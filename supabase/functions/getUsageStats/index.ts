import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supa = createClient(Deno.env.get("SUPA_URL")!, Deno.env.get("SUPA_SERVICE_KEY")!);
  const { data: auth } = await supa.auth.getUser(req);
  if (!auth?.user) return new Response("Forbidden", { status: 403 });

  const { from = 30 } = Object.fromEntries(new URL(req.url).searchParams);
  const { data } = await supa.rpc("contracts_per_day", { days_back: Number(from), uid: auth.user.id });
  return new Response(JSON.stringify(data ?? []), { headers: { "Content-Type": "application/json" }});
});
