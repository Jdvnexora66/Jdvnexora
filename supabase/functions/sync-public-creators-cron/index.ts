import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const decodeXml = (value: string) => value
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");

function xmlTag(block: string, name: string): string | null {
  const match = block.match(new RegExp("<" + name + "(?:\\s[^>]*)?>([\\s\\S]*?)</" + name + ">"));
  return match ? decodeXml(match[1]).trim() : null;
}

async function fetchFeed(channelId: string): Promise<string> {
  const channelUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(channelId);
  const uploadsId = "UU" + channelId.slice(2);
  const uploadsUrl = "https://www.youtube.com/feeds/videos.xml?playlist_id=" + encodeURIComponent(uploadsId);

  async function requestFeed(url: string): Promise<string> {
    let lastStatus: number | null = null;
    let lastError = "";
    const delays = [400];
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; NEXORA-CreatorCatalog/1.0)",
            "Accept": "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
          },
          redirect: "follow",
          signal: AbortSignal.timeout(2500),
        });
        if (response.ok) {
          const xml = await response.text();
          if (xml.length > 2_000_000 || !/<feed(?:\\s|>)/i.test(xml)) {
            throw new Error("Réponse YouTube non conforme au format Atom.");
          }
          return xml;
        }
        lastStatus = response.status;
        lastError = "HTTP " + response.status;
        if (!(response.status === 404 || response.status === 429 || response.status >= 500)) break;
      } catch (error) {
        lastStatus = null;
        lastError = error instanceof Error ? error.message : "Erreur réseau inconnue";
      }
      if (attempt < delays.length) await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
    throw new Error(lastStatus === 404 ? "HTTP 404 après deux tentatives" : lastError || "flux inaccessible");
  }

  try {
    return await requestFeed(channelUrl);
  } catch (primaryError) {
    try {
      return await requestFeed(uploadsUrl);
    } catch (fallbackError) {
      const first = primaryError instanceof Error ? primaryError.message : "flux chaîne indisponible";
      const second = fallbackError instanceof Error ? fallbackError.message : "flux uploads indisponible";
      throw new Error("Flux chaîne : " + first + " ; flux uploads : " + second);
    }
  }
}

async function syncOne(admin: ReturnType<typeof createClient>, channel: Record<string, unknown>) {
  const ownerId = String(channel.owner_id ?? "");
  const channelId = String(channel.channel_id ?? "");
  const channelRowId = String(channel.id ?? "");
  if (!ownerId || !channelRowId || !/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) {
    throw new Error("Enregistrement de chaîne invalide.");
  }

  const xml = await fetchFeed(channelId);
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map(match => match[1]).slice(0, 15);
  const channelTitle = xmlTag(xml, "title") || String(channel.channel_name || "Créateur YouTube");
  let imported = 0;
  let failed = 0;

  for (const entry of entries) {
    const videoId = xmlTag(entry, "yt:videoId") || "";
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;
    const title = (xmlTag(entry, "title") || "Vidéo YouTube").slice(0, 240);
    const publishedRaw = xmlTag(entry, "published");
    const publishedAt = publishedRaw && !Number.isNaN(Date.parse(publishedRaw))
      ? new Date(publishedRaw).toISOString()
      : null;
    const creatorName = xmlTag(entry, "name") || channelTitle;
    const record = {
      owner_id: ownerId,
      platform: "youtube",
      external_id: videoId,
      title,
      description: null,
      creator_name: creatorName,
      source_url: "https://www.youtube.com/watch?v=" + videoId,
      embed_url: "https://www.youtube-nocookie.com/embed/" + videoId,
      thumbnail_url: "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg",
      published_at: publishedAt,
      content_type: "video",
      visibility: "private",
      sync_source: "youtube_api",
      provider_metadata: { creator_channel_id: channelId, synced_via: "public_rss" },
    };

    const { data: existing, error: lookupError } = await admin
      .from("media_library_items").select("id")
      .eq("owner_id", ownerId).eq("platform", "youtube").eq("external_id", videoId)
      .maybeSingle();
    if (lookupError) { failed++; continue; }

    const write = existing
      ? await admin.from("media_library_items").update(record).eq("id", existing.id).eq("owner_id", ownerId)
      : await admin.from("media_library_items").insert(record);
    if (write.error) { failed++; continue; }
    imported++;
  }

  const { error: updateError } = await admin.from("nexora_creator_channels").update({
    channel_name: channelTitle,
    last_synced_at: new Date().toISOString(),
    last_sync_error: failed ? failed + " vidéo(s) non importée(s) lors de cette synchronisation." : null,
  }).eq("id", channelRowId).eq("owner_id", ownerId);
  if (updateError) throw updateError;

  return { channel_id: channelId, channel_name: channelTitle, discovered: entries.length, imported, failed };
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);

  const expected = Deno.env.get("RESOURCE_SYNC_SECRET") ?? "";
  const provided = req.headers.get("x-sync-secret") ?? "";
  if (!expected || provided.length !== expected.length || provided !== expected) {
    return json({ error: "Non autorisé." }, 401);
  }

  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !service) return json({ error: "Configuration serveur incomplète." }, 503);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: channels, error } = await admin
    .from("nexora_creator_channels")
    .select("id, owner_id, channel_id, channel_name")
    .eq("platform", "youtube")
    .order("last_synced_at", { ascending: true, nullsFirst: true })
    .order("created_at", { ascending: true })
    .limit(10);
  if (error) return json({ error: "Impossible de charger les chaînes à synchroniser." }, 500);

  const results = await Promise.all((channels ?? []).map(async channel => {
    try {
      return { ...await syncOne(admin, channel), status: "ok" as const };
    } catch (error) {
      const message = error instanceof Error ? error.message.slice(0, 500) : "Échec de synchronisation.";
      await admin.from("nexora_creator_channels").update({ last_sync_error: message })
        .eq("id", channel.id).eq("owner_id", channel.owner_id);
      return { channel_id: channel.channel_id, status: "error" as const, error: message };
    }
  }));

  return json({
    success: results.every(result => result.status === "ok"),
    processed: results.length,
    succeeded: results.filter(result => result.status === "ok").length,
    failed: results.filter(result => result.status === "error").length,
    results,
  });
});
