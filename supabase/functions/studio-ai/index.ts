import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
  if (req.method !== "POST") return respond({ error: "Méthode non autorisée." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const authorization = req.headers.get("Authorization");
  if (!supabaseUrl || !anonKey || !authorization) return respond({ error: "Authentification requise." }, 401);

  const authClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authorization } } });
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  if (authError || !user) return respond({ error: "Session invalide. Reconnectez-vous." }, 401);

  let body: { prompt?: unknown; history?: unknown };
  try { body = await req.json(); } catch { return respond({ error: "Corps JSON invalide." }, 400); }
  if (typeof body.prompt !== "string" || !body.prompt.trim() || body.prompt.length > 8000) {
    return respond({ error: "La demande doit contenir entre 1 et 8000 caractères." }, 400);
  }

  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) return respond({ error: "Configuration incomplète : ajoutez OPENAI_API_KEY aux secrets Supabase pour activer les réponses IA." }, 503);

  const history = Array.isArray(body.history) ? body.history.slice(-8).filter((item: any) =>
    item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string"
  ).map((item: any) => ({ role: item.role, content: item.content.slice(0, 8000) })) : [];
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini",
        messages: [
          { role: "system", content: "Tu es l’assistant de création de JDV NEXORA. Réponds en français par défaut, de façon pratique, structurée et honnête. N’invente pas de faits et signale les incertitudes." },
          ...history,
          { role: "user", content: body.prompt.trim() },
        ],
        max_tokens: 1800,
      }),
    });
    const result = await response.json();
    if (!response.ok) return respond({ error: response.status === 429 ? "Limite de requêtes IA atteinte. Réessayez plus tard." : "Le fournisseur IA a refusé la demande. Vérifiez la configuration du service." }, response.status === 429 ? 429 : 502);
    const text = result?.choices?.[0]?.message?.content;
    if (typeof text !== "string" || !text.trim()) return respond({ error: "Aucune réponse IA disponible." }, 502);
    return respond({ text });
  } catch {
    return respond({ error: "Impossible de joindre le service IA pour le moment." }, 502);
  }
});
