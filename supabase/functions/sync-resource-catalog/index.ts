import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-sync-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function xmlText(value: string | null): string {
  return (value ?? '').replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1').replace(/<[^>]*>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();
}
function tag(item: string, name: string): string {
  // Prefer the simple RSS 2.0 tag form, then fall back to namespace-prefixed XML tags.
  const plain = item.match(new RegExp('<' + name + '\\b[^>]*>([\\s\\S]*?)<\\/' + name + '\\s*>', 'i'));
  if (plain?.[1] != null) return xmlText(plain[1]);
  const namespaced = item.match(new RegExp('<(?:[\\w.-]+:)?' + name + '\\b[^>]*>([\\s\\S]*?)<\\/(?:[\\w.-]+:)?' + name + '\\s*>', 'i'));
  return xmlText(namespaced?.[1] ?? '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  const secret = Deno.env.get('RESOURCE_SYNC_SECRET');
  if (!secret || req.headers.get('x-sync-secret') !== secret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !serviceKey) return new Response(JSON.stringify({ error: 'Server configuration missing' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: sources, error } = await db.from('nexora_resource_sources').select('id,name,source_type,feed_url,topic,language,website_url').eq('is_active', true).not('feed_url', 'is', null);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  let processed = 0; let failed = 0; const issues: string[] = [];
  for (const source of sources ?? []) {
    try {
      const response = await fetch(source.feed_url, { headers: { 'User-Agent': 'JDV-NEXORA-ResourceCatalog/1.0' }, signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw new Error('Feed HTTP ' + response.status);
      const xml = await response.text();
      const items = [...xml.matchAll(/<item\b[^>]*>[\s\S]*?<\/item\s*>/gi)].map(m => m[0]).slice(0, 30);
      if (items.length === 0) throw new Error('Aucun élément RSS <item> détecté ; le flux a été récupéré mais son contenu n’a pas été analysé.');
      let importedForSource = 0;
      for (const item of items) {
        const title = tag(item, 'title');
        const linkTag = item.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*\/?\s*>/i);
        const link = tag(item, 'link') || linkTag?.[1] || tag(item, 'guid') || tag(item, 'id');
        const description = tag(item, 'description') || tag(item, 'summary') || tag(item, 'content');
        const externalId = tag(item, 'guid') || tag(item, 'id') || link;
        const dateText = tag(item, 'pubDate') || tag(item, 'published') || tag(item, 'updated');
        if (!title || !link || !/^https?:\/\//i.test(link)) continue;
        const { error: upsertError } = await db.from('nexora_resources').upsert({
          source_id: source.id, external_id: externalId.slice(0, 1000), title: title.slice(0, 300),
          description: description.slice(0, 5000), creator_name: source.name,
          resource_type: source.source_type === 'youtube' ? 'video' : /podcast|show/i.test(source.name) ? 'podcast' : 'article',
          topic: source.topic, language: source.language, url: link,
          published_at: dateText ? (Number.isNaN(Date.parse(dateText)) ? null : new Date(dateText).toISOString()) : null,
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
        const sampleLink = tag(sample, 'link').slice(0, 180) || '(lien vide)';
        const linkStart = sample.toLowerCase().indexOf('<link');
        const linkContentStart = linkStart >= 0 ? sample.indexOf('>', linkStart) + 1 : -1;
        const linkEnd = linkContentStart > 0 ? sample.toLowerCase().indexOf('</link>', linkContentStart) : -1;
        const rawLinkTag = linkContentStart > 0 && linkEnd > linkContentStart ? sample.slice(linkContentStart, linkEnd).slice(0, 180) : '(aucun tag link standard o contenu vide)';
        throw new Error('Éléments RSS détectés (' + items.length + '), aucun import valide. Exemple titre=' + sampleTitle + '; lien extrait=' + sampleLink + '; contenu link brut=' + rawLinkTag);
      }
      if (/^the tim ferriss show$/i.test(source.name.trim())) {
        const { error: publishError } = await db.from('nexora_resources')
          .update({
            is_published: true,
            resource_type: 'podcast',
            editorial_note_fr: 'Épisode du flux RSS officiel The Tim Ferriss Show, importé et publié automatiquement.',
            updated_at: new Date().toISOString(),
          })
          .eq('source_id', source.id);
        if (publishError) throw publishError;
      }
      const { error: syncError } = await db.from('nexora_resource_sources').update({ last_synced_at: new Date().toISOString() }).eq('id', source.id);
      if (syncError) throw syncError;
    } catch (cause) {
      failed++;
      issues.push(source.name + ': ' + (cause instanceof Error ? cause.message : 'Erreur inconnue'));
    }
  }
  return new Response(JSON.stringify({ success: failed === 0, sources: sources?.length ?? 0, processed, failed, issues }), { status: failed === 0 ? 200 : 207, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
});
