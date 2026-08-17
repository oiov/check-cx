"use client";

import {useCallback, useEffect, useMemo, useRef, useState} from "react";
import {Activity, ExternalLink, RefreshCcw} from "lucide-react";

import {GroupTags} from "@/components/group-tags";
import {ProviderCard} from "@/components/provider-card";
import {StatusSummary} from "@/components/status-summary";
import {ClientTime} from "@/components/client-time";
import {fetchGroupWithCache, prefetchGroupData, setGroupCache} from "@/lib/core/group-frontend-cache";
import type {AvailabilityPeriod, ProviderTimeline} from "@/lib/types";
import type {GroupDashboardData} from "@/lib/core/group-data";
import {cn} from "@/lib/utils";

interface GroupDashboardViewProps {
  groupName: string;
  initialData: GroupDashboardData;
}

/** 计算所有 Provider 中最近一次检查的时间戳（毫秒） */
const getLatestCheckTimestamp = (timelines: ProviderTimeline[]) => {
  const timestamps = timelines.map((timeline) =>
    new Date(timeline.latest.checkedAt).getTime()
  );
  return timestamps.length > 0 ? Math.max(...timestamps) : null;
};

const computeRemainingMs = (
  pollIntervalMs: number | null | undefined,
  latestCheckTimestamp: number | null,
  clock: number = Date.now()
) => {
  if (!pollIntervalMs || pollIntervalMs <= 0 || latestCheckTimestamp === null) {
    return null;
  }
  const remaining = pollIntervalMs - (clock - latestCheckTimestamp);
  return Math.max(0, remaining);
};

const PERIOD_OPTIONS: Array<{ value: AvailabilityPeriod; label: string }> = [
  { value: "7d", label: "7 天" },
  { value: "15d", label: "15 天" },
  { value: "30d", label: "30 天" },
];

/**
 * 分组 Dashboard 视图
 * - 展示单个分组内的所有 Provider 卡片
 * - 支持客户端定时刷新
 */
