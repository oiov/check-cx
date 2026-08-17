"use client";

import {STATUS_META} from "@/lib/core/status";
import type {AvailabilityPeriod, AvailabilityStat} from "@/lib/types";
import {cn} from "@/lib/utils";

interface AvailabilityStatsProps {
  stats?: AvailabilityStat[] | null;
  period: AvailabilityPeriod;
  isMaintenance?: boolean;
}

const PERIOD_LABELS: Record<AvailabilityPeriod, string> = {
  "7d": "7 天",
  "15d": "15 天",
  "30d": "30 天",
};

function getAvailabilityColorClass(pct: number | null | undefined) {
  if (pct === null || pct === undefined) {
    return "text-muted-foreground";
  }
  if (pct >= 99) {
    return "text-emerald-600 dark:text-emerald-400";
  }
  if (pct >= 95) {
    return "text-amber-600 dark:text-amber-400";
  }
  return "text-red-600 dark:text-red-400";
}

export function AvailabilityStats({ stats, period, isMaintenance }: AvailabilityStatsProps) {
  const current = stats?.find((item) => item.period === period);
  const pct = current?.availabilityPct ?? null;
  const pctLabel = pct === null ? "—" : `${pct.toFixed(2)}%`;

  // 维护模式下的特殊展示：色板只读 STATUS_META.maintenance
  if (isMaintenance) {
    const meta = STATUS_META.maintenance;
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border border-dashed px-3 py-2",
          meta.badgeClass
        )}
      >
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider">
            可用性 ({PERIOD_LABELS[period]})
          </p>
          <p className="text-[10px] opacity-70">
            {current
              ? `维护前 ${current.operationalCount}/${current.totalChecks} 成功`
              : "维护中 · 已暂停统计"}
          </p>
        </div>
        <span className="font-mono text-sm font-bold">
          {pctLabel}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
      <div className="space-y-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          可用性 ({PERIOD_LABELS[period]})
        </p>
        <p className="text-[10px] text-muted-foreground">
          {current
            ? `${current.operationalCount}/${current.totalChecks} 成功`
            : "暂无数据"}
        </p>
      </div>
      <span className={cn("font-mono text-sm font-bold", getAvailabilityColorClass(pct))}>
        {pctLabel}
      </span>
    </div>
  );
}
