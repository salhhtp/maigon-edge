import Stripe from "npm:stripe@13";
import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const endpointSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supa = createClient(Deno.env.get("SUPA_URL")!, Deno.env.get("SUPA_SERVICE_KEY")!);

serve(async (req) => {
  const sig = req.headers.get("stripe-signature")!;
  const payload = await req.text();
  let event;
  try { event = stripe.webhooks.constructEvent(payload, sig, endpointSecret); }
  catch { return new Response("Bad signature", { status: 400 }); }

  if (event.type === "checkout.session.completed") {
    const s: any = event.data.object;
    const email = s.customer_details?.email;
    if (email) {
      // Minimal user lookup by email; adapt if you store Stripe IDs
      const { data: user } = await supa.from("auth.users").select("id, email").eq("email", email).maybeSingle();
      if (user) {
        // Attach active subscription (trial logic handled by UI/plan choices)
        const { data: plan } = await supa.from("plans").select("id").eq("name", s?.display_items?.[0]?.custom?.name ?? "Pay-as-you-go").maybeSingle();
        if (plan) {
          await supa.from("subscriptions").upsert({
            user_id: user.id,
            plan_id: plan.id,
            status: "active",
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now()+30*24*3600*1000).toISOString()
          }, { onConflict: "user_id" });
        }
      }
    }
  }

  if (event.type.startsWith("invoice.")) {
    const inv: any = event.data.object;
    await supa.from("billing_events").insert({
      user_id: null,
      event_type: event.type,
      amount_cents: inv.amount_paid ?? 0,
      raw: inv
    });
  }

  return new Response("ok");
});
