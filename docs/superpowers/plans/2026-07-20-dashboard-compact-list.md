# Dashboard Compact List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the public Dashboard UI as a slim toolbar + collapsible group rows + expandable provider status tables using shadcn/ui, without changing API or polling behavior.

**Architecture:** Keep all data fetching, caching, localStorage keys, and DnD logic in `dashboard-view.tsx` / `group-dashboard-view.tsx`. Extract presentation into focused components (`DashboardToolbar`, `GroupListPanel`, `ProviderStatusTable` / `Row` / `Details`). Replace glassmorphic cards with Table + Collapsible + Alert composition.

**Tech Stack:** Next.js 16 App Router, React client components, shadcn/ui (radix-mira), Tailwind v4, lucide-react, @dnd-kit, existing Supabase-backed dashboard APIs.

**Spec:** `docs/superpowers/specs/2026-07-20-dashboard-compact-list-design.md`

## Global Constraints

- Do **not** change API routes, poller, schema, cache keys, or response types
- Keep localStorage keys: `check-cx-group-order`, `check-cx-sort-mode`, `check-cx-selected-tags`
- Keep shadcn preset (mira + amber); do not re-init or apply a new preset
- Prefer semantic tokens (`bg-card`, `text-muted-foreground`); no new raw palette systems
- Spacing: `flex` + `gap-*` only (no `space-y-*` / `space-x-*` in new code)
- Install UI primitives via `pnpm dlx shadcn@latest add ...` only
- Project has **no unit test runner** — each task verifies with `pnpm lint` (and `pnpm build` on integration tasks) plus listed manual checks
- Default Server Components; `"use client"` only where hooks/events are required
- Import order: Node → third-party → `@/` aliases

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `components/ui/*` | shadcn primitives (CLI-managed) |
| `components/dashboard-toolbar.tsx` | Shared toolbar UI (home + group variants) |
| `components/group-list-panel.tsx` | Collapsible group header + status summary + DnD handle slot |
| `components/provider-status-table.tsx` | Table shell + maps timelines to rows |
| `components/provider-status-row.tsx` | Single model row + expand toggle |
| `components/provider-row-details.tsx` | Expanded: official Alert, availability, timeline |
| `components/dashboard-view.tsx` | Home data shell: poll, filter, sort, DnD, compose children |
| `components/group-dashboard-view.tsx` | Group page data shell; reuse table/toolbar |
| `components/dashboard-skeleton.tsx` | Loading skeleton matching new layout |
| `components/notification-banner.tsx` | Alert-based system notification strip |
| `components/status-timeline.tsx` | Existing timeline; minor layout class tweaks only |
| `components/availability-stats.tsx` | Compact table-cell + expanded detail modes |
| `components/provider-card.tsx` | **Delete** after migration |
| `lib/core/status.ts` | Unchanged STATUS_META / OFFICIAL_STATUS_META / PROVIDER_LABEL |
| `lib/utils/status-summary.ts` | Pure helpers: global health badge, group status counts |

---

### Task 1: Install shadcn primitives + status helpers

**Files:**
- Create: `lib/utils/status-summary.ts`
- Create/overwrite via CLI: `components/ui/alert.tsx`, `input.tsx`, `toggle-group.tsx`, `separator.tsx`, `skeleton.tsx`, `tooltip.tsx`, `scroll-area.tsx` (and `spinner.tsx` / `empty.tsx` if offered by registry)
- Modify: none of business components yet

**Interfaces:**
- Consumes: `HealthStatus` from `@/lib/types`, `STATUS_META` from `@/lib/core/status`
- Produces:
  - `countStatuses(statuses: HealthStatus[]): StatusCounts`
  - `getGlobalHealth(statuses: HealthStatus[]): { label: string; variant: "default" | "secondary" | "destructive" }`
  - `type StatusCounts = { operational: number; degraded: number; failed: number; validation_failed: number; maintenance: number; error: number }`

- [ ] **Step 1: Install components**

```bash
cd /home/ziyou/project/check-cx
pnpm dlx shadcn@latest add alert input toggle-group separator skeleton tooltip scroll-area -y
# If available without error, also:
pnpm dlx shadcn@latest add spinner empty -y || true
```

Expected: files appear under `components/ui/`; `components.json` unchanged style (`radix-mira`).

