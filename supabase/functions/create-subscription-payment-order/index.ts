import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const appOrigin = Deno.env.get("APP_ORIGIN");
const corsHeaders = {
  "Access-Control-Allow-Origin": appOrigin ?? "*",
  "Vary": "Origin",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const reply = (status: number, payload: Record<string, unknown>) =>
  new Response(JSON.stringify(payload), { status, headers: corsHeaders });

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply(500, { error: "Configuration Supabase serveur manquante." });

  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Connexion requise." });
  const userClient = createClient(url, anon, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return reply(401, { error: "Session invalide." });

  let body: { plan_id?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "Requête invalide." }); }
  if (typeof body.plan_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.plan_id)) {
    return reply(400, { error: "Forfait invalide." });
  }

  const { data: plan, error: planError } = await userClient.from("plans")
    .select("id,name,active,price_minor,currency,billing_interval,trial_days,features")
    .eq("id", body.plan_id).maybeSingle();
  if (planError || !plan) return reply(404, { error: "Forfait introuvable." });
  if (!plan.active) return reply(409, { error: "Ce forfait n'est plus disponible." });
  if (plan.features?.billing_mode === "quote") return reply(400, { error: "Cette offre nécessite un devis." });
  if (plan.features?.billing_mode === "free" || Number(plan.price_minor) === 0) {
    return reply(400, { error: "Ce forfait est gratuit ; utilisez l'activation gratuite." });
  }
  if (plan.currency !== "XOF" || !Number.isSafeInteger(Number(plan.price_minor)) || Number(plan.price_minor) <= 0) {
    return reply(400, { error: "Ce forfait n'est pas payable via KKIAPAY en FCFA." });
  }

  const publicKey = Deno.env.get("KKIAPAY_PUBLIC_KEY");
  const privateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
  const secretKey = Deno.env.get("KKIAPAY_SECRET_KEY");
  if (!publicKey || !privateKey || !secretKey) {
    return reply(503, { error: "Le paiement KKIAPAY n'est pas configuré côté serveur. Aucun paiement ne sera lancé." });
  }

  return reply(200, {
    plan_id: plan.id,
    amount_xof: Number(plan.price_minor),
    currency: plan.currency,
    provider_mode: Deno.env.get("KKIAPAY_SANDBOX") === "true" ? "sandbox" : "live",
    public_key: publicKey,
    billing_interval: plan.billing_interval,
    trial_days: plan.trial_days,
  });
});
