import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://hilarious-cheesecake-2520ca.netlify.app",
  "Access-Control-Allow-Headers": "content-type, x-kkiapay-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function constantTimeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const aa = enc.encode(a);
  const bb = enc.encode(b);
  if (aa.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return response(405, { error: "method_not_allowed" });

  const expectedSecret = Deno.env.get("KKIAPAY_WEBHOOK_SECRET_HASH");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!expectedSecret || !supabaseUrl || !serviceRoleKey) {
    console.error("KKiaPay webhook is not configured");
    return response(503, { error: "webhook_not_configured" });
  }

  const suppliedSecret = req.headers.get("x-kkiapay-secret") ?? "";
  if (!constantTimeEqual(suppliedSecret, expectedSecret)) {
    return response(401, { error: "invalid_webhook_signature" });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return response(400, { error: "invalid_json" });
  }

  const transactionId = typeof payload.transactionId === "string" ? payload.transactionId.trim() : "";
  const eventType = typeof payload.event === "string" ? payload.event : "";
  const isSuccessEvent = eventType === "transaction.success" && payload.isPaymentSucces === true;
  const isFailureEvent = eventType === "transaction.failed" && payload.isPaymentSucces === false;
  const amount = Number(payload.amount);

  if (!transactionId || !["transaction.success", "transaction.failed"].includes(eventType)
      || (!isSuccessEvent && !isFailureEvent) || !Number.isFinite(amount) || amount <= 0) {
    return response(400, { error: "invalid_event_payload" });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Inbox only: a valid webhook header is not sufficient to activate an entitlement.
  // A later server-side KKiaPay transaction verification must confirm transaction ID,
  // amount, currency and partner/order reference before any subscription is activated.
  const { error } = await supabase.from("payment_webhook_events").upsert({
    provider: "kkiapay",
    transaction_id: transactionId,
    event_type: eventType,
    signature_verified: true,
    payload,
  }, { onConflict: "provider,transaction_id,event_type", ignoreDuplicates: true });

  if (error) {
    console.error("Failed to persist KKiaPay webhook event", error.message);
    return response(500, { error: "event_persistence_failed" });
  }

  return response(202, {
    received: true,
    verification: "required",
    subscription_activated: false,
  });
});