- [ ] **Step 2: Add pure status helpers**

Create `lib/utils/status-summary.ts`:

```ts
import type { HealthStatus } from "@/lib/types";

export type StatusCounts = {
  operational: number;
  degraded: number;
  failed: number;
  validation_failed: number;
  maintenance: number;
  error: number;
};

export function emptyStatusCounts(): StatusCounts {
  return {
    operational: 0,
    degraded: 0,
    failed: 0,
    validation_failed: 0,
    maintenance: 0,
    error: 0,
  };
}

export function countStatuses(statuses: HealthStatus[]): StatusCounts {
  const counts = emptyStatusCounts();
  for (const status of statuses) {
    if (status in counts) {
      counts[status as keyof StatusCounts] += 1;
    }
  }
  return counts;
}

/** Spec §4.1 global health rules */
export function getGlobalHealth(statuses: HealthStatus[]): {
  label: string;
  variant: "default" | "secondary" | "destructive";
} {
  if (statuses.length === 0) {
    return { label: "无数据", variant: "secondary" };
  }
  const hasHardFailure = statuses.some((s) =>
    s === "failed" || s === "validation_failed" || s === "error"
  );
  if (hasHardFailure) {
    return { label: "存在异常", variant: "destructive" };
  }
  const hasDegraded = statuses.some((s) => s === "degraded");
  if (hasDegraded) {
    return { label: "部分延迟", variant: "secondary" };
  }
  return { label: "运行正常", variant: "default" };
}
```

- [ ] **Step 3: Export helper from utils barrel if present**

If `lib/utils/index.ts` re-exports utilities, add:

```ts
export * from "./status-summary";
```

Do not break existing `cn` export.

- [ ] **Step 4: Verify**

```bash
pnpm lint
```

Expected: no errors related to new files.

- [ ] **Step 5: Commit**

```bash
git add components/ui lib/utils/status-summary.ts lib/utils/index.ts components.json package.json pnpm-lock.yaml
git commit -m "chore(ui): add shadcn primitives and status summary helpers"
```

---

### Task 2: `AvailabilityStats` compact modes

**Files:**
- Modify: `components/availability-stats.tsx`

**Interfaces:**
- Consumes: existing `AvailabilityStat`, `AvailabilityPeriod`
- Produces: `AvailabilityStats` with prop `mode?: "block" | "inline"` (default `"block"` for expanded detail; `"inline"` for table cell)

- [ ] **Step 1: Read current file and extend API**

Replace the single layout with two modes. Keep maintenance copy and `getAvailabilityColorStyle` logic.

