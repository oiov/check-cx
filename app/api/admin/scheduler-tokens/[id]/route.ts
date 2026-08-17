import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { deleteSchedulerToken, setSchedulerTokenEnabled } from "@/lib/database/scheduler-tokens";

interface Context { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, context: Context) {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const body = await request.json();
  if (typeof body.enabled !== "boolean") return NextResponse.json({ error: "enabled 必须为布尔值" }, { status: 400 });
  try { await setSchedulerTokenEnabled(id, body.enabled); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "更新失败" }, { status: 500 }); }
}

export async function DELETE(_: NextRequest, context: Context) {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  try { await deleteSchedulerToken(id); return NextResponse.json({ ok: true }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "删除失败" }, { status: 500 }); }
}
