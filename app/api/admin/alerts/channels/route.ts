import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "../_auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const err = await requireAuth();
  if (err) return err;
  const { data, error } = await createAdminClient()
    .from("alert_channels")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const err = await requireAuth();
  if (err) return err;
  const body = await request.json();
  const { name, type, config, enabled } = body;
  const validTypes = ["webhook", "feishu", "dingtalk", "pushplus"];
  if (!name || !type || !validTypes.includes(type)) {
    return NextResponse.json({ error: "name、type 必填，type 须为合法渠道类型" }, { status: 400 });
  }
  if (type === "pushplus") {
    if (!config?.token) return NextResponse.json({ error: "PushPlus 渠道需填写 token" }, { status: 400 });
  } else {
    if (!config?.url) return NextResponse.json({ error: "该渠道类型需填写 URL" }, { status: 400 });
  }
  const { data, error } = await createAdminClient()
    .from("alert_channels")
    .insert({ name, type, config, enabled: enabled ?? true })
    .select("id")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
