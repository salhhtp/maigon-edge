import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPA_URL = Deno.env.get("SUPA_URL")!;
const SUPA_SERVICE_KEY = Deno.env.get("SUPA_SERVICE_KEY")!;

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const supa = createClient(SUPA_URL, SUPA_SERVICE_KEY);
  const { data: auth } = await supa.auth.getUser(req);
  if (!auth?.user) return new Response("Forbidden", { status: 403 });

  const { service_id, file_path } = await req.json();

  // Optional: quota guard (reads the user’s active subscription)
  const { data: sub } = await supa.from("subscriptions")
    .select("id, usage_this_period, plan:plan_id(monthly_quota)")
    .eq("user_id", auth.user.id).maybeSingle();

  if (sub?.plan?.monthly_quota && sub.usage_this_period >= sub.plan.monthly_quota) {
    return new Response(JSON.stringify({ error: "Quota exceeded" }), { status: 402 });
  }

  // Create request row
  const { data: [reqRow], error: insErr } = await supa.from("requests")
    .insert({
      user_id: auth.user.id,
      service_id,
      subscription_id: sub?.id ?? null,
      file_path,
      status: "queued"
    })
    .select("*");

  if (insErr) return new Response(insErr.message, { status: 400 });

  // Lookup target model URL
  const { data: svc } = await supa.from("services").select("api_url").eq("id", service_id).single();

  // Fire-and-forget to GPU container
  fetch(svc!.api_url!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ request_id: reqRow.id, file_path })
  }).catch(console.error);

  // Increment usage best-effort
  if (sub?.id) {
    await supa.from("subscriptions")
      .update({ usage_this_period: (sub.usage_this_period ?? 0) + 1 })
      .eq("id", sub.id);
  }

  return new Response(JSON.stringify({ request_id: reqRow.id }), {
    headers: { "Content-Type": "application/json" }
  });
});