```tsx
"use client";

import type { AvailabilityPeriod, AvailabilityStat } from "@/lib/types";
import { cn } from "@/lib/utils";

interface AvailabilityStatsProps {
  stats?: AvailabilityStat[] | null;
  period: AvailabilityPeriod;
  isMaintenance?: boolean;
  /** block = expanded detail; inline = table cell single value */
  mode?: "block" | "inline";
  className?: string;
}

const PERIOD_LABELS: Record<AvailabilityPeriod, string> = {
  "7d": "7 天",
  "15d": "15 天",
  "30d": "30 天",
};

function getAvailabilityColorStyle(pct: number | null | undefined) {
  if (pct === null || pct === undefined) return undefined;
  const clamped = Math.max(0, Math.min(100, pct));
  const hue = (clamped / 100) * 120;
  return { color: `hsl(${hue} 80% 45%)` };
}

export function AvailabilityStats({
  stats,
  period,
  isMaintenance,
  mode = "block",
  className,
}: AvailabilityStatsProps) {
  const current = stats?.find((item) => item.period === period);
  const pct = current?.availabilityPct ?? null;
  const pctLabel = pct === null ? "—" : `${pct.toFixed(2)}%`;

  if (mode === "inline") {
    return (
      <span
        className={cn("font-mono text-xs tabular-nums", className)}
        style={isMaintenance ? undefined : getAvailabilityColorStyle(pct)}
      >
        {pctLabel}
      </span>
    );
  }

  if (isMaintenance) {
    return (
      <div
        className={cn(
          "flex items-center justify-between rounded-lg border border-dashed border-blue-500/30 bg-blue-500/5 px-3 py-2",
          className
        )}
      >
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-500">
            可用性 ({PERIOD_LABELS[period]})
          </p>
          <p className="text-[10px] text-blue-500/70">
            {current
              ? `维护前 ${current.operationalCount}/${current.totalChecks} 成功`
              : "维护中 · 已暂停统计"}
          </p>
        </div>
        <span className="font-mono text-sm font-bold text-blue-500">{pctLabel}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2",
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          可用性 ({PERIOD_LABELS[period]})
        </p>
        <p className="text-[10px] text-muted-foreground">
          {current
            ? `${current.operationalCount}/${current.totalChecks} 次成功`
            : "暂无统计"}
        </p>
      </div>
      <span
        className="font-mono text-sm font-bold"
        style={getAvailabilityColorStyle(pct)}
      >
        {pctLabel}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

Expected: pass. Existing `ProviderCard` still uses default `block` mode.

- [ ] **Step 3: Commit**

```bash
git add components/availability-stats.tsx
git commit -m "feat(ui): support inline availability stats for table cells"
```

---

### Task 3: Provider table row + details + table shell

**Files:**
- Create: `components/provider-row-details.tsx`
- Create: `components/provider-status-row.tsx`
- Create: `components/provider-status-table.tsx`

**Interfaces:**
- Consumes:
  - `ProviderTimeline`, `AvailabilityPeriod`, `AvailabilityStat[]` from `@/lib/types`
  - `STATUS_META`, `OFFICIAL_STATUS_META`, `PROVIDER_LABEL` from `@/lib/core/status`
  - `AvailabilityStats`, `StatusTimeline`, `ProviderIcon`, `Badge`, `Table*`, `Alert*`, `Button`, `Collapsible` optional
- Produces:
  - `ProviderStatusTable({ timelines, availabilityStats, selectedPeriod, timeToNextRefresh, modelFilter? })`
  - `ProviderStatusRow` / `ProviderRowDetails` may stay unexported if only used by table

- [ ] **Step 1: Create `provider-row-details.tsx`**

```tsx
"use client";

import { AlertTriangle } from "lucide-react";

import { AvailabilityStats } from "@/components/availability-stats";
import { StatusTimeline } from "@/components/status-timeline";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { OFFICIAL_STATUS_META } from "@/lib/core/status";
import type { AvailabilityPeriod, AvailabilityStat, ProviderTimeline } from "@/lib/types";

interface ProviderRowDetailsProps {
  timeline: ProviderTimeline;
  availabilityStats?: AvailabilityStat[] | null;
  selectedPeriod: AvailabilityPeriod;
  timeToNextRefresh: number | null;
}

