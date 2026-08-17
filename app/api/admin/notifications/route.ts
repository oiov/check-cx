import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function authenticated() { return Boolean(await getAdminClaims()); }

export async function GET() {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient().from("system_notifications").select("*").order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const message = String(body.message ?? "").trim();
  if (!message) return NextResponse.json({ error: "message 必填" }, { status: 400 });
  const { data, error } = await createAdminClient().from("system_notifications").insert({
    message,
    level: body.level === "warning" || body.level === "error" ? body.level : "info",
    is_active: body.is_active !== false,
  }).select("id").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ id: data.id }, { status: 201 });
}
