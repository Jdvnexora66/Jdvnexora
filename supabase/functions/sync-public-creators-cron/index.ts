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
          if (xml.length > 2_000_000 || !/<feed(?:\s|>)/i.test(xml)) {
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

async function syncOneViaOAuth(
  admin: ReturnType<typeof createClient>,
  ownerId: string,
  channelId: string,
  channelRowId: string,
  fallbackName: string,
) {
  const { data: connection, error: connectionError } = await admin
    .from("media_provider_connections")
    .select("access_token,refresh_token,token_expires_at")
    .eq("owner_id", ownerId)
    .eq("platform", "youtube")
    .maybeSingle();
  if (connectionError) throw connectionError;
  if (!connection?.access_token) {
    throw new Error("Aucun compte YouTube OAuth connecté pour cet utilisateur. Connectez YouTube dans les intégrations média pour activer la source API officielle.");
  }

  let accessToken = String(connection.access_token);
  const refreshToken = typeof connection.refresh_token === "string" ? connection.refresh_token : "";
  const expiresAt = connection.token_expires_at ? new Date(String(connection.token_expires_at)).getTime() : 0;
  if (expiresAt && expiresAt < Date.now() + 120000) {
    if (!refreshToken) throw new Error("Le jeton YouTube a expiré et aucun jeton de renouvellement n'est disponible. Reconnectez YouTube.");
    const clientId = Deno.env.get("GOOGLE_CLIENT_ID") ?? "";
    const clientSecret = Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "";
    if (!clientId || !clientSecret) throw new Error("Les identifiants OAuth Google ne sont pas configurés côté serveur.");
    const refreshResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
      signal: AbortSignal.timeout(10000),
    });
    const refreshBody = await refreshResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (!refreshResponse.ok || typeof refreshBody.access_token !== "string") {
      throw new Error("Renouvellement du jeton YouTube impossible. Reconnectez le compte YouTube.");
    }
    accessToken = refreshBody.access_token;
    const expiresIn = Number(refreshBody.expires_in ?? 3600);
    const { error: tokenUpdateError } = await admin.from("media_provider_connections").update({
      access_token: accessToken,
      token_expires_at: new Date(Date.now() + expiresIn * 1000).toISOString(),
      last_sync_error: null,
    }).eq("owner_id", ownerId).eq("platform", "youtube");
    if (tokenUpdateError) throw tokenUpdateError;
  }

  const uploadsPlaylistId = "UU" + channelId.slice(2);
  const apiUrl = "https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=15&playlistId=" + encodeURIComponent(uploadsPlaylistId);
  const apiResponse = await fetch(apiUrl, {
    headers: { Authorization: "Bearer " + accessToken, Accept: "application/json" },
    signal: AbortSignal.timeout(12000),
  });
  const apiBody = await apiResponse.json().catch(() => ({})) as Record<string, unknown>;
  if (!apiResponse.ok) {
    const apiError = apiBody.error as Record<string, unknown> | undefined;
    throw new Error("YouTube Data API refuse la lecture de la playlist (HTTP " + apiResponse.status + ") : " + String(apiError?.message ?? "vérifiez les autorisations et le quota API"));
  }

  const items = Array.isArray(apiBody.items) ? apiBody.items as Array<Record<string, unknown>> : [];
  let imported = 0;
  let failed = 0;
  let channelName = fallbackName || "Créateur YouTube";

  for (const item of items) {
    const details = item.contentDetails as Record<string, unknown> | undefined;
    const snippet = item.snippet as Record<string, unknown> | undefined;
    const videoId = typeof details?.videoId === "string" ? details.videoId : "";
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;
    const title = typeof snippet?.title === "string" ? snippet.title.slice(0, 240) : "Vidéo YouTube";
    const creator = typeof snippet?.channelTitle === "string" ? snippet.channelTitle : channelName;
    channelName = creator || channelName;
    const publishedRaw = typeof snippet?.publishedAt === "string" ? snippet.publishedAt : null;
    const publishedAt = publishedRaw && !Number.isNaN(Date.parse(publishedRaw)) ? new Date(publishedRaw).toISOString() : null;
    const thumbnails = snippet?.thumbnails as Record<string, Record<string, unknown>> | undefined;
    const thumbnail = [thumbnails?.maxres, thumbnails?.high, thumbnails?.medium, thumbnails?.default]
      .map(value => value?.url)
      .find(value => typeof value === "string" && value.startsWith("https://")) as string | undefined;
    const record = {
      owner_id: ownerId,
      platform: "youtube",
      external_id: videoId,
      title,
      description: typeof snippet?.description === "string" ? snippet.description.slice(0, 10000) : null,
      creator_name: creator,
      source_url: "https://www.youtube.com/watch?v=" + videoId,
      embed_url: "https://www.youtube-nocookie.com/embed/" + videoId,
      thumbnail_url: thumbnail ?? "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg",
      published_at: publishedAt,
      content_type: "video",
      visibility: "private",
      sync_source: "youtube_api",
      provider_metadata: { creator_channel_id: channelId, synced_via: "youtube_data_api_oauth" },
    };
    const { data: existing, error: lookupError } = await admin.from("media_library_items")
      .select("id").eq("owner_id", ownerId).eq("platform", "youtube").eq("external_id", videoId).maybeSingle();
    if (lookupError) { failed++; continue; }
    const write = existing
      ? await admin.from("media_library_items").update(record).eq("id", existing.id).eq("owner_id", ownerId)
      : await admin.from("media_library_items").insert(record);
    if (write.error) { failed++; continue; }
    imported++;
  }

  const { error: updateError } = await admin.from("nexora_creator_channels").update({
    channel_name: channelName,
    last_synced_at: new Date().toISOString(),
    last_sync_error: failed ? failed + " vidéo(s) non importée(s) lors de la synchronisation API." : null,
  }).eq("id", channelRowId).eq("owner_id", ownerId);
  if (updateError) throw updateError;
  return { channel_id: channelId, channel_name: channelName, discovered: items.length, imported, failed, source: "youtube_data_api_oauth" };
}

async function syncOne(admin: ReturnType<typeof createClient>, channel: Record<string, unknown>) {
  const ownerId = String(channel.owner_id ?? "");
  const channelId = String(channel.channel_id ?? "");
  const channelRowId = String(channel.id ?? "");
  if (!ownerId || !channelRowId || !/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) {
    throw new Error("Enregistrement de chaîne invalide.");
  }

  let xml: string;
  try {
    xml = await fetchFeed(channelId);
  } catch (feedError) {
    return await syncOneViaOAuth(admin, ownerId, channelId, channelRowId, String(channel.channel_name ?? ""));
  }
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
