import { loadProviderConfigsFromDB } from "../database/config-loader";
import type { CheckResult, HealthStatus } from "../types";
import { runChecksForConfigs } from "./config-check-execution";
import { getLastPingStartedAt, setLastPingStartedAt, setPollerRunning } from "./global-state";
import { ensurePollerLeadership, isPollerLeader } from "./poller-leadership";
import { refreshSiteSettings } from "./site-settings";

export interface PollExecutionOptions {
  forceRefreshConfigs?: boolean;
  skipLeadership?: boolean;
  source?: string;
}

export interface PollExecutionResult {
  executed: boolean;
  reason: string;
  source: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  totalConfigs: number;
  checkedConfigs: number;
  statusCounts: Record<HealthStatus, number>;
}

function emptyStatusCounts(): Record<HealthStatus, number> {
  return {
    operational: 0,
    degraded: 0,
    failed: 0,
    validation_failed: 0,
    maintenance: 0,
    error: 0,
  };
}

function skippedResult(
  source: string,
  reason: string,
  startedAt: number,
  totalConfigs = 0
): PollExecutionResult {
  const finishedAt = Date.now();
  return {
    executed: false,
    reason,
    source,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    totalConfigs,
    checkedConfigs: 0,
    statusCounts: emptyStatusCounts(),
  };
}

function completedResult(
  source: string,
  startedAt: number,
  totalConfigs: number,
  results: CheckResult[]
): PollExecutionResult {
  const finishedAt = Date.now();
  const statusCounts = emptyStatusCounts();
  for (const result of results) {
    statusCounts[result.status] += 1;
  }
  return {
    executed: true,
    reason: "检测完成",
    source,
    startedAt: new Date(startedAt).toISOString(),
    finishedAt: new Date(finishedAt).toISOString(),
    durationMs: finishedAt - startedAt,
    totalConfigs,
    checkedConfigs: results.length,
    statusCounts,
  };
}

export async function runPollExecution(
  options: PollExecutionOptions = {}
): Promise<PollExecutionResult> {
  const source = options.source ?? "background";
  await refreshSiteSettings().catch(() => undefined);
  const startedAt = Date.now();

  if (!options.skipLeadership) {
    try {
      await ensurePollerLeadership();
    } catch (error) {
      console.error("[check-cx] 主节点选举失败，跳过本轮检测", error);
      return skippedResult(source, "主节点选举失败", startedAt);
    }
    if (!isPollerLeader()) {
      return skippedResult(source, "当前节点不是 leader", startedAt);
    }
  }

  if (globalThis.__checkCxPollerRunning) {
    const previousStartedAt = getLastPingStartedAt();
    const duration = previousStartedAt ? Date.now() - previousStartedAt : null;
    return skippedResult(
      source,
      duration == null ? "上一轮检测仍在执行" : `上一轮检测仍在执行（已耗时 ${duration}ms）`,
      startedAt
    );
  }

  globalThis.__checkCxPollerRunning = true;
  setPollerRunning(true);
  setLastPingStartedAt(startedAt);

  try {
    const allConfigs = await loadProviderConfigsFromDB({
      forceRefresh: options.forceRefreshConfigs,
    });
    const activeConfigs = allConfigs.filter((config) => !config.is_maintenance);
    if (activeConfigs.length === 0) {
      return skippedResult(source, "没有可执行的启用配置", startedAt, allConfigs.length);
    }

    const results = await runChecksForConfigs(activeConfigs);
    return completedResult(source, startedAt, allConfigs.length, results);
  } catch (error) {
    console.error("[check-cx] 执行检测失败", error);
    return skippedResult(source, "执行检测失败", startedAt);
  } finally {
    globalThis.__checkCxPollerRunning = false;
    setPollerRunning(false);
  }
}
