import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
  const supa = createClient(Deno.env.get("SUPA_URL")!, Deno.env.get("SUPA_SERVICE_KEY")!);
  const body = await req.json(); // { user_id, name, price_cents, quota }

  // TODO: admin guard
  const { data: plan } = await supa.from("plans").insert({
    code: `custom_${crypto.randomUUID().slice(0,8)}`,
    name: body.name,
    price_cents: body.price_cents,
    monthly_quota: body.quota ?? null
  }).select("*").single();

  await supa.from("subscriptions").insert({
    user_id: body.user_id,
    plan_id: plan.id,
    status: "active",
    current_period_start: new Date().toISOString(),
    current_period_end: new Date(Date.now()+30*24*3600*1000).toISOString()
  });

  return new Response(JSON.stringify(plan), { headers: { "Content-Type": "application/json" }});
});
