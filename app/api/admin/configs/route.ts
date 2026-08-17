import { NextResponse, type NextRequest } from "next/server";

import { clearPingCache } from "@/lib/core/global-state";
import { clearDashboardDataCache } from "@/lib/core/dashboard-data";
import { clearGroupDashboardCache } from "@/lib/core/group-data";
import { clearAvailabilityStatsCache } from "@/lib/database/availability";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAdminClaims } from "@/lib/admin/auth";
import type { ProviderType } from "@/lib/types";

const PROVIDERS: ProviderType[] = ["openai", "gemini", "anthropic"];

function maskKey(key: string): string {
  return `****${key.slice(-4)}`;
}

function clearCaches() {
  clearPingCache();
  clearDashboardDataCache();
  clearGroupDashboardCache();
  clearAvailabilityStatsCache();
}

async function requireAuth() {
  return Boolean(await getAdminClaims());
}

export async function GET() {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("check_configs")
    .select("id,name,type,model,endpoint,api_key,enabled,is_maintenance,group_name,request_header,metadata,stream_mode,created_at,updated_at,model_row:check_models(model)")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json((data ?? []).map((row) => {
    const modelRow = (row as { model_row?: { model?: string } | Array<{ model?: string }> | null }).model_row;
    const model = Array.isArray(modelRow) ? modelRow[0]?.model : modelRow?.model;
    return { ...row, model: model ?? (row as { model?: string }).model ?? "", api_key: maskKey(row.api_key) };
  }));
}

async function parseConfig(request: NextRequest) {
  const body = await request.json();
  const type = String(body.type ?? "") as ProviderType;
  const model = String(body.model ?? "").trim();
  const name = String(body.name ?? "").trim();
  const endpoint = String(body.endpoint ?? "").trim();
  if (!name || !model || !endpoint || !PROVIDERS.includes(type)) {
    return { error: "name、type、model、endpoint 必填且 type 必须受支持" } as const;
  }
  return {
    value: {
      name,
      type,
      model,
      endpoint,
      api_key: typeof body.api_key === "string" ? body.api_key : "",
      enabled: body.enabled !== false,
      is_maintenance: body.is_maintenance === true,
      group_name: body.group_name ? String(body.group_name).trim() : null,
      request_header: body.request_header && typeof body.request_header === "object" ? body.request_header : null,
      metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : null,
      stream_mode: body.stream_mode === "generate" ? "generate" : "stream",
    },
  } as const;
}

export async function POST(request: NextRequest) {
  if (!(await requireAuth())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const parsed = await parseConfig(request);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!parsed.value.api_key) return NextResponse.json({ error: "api_key 必填" }, { status: 400 });

  const admin = createAdminClient();
  const { data: model, error: modelError } = await admin
    .from("check_models")
    .upsert({ type: parsed.value.type, model: parsed.value.model }, { onConflict: "type,model" })
    .select("id")
    .single();
  if (modelError || !model) return NextResponse.json({ error: modelError?.message ?? "模型创建失败" }, { status: 500 });

  const { data, error } = await admin
    .from("check_configs")
    .insert({ ...parsed.value, model_id: model.id })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  clearCaches();
  return NextResponse.json({ id: data.id }, { status: 201 });
}