export function GroupDashboardView({ groupName, initialData }: GroupDashboardViewProps) {
  const [data, setData] = useState(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState<AvailabilityPeriod>(
    initialData.trendPeriod ?? "7d"
  );
  const [isRefreshing, setIsRefreshing] = useState(false);
  const lockRef = useRef(false);
  const [timeToNextRefresh, setTimeToNextRefresh] = useState<number | null>(() =>
    computeRemainingMs(
      initialData.pollIntervalMs,
      getLatestCheckTimestamp(initialData.providerTimelines),
      initialData.generatedAt
    )
  );
  const latestCheckTimestamp = useMemo(
    () => getLatestCheckTimestamp(data.providerTimelines),
    [data.providerTimelines]
  );

  const refresh = useCallback(
    async (
      period?: AvailabilityPeriod,
      forceFresh?: boolean,
      revalidateIfFresh?: boolean
    ) => {
    if (lockRef.current) {
      return;
    }
    lockRef.current = true;
    setIsRefreshing(true);
    try {
      const targetPeriod = period ?? selectedPeriod;
      const result = await fetchGroupWithCache({
        groupName,
        trendPeriod: targetPeriod,
        forceFresh,
        revalidateIfFresh,
        onBackgroundUpdate: (newData) => {
          setData(newData);
        },
      });
      setData(result.data);
    } catch (error) {
      console.error("[check-cx] 分组自动刷新失败", error);
    } finally {
      setIsRefreshing(false);
      lockRef.current = false;
    }
  }, [groupName, selectedPeriod]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setData(initialData);
      if (initialData.trendPeriod) {
        setGroupCache(groupName, initialData.trendPeriod, initialData);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [groupName, initialData]);

  useEffect(() => {
    const currentPeriod = data.trendPeriod ?? "7d";
    prefetchGroupData(groupName, ["7d", "15d", "30d"], currentPeriod).catch(() => undefined);
  }, [data.trendPeriod, groupName]);

  useEffect(() => {
    if (!data.pollIntervalMs || data.pollIntervalMs <= 0) {
      return;
    }
    const timer = window.setInterval(() => {
      refresh(undefined, false, true).catch(() => undefined);
    }, data.pollIntervalMs);
    return () => window.clearInterval(timer);
  }, [data.pollIntervalMs, refresh]);

  useEffect(() => {
    if (selectedPeriod === data.trendPeriod) {
      return;
    }
    const frame = window.requestAnimationFrame(() => {
      refresh(selectedPeriod).catch(() => undefined);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [data.trendPeriod, refresh, selectedPeriod]);

  useEffect(() => {
    if (!data.pollIntervalMs || data.pollIntervalMs <= 0 || latestCheckTimestamp === null) {
      const frame = window.requestAnimationFrame(() => {
        setTimeToNextRefresh(null);
      });
      return () => window.cancelAnimationFrame(frame);
    }

    const updateCountdown = () => {
      setTimeToNextRefresh(
        computeRemainingMs(data.pollIntervalMs, latestCheckTimestamp)
      );
    };

    const frame = window.requestAnimationFrame(updateCountdown);
    const countdownTimer = window.setInterval(updateCountdown, 1000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(countdownTimer);
    };
  }, [data.pollIntervalMs, latestCheckTimestamp]);

  const { providerTimelines, total, lastUpdated, pollIntervalLabel, displayName } = data;
  const { availabilityStats } = data;

  // 根据卡片数量决定宽屏列数
  const gridColsClass = useMemo(() => {
    if (total > 4) {
      return "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";
    }
    return "grid-cols-1 md:grid-cols-2";
  }, [total]);

  // 计算状态统计
  const statusSummary = useMemo(() => {
    const counts = { operational: 0, degraded: 0, failed: 0, validation_failed: 0, maintenance: 0, error: 0 };
    for (const timeline of providerTimelines) {
      const status = timeline.latest.status;
      if (status in counts) {
        counts[status as keyof typeof counts]++;
      }
    }
    return counts;
  }, [providerTimelines]);

  return (
    <div className="relative">
      <header className="mb-6 space-y-3 sm:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {displayName}
              </h1>
              <GroupTags tags={data.tags} />
              {data.websiteUrl && (
                <a
                  href={data.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <StatusSummary counts={statusSummary} />
              <span className="text-xs text-muted-foreground/60">|</span>
              <span className="text-xs text-muted-foreground">{total} 个配置</span>
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 sm:w-auto">
            <div className="flex flex-1 items-center gap-1 rounded-md border bg-background p-0.5 text-xs sm:flex-none">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedPeriod(option.value)}
                  className={cn(
                    "flex-1 whitespace-nowrap rounded px-2 py-1 font-medium transition-colors sm:flex-none",
                    selectedPeriod === option.value
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {lastUpdated && (
              <div className="flex w-full min-w-0 items-center gap-2 text-xs text-muted-foreground sm:w-auto">
                <RefreshCcw className={cn("h-3 w-3 shrink-0", isRefreshing && "animate-spin")} />
                <span className="truncate">
                  <span className="whitespace-nowrap">更新于 <ClientTime value={lastUpdated} /></span>
                  <span className="mx-1.5 opacity-30">|</span>
                  <span className="whitespace-nowrap">{pollIntervalLabel} 轮询</span>
                </span>
                <button
                  type="button"
                  onClick={() => refresh(selectedPeriod, true)}
                  disabled={isRefreshing}
                  className={cn(
                    "ml-auto shrink-0 rounded-lg border px-2.5 py-1 font-medium transition-colors hover:border-foreground/20 hover:text-foreground sm:ml-0",
                    isRefreshing && "cursor-not-allowed opacity-60"
                  )}
                >
                  刷新
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
            <div className="mb-4 rounded-full bg-muted/50 p-4">
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">该分组下暂无配置</h3>
          </div>
      ) : (
        <section className={`grid gap-4 ${gridColsClass}`}>
          {providerTimelines.map((timeline) => (
            <ProviderCard
              key={timeline.id}
              timeline={timeline}
              timeToNextRefresh={timeToNextRefresh}
              availabilityStats={availabilityStats[timeline.id]}
              selectedPeriod={selectedPeriod}
            />
          ))}
        </section>
      )}
    </div>
  );
}
