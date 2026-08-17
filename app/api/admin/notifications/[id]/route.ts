import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface Context { params: Promise<{ id: string }> }
async function authenticated() { return Boolean(await getAdminClaims()); }

export async function PATCH(request: NextRequest, context: Context) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  const update: Record<string, unknown> = {};
  if (typeof body.message === "string") update.message = body.message.trim();
  if (typeof body.is_active === "boolean") update.is_active = body.is_active;
  if (["info", "warning", "error"].includes(body.level)) update.level = body.level;
  const { error } = await createAdminClient().from("system_notifications").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, context: Context) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const { error } = await createAdminClient().from("system_notifications").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