export function ProviderRowDetails({
  timeline,
  availabilityStats,
  selectedPeriod,
  timeToNextRefresh,
}: ProviderRowDetailsProps) {
  const { latest, items } = timeline;
  const isMaintenance = latest.status === "maintenance";
  const official = latest.officialStatus;
  const officialMeta = official ? OFFICIAL_STATUS_META[official.status] : null;
  const showOfficial = Boolean(officialMeta?.bannerLabel && official);

  return (
    <div className="flex flex-col gap-4 bg-muted/20 px-3 py-4 sm:px-4">
      {showOfficial && official && officialMeta && (
        <Alert className={officialMeta.bannerBg}>
          <AlertTriangle />
          <AlertTitle>{officialMeta.bannerLabel}</AlertTitle>
          <AlertDescription>
            <p>{official.message || officialMeta.description}</p>
            {official.affectedComponents && official.affectedComponents.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {official.affectedComponents.map((c, i) => (
                  <Badge key={`${c}-${i}`} variant="outline">
                    {c}
                  </Badge>
                ))}
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <AvailabilityStats
        stats={availabilityStats}
        period={selectedPeriod}
        isMaintenance={isMaintenance}
        mode="block"
      />

      <StatusTimeline
        items={items}
        nextRefreshInMs={timeToNextRefresh}
        isMaintenance={isMaintenance}
      />
    </div>
  );
}
```

Adjust `Alert` className usage after reading installed `alert.tsx` API — prefer variants if available; only pass layout classes.

- [ ] **Step 2: Create `provider-status-row.tsx`**

```tsx
"use client";

import { useState } from "react";
import { AlertTriangle, ChevronRight } from "lucide-react";

import { AvailabilityStats } from "@/components/availability-stats";
import { ProviderIcon } from "@/components/provider-icon";
import { ProviderRowDetails } from "@/components/provider-row-details";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { PROVIDER_LABEL, STATUS_META, OFFICIAL_STATUS_META } from "@/lib/core/status";
import type { AvailabilityPeriod, AvailabilityStat, ProviderTimeline } from "@/lib/types";
import { cn } from "@/lib/utils";

const formatLatency = (value: number | null | undefined) =>
  typeof value === "number" ? `${value} ms` : "—";

interface ProviderStatusRowProps {
  timeline: ProviderTimeline;
  availabilityStats?: AvailabilityStat[] | null;
  selectedPeriod: AvailabilityPeriod;
  timeToNextRefresh: number | null;
}

export function ProviderStatusRow({
  timeline,
  availabilityStats,
  selectedPeriod,
  timeToNextRefresh,
}: ProviderStatusRowProps) {
  const [open, setOpen] = useState(false);
  const { latest } = timeline;
  const preset = STATUS_META[latest.status];
  const official = latest.officialStatus;
  const officialMeta = official ? OFFICIAL_STATUS_META[official.status] : null;
  const hasOfficialIssue = Boolean(officialMeta?.bannerLabel);

  return (
    <>
      <TableRow
        className="cursor-pointer"
        data-state={open ? "selected" : undefined}
        onClick={() => setOpen((v) => !v)}
      >
        <TableCell className="w-8">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-expanded={open}
            aria-label={open ? "收起详情" : "展开详情"}
            onClick={(e) => {
              e.stopPropagation();
              setOpen((v) => !v);
            }}
          >
            <ChevronRight
              className={cn("transition-transform", open && "rotate-90")}
            />
          </Button>
        </TableCell>
        <TableCell>
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate font-medium text-foreground">{latest.name}</span>
            <span className="truncate font-mono text-[10px] text-muted-foreground">
              {latest.model}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1.5">
            <ProviderIcon type={latest.type} size={14} />
            <span className="text-xs text-muted-foreground">
              {PROVIDER_LABEL[latest.type]}
            </span>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant={preset.badge}>{preset.label}</Badge>
        </TableCell>
        <TableCell className="font-mono text-xs tabular-nums">
          {formatLatency(latest.latencyMs)}
        </TableCell>
        <TableCell className="hidden font-mono text-xs tabular-nums md:table-cell">
          {formatLatency(latest.pingLatencyMs)}
        </TableCell>
        <TableCell className="hidden md:table-cell">
          <AvailabilityStats
            stats={availabilityStats}
            period={selectedPeriod}
            isMaintenance={latest.status === "maintenance"}
            mode="inline"
          />
        </TableCell>
        <TableCell className="w-8">
          {hasOfficialIssue ? (
            <AlertTriangle className="size-3.5 text-amber-600 dark:text-amber-400" />
          ) : null}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={8} className="p-0">
            <ProviderRowDetails
              timeline={timeline}
              availabilityStats={availabilityStats}
              selectedPeriod={selectedPeriod}
              timeToNextRefresh={timeToNextRefresh}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
```

- [ ] **Step 3: Create `provider-status-table.tsx`**

```tsx
"use client";

import { ProviderStatusRow } from "@/components/provider-status-row";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  AvailabilityPeriod,
  AvailabilityStatsMap,
  ProviderTimeline,
} from "@/lib/types";

interface ProviderStatusTableProps {
  timelines: ProviderTimeline[];
  availabilityStats: AvailabilityStatsMap;
  selectedPeriod: AvailabilityPeriod;
  timeToNextRefresh: number | null;
  /** Optional filter by model display name or model id (group page) */
  modelFilter?: string;
}

export function ProviderStatusTable({
  timelines,
  availabilityStats,
  selectedPeriod,
  timeToNextRefresh,
  modelFilter = "",
}: ProviderStatusTableProps) {
  const query = modelFilter.trim().toLowerCase();
  const filtered = query
    ? timelines.filter((t) => {
        const { name, model } = t.latest;
        return (
          name.toLowerCase().includes(query) ||
          model.toLowerCase().includes(query)
        );
      })
    : timelines;

  if (filtered.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
        {query ? "无匹配模型" : "暂无监控配置"}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-8" />
          <TableHead>模型</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>状态</TableHead>
          <TableHead>延迟</TableHead>
          <TableHead className="hidden md:table-cell">Ping</TableHead>
          <TableHead className="hidden md:table-cell">可用性</TableHead>
          <TableHead className="w-8">官方</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered.map((timeline) => (
          <ProviderStatusRow
            key={timeline.id}
            timeline={timeline}
            availabilityStats={availabilityStats[timeline.id]}
            selectedPeriod={selectedPeriod}
            timeToNextRefresh={timeToNextRefresh}
          />
        ))}
      </TableBody>
    </Table>
  );
}
```

- [ ] **Step 4: Lint**

```bash
pnpm lint
```

Expected: pass. Fix Alert/Badge API mismatches against installed files.

- [ ] **Step 5: Commit**

```bash
git add components/provider-row-details.tsx components/provider-status-row.tsx components/provider-status-table.tsx
git commit -m "feat(ui): add expandable provider status table"
```

---

### Task 4: `DashboardToolbar`

**Files:**
- Create: `components/dashboard-toolbar.tsx`

**Interfaces:**
- Consumes: `AvailabilityPeriod`, `Button`, `Input`, `Badge`, `ToggleGroup`, `ThemeToggle`, `getGlobalHealth`
- Produces:

```ts
export type SortMode = "custom" | "group" | "name";

export interface DashboardToolbarProps {
  variant: "home" | "group";
  title: string;
  /** home: all latest statuses; group: group statuses */
  statuses: import("@/lib/types").HealthStatus[];
  lastUpdated: string | null;
  pollIntervalLabel: string;
  timeToNextRefresh: number | null;
  selectedPeriod: AvailabilityPeriod;
  onPeriodChange: (period: AvailabilityPeriod) => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  // home-only
  searchQuery?: string;
  onSearchQueryChange?: (q: string) => void;
  showSearch?: boolean;
  sortMode?: SortMode;
  onSortModeChange?: (mode: SortMode) => void;
  showSort?: boolean;
  allTags?: string[];
  selectedTags?: string[];
  onToggleTag?: (tag: string) => void;
  onClearTags?: () => void;
  // group-only
  groupTags?: string;
  websiteUrl?: string | null;
  modelFilter?: string;
  onModelFilterChange?: (q: string) => void;
  backHref?: string;
}
```

- [ ] **Step 1: Implement toolbar**

Use composition:

- Left: Activity icon + `title` + `Badge` from `getGlobalHealth(statuses)`
- Home search: `Input` with Search/X when `showSearch`
- Group: `Button asChild` Link to `backHref ?? "/"`, `GroupTags` for `groupTags`, external link button for `websiteUrl`
- Period: `ToggleGroup` type="single" values `7d|15d|30d`
- Sort (home): `ToggleGroup` values `custom|group|name` when `showSort`
- Refresh: `Button` variant outline, disabled when `isRefreshing`, show spinning `RefreshCcw` with `animate-spin` when refreshing
- `ThemeToggle` + GitHub link (home)
- Meta line: `ClientTime` for `lastUpdated` + `pollIntervalLabel` + countdown if `timeToNextRefresh != null`

Format countdown same as existing views (minutes/seconds). Reuse logic:

```ts
function formatRemainingTime(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  return `${seconds}s`;
}
```

Tag chips (home): map `allTags` to buttons; selected uses `getTagColorClass(tag)` + ring; clear button when `selectedTags.length > 0`.

Read installed `toggle-group.tsx` for exact props (`type`, `value`, `onValueChange`). If empty value not allowed, ignore clear-to-empty transitions.

- [ ] **Step 2: Lint**

```bash
pnpm lint
```

- [ ] **Step 3: Commit**

```bash
git add components/dashboard-toolbar.tsx
git commit -m "feat(ui): add compact dashboard toolbar"
```

---

### Task 5: `GroupListPanel` + wire home `dashboard-view`

**Files:**
- Create: `components/group-list-panel.tsx`
- Modify: `components/dashboard-view.tsx` (replace hero, GroupPanel, card grid)

**Interfaces:**
- Consumes: `GroupedProviderTimelines`, `ProviderStatusTable`, `Collapsible*`, `Button`, `GroupTags`, `countStatuses`
- Produces: `GroupListPanel` props:

```ts
interface GroupListPanelProps {
  group: GroupedProviderTimelines;
  timeToNextRefresh: number | null;
  availabilityStats: AvailabilityStatsMap;
  selectedPeriod: AvailabilityPeriod;
  defaultOpen?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  showDragHandle?: boolean;
}
```

- [ ] **Step 1: Create `group-list-panel.tsx`**

Port status summary from current `GroupPanel` but use `countStatuses(group.timelines.map(t => t.latest.status))`.

Structure:

```tsx
<Collapsible open={isOpen} onOpenChange={setIsOpen} className="rounded-xl border bg-card">
  <div className="flex items-center gap-2 p-3 sm:gap-3 sm:p-4">
    {showDragHandle && dragHandleProps ? (
      <div {...dragHandleProps} className="cursor-grab p-1 text-muted-foreground ..." title="拖拽排序">
        <GripVertical />
      </div>
    ) : null}
    <CollapsibleTrigger className="flex min-w-0 flex-1 items-center gap-2 text-left ...">
      <ChevronDown className={cn("size-4 shrink-0 transition-transform", isOpen && "rotate-180")} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="truncate text-base font-semibold sm:text-lg">{group.displayName}</h2>
          <GroupTags tags={group.tags} />
          {/* website external Button stopPropagation */}
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {/* summary badges using STATUS_META.dot + counts; skip zero counts; skip maintenance in summary or show if >0 */}
        </div>
      </div>
    </CollapsibleTrigger>
    <Button asChild size="sm" variant="default">
      <Link href={`/group/${encodeURIComponent(group.groupName)}`} onClick={(e) => e.stopPropagation()}>
        详情
        <ExternalLink data-icon="inline-end" />
      </Link>
    </Button>
  </div>
  <CollapsibleContent>
    <div className="border-t px-2 pb-3 sm:px-3">
      <ProviderStatusTable
        timelines={group.timelines}
        availabilityStats={availabilityStats}
        selectedPeriod={selectedPeriod}
        timeToNextRefresh={timeToNextRefresh}
      />
    </div>
  </CollapsibleContent>
</Collapsible>
```

Keep `SortableGroupPanel` either in this file or in `dashboard-view` wrapping `GroupListPanel` with `@dnd-kit/sortable` — same pattern as today (`useSortable`, opacity while dragging).

- [ ] **Step 2: Rewrite `dashboard-view` render tree**

Keep all existing state, effects, `refresh`, filters, DnD sensors, localStorage — **only replace JSX return and remove old `GroupPanel` / `CornerPlus` / hero markup**.

New return shape:

```tsx
return (
  <div className="relative flex flex-col gap-4 sm:gap-6">
    <DashboardToolbar
      variant="home"
      title="模型状态"
      statuses={providerTimelines.map((t) => t.latest.status)}
      lastUpdated={lastUpdated}
      pollIntervalLabel={pollIntervalLabel}
      timeToNextRefresh={timeToNextRefresh}
      selectedPeriod={selectedPeriod}
      onPeriodChange={setSelectedPeriod}
      isRefreshing={isRefreshing}
      onRefresh={() => refresh(undefined, true).catch(() => undefined)}
      searchQuery={searchQuery}
      onSearchQueryChange={setSearchQuery}
      showSearch={hasMultipleGroups}
      sortMode={sortMode}
      onSortModeChange={setSortMode}
      showSort={hasMultipleGroups}
      allTags={allTags}
      selectedTags={selectedTags}
      onToggleTag={toggleTag}
      onClearTags={() => setSelectedTags([])}
    />

    {filteredGroupNames.length === 0 ? (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed py-16 text-center">
        <Search className="size-8 text-muted-foreground" />
        <h3 className="text-lg font-semibold">没有找到匹配的分组</h3>
        <p className="text-sm text-muted-foreground">尝试使用其他关键词或标签筛选</p>
        {(searchQuery || selectedTags.length > 0) && (
          <Button
            type="button"
            onClick={() => {
              setSearchQuery("");
              setSelectedTags([]);
            }}
          >
            清除筛选
          </Button>
        )}
      </div>
    ) : (
      <div className="flex flex-col gap-3">
        {filteredGroupNames.map((groupName, index) => {
          const group = groupedTimelineMap.get(groupName);
          if (!group) return null;
          const panel = (
            <GroupListPanel
              group={group}
              timeToNextRefresh={timeToNextRefresh}
              availabilityStats={availabilityStats}
              selectedPeriod={selectedPeriod}
              defaultOpen={index === 0}
              showDragHandle={sortMode === "custom"}
            />
          );
          // wrap with Sortable when isDndReady && sortMode === "custom"
          ...
        })}
      </div>
    )}
  </div>
);
```

Remove unused imports (`ProviderCard`, gridColsClass if unused, old header-only icons as applicable).

Fix first-open behavior: previously all `defaultOpen={false}`; spec wants first **visible** group open — use `index === 0` on `filteredGroupNames`.

Wrap DnD:

```tsx
{isDndReady && sortMode === "custom" ? (
  <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={filteredGroupNames} strategy={verticalListSortingStrategy}>
      {groupedPanels}
    </SortableContext>
  </DndContext>
) : (
  groupedPanels
)}
```

Match existing DnD wrapper structure in the file (read current bottom of file before editing).

- [ ] **Step 3: Lint**

```bash
pnpm lint
```

- [ ] **Step 4: Manual check (dev server)**

```bash
pnpm dev
```

Open `/`:
1. No large hero title
2. Toolbar period/sort/search work
3. First group expanded with table
4. Row expand shows timeline
5. Drag reorder in custom mode persists after refresh

- [ ] **Step 5: Commit**

```bash
git add components/group-list-panel.tsx components/dashboard-view.tsx
git commit -m "feat(ui): wire home dashboard to compact group list"
```

---

### Task 6: Group page + skeleton + notification banner

**Files:**
- Modify: `components/group-dashboard-view.tsx`
- Modify: `components/dashboard-skeleton.tsx`
- Modify: `components/notification-banner.tsx`
- Delete: `components/provider-card.tsx` (after no references)

**Interfaces:**
- Group page uses `DashboardToolbar` variant `"group"` + `ProviderStatusTable`
- Skeleton mirrors toolbar + 2 group rows + table rows using `Skeleton`

- [ ] **Step 1: Refactor `group-dashboard-view.tsx` render**

Keep poll/refresh/period state. Replace card grid + hero with:

```tsx
const [modelFilter, setModelFilter] = useState("");

// in JSX:
<DashboardToolbar
  variant="group"
  title={data.displayName ?? groupName}
  statuses={data.providerTimelines.map((t) => t.latest.status)}
  lastUpdated={data.lastUpdated}
  pollIntervalLabel={data.pollIntervalLabel}
  timeToNextRefresh={timeToNextRefresh}
  selectedPeriod={selectedPeriod}
  onPeriodChange={setSelectedPeriod}
  isRefreshing={isRefreshing}
  onRefresh={() => refresh(undefined, true).catch(() => undefined)}
  groupTags={data.tags}
  websiteUrl={data.websiteUrl}
  modelFilter={modelFilter}
  onModelFilterChange={setModelFilter}
  backHref="/"
/>

<ProviderStatusTable
  timelines={data.providerTimelines}
  availabilityStats={data.availabilityStats ?? {}}
  selectedPeriod={selectedPeriod}
  timeToNextRefresh={timeToNextRefresh}
  modelFilter={modelFilter}
/>
```

Remove `CornerPlus`, `ProviderCard`, custom period pill markup. Confirm `GroupDashboardData` field names (`displayName`, `tags`, `websiteUrl`) from `lib/core/group-data.ts` — adjust props to match real fields.

- [ ] **Step 2: Rewrite `dashboard-skeleton.tsx`**

```tsx
import { Skeleton } from "@/components/ui/skeleton";

export function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-3 rounded-xl border p-4">
        <div className="flex items-center justify-between gap-3">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-6 w-24" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-7 w-32" />
          <Skeleton className="h-7 w-20" />
        </div>
      </div>
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-3 rounded-xl border p-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}
```

Ensure `dashboard-bootstrap.tsx` still imports `DashboardSkeleton` correctly.

- [ ] **Step 3: Convert `notification-banner.tsx` to Alert**

```tsx
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

// map level -> Alert variant if supported, else className:
// info: default; warning: border-amber; error: destructive

return (
  <Alert className={cn("rounded-none border-x-0 border-t-0", levelClass)}>
    <Icon />
    <AlertDescription className="flex w-full items-start gap-3 md:items-center">
      <div className="min-w-0 flex-1 prose-sm ...">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{notification.message}</ReactMarkdown>
      </div>
      <Button type="button" variant="ghost" size="icon-xs" onClick={() => setVisible(false)}>
        <X />
        <span className="sr-only">Dismiss</span>
      </Button>
    </AlertDescription>
  </Alert>
);
```

Keep carousel interval and fetch `/api/notifications` unchanged.

- [ ] **Step 4: Delete `provider-card.tsx` after grep shows zero imports**

```bash
grep -r "provider-card\|ProviderCard" --include='*.tsx' --include='*.ts' .
```

Expected: no matches outside docs. Then `rm components/provider-card.tsx`.

- [ ] **Step 5: Lint + build**

```bash
pnpm lint
pnpm build
```

Expected: both succeed.

- [ ] **Step 6: Manual verification**

1. `/` compact layout end-to-end
2. `/group/<name>` same table, back link, model filter
3. Notification dismiss + multi-notification carousel
4. Dark/light theme toggle
5. Mobile width: table scrolls; expand works

- [ ] **Step 7: Commit**

```bash
git add components/group-dashboard-view.tsx components/dashboard-skeleton.tsx components/notification-banner.tsx
git add -u components/provider-card.tsx
git commit -m "feat(ui): compact group page, skeleton, alert banner; remove provider card"
```

---

### Task 7: Polish pass + final verification

**Files:**
- Modify as needed: `app/page.tsx`, `app/group/[groupName]/page.tsx` (padding only if layout too sparse/tight)
- Modify: `components/status-timeline.tsx` only if expanded-row width breaks layout
- Touch: `lib/core/status.ts` only if Badge variants need a dedicated official indicator (prefer not)

- [ ] **Step 1: Visual polish checklist**

- Remove leftover `CornerPlus` / `space-y-*` introduced in new code
- Ensure icons inside `Button` use `data-icon` where text+icon
- Ensure no import of deleted `ProviderCard`
- Footer on `app/page.tsx` still fine under compact main

- [ ] **Step 2: Full verification**

```bash
pnpm lint
pnpm build
```

Manual against spec §10:

| # | Check |
|---|--------|
| 1 | No large hero; toolbar actions work |
| 2 | Groups collapsible; DnD + localStorage; detail link |
| 3 | Table columns readable |
| 4 | Row expand: timeline + availability + official |
| 5 | Group page consistent |
| 6 | Notification Alert shell |
| 7 | Mobile usable |
| 8 | lint + build green |

- [ ] **Step 3: Commit polish if any diffs**

```bash
git add -A
git status
# if changes:
git commit -m "fix(ui): polish compact dashboard layout"
```

---

## Self-Review (plan vs spec)

| Spec section | Task coverage |
|--------------|---------------|
| §3 Architecture / component split | Tasks 3–6 |
| §4 Toolbar + global health | Tasks 1 helpers + 4 |
| §5 Group row + table + expand | Tasks 3, 5 |
| §5.4 Maintenance | Task 2 + 3 (status badge + availability) |
| §6 Empty/loading/errors | Tasks 3 empty table, 5 empty groups, 6 skeleton; refresh-fail keep snapshot (existing, untouched) |
| §7 shadcn adds | Task 1 |
| §8 File plan | All tasks |
| §9 Implementation order | Tasks 1→7 |
| §10 Acceptance | Task 7 checklist |
| Non-goals (API/poller/preset) | Global Constraints |

**Placeholder scan:** none intentional.  
**Type consistency:** `SortMode`, `AvailabilityPeriod`, `StatusCounts`, toolbar props shared across Tasks 4–6.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-20-dashboard-compact-list.md`.

**Two execution options:**

1. **Subagent-Driven (recommended)** — fresh subagent per task, review between tasks  
2. **Inline Execution** — execute tasks in this session with executing-plans checkpoints  

Which approach?
