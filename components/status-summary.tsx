import {STATUS_META} from "@/lib/core/status";
import type {HealthStatus} from "@/lib/types";
import {cn} from "@/lib/utils";

interface StatusSummaryProps {
  counts: Record<HealthStatus, number>;
  className?: string;
}

const DISPLAY_ORDER: HealthStatus[] = [
  "operational",
  "degraded",
  "validation_failed",
  "failed",
  "error",
  "maintenance",
];

export function StatusSummary({ counts, className }: StatusSummaryProps) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground", className)}>
      {DISPLAY_ORDER.map((status) => {
        const count = counts[status];
        if (count <= 0) {
          return null;
        }
        const meta = STATUS_META[status];
        return (
          <span key={status} className="flex items-center gap-1.5 whitespace-nowrap">
            <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
            {count} {meta.label}
          </span>
        );
      })}
    </div>
  );
}
