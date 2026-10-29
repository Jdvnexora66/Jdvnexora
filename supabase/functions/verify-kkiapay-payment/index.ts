import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { kkiapay } from "npm:@kkiapay-org/nodejs-sdk";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
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

  let body: { plan_id?: unknown; transaction_id?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "Requête invalide." }); }
  if (typeof body.plan_id !== "string" || body.plan_id.length > 100) return reply(400, { error: "Forfait invalide." });
  const transactionId = typeof body.transaction_id === "string" ? body.transaction_id.trim() : null;
  if (transactionId && transactionId.length > 200) return reply(400, { error: "Référence de transaction invalide." });

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: plan, error: planError } = await admin.from("plans")
    .select("id,name,active,price_minor,currency,billing_interval,trial_days,features")
    .eq("id", body.plan_id).maybeSingle();
  if (planError || !plan) return reply(404, { error: "Forfait introuvable." });
  if (!plan.active) return reply(409, { error: "Ce forfait n'est plus disponible." });
  if (plan.features?.billing_mode === "quote") return reply(400, { error: "Cette offre nécessite un devis." });

  const isFree = plan.features?.billing_mode === "free" || Number(plan.price_minor) === 0;
  let provider = "free";
  let providerReference: string | null = null;

  if (!isFree) {
    if (!transactionId) return reply(400, { error: "Référence KKIAPAY manquante." });
    if (plan.currency !== "XOF") return reply(400, { error: "Le paiement KKIAPAY doit être en FCFA (XOF)." });
    const publicKey = Deno.env.get("KKIAPAY_PUBLIC_KEY");
    const privateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
    const secretKey = Deno.env.get("KKIAPAY_SECRET_KEY");
    if (!publicKey || !privateKey || !secretKey) return reply(503, { error: "Les clés KKIAPAY doivent être configurées côté serveur." });

    try {
      const gateway = kkiapay({
        publickey: publicKey, privatekey: privateKey, secretkey: secretKey,
        sandbox: Deno.env.get("KKIAPAY_SANDBOX") === "true",
      });
      const tx = await gateway.verify(transactionId);
      if (String(tx?.status ?? "").toUpperCase() !== "SUCCESS"
          || String(tx?.type ?? "").toUpperCase() !== "DEBIT"
          || Number(tx?.amount) !== Number(plan.price_minor)) {
        return reply(402, { error: "La transaction n'est pas confirmée pour le montant exact du forfait." });
      }
      const { data: existing, error: existingError } = await admin.from("subscriptions")
        .select("id,user_id,plan_id,status").eq("provider", "kkiapay")
        .eq("provider_reference", transactionId).maybeSingle();
      if (existingError) return reply(500, { error: "Impossible de vérifier si cette transaction a déjà été utilisée." });
      if (existing) {
        if (existing.user_id === authData.user.id && existing.plan_id === plan.id && existing.status === "active") {
          return reply(200, { verified: true, subscription_id: existing.id, idempotent: true });
        }
        return reply(409, { error: "Cette transaction est déjà associée à un abonnement." });
      }
      provider = "kkiapay";
      providerReference = transactionId;
    } catch (error) {
      console.error("KKIAPAY verification failed", error);
      return reply(502, { error: "La vérification KKIAPAY a échoué. Aucun abonnement n'a été activé." });
    }
  } else if (transactionId) {
    return reply(400, { error: "Un forfait gratuit ne nécessite pas de transaction." });
  }

  const now = new Date();
  const end = plan.billing_interval === "month"
    ? new Date(new Date(now).setMonth(now.getMonth() + 1))
    : plan.billing_interval === "year"
      ? new Date(new Date(now).setFullYear(now.getFullYear() + 1))
      : null;
  const { data: subscription, error: insertError } = await admin.from("subscriptions").insert({
    user_id: authData.user.id, plan_id: plan.id, status: "active",
    starts_at: now.toISOString(), ends_at: end?.toISOString() ?? null,
    provider, provider_reference: providerReference,
  }).select("id,status,starts_at,ends_at").single();
  if (insertError) {
    console.error("Subscription activation failed", insertError);
    return reply(500, { error: "Impossible d'enregistrer l'abonnement. Contactez le support." });
  }
  return reply(200, { verified: true, subscription });
});