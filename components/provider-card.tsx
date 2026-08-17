"use client";

import {AlertTriangle, Radio, Zap} from "lucide-react";

import {ProviderIcon} from "@/components/provider-icon";
import {StatusTimeline} from "@/components/status-timeline";
import {AvailabilityStats} from "@/components/availability-stats";
import {Badge} from "@/components/ui/badge";
import type {AvailabilityPeriod, AvailabilityStat, ProviderTimeline} from "@/lib/types";
import {OFFICIAL_STATUS_META, PROVIDER_LABEL, STATUS_META} from "@/lib/core/status";
import {cn} from "@/lib/utils";

interface ProviderCardProps {
  timeline: ProviderTimeline;
  timeToNextRefresh: number | null;
  availabilityStats?: AvailabilityStat[] | null;
  selectedPeriod: AvailabilityPeriod;
}

const formatLatency = (value: number | null | undefined) =>
  typeof value === "number" ? `${value} ms` : "—";

export function ProviderCard({
  timeline,
  timeToNextRefresh,
  availabilityStats,
  selectedPeriod,
}: ProviderCardProps) {
  const { latest, items } = timeline;
  const preset = STATUS_META[latest.status];
  const isMaintenance = latest.status === "maintenance";
  const officialStatus = latest.officialStatus;
  const officialStatusMeta = officialStatus
    ? OFFICIAL_STATUS_META[officialStatus.status]
    : null;
  const banner = officialStatusMeta?.bannerLabel ? officialStatusMeta : null;

  return (
    <div className={cn(
      "flex flex-col overflow-hidden rounded-xl border bg-card transition-colors hover:border-foreground/20",
      banner && banner.bannerBorder
    )}>
      {banner && officialStatus && (
        <div className={cn(
          "flex items-start gap-2.5 border-b px-4 py-2.5 sm:px-5 sm:py-3",
          banner.bannerBg
        )}>
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold sm:text-sm">
              {banner.bannerLabel}
            </p>
            <p className="mt-0.5 text-[11px] leading-snug opacity-80 sm:text-xs">
              {officialStatus.message || banner.description}
            </p>
            {officialStatus.affectedComponents && officialStatus.affectedComponents.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {officialStatus.affectedComponents.map((c, i) => (
                  <span key={`${c}-${i}`} className="rounded bg-current/10 px-1.5 py-0.5 text-[10px] font-medium">
                    {c}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <div className={cn("flex-1 p-4 sm:p-5", banner && "opacity-60")}>
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-background">
            <ProviderIcon type={latest.type} size={22} className="text-foreground/80" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-mono text-base font-semibold tracking-tight text-foreground">
              {latest.model}
            </h3>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0 font-medium text-foreground/70">
                {PROVIDER_LABEL[latest.type]}
              </span>
              <span className="truncate">{latest.name}</span>
            </div>
          </div>
          <Badge
            className={cn(
              "shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:text-xs",
              preset.badgeClass
            )}
          >
            {preset.label}
          </Badge>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">对话延迟</span>
            </div>
            <div className="mt-1 font-mono text-lg font-medium leading-none text-foreground">
              {formatLatency(latest.latencyMs)}
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Radio className="h-3.5 w-3.5" />
              <span className="text-[10px] font-semibold uppercase tracking-wider">端点 PING</span>
            </div>
            <div className="mt-1 font-mono text-lg font-medium leading-none text-foreground">
              {formatLatency(latest.pingLatencyMs)}
            </div>
          </div>
        </div>

        <div className="border-t pt-4">
          <AvailabilityStats stats={availabilityStats} period={selectedPeriod} isMaintenance={isMaintenance} />
        </div>
      </div>

      <div className="border-t px-4 py-3 sm:px-5">
        <StatusTimeline items={items} nextRefreshInMs={timeToNextRefresh} isMaintenance={isMaintenance} />
      </div>
    </div>
  );
}
