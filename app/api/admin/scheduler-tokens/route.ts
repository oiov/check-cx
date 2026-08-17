import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { createSchedulerToken, listSchedulerTokens } from "@/lib/database/scheduler-tokens";

export async function GET() {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json(await listSchedulerTokens()); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "读取 Token 失败" }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const name = String((await request.json()).name ?? "").trim();
  if (!name) return NextResponse.json({ error: "name 不能为空" }, { status: 400 });
  try { return NextResponse.json(await createSchedulerToken(name), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "创建 Token 失败" }, { status: 500 }); }
}
