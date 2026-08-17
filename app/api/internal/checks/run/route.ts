import { NextResponse, type NextRequest } from "next/server";

import { runChecksForConfigs } from "@/lib/core/config-check-execution";
import { loadProviderConfigsFromDB } from "@/lib/database/config-loader";
import { touchSchedulerToken, verifySchedulerToken } from "@/lib/database/scheduler-tokens";

export const maxDuration = 300;

function bearerToken(request: NextRequest): string {
  const header = request.headers.get("authorization") ?? "";
  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
}

export async function POST(request: NextRequest) {
  const token = await verifySchedulerToken(bearerToken(request));
  if (!token) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body.ids) ? body.ids.filter((id: unknown): id is string => typeof id === "string" && id.trim().length > 0) : [];
  const allConfigs = await loadProviderConfigsFromDB({ forceRefresh: true });
  const configs = ids.length > 0 ? allConfigs.filter((config) => ids.includes(config.id)) : allConfigs;
  if (ids.length > 0 && configs.length === 0) return NextResponse.json({ error: "未找到指定配置" }, { status: 404 });

  const results = await runChecksForConfigs(configs);
  await touchSchedulerToken(token.id);
  const issues = results.filter((result) => ["failed", "validation_failed", "error"].includes(result.status));
  const payload = {
    ok: issues.length === 0,
    source: "scheduler-token",
    tokenName: token.name,
    total: results.length,
    issueCount: issues.length,
    degradedCount: results.filter((result) => result.status === "degraded").length,
    results: results.map(({ id, name, status, latencyMs, pingLatencyMs, checkedAt, message }) => ({ id, name, status, latencyMs, pingLatencyMs, checkedAt, message })),
  };
  return NextResponse.json(payload, { status: body.failOnIssues === false || issues.length === 0 ? 200 : 503 });
}
