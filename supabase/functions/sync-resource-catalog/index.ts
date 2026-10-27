import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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
    if (href && (!rel || rel === 'alternate') && /^https?:\/\//i.test(href)) return href;
  }
  return '';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });

  const secret = Deno.env.get('RESOURCE_SYNC_SECRET');
  if (!secret || req.headers.get('x-sync-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server configuration missing' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sources, error } = await db.from('nexora_resource_sources')
    .select('id,name,source_type,feed_url,topic,language,website_url')
    .eq('is_active', true)
    .not('feed_url', 'is', null);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let processed = 0;
  let failed = 0;
  const issues: string[] = [];

  for (const source of sources ?? []) {
    try {
      const response = await fetch(source.feed_url, {
        headers: { 'User-Agent': 'JDV-NEXORA-ResourceCatalog/1.0' },
        signal: AbortSignal.timeout(12000),
      });
      if (!response.ok) throw new Error('Feed HTTP ' + response.status);

      const xml = await response.text();
      const items = [
        ...xml.matchAll(/<(?:[\w.-]+:)?item\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?item\s*>/gi),
        ...xml.matchAll(/<(?:[\w.-]+:)?entry\b[^>]*>[\s\S]*?<\/(?:[\w.-]+:)?entry\s*>/gi),
      ].map((match) => ({ item: match[0], index: match.index ?? 0 }))
        .sort((a, b) => a.index - b.index)
        .slice(0, 30)
        .map(({ item }) => item);

      if (items.length === 0) {
        throw new Error('Flux récupéré mais aucun élément RSS <item> ou Atom <entry> détecté.');
      }

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

      if (importedForSource === 0) {
        const sample = items[0] ?? '';
        const sampleTitle = tag(sample, 'title').slice(0, 120) || '(titre vide)';
        const sampleLink = tag(sample, 'link').slice(0, 180) || atomLink(sample) || '(lien vide)';
        throw new Error('Éléments détectés (' + items.length + '), aucun import valide. Exemple titre=' + sampleTitle + '; lien extrait=' + sampleLink.slice(0, 180));
      }

      const { error: syncError } = await db.from('nexora_resource_sources')
        .update({ last_synced_at: new Date().toISOString() })
        .eq('id', source.id);
      if (syncError) throw syncError;
    } catch (cause) {
      failed++;
      issues.push(source.name + ': ' + (cause instanceof Error ? cause.message : 'Erreur inconnue'));
    }
  }

  return new Response(JSON.stringify({
    success: failed === 0,
    sources: sources?.length ?? 0,
    processed,
    failed,
    issues,
  }), {
    status: failed === 0 ? 200 : 207,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
