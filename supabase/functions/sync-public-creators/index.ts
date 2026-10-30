import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const text = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'");
const escape = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&apos;" })[c]!);

async function fetchAtomFeed(feedUrl: string, maxAttempts: number, timeoutMs: number): Promise<string> {
  const retryDelays = [700, 1600];
  let lastStatus: number | null = null;
  let lastError = "";
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(feedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; NEXORA-CreatorCatalog/1.0)",
          "Accept": "application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
        },
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (response.ok) {
        const xml = await response.text();
        if (xml.length > 2_000_000 || !/<feed(?:\s|>)/i.test(xml)) {
          throw new Error("YouTube a renvoyé un contenu qui n'est pas un flux Atom valide.");
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
    if (attempt < maxAttempts - 1) {
      await new Promise(resolve => setTimeout(resolve, retryDelays[Math.min(attempt, retryDelays.length - 1)]));
    }
  }
  throw new Error(lastStatus === 404
    ? "YouTube renvoie HTTP 404 après plusieurs tentatives."
    : "Flux YouTube indisponible après plusieurs tentatives : " + (lastError || "erreur réseau"));
}

async function syncChannelViaOAuth(
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
  return { channel_name: channelName, discovered: items.length, imported, failed, source: "youtube_data_api_oauth" };
}

