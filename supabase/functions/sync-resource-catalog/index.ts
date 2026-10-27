import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function isPublicHttpsUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('URL du flux invalide.');
  }

  if (url.protocol !== 'https:') throw new Error('Les flux doivent utiliser HTTPS.');
  if (url.username || url.password) throw new Error('Les identifiants intégrés dans l’URL sont interdits.');
  if (url.port && url.port !== '443') throw new Error('Port non autorisé pour un flux.');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === 'metadata'
  ) {
    throw new Error('Hôte local ou interne interdit.');
  }

  // Reject IP literals. Feed sources should use a public DNS hostname.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.includes(':')) {
    throw new Error('Les adresses IP directes ne sont pas autorisées pour les flux.');
  }
  return url;
}

async function fetchPublicFeed(rawUrl: string): Promise<Response> {
  let url = isPublicHttpsUrl(rawUrl);
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const response = await fetch(url.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: { 'User-Agent': 'JDV-NEXORA-ResourceCatalog/1.0', Accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.1' },
      signal: AbortSignal.timeout(12000),
    });

    if (![301, 302, 303, 307, 308].includes(response.status)) return response;
    const location = response.headers.get('location');
    if (!location) throw new Error('Redirection de flux sans destination.');
    if (redirects === MAX_REDIRECTS) throw new Error('Trop de redirections du flux.');
    url = isPublicHttpsUrl(new URL(location, url).toString());
  }
  throw new Error('Impossible de récupérer le flux.');
}

async function readLimitedText(response: Response): Promise<string> {
  const length = Number(response.headers.get('content-length') ?? '0');
  if (Number.isFinite(length) && length > MAX_FEED_BYTES) {
    await response.body?.cancel();
    throw new Error('Flux trop volumineux (limite de 2 Mo).');
  }
  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_FEED_BYTES) {
        await reader.cancel();
        throw new Error('Flux trop volumineux (limite de 2 Mo).');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function xmlText(value: string | null): string {
  return (value ?? '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function tag(item: string, name: string): string {
  const plain = item.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '\\s*>', 'i'));
  if (plain?.[1] != null) return xmlText(plain[1]);
  const namespaced = item.match(new RegExp('<(?:[\\w.-]+:)?' + name + '\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + name + '\\s*>', 'i'));
  return xmlText(namespaced?.[1] ?? '');
}

function atomLink(item: string): string {
  const links = [...item.matchAll(/<link\b([^>]*)\/?\s*>/gi)];
  for (const match of links) {
    const attrs = match[1] ?? '';
    const rel = attrs.match(/\brel=["']([^"']+)["']/i)?.[1];
    const href = attrs.match(/\bhref=["']([^"']+)["']/i)?.[1];
    if (href && (!rel || rel === 'alternate') && /^https:\/\//i.test(href)) return href;
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const secret = Deno.env.get('RESOURCE_SYNC_SECRET');
  if (!secret || req.headers.get('x-sync-secret') !== secret) return json({ error: 'Unauthorized' }, 401);

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) return json({ error: 'Server configuration missing' }, 500);

  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sources, error } = await db.from('nexora_resource_sources')
    .select('id,name,source_type,feed_url,topic,language,website_url')
    .eq('is_active', true)
    .not('feed_url', 'is', null);
  if (error) return json({ error: 'Impossible de charger les sources actives.' }, 500);

  let processed = 0;
  let failed = 0;
  const issues: string[] = [];

  for (const source of sources ?? []) {
    try {
      if (typeof source.feed_url !== 'string' || !source.feed_url.trim()) throw new Error('URL du flux absente.');
      const response = await fetchPublicFeed(source.feed_url);
      if (!response.ok) throw new Error('Flux HTTP ' + response.status);
      const xml = await readLimitedText(response);
      const items = [
        ...xml.matchAll(/<(?:[\w.-]+:)?item\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?item\s*>/gi),
        ...xml.matchAll(/<(?:[\w.-]+:)?entry\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?entry\s*>/gi),
      ].map((match) => ({ item: match[0], index: match.index ?? 0 }))
        .sort((a, b) => a.index - b.index)
        .slice(0, 30)
        .map(({ item }) => item);

      if (items.length === 0) throw new Error('Aucun élément RSS <item> ou Atom <entry> détecté.');

      let importedForSource = 0;
      for (const item of items) {
        const title = tag(item, 'title');
        const link = tag(item, 'link') || atomLink(item) || tag(item, 'guid') || tag(item, 'id');
        const description = tag(item, 'description') || tag(item, 'summary') || tag(item, 'content');
        const externalId = tag(item, 'guid') || tag(item, 'id') || link;
        const dateText = tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated');

        if (!title || !link || !/^https?:\/\//i.test(link)) continue;
        const { error: upsertError } = await db.from('nexora_resources').upsert({
          source_id: source.id,
          external_id: externalId.slice(0, 1000),
          title: title.slice(0, 300),
          description: description.slice(0, 5000),
          creator_name: source.name,
          resource_type: source.source_type === 'youtube' ? 'video' : /podcast|show/i.test(source.name) ? 'podcast' : 'article',
          topic: source.topic,
          language: source.language,
          url: link,
          published_at: dateText && !Number.isNaN(Date.parse(dateText)) ? new Date(dateText).toISOString() : null,
          is_published: false,
          editorial_note_fr: 'Importé automatiquement : validation éditoriale requise avant publication.',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'source_id,external_id', ignoreDuplicates: true });
        if (upsertError) throw upsertError;
        importedForSource++;
        processed++;
      }

      if (importedForSource === 0) throw new Error('Éléments détectés, mais aucun élément ne possède un titre et un lien valides.');
      const { error: syncError } = await db.from('nexora_resource_sources')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', source.id);
      if (syncError) throw syncError;
    } catch (cause) {
      failed++;
      issues.push(source.name + ': ' + (cause instanceof Error ? cause.message : 'Erreur inconnue'));
    }
  }

  // Return HTTP 200 for a completed batch even when individual feeds fail.
  // Callers must inspect success/failed; a partial feed failure is not a function transport failure.
  return json({
    success: failed === 0,
    sources: sources?.length ?? 0,
    processed,
    failed,
    issues,
  }, 200);
});
