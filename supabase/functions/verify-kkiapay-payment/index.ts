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

async function repairCourseEnrollment(admin: ReturnType<typeof createClient>, order: {
  id: string; course_id: string; user_id: string; enrollment_id: string;
}, transactionId: string) {
  const { data: enrollment, error: enrollmentReadError } = await admin.from("nexora_course_enrollments")
    .select("id,status").eq("id", order.enrollment_id).eq("user_id", order.user_id).maybeSingle();
  if (enrollmentReadError || !enrollment) return reply(500, { error: "Paiement confirmé, mais l'inscription doit être finalisée. Réessayez." });
  if (enrollment.status !== "active") {
    const { error: activationError } = await admin.from("nexora_course_enrollments").update({
      status: "active", enrolled_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    }).eq("id", order.enrollment_id).eq("user_id", order.user_id);
    if (activationError) {
      console.error("Course enrollment activation failed", activationError);
      return reply(500, { error: "Paiement confirmé ; réessayez pour finaliser votre accès à la formation." });
    }
  }
  return reply(200, { verified: true, order_id: order.id, course_id: order.course_id, enrollment_id: order.enrollment_id, idempotent: true });
}

async function verifyCourseOrder(
  admin: ReturnType<typeof createClient>,
  userId: string,
  orderId: string,
  transactionId: string | null,
) {
  if (!transactionId) return reply(400, { error: "Référence KKIAPAY manquante." });
  const { data: order, error: orderError } = await admin.from("nexora_course_payment_orders")
    .select("id,course_id,user_id,enrollment_id,provider_mode,amount_xof,currency,status,provider_reference")
    .eq("id", orderId).eq("user_id", userId).maybeSingle();
  if (orderError || !order) return reply(404, { error: "Commande de formation introuvable." });

  if (order.status === "succeeded") {
    if (order.provider_reference !== transactionId) return reply(409, { error: "Cette commande a déjà été réglée avec une autre transaction." });
    return await repairCourseEnrollment(admin, order, transactionId);
  }
  if (order.status !== "pending" && order.status !== "verification_required") {
    return reply(409, { error: "Cette commande n'est plus payable. Créez une nouvelle commande." });
  }

  const sandbox = Deno.env.get("KKIAPAY_SANDBOX") === "true";
  const providerMode = sandbox ? "sandbox" : "live";
  if (order.provider_mode !== providerMode) {
    return reply(409, { error: "Le mode KKIAPAY a changé depuis la création de cette commande. Préparez une nouvelle commande." });
  }
  if (order.currency !== "XOF" || !Number.isSafeInteger(Number(order.amount_xof)) || Number(order.amount_xof) <= 0) {
    return reply(400, { error: "Montant ou devise de commande invalide." });
  }

  const { data: course, error: courseError } = await admin.from("nexora_courses")
    .select("id,status,price_xof,currency").eq("id", order.course_id).maybeSingle();
  if (courseError || !course || course.status !== "published") return reply(409, { error: "Cette formation n'est plus disponible." });
  if (course.currency !== "XOF" || Number(course.price_xof) !== Number(order.amount_xof)) {
    return reply(409, { error: "Le tarif de la formation a changé. Préparez une nouvelle commande." });
  }

  if (order.status === "verification_required" && order.provider_reference && order.provider_reference !== transactionId) {
    return reply(409, { error: "Cette commande attend déjà la vérification d'une autre transaction." });
  }
  const { data: verificationLock, error: lockError } = await admin.from("nexora_course_payment_orders")
    .update({ status: "verification_required", provider_reference: transactionId, updated_at: new Date().toISOString() })
    .eq("id", order.id).eq("user_id", userId).in("status", ["pending", "verification_required"])
    .select("id").maybeSingle();
  if (lockError) {
    if (lockError.code === "23505") return reply(409, { error: "Cette transaction est déjà utilisée." });
    return reply(500, { error: "Impossible d'enregistrer la vérification du paiement." });
  }
  if (!verificationLock) return reply(409, { error: "La commande a changé pendant la vérification. Actualisez puis réessayez." });

  const publicKey = Deno.env.get("KKIAPAY_PUBLIC_KEY");
  const privateKey = Deno.env.get("KKIAPAY_PRIVATE_KEY");
  const secretKey = Deno.env.get("KKIAPAY_SECRET_KEY");
  if (!publicKey || !privateKey || !secretKey) return reply(503, { error: "Les clés KKIAPAY doivent être configurées côté serveur." });

  try {
    const gateway = kkiapay({ publickey: publicKey, privatekey: privateKey, secretkey: secretKey, sandbox });
    const tx = await gateway.verify(transactionId);
    const txRecord = tx as unknown as Record<string, unknown>;
    const txStatus = String(txRecord?.status ?? "").toUpperCase();
    const txCurrency = String(txRecord?.currency ?? txRecord?.currency_code ?? "XOF").toUpperCase();
    if (txStatus !== "SUCCESS") {
      if (["FAILED", "CANCELLED", "CANCELED", "EXPIRED"].includes(txStatus)) {
        await admin.from("nexora_course_payment_orders").update({ status: "failed", provider_reference: null, updated_at: new Date().toISOString() })
          .eq("id", order.id).eq("status", "verification_required");
      }
      return reply(402, { error: "La transaction KKIAPAY n'est pas encore confirmée." });
    }
    if (String(txRecord?.type ?? "").toUpperCase() !== "DEBIT"
        || Number(txRecord?.amount) !== Number(order.amount_xof)
        || txCurrency !== "XOF") {
      return reply(402, { error: "La transaction n'est pas confirmée pour le montant exact de cette formation en FCFA." });
    }

    const [{ data: usedSubscription, error: subscriptionCheckError }, { data: usedOrder, error: orderCheckError }] = await Promise.all([
      admin.from("subscriptions").select("id").eq("provider", "kkiapay").eq("provider_reference", transactionId).maybeSingle(),
      admin.from("nexora_course_payment_orders").select("id,status").eq("provider_reference", transactionId).maybeSingle(),
    ]);
    if (subscriptionCheckError || orderCheckError) return reply(500, { error: "Impossible de vérifier l'utilisation de cette transaction." });
    if (usedSubscription || (usedOrder && usedOrder.id !== order.id)) {
      await admin.from("nexora_course_payment_orders").update({ status: "pending", provider_reference: null, updated_at: new Date().toISOString() })
        .eq("id", order.id).eq("status", "verification_required");
      return reply(409, { error: usedSubscription ? "Cette transaction est déjà utilisée pour un abonnement." : "Cette transaction est déjà associée à une autre formation." });
    }

    const now = new Date().toISOString();
    const { data: updatedOrder, error: updateOrderError } = await admin.from("nexora_course_payment_orders")
      .update({ status: "succeeded", provider_reference: transactionId, provider_mode: providerMode, verified_at: now, updated_at: now })
      .eq("id", order.id).eq("status", "verification_required")
      .select("id").maybeSingle();
    if (updateOrderError) {
      console.error("Course payment order verification update failed", updateOrderError);
      if (updateOrderError.code === "23505") return reply(409, { error: "Cette transaction a déjà été utilisée." });
      return reply(500, { error: "La transaction est vérifiée, mais son enregistrement a échoué. Réessayez." });
    }
    if (!updatedOrder) {
      const { data: latestOrder } = await admin.from("nexora_course_payment_orders")
        .select("id,course_id,user_id,enrollment_id,status,provider_reference")
        .eq("id", order.id).eq("user_id", userId).maybeSingle();
      if (latestOrder?.status === "succeeded" && latestOrder.provider_reference === transactionId) {
        return await repairCourseEnrollment(admin, latestOrder, transactionId);
      }
      return reply(409, { error: "La commande a changé pendant la vérification. Actualisez puis réessayez." });
    }

    const { error: enrollmentError } = await admin.from("nexora_course_enrollments").update({
      status: "active", enrolled_at: now, updated_at: now,
    }).eq("id", order.enrollment_id).eq("user_id", userId);
    if (enrollmentError) {
      console.error("Course enrollment activation pending after verified payment", enrollmentError);
      return reply(500, { error: "Paiement confirmé ; réessayez pour finaliser votre accès à la formation." });
    }
    return reply(200, { verified: true, order_id: order.id, course_id: order.course_id, enrollment_id: order.enrollment_id });
  } catch (error) {
    console.error("KKIAPAY course verification failed", error);
    return reply(502, { error: "La vérification KKIAPAY a échoué. Aucun accès payant n'a été activé." });
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return reply(405, { error: "Méthode non autorisée." });

  const url = Deno.env.get("SUPABASE_URL");
  const anon = Deno.env.get("SUPABASE_ANON_KEY");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !anon || !service) return reply(500, { error: "Configuration Supabase serveur manquante." });
  const authorization = req.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer ")) return reply(401, { error: "Connexion requise." });
  const userClient = createClient(url, anon, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return reply(401, { error: "Session invalide." });

  let body: { plan_id?: unknown; course_order_id?: unknown; transaction_id?: unknown };
  try { body = await req.json(); } catch { return reply(400, { error: "Requête invalide." }); }
  const transactionId = typeof body.transaction_id === "string" ? body.transaction_id.trim() : null;
  if (transactionId && transactionId.length > 200) return reply(400, { error: "Référence de transaction invalide." });
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });

  if (typeof body.course_order_id === "string") {
    if (body.plan_id !== undefined) return reply(400, { error: "Une seule cible de paiement est autorisée." });
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.course_order_id)) return reply(400, { error: "Commande de formation invalide." });
    return await verifyCourseOrder(admin, authData.user.id, body.course_order_id, transactionId);
  }

  if (typeof body.plan_id !== "string" || body.plan_id.length > 100) return reply(400, { error: "Forfait invalide." });
  const { data: plan, error: planError } = await admin.from("plans")
    .select("id,name,active,price_minor,currency,billing_interval,trial_days,features")
    .eq("id", body.plan_id).maybeSingle();
  if (planError || !plan) return reply(404, { error: "Forfait introuvable." });
  if (!plan.active) return reply(409, { error: "Ce forfait n'est plus disponible." });
  if (plan.features?.billing_mode === "quote") return reply(400, { error: "Cette offre nécessite un devis." });

  const isFree = plan.features?.billing_mode === "free" || Number(plan.price_minor) === 0;
  if (isFree) {
    const { data: activeFree, error: activeFreeError } = await admin.from("subscriptions")
      .select("id,status").eq("user_id", authData.user.id).eq("plan_id", plan.id)
      .in("status", ["active", "trialing"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (activeFreeError) return reply(500, { error: "Impossible de vérifier votre activation gratuite." });
    if (activeFree) return reply(200, { verified: true, subscription_id: activeFree.id, idempotent: true });
  }
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
      const gateway = kkiapay({ publickey: publicKey, privatekey: privateKey, secretkey: secretKey, sandbox: Deno.env.get("KKIAPAY_SANDBOX") === "true" });
      const tx = await gateway.verify(transactionId);
      const txRecord = tx as unknown as Record<string, unknown>;
      const txCurrency = String(txRecord?.currency ?? txRecord?.currency_code ?? "XOF").toUpperCase();
      if (String(txRecord?.status ?? "").toUpperCase() !== "SUCCESS"
          || String(txRecord?.type ?? "").toUpperCase() !== "DEBIT"
          || Number(txRecord?.amount) !== Number(plan.price_minor)
          || txCurrency !== "XOF") return reply(402, { error: "La transaction n'est pas confirmée pour le montant exact du forfait en FCFA." });
      const [{ data: existing, error: existingError }, { data: usedCourseOrder, error: courseOrderCheckError }] = await Promise.all([
        admin.from("subscriptions").select("id,user_id,plan_id,status").eq("provider", "kkiapay").eq("provider_reference", transactionId).maybeSingle(),
        admin.from("nexora_course_payment_orders").select("id").eq("provider_reference", transactionId).maybeSingle(),
      ]);
      if (existingError || courseOrderCheckError) return reply(500, { error: "Impossible de vérifier si cette transaction a déjà été utilisée." });
      if (usedCourseOrder) return reply(409, { error: "Cette transaction est déjà associée à une formation." });
      if (existing) {
        if (existing.user_id === authData.user.id && existing.plan_id === plan.id && existing.status === "active") return reply(200, { verified: true, subscription_id: existing.id, idempotent: true });
        return reply(409, { error: "Cette transaction est déjà associée à un abonnement." });
      }
      provider = "kkiapay";
      providerReference = transactionId;
    } catch (error) {
      console.error("KKIAPAY verification failed", error);
      return reply(502, { error: "La vérification KKIAPAY a échoué. Aucun abonnement n'a été activé." });
    }
  } else if (transactionId) return reply(400, { error: "Un forfait gratuit ne nécessite pas de transaction." });

  const now = new Date();
  const end = plan.billing_interval === "month" ? new Date(new Date(now).setMonth(now.getMonth() + 1)) : plan.billing_interval === "year" ? new Date(new Date(now).setFullYear(now.getFullYear() + 1)) : null;
  const { data: subscription, error: insertError } = await admin.from("subscriptions").insert({
    user_id: authData.user.id, plan_id: plan.id, status: "active", starts_at: now.toISOString(),
    ends_at: end?.toISOString() ?? null, provider, provider_reference: providerReference,
  }).select("id,status,starts_at,ends_at").single();
  if (insertError) {
    if (insertError.code === "23505" && providerReference) {
      const { data: duplicate } = await admin.from("subscriptions")
        .select("id,user_id,plan_id,status").eq("provider", "kkiapay").eq("provider_reference", providerReference).maybeSingle();
      if (duplicate?.user_id === authData.user.id && duplicate.plan_id === plan.id && duplicate.status === "active") {
        return reply(200, { verified: true, subscription_id: duplicate.id, idempotent: true });
      }
      return reply(409, { error: "Cette transaction KKIAPAY a déjà été utilisée." });
    }
    console.error("Subscription activation failed", insertError);
    return reply(500, { error: "Impossible d'enregistrer l'abonnement. Contactez le support." });
  }
  return reply(200, { verified: true, subscription });
});
