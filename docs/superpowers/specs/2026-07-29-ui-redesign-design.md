# Check CX 界面重设计 Spec

日期：2026-07-29
范围：全站统一改版（主题令牌 + 首页 + 分组详情页 + 所有共享组件）
方向：简洁现代风（参考 Linear / Vercel），实现路径为「令牌先行 + 组件逐层收敛」

## 背景与痛点

当前界面四个已确认的问题：

1. **状态颜色混乱**：6 种状态使用 emerald/amber/rose/orange/blue/red，红橙黄色相挤在一起，扫一眼分不清严重程度；Badge 混用 default/secondary/destructive 三种 variant，"正常"反而用最显眼的 default。
2. **卡片套卡片**：GroupPanel 玻璃拟态外壳内嵌套 ProviderCard，圆角、边框、半透明层多层叠加。
3. **装饰/字体干扰**：`html` 全站强制 `font-mono`；`body::before` 网格背景；多处 CornerPlus 装饰十字。
4. **信息密度过高**：首页头部堆叠搜索、标签、排序、区间、状态灯、刷新等 6 组控件，无主次。

## 设计决策

### 1. 设计令牌（`app/globals.css`）

- **字体分工**：正文/标题恢复 sans（系统字体栈，不引入新字体文件）；等宽仅用于数字（延迟、时间戳、倒计时）与代码感标签。删除 `html` 上的全站 `font-mono`。
- **背景**：删除 `body::before` 网格纹理；删除所有 CornerPlus 装饰（`dashboard-view.tsx`、`provider-card.tsx`、`group-dashboard-view.tsx`）。
- **配色基调**：中性灰阶（zinc 系 oklch）做背景/卡片/边框/文字；`--primary` 从橙棕改为近黑（light）/近白（dark），即 shadcn 默认风格。强调色只用于按钮、链接、选中态。
- **边框/圆角**：统一 `rounded-xl`（卡片）/ `rounded-lg`（内嵌块）/ `rounded-full`（pill 控件）；去除全部 `backdrop-blur` 玻璃拟态与半透明叠层，卡片实色 `bg-card` + `border`。
- **chart 色**：`--chart-1..5` 改为中性/绿系。
- light/dark 双模式同步收敛。

### 2. 状态色系统

6 种状态各自独立色，拉开色相差距：

| 状态 | 色 | light 文字 | dark 文字 |
|---|---|---|---|
| operational 正常 | emerald-500 | emerald-700 | emerald-400 |
| degraded 延迟 | amber-500 | amber-700 | amber-400 |
| validation_failed 验证失败 | orange-500 | orange-700 | orange-400 |
| failed 异常 | red-500 | red-700 | red-400 |
| error 错误 | rose-600 紫红 | rose-700 | rose-400 |
| maintenance 维护中 | blue-500 | blue-700 | blue-400 |

落地点：

- `lib/core/status.ts`：`STATUS_META` 每项的 `badge: variant` 改为完整 tinted-badge class 字符串（`bg-{c}-500/10 text-{c}-700 dark:text-{c}-400 border-{c}-500/30`），`dot` 保留。消费方（`provider-card.tsx`、`status-timeline.tsx`）相应改为直接使用 class。
- `dashboard-view.tsx` 分组摘要硬编码的 5 处颜色（`bg-green-500` 等）改为读 `STATUS_META[status].dot`。
- `OFFICIAL_STATUS_META` banner 色与同一色板对齐（官方降级=amber、官方故障=rose）。
- 分组标签（`lib/utils/tag-colors.ts` 8 色哈希）不属于状态语义，保持现状。

### 3. 布局重构

**3.1 首页头部（`dashboard-view.tsx`）**

- 第一行：logo + "Check CX" 标题；删除 `AI SERVICES INTELLIGENCE MONITOR` 巨型双行标题与装饰副标题。右侧放全局状态 pill + 更新时间/刷新按钮。
- 第二行（仅多分组时显示）：搜索框 + 标签筛选 + 排序 + 可用性区间，收进一条统一样式工具栏（`rounded-lg border bg-muted/40`）。

**3.2 GroupPanel 降级为弱容器**

- 去掉 `rounded-3xl border bg-white/30 backdrop-blur` 外壳，改为无边框分区块：分组标题行（chevron + 名称 + 标签 + 状态摘要 + 详情链接）+ 卡片网格；组间以间距和细分隔线区分。
- 状态摘要改为一行彩色小圆点 + 数字，颜色读 `STATUS_META`。
- 拖拽手柄、官网外链图标保留，样式随令牌更新。

**3.3 ProviderCard 单层卡片**

- 实色 `bg-card border rounded-xl`；去 `backdrop-blur`、hover 位移+大阴影（保留细微 border 变色反馈）、CornerPlus。
- 内部结构不变（名称/图标/badge → 延迟+ping → 可用性 → 时间线），层级改为单个边框卡片 + 内部分隔线，不再每层各自 `bg-muted/30` 套娃。
- 官方状态 banner 保留在顶部，样式并入统一色板。
- 卡片标题从 `text-2xl` 收敛到 `text-base font-semibold`；网格列数规则不变。

**3.4 细节**

- 时间线 hover 卡、"NO DATA"、空状态沿用新令牌。
- 删除 fixed 定位的 4 个角落装饰十字。

### 4. 分组详情页与共享组件

- `group-dashboard-view.tsx`：删 CornerPlus 与玻璃拟态；头部与首页对齐（返回链接 + 分组名 + 标签 + 官网链接，右侧状态摘要 + 区间切换 + 更新时间）；卡片网格平铺。
- `AvailabilityStats`：HSL 连续色带改为离散档位（≥99% 绿、≥95% 琥珀、<95% 红）；维护态蓝色块并入令牌色。
- `StatusTimeline`：空态、hover 卡、倒计时样式随令牌更新；段颜色已读 `STATUS_META.dot` 自动一致。
- `notification-banner`、`dashboard-skeleton`、`group-tags`、`theme-toggle`、`not-found.tsx`：仅类名适配，不改结构。
- `app/layout.tsx`、`app/page.tsx`、`app/group/[groupName]/page.tsx`：统一外层容器 `max-w-7xl mx-auto px-4 sm:px-6`。

## 不做的事（YAGNI）

- 不推倒重写页面骨架（不引入 BetterStack 式大字横幅）。
- 不引入新字体文件、新依赖、新组件库。
- 不改拖拽排序、轮询缓存、筛选等业务逻辑。
- 不动分组标签哈希配色。

## 验证

- `pnpm lint` + `pnpm build` 必过。
- `pnpm dev` 浏览器人工验证清单：首页浅色/深色、多分组折叠展开、拖拽排序、搜索/标签筛选、分组详情页、维护态卡片、官方故障 banner。
