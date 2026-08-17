import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { refreshSiteSettings } from "@/lib/core/site-settings";
import { createAdminClient } from "@/lib/supabase/admin";

interface Context { params: Promise<{ key: string }> }
const ALLOWED_KEYS = new Set([
  "check_poll_interval_seconds",
  "degraded_threshold_ms",
  "max_concurrency",
  "history_retention_count",
  "site.title",
  "site.description",
  "site.url",
  "site.keywords",
  "site.logo_url",
  "site.favicon_url",
  "site.github_url",
]);

export async function PATCH(request: NextRequest, context: Context) {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { key } = await context.params;
  const decodedKey = decodeURIComponent(key);
  if (!ALLOWED_KEYS.has(decodedKey)) return NextResponse.json({ error: "不允许编辑此配置项" }, { status: 403 });
  const body = await request.json();
  if (body.value === undefined || body.value === null) return NextResponse.json({ error: "value 必填" }, { status: 400 });
  const { error } = await createAdminClient().from("site_settings").upsert({ key: decodedKey, value: String(body.value) }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await refreshSiteSettings({ force: true });
  return NextResponse.json({ ok: true });
}
