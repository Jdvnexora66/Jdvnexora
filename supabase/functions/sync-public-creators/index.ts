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

async function syncChannel(admin: ReturnType<typeof createClient>, ownerId: string, channel: Record<string, unknown>) {
  const channelId = String(channel.channel_id ?? "");
  if (!/^UC[a-zA-Z0-9_-]{22}$/.test(channelId)) throw new Error("Identifiant de chaîne YouTube invalide.");
  const response = await fetch("https://www.youtube.com/feeds/videos.xml?channel_id=" + encodeURIComponent(channelId), {
    headers: { "User-Agent": "NEXORA-CreatorCatalog/1.0 (+https://www.youtube.com)" },
  });
  if (!response.ok) throw new Error("Le flux public YouTube est indisponible (HTTP " + response.status + ").");
  const xml = await response.text();
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
    try { parsed = new URL(channelUrl); } catch { return json({ error: "Collez l’URL officielle de la chaîne YouTube au format https://www.youtube.com/channel/UC…" }, 400); }
    const match = parsed.protocol === "https:" && parsed.hostname.replace(/^www\./, "") === "youtube.com"
      ? parsed.pathname.match(/^\/channel\/(UC[a-zA-Z0-9_-]{22})\/?$/) : null;
    if (!match) return json({ error: "Pour vérifier la chaîne sans clé API, utilisez son URL YouTube de type /channel/UC… (les URL @nom nécessitent une résolution supplémentaire)." }, 400);
    const channelId = match[1];
    const { data: existing } = await admin.from("nexora_creator_channels").select("*").eq("owner_id", ownerId).eq("channel_id", channelId).maybeSingle();
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
