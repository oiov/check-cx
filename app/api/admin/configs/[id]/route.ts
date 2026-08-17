import { NextResponse, type NextRequest } from "next/server";

import { clearAvailabilityStatsCache } from "@/lib/database/availability";
import { clearDashboardDataCache } from "@/lib/core/dashboard-data";
import { clearGroupDashboardCache } from "@/lib/core/group-data";
import { clearPingCache } from "@/lib/core/global-state";
import { getAdminClaims } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

function clearCaches() {
  clearPingCache();
  clearDashboardDataCache();
  clearGroupDashboardCache();
  clearAvailabilityStatsCache();
}

async function authenticated() {
  return Boolean(await getAdminClaims());
}

interface Context { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const allowed = ["enabled", "is_maintenance", "group_name"] as const;
  const update: Record<string, unknown> = {};
  for (const key of allowed) if (key in body) update[key] = body[key];
  if (!Object.keys(update).length) return NextResponse.json({ error: "没有可更新字段" }, { status: 400 });
  const { error } = await createAdminClient().from("check_configs").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearCaches();
  return NextResponse.json({ ok: true });
}

export async function PUT(request: NextRequest, context: Context) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const update: Record<string, unknown> = {
    name: String(body.name ?? "").trim(),
    endpoint: String(body.endpoint ?? "").trim(),
    enabled: body.enabled !== false,
    is_maintenance: body.is_maintenance === true,
    group_name: body.group_name ? String(body.group_name).trim() : null,
    request_header: body.request_header && typeof body.request_header === "object" ? body.request_header : null,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : null,
    stream_mode: body.stream_mode === "generate" ? "generate" : "stream",
  };
  if (typeof body.api_key === "string" && body.api_key.trim() && !body.api_key.startsWith("****")) {
    update.api_key = body.api_key.trim();
  }
  const admin = createAdminClient();
  if (body.model) {
    const type = String(body.type ?? "");
    const { data: model, error: modelError } = await admin
      .from("check_models")
      .upsert({ type, model: String(body.model).trim() }, { onConflict: "type,model" })
      .select("id")
      .single();
    if (modelError || !model) return NextResponse.json({ error: modelError?.message ?? "模型更新失败" }, { status: 500 });
    update.model_id = model.id;
    update.model = String(body.model).trim();
    update.type = type;
  }
  const { error } = await admin.from("check_configs").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearCaches();
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, context: Context) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await createAdminClient().from("check_configs").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearCaches();
  return NextResponse.json({ ok: true });
}
