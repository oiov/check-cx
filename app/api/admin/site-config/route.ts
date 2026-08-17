import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { refreshSiteSettings } from "@/lib/core/site-settings";
import { createAdminClient } from "@/lib/supabase/admin";

const KEYS = ["site.title", "site.description", "site.url", "site.keywords", "site.logo_url", "site.favicon_url", "site.github_url"] as const;

export async function GET() {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient().from("site_settings").select("key,value").in("key", [...KEYS]);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function PUT(request: NextRequest) {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const key = String(body.key ?? "");
  if (!KEYS.includes(key as (typeof KEYS)[number]) || body.value === undefined) return NextResponse.json({ error: "不允许编辑此配置项" }, { status: 400 });
  const { error } = await createAdminClient().from("site_settings").upsert({ key, value: String(body.value) }, { onConflict: "key" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await refreshSiteSettings({ force: true });
  return NextResponse.json({ ok: true });
}
