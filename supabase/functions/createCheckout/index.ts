import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import Stripe from "npm:stripe@13";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { apiVersion: "2023-10-16" });
const SUPA_URL = Deno.env.get("SUPA_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPA_SERVICE_KEY")!;
const supa = createClient(SUPA_URL, SUPA_SERVICE_KEY);

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const { plan_code, success_url, cancel_url } = await req.json();

  const { data: plan, error } = await supa.from("plans")
    .select("name, price_cents, code")
    .eq("code", plan_code).single();
  if (error || !plan) return new Response("Plan not found", { status: 400 });

  const isPayg = plan_code === "payg";
  const session = await stripe.checkout.sessions.create({
    mode: isPayg ? "payment" : "subscription",
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "EUR",
        unit_amount: plan.price_cents,
        product_data: { name: plan.name }
      }, quantity: 1
    }],
    success_url: success_url ?? "https://app.maigon.io/dashboard?success=true",
    cancel_url:  cancel_url  ?? "https://app.maigon.io/pricing?canceled=true"
  });

  return new Response(JSON.stringify({ url: session.url }), {
    headers: { "Content-Type": "application/json" }
  });
});
