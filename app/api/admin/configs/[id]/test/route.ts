import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { runChecksForConfigs } from "@/lib/core/config-check-execution";
import { loadProviderConfigsFromDB } from "@/lib/database/config-loader";

interface Context { params: Promise<{ id: string }> }

export async function POST(_: NextRequest, context: Context) {
  if (!(await getAdminClaims())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const config = (await loadProviderConfigsFromDB({ forceRefresh: true })).find((item) => item.id === id);
  if (!config) return NextResponse.json({ error: "配置不存在" }, { status: 404 });
  const [result] = await runChecksForConfigs([config]);
  return NextResponse.json(result);
}
