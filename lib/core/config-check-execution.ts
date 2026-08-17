import { clearAvailabilityStatsCache } from "@/lib/database/availability";
import { historySnapshotStore } from "@/lib/database/history";
import { runProviderChecks } from "@/lib/providers";
import type { CheckResult, ProviderConfig } from "@/lib/types";

import { clearDashboardDataCache } from "./dashboard-data";
import { clearGroupDashboardCache } from "./group-data";
import { clearPingCache } from "./global-state";

export async function runChecksForConfigs(
  configs: ProviderConfig[]
): Promise<CheckResult[]> {
  const activeConfigs = configs.filter((config) => !config.is_maintenance);
  if (activeConfigs.length === 0) {
    return [];
  }

  const results = await runProviderChecks(activeConfigs);
  await historySnapshotStore.append(results);

  clearPingCache();
  clearDashboardDataCache();
  clearGroupDashboardCache();
  clearAvailabilityStatsCache();

  return results;
}
