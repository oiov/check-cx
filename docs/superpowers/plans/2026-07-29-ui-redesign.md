# Check CX UI 重设计实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 Check CX 全站界面从「极客玻璃拟态风」收敛为「简洁现代风」，根治状态色混乱、卡片套卡片、装饰/字体干扰、信息密度过高四个痛点。

**Architecture:** 令牌先行——重写 `globals.css` 设计令牌（中性灰 + 单强调色、去网格背景、字体 sans/mono 分工），状态色集中到 `lib/core/status.ts` 单一数据源；随后逐组件收敛，不改任何业务逻辑（拖拽、轮询、缓存、筛选原样保留）。

**Tech Stack:** Next.js 16 (Cache Components)、Tailwind CSS v4、shadcn/ui、TypeScript。

**Spec:** `docs/superpowers/specs/2026-07-29-ui-redesign-design.md`

## Global Constraints

- 项目无测试 runner：每个任务以 `pnpm lint`（必须通过）+ 受影响时的 `pnpm build` 作为自动验证，最终以浏览器人工验证收尾。
- 不引入新依赖、新字体文件、新组件库。
- 不改业务逻辑：DnD 拖拽、`frontend-cache` 轮询、localStorage 键名、数据获取代码一律不动。
- 状态色唯一数据源是 `lib/core/status.ts` 的 `STATUS_META`；禁止在组件里硬编码状态色。
- TypeScript 2 空格缩进，优先 `const`，组件 PascalCase；className 合并用 `@/lib/utils` 的 `cn`。
- 6 状态色映射（light 文字 / dark 文字）：operational=emerald-500（700/400）、degraded=amber-500（700/400）、validation_failed=orange-500（700/400）、failed=red-500（700/400）、error=rose-600（700/400）、maintenance=blue-500（700/400）。

---

### Task 1: 设计令牌重写（globals.css + 字体分工）

**Files:**
- Modify: `app/globals.css`（全量重写令牌区）
- Modify: `app/layout.tsx:2,10,34`

**Interfaces:**
- Produces: 新中性色令牌（`--background/--foreground/--card/--muted/--border/--primary` 等，shadcn neutral 系）；`--font-mono` 变量保留供数字使用；全站默认字体变为 sans。后续所有任务依赖这些令牌。

- [ ] **Step 1: 重写 `app/globals.css`**

完整替换文件内容为：

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-mono: var(--font-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.141 0.005 285.823);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.141 0.005 285.823);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.141 0.005 285.823);
  --primary: oklch(0.21 0.006 285.885);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.967 0.001 286.375);
  --secondary-foreground: oklch(0.21 0.006 285.885);
  --muted: oklch(0.967 0.001 286.375);
  --muted-foreground: oklch(0.552 0.016 285.938);
  --accent: oklch(0.967 0.001 286.375);
  --accent-foreground: oklch(0.21 0.006 285.885);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.92 0.004 286.32);
  --input: oklch(0.92 0.004 286.32);
  --ring: oklch(0.705 0.015 286.067);
  --chart-1: oklch(0.646 0.222 151.04);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.141 0.005 285.823);
  --sidebar-primary: oklch(0.21 0.006 285.885);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.967 0.001 286.375);
  --sidebar-accent-foreground: oklch(0.21 0.006 285.885);
  --sidebar-border: oklch(0.92 0.004 286.32);
  --sidebar-ring: oklch(0.705 0.015 286.067);
}

