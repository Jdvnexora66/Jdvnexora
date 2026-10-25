import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FUNCTION_URL = SUPABASE_URL + "/functions/v1/media-integrations";
const GRAPH_VERSION = Deno.env.get("META_GRAPH_VERSION") ?? "v22.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Platform = "youtube" | "tiktok" | "instagram";
type Json = Record<string, unknown>;

function json(data: Json, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function html(message: string, ok: boolean) {
  const safeMessage = message.replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" }[c] ?? c));
  return new Response(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>NEXORA Media</title><body style="font:16px system-ui;background:#0b1020;color:#eef2ff;display:grid;place-items:center;min-height:90vh"><main style="max-width:440px;padding:28px;border:1px solid #303a58;border-radius:18px"><h1>${ok ? "Compte connecté" : "Connexion impossible"}</h1><p>${safeMessage}</p><p>Vous pouvez fermer cette fenêtre et revenir à NEXORA.</p></main><script>try{if(window.opener){window.opener.postMessage({type:"nexora-media-oauth",ok:${ok ? "true" : "false"}}, "*");setTimeout(()=>window.close(),1200)}}catch(e){}</script></body></html>`, { status: ok ? 200 : 400, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8" } });
}
function envFor(platform: Platform) {
  if (platform === "youtube") return { clientId: Deno.env.get("GOOGLE_CLIENT_ID") ?? "", clientSecret: Deno.env.get("GOOGLE_CLIENT_SECRET") ?? "" };
  if (platform === "tiktok") return { clientId: Deno.env.get("TIKTOK_CLIENT_KEY") ?? "", clientSecret: Deno.env.get("TIKTOK_CLIENT_SECRET") ?? "" };
  return { clientId: Deno.env.get("META_APP_ID") ?? "", clientSecret: Deno.env.get("META_APP_SECRET") ?? "" };
}
function redirectUri(platform: Platform) {
  return FUNCTION_URL + "?action=callback&platform=" + platform;
}
function asPlatform(value: unknown): Platform | null {
  return value === "youtube" || value === "tiktok" || value === "instagram" ? value : null;
}
async function readJson(response: Response): Promise<Json> {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(String((body as Json).error_description ?? (body as Json).message ?? (body as Json).error ?? `Provider HTTP ${response.status}`));
  return body as Json;
}
function text(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}
function isoFromSeconds(value: unknown): string | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) && number > 0 ? new Date(number * 1000).toISOString() : null;
}
function safeUrl(value: unknown, fallback: string): string {
  const candidate = text(value, fallback);
  try { const url = new URL(candidate); return url.protocol === "https:" ? url.toString() : fallback; } catch { return fallback; }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const url = new URL(req.url);
  const action = url.searchParams.get("action") ?? "status";
  const callbackPlatform = asPlatform(url.searchParams.get("platform"));

  if (action === "callback" && req.method === "GET") {
    const platform = callbackPlatform;
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const providerError = url.searchParams.get("error_description") ?? url.searchParams.get("error");
    if (providerError) return html("Le fournisseur a refusé la connexion. Vérifiez les autorisations puis réessayez.", false);
    if (!platform || !code || !state) return html("Paramètres OAuth incomplets. Recommencez depuis NEXORA.", false);
    if (!SUPABASE_SERVICE_ROLE_KEY) return html("La configuration serveur Supabase est incomplète.", false);

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const { data: stateRow, error: stateError } = await admin.from("media_oauth_states").select("*").eq("state", state).eq("platform", platform).maybeSingle();
    if (stateError || !stateRow || new Date(stateRow.expires_at).getTime() < Date.now()) {
      if (stateRow) await admin.from("media_oauth_states").delete().eq("state", state);
      return html("Cette demande de connexion a expiré ou a déjà été utilisée. Relancez la connexion dans NEXORA.", false);
    }

    try {
      const credentials = envFor(platform);
      if (!credentials.clientId || !credentials.clientSecret) throw new Error("Les identifiants développeur de cette plateforme ne sont pas configurés côté serveur.");
      const redirect = redirectUri(platform);
      let tokenBody: Json;
      if (platform === "youtube") {
        tokenBody = await readJson(await fetch("https://oauth2.googleapis.com/token", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ code, client_id: credentials.clientId, client_secret: credentials.clientSecret, redirect_uri: redirect, grant_type: "authorization_code" }),
        }));
      } else if (platform === "tiktok") {
        tokenBody = await readJson(await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
          method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_key: credentials.clientId, client_secret: credentials.clientSecret, code, grant_type: "authorization_code", redirect_uri: redirect }),
        }));
      } else {
        const shortToken = await readJson(await fetch("https://graph.facebook.com/" + GRAPH_VERSION + "/oauth/access_token?" + new URLSearchParams({
          client_id: credentials.clientId, client_secret: credentials.clientSecret, redirect_uri: redirect, code,
        })));
        const shortAccessToken = text(shortToken.access_token);
        tokenBody = await readJson(await fetch("https://graph.facebook.com/" + GRAPH_VERSION + "/oauth/access_token?" + new URLSearchParams({
          grant_type: "fb_exchange_token", client_id: credentials.clientId, client_secret: credentials.clientSecret, fb_exchange_token: shortAccessToken,
        })));
        tokenBody.refresh_token = "";
      }
      const accessToken = text(tokenBody.access_token);
      if (!accessToken) throw new Error("Le fournisseur n’a pas renvoyé de jeton d’accès.");
      const expiresIn = Number(tokenBody.expires_in ?? 3600);
      const scopesRaw = text(tokenBody.scope);
      const scopes = scopesRaw.split(/[ ,]+/).filter(Boolean);
      const { error: saveError } = await admin.from("media_provider_connections").upsert({
        owner_id: stateRow.owner_id, platform, access_token: accessToken,
        refresh_token: text(tokenBody.refresh_token) || null,
        token_expires_at: Number.isFinite(expiresIn) ? new Date(Date.now() + expiresIn * 1000).toISOString() : null,
        scopes, connected_at: new Date().toISOString(), last_sync_error: null,
      }, { onConflict: "owner_id,platform" });
      if (saveError) throw saveError;
      await admin.from("media_oauth_states").delete().eq("state", state);
      return html("Votre compte " + platform + " est connecté à NEXORA. Revenez dans l’application pour synchroniser ses contenus.", true);
    } catch (error) {
      await admin.from("media_oauth_states").delete().eq("state", state);
      return html(error instanceof Error ? error.message : "Échec de la connexion.", false);
    }
  }

  if (req.method !== "POST") return json({ error: "Méthode non prise en charge." }, 405);
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Configuration Supabase serveur incomplète." }, 503);
  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer ")) return json({ error: "Connexion requise." }, 401);
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData.user) return json({ error: "Session expirée. Reconnectez-vous." }, 401);
  const userId = userData.user.id;
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  let body: Json = {};
  try { body = await req.json() as Json; } catch { return json({ error: "Corps JSON invalide." }, 400); }

  if (action === "connect") {
    const platform = asPlatform(body.platform);
    if (!platform) return json({ error: "Plateforme non prise en charge." }, 400);
    const credentials = envFor(platform);
    if (!credentials.clientId || !credentials.clientSecret) return json({ error: "Les identifiants développeur de " + platform + " ne sont pas configurés dans les secrets Supabase. L’intégration est préparée, mais la connexion ne peut pas démarrer avant cette configuration." }, 503);
    const state = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
    const { error: stateError } = await admin.from("media_oauth_states").insert({ state, owner_id: userId, platform, expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString() });
    if (stateError) return json({ error: "Impossible de préparer la connexion OAuth." }, 500);
    const redirect = redirectUri(platform);
    let authUrl: URL;
    if (platform === "youtube") {
      authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      authUrl.search = new URLSearchParams({ client_id: credentials.clientId, redirect_uri: redirect, response_type: "code", scope: "https://www.googleapis.com/auth/youtube.readonly", access_type: "offline", prompt: "consent", state }).toString();
    } else if (platform === "tiktok") {
      authUrl = new URL("https://www.tiktok.com/v2/auth/authorize/");
      authUrl.search = new URLSearchParams({ client_key: credentials.clientId, redirect_uri: redirect, response_type: "code", scope: "user.info.basic,video.list", state }).toString();
    } else {
      authUrl = new URL("https://www.facebook.com/" + GRAPH_VERSION + "/dialog/oauth");
      authUrl.search = new URLSearchParams({ client_id: credentials.clientId, redirect_uri: redirect, response_type: "code", scope: "instagram_basic,pages_show_list,pages_read_engagement", state }).toString();
    }
    return json({ authorization_url: authUrl.toString() });
  }

  if (action === "status") {
    const { data, error } = await admin.from("media_provider_connections").select("platform,provider_user_id,account_name,connected_at,last_synced_at,last_sync_error").eq("owner_id", userId);
    if (error) return json({ error: "Impossible de lire l’état des connexions." }, 500);
    return json({ connections: data ?? [] });
  }

  if (action === "disconnect") {
    const platform = asPlatform(body.platform);
    if (!platform) return json({ error: "Plateforme non prise en charge." }, 400);
    const { error } = await admin.from("media_provider_connections").delete().eq("owner_id", userId).eq("platform", platform);
    if (error) return json({ error: "Impossible de déconnecter le compte." }, 500);
    return json({ disconnected: true, platform });
  }

  if (action !== "sync") return json({ error: "Action inconnue." }, 400);
  const platform = asPlatform(body.platform);
  if (!platform) return json({ error: "Plateforme non prise en charge." }, 400);
  const { data: connection, error: connectionError } = await admin.from("media_provider_connections").select("*").eq("owner_id", userId).eq("platform", platform).maybeSingle();
  if (connectionError || !connection) return json({ error: "Connectez d’abord votre compte " + platform + " dans NEXORA." }, 409);

  const { data: job, error: jobError } = await admin.from("media_sync_jobs").insert({ owner_id: userId, platform, creator_handle: connection.account_name || connection.provider_user_id || platform, status: "running", started_at: new Date().toISOString() }).select("id").single();
  if (jobError || !job) return json({ error: "Impossible de démarrer la synchronisation." }, 500);

  try {
    let discovered: Array<Record<string, unknown>> = [];
    let accountName = connection.account_name ?? null;
    let accountId = connection.provider_user_id ?? null;
    let newAccessToken = connection.access_token;
    let newRefreshToken = connection.refresh_token;
    let tokenExpiry = connection.token_expires_at;

    if (platform === "youtube") {
      if (tokenExpiry && new Date(tokenExpiry).getTime() < Date.now() + 120000 && newRefreshToken) {
        const credentials = envFor("youtube");
        const refresh = await readJson(await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: credentials.clientId, client_secret: credentials.clientSecret, refresh_token: newRefreshToken, grant_type: "refresh_token" }) }));
        newAccessToken = text(refresh.access_token, newAccessToken);
        tokenExpiry = new Date(Date.now() + Number(refresh.expires_in ?? 3600) * 1000).toISOString();
      }
      const channelData = await readJson(await fetch("https://youtube.googleapis.com/youtube/v3/channels?part=snippet,contentDetails&mine=true", { headers: { Authorization: "Bearer " + newAccessToken } }));
      const channel = (channelData.items as Json[] | undefined)?.[0];
      if (!channel) throw new Error("Aucune chaîne YouTube n’a été trouvée sur ce compte.");
      accountId = text(channel.id);
      const snippet = (channel.snippet ?? {}) as Json;
      const details = (channel.contentDetails ?? {}) as Json;
      accountName = text(snippet.title, "YouTube");
      const related = (details.relatedPlaylists ?? {}) as Json;
      const uploads = text(related.uploads);
      const playlist = await readJson(await fetch("https://youtube.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&maxResults=50&playlistId=" + encodeURIComponent(uploads), { headers: { Authorization: "Bearer " + newAccessToken } }));
      const ids = ((playlist.items as Json[] | undefined) ?? []).map((row) => text((row.contentDetails as Json | undefined)?.videoId)).filter(Boolean);
      if (ids.length) {
        const videos = await readJson(await fetch("https://youtube.googleapis.com/youtube/v3/videos?part=snippet&id=" + ids.map(encodeURIComponent).join(","), { headers: { Authorization: "Bearer " + newAccessToken } }));
        discovered = ((videos.items as Json[] | undefined) ?? []).map((video) => {
          const v = (video.snippet ?? {}) as Json;
          const thumbs = (v.thumbnails ?? {}) as Json;
          const thumb = (thumbs.maxres ?? thumbs.high ?? thumbs.medium ?? thumbs.default ?? {}) as Json;
          return { external_id: text(video.id), title: text(v.title, "Vidéo YouTube"), description: text(v.description), creator_name: text(v.channelTitle, accountName ?? "YouTube"), source_url: "https://www.youtube.com/watch?v=" + text(video.id), embed_url: "https://www.youtube-nocookie.com/embed/" + text(video.id), thumbnail_url: safeUrl(thumb.url, ""), published_at: isoFromSeconds(v.publishedAt) ?? (typeof v.publishedAt === "string" ? v.publishedAt : null), content_type: "video" };
        });
      }
    } else if (platform === "tiktok") {
      const profile = await readJson(await fetch("https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name,username", { headers: { Authorization: "Bearer " + newAccessToken } }));
      const user = ((profile.data as Json | undefined)?.user ?? {}) as Json;
      accountId = text(user.open_id, accountId ?? "");
      accountName = text(user.display_name || user.username, accountName ?? "TikTok");
      const videoData = await readJson(await fetch("https://open.tiktokapis.com/v2/video/list/?fields=id,title,video_description,create_time,cover_image_url,share_url,embed_link", { method: "POST", headers: { Authorization: "Bearer " + newAccessToken, "Content-Type": "application/json" }, body: JSON.stringify({ max_count: 20 }) }));
      discovered = (((videoData.data as Json | undefined)?.videos as Json[] | undefined) ?? []).map((video) => {
        const id = text(video.id);
        return { external_id: id, title: text(video.title || video.video_description, "Vidéo TikTok"), description: text(video.video_description), creator_name: accountName, source_url: safeUrl(video.share_url, "https://www.tiktok.com/player/v1/" + id), embed_url: safeUrl(video.embed_link, "https://www.tiktok.com/player/v1/" + id), thumbnail_url: safeUrl(video.cover_image_url, ""), published_at: isoFromSeconds(video.create_time), content_type: "video" };
      });
    } else {
      const pages = await readJson(await fetch("https://graph.facebook.com/" + GRAPH_VERSION + "/me/accounts?fields=id,name,access_token,instagram_business_account{id,username}&access_token=" + encodeURIComponent(newAccessToken)));
      const pageRows = (pages.data as Json[] | undefined) ?? [];
      const page = pageRows.find((row) => Boolean(row.instagram_business_account));
      if (!page) throw new Error("Aucun compte Instagram professionnel/créateur relié à une Page Facebook n’a été trouvé. Vérifiez le type du compte et ses autorisations.");
      const ig = (page.instagram_business_account ?? {}) as Json;
      const igId = text(ig.id);
      const pageToken = text(page.access_token, newAccessToken);
      accountId = igId;
      accountName = text(ig.username, text(page.name, "Instagram"));
      const media = await readJson(await fetch("https://graph.facebook.com/" + GRAPH_VERSION + "/" + encodeURIComponent(igId) + "/media?fields=id,caption,media_type,permalink,thumbnail_url,timestamp,username&limit=50&access_token=" + encodeURIComponent(pageToken)));
      discovered = (((media.data as Json[] | undefined) ?? []).filter((item) => ["VIDEO", "REELS"].includes(text(item.media_type).toUpperCase()))).map((item) => {
        const permalink = safeUrl(item.permalink, "https://www.instagram.com/");
        return { external_id: text(item.id), title: text(item.caption).slice(0, 240) || "Vidéo Instagram", description: text(item.caption), creator_name: text(item.username, accountName ?? "Instagram"), source_url: permalink, embed_url: permalink.replace(/\/?$/, "/") + "embed/", thumbnail_url: safeUrl(item.thumbnail_url, ""), published_at: typeof item.timestamp === "string" ? item.timestamp : null, content_type: "video" };
      });
    }

    let imported = 0;
    for (const item of discovered) {
      const externalId = text(item.external_id);
      if (!externalId) continue;
      const record = {
        owner_id: userId, platform, external_id: externalId, title: text(item.title, "Média"),
        description: text(item.description) || null, creator_name: text(item.creator_name, accountName ?? platform),
        source_url: text(item.source_url), embed_url: text(item.embed_url), thumbnail_url: text(item.thumbnail_url) || null,
        published_at: typeof item.published_at === "string" ? item.published_at : null,
        content_type: text(item.content_type, "video"), visibility: "private", sync_source: platform + "_api",
        provider_metadata: { synced_at: new Date().toISOString() },
      };
      const { error: upsertError } = await admin.from("media_library_items").upsert(record, { onConflict: "owner_id,platform,external_id" });
      if (upsertError) throw upsertError;
      imported++;
    }

    await admin.from("media_provider_connections").update({ provider_user_id: accountId, account_name: accountName, access_token: newAccessToken, refresh_token: newRefreshToken, token_expires_at: tokenExpiry, last_synced_at: new Date().toISOString(), last_sync_error: null }).eq("owner_id", userId).eq("platform", platform);
    await admin.from("media_sync_jobs").update({ status: "completed", discovered_count: discovered.length, imported_count: imported, finished_at: new Date().toISOString() }).eq("id", job.id);
    return json({ success: true, platform, account_name: accountName, discovered: discovered.length, imported, message: discovered.length ? "Synchronisation terminée. Les médias sont enregistrés dans votre vidéothèque." : "Aucun nouveau média vidéo compatible trouvé sur ce compte." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur inconnue pendant la synchronisation.";
    await admin.from("media_provider_connections").update({ last_sync_error: message }).eq("owner_id", userId).eq("platform", platform);
    await admin.from("media_sync_jobs").update({ status: "failed", error_message: message.slice(0, 1000), finished_at: new Date().toISOString() }).eq("id", job.id);
    return json({ error: message }, 502);
  }
});