async function syncChannel(admin: ReturnType<typeof createClient>, ownerId: string, channel: Record<string, unknown>) {
  const channelId = String(channel.channel_id ?? "");
  if (!/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) throw new Error("Identifiant de chaîne YouTube invalide.");
  const channelFeedUrl = "https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(channelId);
  let xml: string;
  try {
    xml = await fetchAtomFeed(channelFeedUrl, 3, 5000);
  } catch (primaryError) {
    // YouTube's channel_id feed can return intermittent 404s. Retry through the channel's
    // automatically generated uploads playlist (UU + the channel ID without its UC prefix).
    const uploadsPlaylistId = "UU" + channelId.slice(2);
    const uploadsFeedUrl = "https://www.youtube.com/feeds/videos.xml?playlist_id=" + encodeURIComponent(uploadsPlaylistId);
    try {
      xml = await fetchAtomFeed(uploadsFeedUrl, 2, 4000);
    } catch (fallbackError) {
      const primaryMessage = primaryError instanceof Error ? primaryError.message : "flux chaîne indisponible";
      const fallbackMessage = fallbackError instanceof Error ? fallbackError.message : "flux playlist indisponible";
      try {
        return await syncChannelViaOAuth(admin, ownerId, channelId, String(channel.id ?? ""), String(channel.channel_name ?? ""));
      } catch (apiError) {
        const apiMessage = apiError instanceof Error ? apiError.message : "API officielle indisponible";
        throw new Error("Échec des flux RSS YouTube. Flux chaîne : " + primaryMessage + " Flux uploads : " + fallbackMessage + " Source API officielle : " + apiMessage);
      }
    }
  }
  if (!/<feed(?:\s|>)/i.test(xml) || !/<(?:entry|title)(?:\s|>)/i.test(xml)) {
    throw new Error("YouTube a renvoyé une réponse qui ne ressemble pas à un flux Atom valide. Réessayez dans quelques minutes.");
  }
  const titleMatch = xml.match(/<title>([\s\S]*?)<\/title>/);
  const channelName = titleMatch ? text(titleMatch[1]).trim() : String(channel.channel_name || "Créateur YouTube");
  const entries = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)].map((m) => m[1]);
  let imported = 0;
  for (const entry of entries) {
    const videoIdMatch = entry.match(/<yt:videoId>([\s\S]*?)<\/yt:videoId>/);
    const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
    const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);
    const authorMatch = entry.match(/<author>[\s\S]*?<name>([\s\S]*?)<\/name>[\s\S]*?<\/author>/);
    const videoId = videoIdMatch ? text(videoIdMatch[1]).trim() : "";
    if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) continue;
    const title = (titleMatch ? text(titleMatch[1]).trim() : "Vidéo YouTube").slice(0, 240);
    const publishedAt = publishedMatch ? text(publishedMatch[1]).trim() : null;
    const creatorName = authorMatch ? text(authorMatch[1]).trim() : channelName;
    const record = {
      owner_id: ownerId, platform: "youtube", external_id: videoId, title,
      description: null, creator_name: creatorName || channelName,
      source_url: "https://www.youtube.com/watch?v=" + videoId,
      embed_url: "https://www.youtube-nocookie.com/embed/" + videoId,
      thumbnail_url: "https://i.ytimg.com/vi/" + videoId + "/hqdefault.jpg",
      published_at: publishedAt, content_type: "video", visibility: "private",
      sync_source: "youtube_api", provider_metadata: { creator_channel_id: channelId, synced_via: "public_rss" },
    };
    // The existing library schema does not guarantee a composite unique constraint.
    // Find this user's imported video first, then update it or insert it without relying on one.
    const { data: existingItem, error: lookupError } = await admin
      .from("media_library_items")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("platform", "youtube")
      .eq("external_id", videoId)
      .maybeSingle();
    if (lookupError) throw lookupError;
    const write = existingItem
      ? await admin.from("media_library_items").update(record).eq("id", existingItem.id).eq("owner_id", ownerId)
      : await admin.from("media_library_items").insert(record);
    if (write.error) throw write.error;
    imported++;
  }
  const { error: updateError } = await admin.from("nexora_creator_channels").update({
    channel_name: channelName, last_synced_at: new Date().toISOString(), last_sync_error: null,
  }).eq("id", channel.id).eq("owner_id", ownerId);
  if (updateError) throw updateError;
  return { channel_name: channelName, discovered: entries.length, imported };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const anon = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!url || !anon || !service) return json({ error: "Configuration Supabase serveur incomplète." }, 503);
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Connexion requise." }, 401);
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Session expirée. Reconnectez-vous." }, 401);
  const admin = createClient(url, service, { auth: { persistSession: false } });
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: "Corps JSON invalide." }, 400); }
  const ownerId = userData.user.id;
  const action = String(body.action ?? "");
  if (action === "add") {
    const channelUrl = String(body.channel_url ?? "").trim();
    let parsed: URL;
    try { parsed = new URL(channelUrl); } catch { return json({ error: "Collez une URL officielle de chaîne YouTube, par exemple https://www.youtube.com/@nom ou https://www.youtube.com/channel/UC…" }, 400); }
    if (parsed.protocol !== "https:" || !["youtube.com", "m.youtube.com"].includes(parsed.hostname.replace(/^www\./, ""))) {
      return json({ error: "L’adresse doit appartenir à youtube.com et utiliser HTTPS." }, 400);
    }
    // Normalize encoded @ characters before validating the path.
    let channelPathname: string;
    try {
      channelPathname = decodeURIComponent(parsed.pathname).replace(/\/+$/, "");
    } catch {
      return json({ error: "L’URL de la chaîne contient un encodage invalide." }, 400);
    }
    // Accept canonical channel URLs and common channel tabs such as /videos or /shorts.
    const channelPath = channelPathname.match(/^\/channel\/(UC[a-zA-Z0-9_-]{22})(?:\/(?:videos|shorts|streams|featured|playlists|about|community|live))?$/i);
    let channelId = channelPath?.[1] ?? "";
    if (!channelId) {
      const handleMatch = channelPathname.match(/^\/@([A-Za-z0-9._-]{3,})(?:\/(?:videos|shorts|streams|featured|playlists|about|community|live))?$/i);
      const handle = handleMatch?.[1];
      if (!handle) return json({ error: "URL de chaîne non reconnue. Collez le lien direct de la chaîne YouTube, par exemple https://www.youtube.com/@nom." }, 400);
      try {
        const page = await fetch("https://www.youtube.com/@" + encodeURIComponent(handle), {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; NEXORA-CreatorCatalog/1.0)", "Accept-Language": "fr-FR,fr;q=0.9,en;q=0.8" },
          redirect: "follow",
        });
        if (!page.ok) return json({ error: "YouTube n’a pas permis de résoudre cette chaîne (HTTP " + page.status + "). Vérifiez que le nom @ est exact, puis réessayez." }, 502);
        const html = await page.text();
        // YouTube changes the ordering and shape of channel metadata between page variants.
        // Try the canonical meta tag first, then the JSON fields used by YouTube's page data.
        const channelIdMatch =
          html.match(/<meta[^>]+itemprop=["']channelId["'][^>]+content=["'](UC[a-zA-Z0-9_-]{22})["']/i) ??
          html.match(/<meta[^>]+content=["'](UC[a-zA-Z0-9_-]{22})["'][^>]+itemprop=["']channelId["']/i) ??
          html.match(/["'](?:externalId|channelId|browseId)["']\s*:\s*["'](UC[a-zA-Z0-9_-]{22})["']/i) ??
          html.match(/youtube\.com\/channel\/(UC[a-zA-Z0-9_-]{22})/i);
        if (!channelIdMatch) {
          return json({ error: "YouTube n’a pas fourni d’identifiant de chaîne vérifiable pour @" + handle + ". Vérifiez que la chaîne est publique et réessayez." }, 502);
        }
        channelId = channelIdMatch[1];
      } catch {
        return json({ error: "Impossible de contacter YouTube pour résoudre ce nom @. Réessayez plus tard." }, 502);
      }
    }
    const { data: existing, error: existingError } = await admin
      .from("nexora_creator_channels")
      .select("*")
      .eq("owner_id", ownerId)
      .eq("channel_id", channelId)
      .maybeSingle();

    if (existingError) {
      return json(
        { error: "Impossible de vérifier si cette chaîne est déjà enregistrée." },
        500,
      );
    }

    let channel = existing;
    if (!channel) {
      const { data, error } = await admin.from("nexora_creator_channels").insert({ owner_id: ownerId, channel_id: channelId, channel_url: "https://www.youtube.com/channel/" + channelId }).select("*").single();
      if (error || !data) return json({ error: error?.code === "23505" ? "Cette chaîne est déjà enregistrée." : "Impossible d’enregistrer la chaîne." }, 500);
      channel = data;
    }
    try {
      const result = await syncChannel(admin, ownerId, channel);
      return json({ success: true, channel: { id: channel.id, channel_id: channelId, ...result }, ...result });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Échec de synchronisation.";
      await admin.from("nexora_creator_channels").update({ last_sync_error: message }).eq("id", channel.id).eq("owner_id", ownerId);
      return json({ error: message, channel_id: channelId }, 502);
    }
  }
  if (action === "sync") {
    const id = String(body.id ?? "");
    const { data: channel, error } = await admin.from("nexora_creator_channels").select("*").eq("id", id).eq("owner_id", ownerId).maybeSingle();
    if (error || !channel) return json({ error: "Chaîne introuvable ou accès refusé." }, 404);
    try { return json({ success: true, channel: { id: channel.id, ...(await syncChannel(admin, ownerId, channel)) } }); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Échec de synchronisation.";
      await admin.from("nexora_creator_channels").update({ last_sync_error: message }).eq("id", id).eq("owner_id", ownerId);
      return json({ error: message }, 502);
    }
  }
  if (action === "remove") {
    const id = String(body.id ?? "");
    const { error } = await admin.from("nexora_creator_channels").delete().eq("id", id).eq("owner_id", ownerId);
    if (error) return json({ error: "Impossible de retirer cette chaîne." }, 500);
    return json({ success: true });
  }
  if (action === "list") {
    const { data, error } = await admin.from("nexora_creator_channels").select("id,channel_id,channel_url,channel_name,last_synced_at,last_sync_error,created_at").eq("owner_id", ownerId).order("created_at", { ascending: false });
    if (error) return json({ error: "Impossible de charger les chaînes." }, 500);
    return json({ channels: data ?? [] });
  }
  return json({ error: "Action inconnue." }, 400);
});
