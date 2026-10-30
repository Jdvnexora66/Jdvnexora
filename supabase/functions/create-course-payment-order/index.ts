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

  let body: { course_id?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "Requête invalide." }); }
  if (typeof body.course_id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.course_id)) {
    return reply(400, { error: "Formation invalide." });
  }

  const publicKey = Deno.env.get("KKIAPAY_PUBLIC_KEY");
  const privateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
  const secretKey = Deno.env.get("KKIAPAY_SECRET_KEY");
  if (!publicKey || !privateKey || !secretKey) {
    return reply(503, { error: "Le paiement sécurisé n'est pas configuré côté serveur. Aucun paiement ne sera lancé." });
  }

  const { data: orderData, error: orderError } = await userClient.rpc("nexora_create_course_payment_order", {
    p_course_id: body.course_id,
  });
  if (orderError) {
    const message = orderError.message ?? "";
    if (message.includes("course_not_available")) return reply(404, { error: "Cette formation n'est plus disponible." });
    if (message.includes("course_is_free")) return reply(400, { error: "Cette formation est gratuite ; utilisez l'inscription gratuite." });
    if (message.includes("authentication_required")) return reply(401, { error: "Connexion requise." });
    console.error("Course payment order RPC failed", orderError);
    return reply(400, { error: "Impossible de préparer la commande de formation." });
  }

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  if (orderData?.already_enrolled) {
    return reply(200, { already_enrolled: true, course_id: body.course_id });
  }
  if (orderData?.already_paid) {
    const { data: enrollment, error: enrollmentError } = await admin.from("nexora_course_enrollments")
      .select("id,status").eq("course_id", body.course_id).eq("user_id", authData.user.id).maybeSingle();
    if (enrollmentError || !enrollment) return reply(500, { error: "Paiement enregistré, mais inscription introuvable. Contactez le support." });
    if (enrollment.status !== "active") {
      const { error: repairError } = await admin.from("nexora_course_enrollments").update({
        status: "active", enrolled_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("id", enrollment.id).eq("user_id", authData.user.id);
      if (repairError) return reply(500, { error: "Paiement enregistré ; réessayez pour finaliser votre accès à la formation." });
    }
    return reply(200, { already_enrolled: true, already_paid: true, course_id: body.course_id });
  }

  const orderId = typeof orderData?.order_id === "string" ? orderData.order_id : "";
  const amount = Number(orderData?.amount_xof);
  if (!orderId || !Number.isSafeInteger(amount) || amount <= 0 || orderData?.currency !== "XOF") {
    return reply(500, { error: "La commande de paiement retournée par le serveur est invalide." });
  }

  const sandbox = Deno.env.get("KKIAPAY_SANDBOX") === "true";
  const providerMode = sandbox ? "sandbox" : "live";
  const orderFields = "id,course_id,enrollment_id,amount_xof,currency,provider_mode,status,provider_reference";
  type PaymentOrder = { id:string; course_id:string; enrollment_id:string; amount_xof:number; currency:string; provider_mode:"sandbox"|"live"; status:string; provider_reference:string|null };
  let order: PaymentOrder | null = null;
  let updateError: { message:string } | null = null;
  if (orderData?.status === "verification_required") {
    const result = await admin.from("nexora_course_payment_orders")
      .select(orderFields).eq("id", orderId).eq("user_id", authData.user.id)
      .eq("status", "verification_required").single();
    order = result.data as PaymentOrder | null;
    updateError = result.error;
  } else {
    const result = await admin.from("nexora_course_payment_orders")
      .update({ provider_mode: providerMode, updated_at: new Date().toISOString() })
      .eq("id", orderId).eq("user_id", authData.user.id).eq("status", "pending")
      .select(orderFields).single();
    order = result.data as PaymentOrder | null;
    updateError = result.error;
    if (updateError || !order) {
      const latest = await admin.from("nexora_course_payment_orders")
        .select(orderFields).eq("id", orderId).eq("user_id", authData.user.id).maybeSingle();
      if (latest.data?.status === "verification_required") {
        order = latest.data as PaymentOrder;
        updateError = null;
      }
    }
  }
  if (updateError || !order) {
    console.error("Course payment order preparation failed", updateError);
    return reply(500, { error: "Impossible de préparer le paiement. Réessayez." });
  }

  if (order.status === "verification_required" && order.provider_reference) {
    return reply(200, { verification_required: true, order_id: order.id, course_id: order.course_id, enrollment_id: order.enrollment_id, amount_xof: Number(order.amount_xof), currency: order.currency, provider_mode: order.provider_mode, transaction_id: order.provider_reference });
  }

  return reply(200, {
    order_id: order.id,
    course_id: order.course_id,
    enrollment_id: order.enrollment_id,
    amount_xof: Number(order.amount_xof),
    currency: order.currency,
    provider_mode: order.provider_mode,
    provider_reference: order.provider_reference,
    public_key: publicKey,
    payment_started: false,
  });
});
