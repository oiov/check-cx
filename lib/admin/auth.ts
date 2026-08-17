import "server-only";

import { createClient } from "@/lib/supabase/server";

export async function getAdminClaims() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims ?? null;
}