.dark {
  --background: oklch(0.141 0.005 285.823);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.21 0.006 285.885);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.21 0.006 285.885);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.92 0.004 286.32);
  --primary-foreground: oklch(0.21 0.006 285.885);
  --secondary: oklch(0.274 0.006 286.033);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.274 0.006 286.033);
  --muted-foreground: oklch(0.705 0.015 286.067);
  --accent: oklch(0.274 0.006 286.033);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.552 0.016 285.938);
  --chart-1: oklch(0.646 0.222 151.04);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
  --sidebar: oklch(0.21 0.006 285.885);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.646 0.222 151.04);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.274 0.006 286.033);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(1 0 0 / 10%);
  --sidebar-ring: oklch(0.552 0.016 285.938);
}

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html {
    @apply bg-background text-foreground;
  }

  body {
    @apply relative min-h-screen bg-background text-foreground;
  }
}
```

要点（相对现状的变化）：
- 删除 `--font-sans: var(--font-mono)` 与 `--font-heading: var(--font-mono)` 两行 → sans 回到 Tailwind 默认系统栈。
- 删除 `@layer base` 中 `html` 的 `font-mono`。
- 删除整个 `body::before` 网格背景块。
- 删除 `--radius-2xl/3xl/4xl` 三个扩展。
- `--primary` 橙棕 → 中性近黑/近白；chart 色橙棕系 → 绿/青/蓝灰系。

- [ ] **Step 2: 修改 `app/layout.tsx` 字体挂载**

`<html>` 的 className 从 `cn("font-mono", jetbrainsMono.variable)` 改为仅 `jetbrainsMono.variable`（保留 JetBrains Mono 变量供 `font-mono` 工具类在数字处使用）：

```tsx
<html lang="zh-CN" suppressHydrationWarning className={jetbrainsMono.variable}>
```

同时 `cn` import 若不再使用则删除该 import 行（检查文件内无其他 `cn` 调用后删除）。

- [ ] **Step 3: lint + build 验证**

```bash
pnpm lint && pnpm build
```
预期：全部通过。构建后页面字体变为 sans、背景网格消失、primary 色变中性。

- [ ] **Step 4: Commit**

```bash
git add app/globals.css app/layout.tsx
git commit -m "feat(theme): 中性色令牌重写，去网格背景，字体 sans/mono 分工"
```

---

### Task 2: 状态色系统（status.ts 单一数据源）

**Files:**
- Modify: `lib/core/status.ts`
- Modify: `components/provider-card.tsx:109-114`（Badge 用法）
- Modify: `components/status-timeline.tsx:159`（Badge 用法）

**Interfaces:**
- Produces: `STATUS_META` 新形状——每项 `{ label: string; description: string; badgeClass: string; dot: string }`。`badgeClass` 为完整 tinted-badge class 字符串，消费方直接传给 `Badge` 的 `className`（`Badge` 组件用 `variant="outline"` 或 className 覆盖均可，本计划统一用 `variant={undefined}` 即不传 variant，靠 className 完全控制颜色）。后续 Task 3/5/6 依赖 `badgeClass` 与 `dot`。
- 注意：`STATUS_META` 删除 `badge` 字段，所有引用 `preset.badge` 的位置必须同任务内改完（仅 provider-card.tsx 与 status-timeline.tsx 两处）。

- [ ] **Step 1: 重写 `lib/core/status.ts` 的 `STATUS_META`**

```ts
import type {HealthStatus, OfficialHealthStatus, ProviderType} from "../types";

export const STATUS_META: Record<
  HealthStatus,
  {
    label: string;
    description: string;
    /** 完整 tinted-badge class，直接传给 Badge 的 className */
    badgeClass: string;
    /** 状态圆点/时间线段背景色 */
    dot: string;
  }
