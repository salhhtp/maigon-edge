import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supa = createClient(Deno.env.get("SUPA_URL")!, Deno.env.get("SUPA_SERVICE_KEY")!);
  const { data: auth } = await supa.auth.getUser(req);
  if (!auth?.user) return new Response("Forbidden", { status: 403 });

  // TODO: enforce admin role in JWT if you add it
  const { data: byPlan } = await supa.from("subscriptions")
    .select("plan:plan_id(code), count:id")
    .group("plan.code");
  const { data: byDay } = await supa.from("requests")
    .select("count:id, created_at")
    .gte("created_at", new Date(Date.now()-30*86400000).toISOString());

  return new Response(JSON.stringify({ byPlan, byDay }), { headers: { "Content-Type": "application/json" }});
});
