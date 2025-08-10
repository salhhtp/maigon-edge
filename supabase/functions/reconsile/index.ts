import { serve } from "https://deno.land/x/sift@0.6.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
serve(async () => {
  const s = createClient(Deno.env.get("SUPA_URL")!, Deno.env.get("SUPA_SERVICE_KEY")!);
  await s.from("requests")
    .update({ status:"error", result_json:{ error:"Timeout" } })
    .lt("created_at", new Date(Date.now()-30*60*1000).toISOString())
    .in("status", ["queued","running"]);
  await s.from("requests").delete().lt("ttl_at", new Date().toISOString());
  return new Response("ok");
});