> = {
  operational: {
    label: "正常",
    description: "请求响应如常",
    badgeClass:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  degraded: {
    label: "延迟",
    description: "响应成功但耗时升高",
    badgeClass:
      "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  failed: {
    label: "异常",
    description: "请求失败或超时",
    badgeClass:
      "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
  validation_failed: {
    label: "验证失败",
    description: "请求成功但回答未通过验证",
    badgeClass:
      "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  maintenance: {
    label: "维护中",
    description: "人工维护,已停止检查",
    badgeClass:
      "border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400",
    dot: "bg-blue-500",
  },
  error: {
    label: "错误",
    description: "请求异常（网络错误、API报错、连接失败）",
    badgeClass:
      "border-rose-600/30 bg-rose-600/10 text-rose-700 dark:text-rose-400",
    dot: "bg-rose-600",
  },
};
```

`OFFICIAL_STATUS_META` 与 `PROVIDER_LABEL` 保持原样（banner 已是 amber/rose 色系，与新色板一致）。

- [ ] **Step 2: 改 `components/provider-card.tsx` Badge 用法**

把：

```tsx
<Badge
  variant={preset.badge}
  className="shrink-0 whitespace-nowrap rounded-lg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur-md sm:px-2.5 sm:py-1 sm:text-xs"
>
```

改为：

```tsx
<Badge
  className={cn(
    "shrink-0 whitespace-nowrap px-2 py-0.5 text-[10px] font-semibold sm:px-2.5 sm:py-1 sm:text-xs",
    preset.badgeClass
  )}
>
```

- [ ] **Step 3: 改 `components/status-timeline.tsx` hover 卡 Badge**

把 `<Badge variant={preset.badge} className="h-5 px-1.5 text-[10px]">{preset.label}</Badge>` 改为：

```tsx
<Badge className={cn("h-5 px-1.5 text-[10px]", preset.badgeClass)}>{preset.label}</Badge>
```

- [ ] **Step 4: 全局检查无残留引用**

```bash
grep -rn "preset.badge\b\|\.badge\b" components/ lib/ --include="*.tsx" --include="*.ts" | grep -v badgeClass
```
预期：无输出（`GroupTags` 用的是 Badge 组件本身不是 `preset.badge`，不受影响）。

- [ ] **Step 5: lint + build**

```bash
pnpm lint && pnpm build
```
预期：通过。

- [ ] **Step 6: Commit**

```bash
git add lib/core/status.ts components/provider-card.tsx components/status-timeline.tsx
git commit -m "feat(status): 状态色统一到 STATUS_META 单一数据源，6 色拉开色相"
```

---

### Task 3: StatusSummary 共享组件 + 两页摘要接入

**Files:**
- Create: `components/status-summary.tsx`
- Modify: `components/dashboard-view.tsx:212-221,263-294`（GroupPanel 内 statusSummary 与渲染）
- Modify: `components/group-dashboard-view.tsx:185-194,231-270`（页面级 statusSummary 与渲染）

**Interfaces:**
- Consumes: `STATUS_META`（Task 2 的 `dot` 字段）。
- Produces: `StatusSummary` 组件，签名 `({ counts, className }: { counts: Record<HealthStatus, number>; className?: string }) => JSX.Element`。两页共用；渲染顺序固定为 operational → degraded → validation_failed → failed → error → maintenance，仅渲染 count > 0 的项。

- [ ] **Step 1: 创建 `components/status-summary.tsx`**

```tsx
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
```

- [ ] **Step 2: `dashboard-view.tsx` GroupPanel 接入**

删除 GroupPanel 内联的 statusSummary 渲染块（原 263-294 行那 5 段硬编码 `<span>`），替换为：

```tsx
<StatusSummary counts={statusSummary} className="text-xs sm:text-sm" />
```

并在文件顶部 import 区加入：

```tsx
import {StatusSummary} from "@/components/status-summary";
```

GroupPanel 的 `statusSummary` useMemo 计算逻辑保留不动（counts 形状正好是 `Record<HealthStatus, number>`）。

- [ ] **Step 3: `group-dashboard-view.tsx` 接入**

删除原 231-270 行整段硬编码摘要（6 个 pill + 分隔符 + "N 个配置"），替换为：

```tsx
<div className="flex flex-wrap items-center gap-2.5">
  <StatusSummary counts={statusSummary} />
  <span className="text-xs text-muted-foreground/60">|</span>
  <span className="text-xs text-muted-foreground">{total} 个配置</span>
</div>
```

并加 import：

```tsx
import {StatusSummary} from "@/components/status-summary";
```

- [ ] **Step 4: 检查 HealthStatus 类型匹配**

两页的 counts 对象字面量键均为 `operational/degraded/failed/validation_failed/maintenance/error`。若 `HealthStatus` 包含其他键导致 `Record<HealthStatus, number>` 类型不匹配，给 counts 显式标注类型 `Record<HealthStatus, number>` 即可（先跑 lint 看是否报错再处理）。

- [ ] **Step 5: lint + build**

```bash
pnpm lint && pnpm build
```
预期：通过。

- [ ] **Step 6: Commit**

```bash
git add components/status-summary.tsx components/dashboard-view.tsx components/group-dashboard-view.tsx
git commit -m "feat(status): 抽取 StatusSummary 共享组件，两页摘要读 STATUS_META"
```

---

### Task 4: ProviderCard 单层卡片重构

**Files:**
- Modify: `components/provider-card.tsx`（整体重写 JSX，逻辑不变）

**Interfaces:**
- Consumes: `STATUS_META.badgeClass`（Task 2）；`AvailabilityStats`、`StatusTimeline` 子组件接口不变。
- Produces: 组件 props 签名不变：`({ timeline, timeToNextRefresh, availabilityStats, selectedPeriod }: ProviderCardProps)`。Task 5/6 的调用方无需改动。

- [ ] **Step 1: 重写 `components/provider-card.tsx`**

完整替换为：

```tsx
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
            <h3 className="truncate text-base font-semibold tracking-tight text-foreground">
              {latest.name}
            </h3>
            <div className="mt-0.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
              <span className="shrink-0 font-medium text-foreground/70">
                {PROVIDER_LABEL[latest.type]}
              </span>
              <span className="truncate font-mono">{latest.model}</span>
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
```

要点：去 CornerPlus（含组件定义）、去 `backdrop-blur`/渐变图标盒/hover 位移阴影；标题收敛 `text-base font-semibold`；头部改为「图标+名称/badge」单行布局；内部块统一 `rounded-lg bg-muted/50`。

- [ ] **Step 2: lint + build**

```bash
pnpm lint && pnpm build
```
预期：通过。

- [ ] **Step 3: Commit**

```bash
git add components/provider-card.tsx
git commit -m "feat(card): ProviderCard 单层卡片化，去玻璃拟态与装饰"
```

---

### Task 5: 首页头部工具栏化 + GroupPanel 弱容器化

**Files:**
- Modify: `components/dashboard-view.tsx`（CornerPlus 删除、GroupPanel 重写、header 重写）

**Interfaces:**
- Consumes: `StatusSummary`（Task 3）、`ProviderCard`（Task 4，props 不变）。
- Produces: 无新接口；`DashboardView` props 不变。DnD、localStorage、轮询逻辑全部保留。

- [ ] **Step 1: 删除 CornerPlus**

删除 `CornerPlus` 组件定义（原 152-163 行）和 `DashboardView` return 里 4 个 fixed 角落装饰（原 743-746 行）。

- [ ] **Step 2: 重写 GroupPanel 为弱容器**

`GroupPanel` 的 return 整体替换为：

```tsx
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="border-b pb-6 last:border-b-0">
      <div className="flex items-center justify-between gap-3 sm:gap-4">
        {dragHandleProps && (
          <div
            {...dragHandleProps}
            className="cursor-grab p-2 text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            title="拖拽排序"
          >
            <GripVertical className="h-5 w-5" />
          </div>
        )}
        <CollapsibleTrigger className="group flex min-w-0 flex-1 items-center gap-2.5 text-left focus-visible:outline-none sm:gap-3">
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <h2 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                {group.displayName}
              </h2>
              <GroupTags tags={group.tags} />
              {group.websiteUrl && (
                <a
                  href={group.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            <StatusSummary counts={statusSummary} className="mt-0.5 text-xs" />
          </div>
        </CollapsibleTrigger>

        <Link
          href={groupLink}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
        >
          <span className="hidden sm:inline">详情</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <CollapsibleContent className="animate-in fade-in-0 slide-in-from-top-2">
        <div className={`mt-4 grid gap-4 ${gridColsClass}`}>
          {group.timelines.map((timeline) => (
            <ProviderCard
              key={timeline.id}
              timeline={timeline}
              timeToNextRefresh={timeToNextRefresh}
              availabilityStats={availabilityStats[timeline.id]}
              selectedPeriod={selectedPeriod}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
```

注意：`statusSummary` 的 useMemo 保留；确认 `StatusSummary` 已 import（Task 3 已加）。分组列表容器由 `space-y-4` 改为 `space-y-6`（`groupedPanels` 里的 `<div className="space-y-4">`）。

- [ ] **Step 3: 重写首页 header**

`DashboardView` 的 `<header>` 整块（原 748-921 行）替换为：

```tsx
      <header className="mb-6 space-y-4 sm:mb-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Activity className="h-4 w-4" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight">Check CX</h1>
            <span className="hidden text-sm text-muted-foreground sm:inline">
              AI 模型接口健康监控
            </span>
            <Link
              href="https://github.com/BingZi-233/check-cx"
              target="_blank"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              <Github className="h-4 w-4" />
            </Link>
            <ThemeToggle />
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border px-3 py-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-xs font-medium">Operational</span>
            </div>
            {lastUpdated && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCcw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                <span>更新于 <ClientTime value={lastUpdated} /></span>
                <span className="opacity-30">|</span>
                <span>{pollIntervalLabel} 轮询</span>
                <button
                  type="button"
                  onClick={() => refresh(selectedPeriod, true)}
                  disabled={isRefreshing}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 font-medium transition-colors hover:border-foreground/20 hover:text-foreground",
                    isRefreshing && "cursor-not-allowed opacity-60"
                  )}
                >
                  刷新
                </button>
              </div>
            )}
          </div>
        </div>

        {hasMultipleGroups && (
          <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-2">
            <div className="relative w-full sm:w-56">
              <input
                type="text"
                placeholder="搜索分组..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-full rounded-md border bg-background pl-8 pr-8 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/30"
              />
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-0.5 text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {allTags.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {allTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold transition-all",
                        isSelected
                          ? cn(getTagColorClass(tag), "ring-2 ring-foreground/20")
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      )}
                    >
                      {tag}
                    </button>
                  );
                })}
                {selectedTags.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedTags([])}
                    className="flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                    清除
                  </button>
                )}
              </div>
            )}

            <div className="ml-auto flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-md border bg-background p-0.5 text-xs">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSortMode(option.value)}
                    className={cn(
                      "rounded px-2 py-1 font-medium transition-colors",
                      sortMode === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1 rounded-md border bg-background p-0.5 text-xs">
                {PERIOD_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedPeriod(option.value)}
                    className={cn(
                      "rounded px-2 py-1 font-medium transition-colors",
                      selectedPeriod === option.value
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </header>
```

同时把「无搜索结果」空态外壳统一为新令牌（`rounded-3xl` → `rounded-xl`，去 `bg-muted/20` 保留 dashed border）：

```tsx
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed py-20 text-center">
```

「尚无监控目标」空态同样改。清除筛选按钮改为 `rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90`。

- [ ] **Step 4: lint + build**

```bash
pnpm lint && pnpm build
```
预期：通过。`Activity/Github/Search/X/ChevronDown/ExternalLink/GripVertical/RefreshCcw` 等 import 仍在使用，无 unused 报错。

- [ ] **Step 5: Commit**

```bash
git add components/dashboard-view.tsx
git commit -m "feat(dashboard): 头部工具栏化，GroupPanel 弱容器化，去装饰元素"
```

---

### Task 6: 分组详情页重构

**Files:**
- Modify: `components/group-dashboard-view.tsx`（CornerPlus 删除、header 重写）
- Modify: `app/group/[groupName]/page.tsx:27-36`（容器与返回链接样式）

**Interfaces:**
- Consumes: `StatusSummary`（Task 3）、`ProviderCard`（Task 4）。
- Produces: 无新接口。

- [ ] **Step 1: 删除 CornerPlus**

删除 `CornerPlus` 定义（46-57 行）与 return 里的 4 个 fixed 装饰（198-201 行）。

- [ ] **Step 2: 重写 header**

`<header>` 整块（203-326 行）替换为：

```tsx
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

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 rounded-md border bg-background p-0.5 text-xs">
              {PERIOD_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSelectedPeriod(option.value)}
                  className={cn(
                    "rounded px-2 py-1 font-medium transition-colors",
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <RefreshCcw className={cn("h-3 w-3", isRefreshing && "animate-spin")} />
                <span>更新于 <ClientTime value={lastUpdated} /></span>
                <span className="opacity-30">|</span>
                <span>{pollIntervalLabel} 轮询</span>
                <button
                  type="button"
                  onClick={() => refresh(selectedPeriod, true)}
                  disabled={isRefreshing}
                  className={cn(
                    "rounded-lg border px-2.5 py-1 font-medium transition-colors hover:border-foreground/20 hover:text-foreground",
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
```

同时删除旧的「Status Pill」（固定 Operational 灯，该页不再显示——首页保留）。

注意：Task 3 已把摘要替换为 `StatusSummary`，本 Step 是把它并入新 header 结构，实施时以最终代码块为准整体替换 header。`Activity` import 在空态仍使用，保留。

- [ ] **Step 3: 空态外壳统一**

「该分组下暂无配置」空态 `rounded-3xl border-dashed border-border/50 bg-muted/20` → `rounded-xl border border-dashed`。

- [ ] **Step 4: `app/group/[groupName]/page.tsx` 容器统一**

返回链接 className 改为：

```tsx
className="inline-flex w-fit items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground/20 hover:text-foreground"
```

（去 `rounded-full`、`backdrop-blur`、`bg-background/60`、`shadow-sm`。）

- [ ] **Step 5: lint + build**

```bash
pnpm lint && pnpm build
```
预期：通过。

- [ ] **Step 6: Commit**

```bash
git add components/group-dashboard-view.tsx "app/group/[groupName]/page.tsx"
git commit -m "feat(group): 分组详情页头部对齐首页，去装饰元素"
```

---

### Task 7: 共享组件与页面容器收尾

**Files:**
- Modify: `components/availability-stats.tsx:18-25`（HSL 色带 → 离散档位）
- Modify: `components/dashboard-skeleton.tsx`（删 CornerPlus、圆角/玻璃类名适配）
- Modify: `components/theme-toggle.tsx:18,33`（去 backdrop-blur/半透明）
- Modify: `app/not-found.tsx:7,21`（去 backdrop-blur/scale 动效）
- Modify: `app/page.tsx:9-25`（容器 max-width 与 footer 统一）

**Interfaces:**
- Consumes: 无。
- Produces: 无新接口。

- [ ] **Step 1: `availability-stats.tsx` 离散档位**

删除 `getAvailabilityColorStyle` 函数，替换为：

```tsx
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
```

百分比 `<span>` 改为：

```tsx
<span className={cn("font-mono text-sm font-bold", getAvailabilityColorClass(pct))}>
  {pctLabel}
</span>
```

（删掉原 `style={...}` 与 `cn(...)` 里的 `pct === null` 三元。）

- [ ] **Step 2: `dashboard-skeleton.tsx` 适配**

- 删除 `CornerPlus` 定义与 `DashboardSkeleton` 里 4 个 fixed 装饰。
- `CardSkeleton` / `GroupPanelSkeleton` 外壳 `rounded-3xl border ... bg-white/30 backdrop-blur-sm dark:bg-black/10` → `rounded-xl border bg-card`；`ProviderCardSkeleton` 外壳 `rounded-2xl border border-border/40 bg-background/40` → `rounded-xl border bg-card`。
- header 骨架结构不必重写为新 header 精确形状（骨架只需近似），但去掉 pill 圆角过度处无强制要求。

- [ ] **Step 3: `theme-toggle.tsx` 去玻璃**

两处 className 中的 `border-border/40 bg-background/60 backdrop-blur-sm` 删除，保留 `h-9 w-9 rounded-full`；hover 处 `hover:bg-background/80` → `hover:bg-muted`。

- [ ] **Step 4: `not-found.tsx` 去玻璃**

图标盒 `rounded-3xl bg-muted/30 shadow-sm backdrop-blur-sm` → `rounded-2xl bg-muted`；返回按钮去 `hover:scale-105 active:scale-95`，改 `hover:bg-foreground/90`。

- [ ] **Step 5: `app/page.tsx` 容器统一**

`max-w-[1600px]` 两处（main 与 footer）改为 `max-w-7xl`；`px-3 sm:px-6 lg:px-12` → `px-4 sm:px-6`。footer 版本 pill `rounded-full border border-border/40 bg-background/60 shadow-sm` → `rounded-full border bg-muted/50`。`app/group/[groupName]/page.tsx` 的 main 容器同样 `max-w-[1600px]` → `max-w-7xl`、`px-3 sm:px-6 lg:px-12` → `px-4 sm:px-6`（Task 6 已改过返回链接，本次只动容器 className）。

- [ ] **Step 6: lint + build**

```bash
pnpm lint && pnpm build
```
预期：通过。

- [ ] **Step 7: Commit**

```bash
git add components/availability-stats.tsx components/dashboard-skeleton.tsx components/theme-toggle.tsx app/not-found.tsx app/page.tsx "app/group/[groupName]/page.tsx"
git commit -m "feat(ui): 共享组件与页面容器收尾，可用性色离散档位化"
```

---

### Task 8: 浏览器人工验证 + 版本号

**Files:**
- Modify: `package.json`（patch 版本号 +1）

**Interfaces:**
- Consumes: 全部前序任务。
- Produces: 无。

- [ ] **Step 1: 启动开发服务器**

```bash
pnpm dev
```

- [ ] **Step 2: 浏览器验证清单（逐项确认）**

1. 首页浅色模式：无网格背景、无角落十字；头部单行 logo+标题+状态灯；工具栏一行（搜索/标签/排序/区间）。
2. 首页深色模式（ThemeToggle 切换）：对比度正常，卡片实色无玻璃感。
3. 分组折叠/展开动画正常；状态摘要圆点颜色与卡片 Badge 颜色一致（同状态同色）。
4. 自定义排序模式下拖拽手柄可用，顺序刷新后保持（localStorage）。
5. 搜索 + 标签筛选联动正常，空态有「清除筛选」。
6. ProviderCard：无 hover 位移大阴影，仅 border 变色；badge 6 色区分明显（绿/黄/橙/红/紫红/蓝）。
7. 时间线段颜色与 badge 同色；hover 卡 Badge 同色。
8. 分组详情页：返回链接、头部、区间切换、卡片网格正常。
9. 维护态卡片（如有）：蓝色系展示正常；官方降级/故障 banner 正常。
10. 可用性百分比：≥99% 绿、≥95% 琥珀、<95% 红。
11. 骨架屏加载态无装饰元素；NotificationBanner、404 页正常。

- [ ] **Step 3: 修复验证中发现的问题（若有）并提交**

- [ ] **Step 4: 版本号 +1 并提交**

```bash
git add package.json
git commit -m "chore: bump version（UI 重设计）"
```

---

## Self-Review 记录

- Spec 覆盖：令牌(§1)→Task 1；状态色(§2)→Task 2/3；布局(§3)→Task 4/5；详情页+共享组件(§4)→Task 6/7；验证(§验证)→Task 8。`notification-banner.tsx` 无需改动（其 info/warning/error 三色本就属于通知语义，与状态色板一致）。
- 无占位符；所有代码块为完整可粘贴代码。
- 类型一致性：`STATUS_META.badgeClass`/`dot` 在 Task 2 定义，Task 3/4 消费一致；`StatusSummary` 签名在两处调用一致。
