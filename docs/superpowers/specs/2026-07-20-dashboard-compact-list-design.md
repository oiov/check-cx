# Dashboard 紧凑列表布局重构设计

**日期：** 2026-07-20  
**状态：** 已确认  
**范围：** Check CX 公开 Dashboard UI（首页 + 分组详情页 + 通知横幅）  
**方案：** B — 分组折叠 + 表格行内展开  

## 1. 背景与目标

Check CX 当前 Dashboard 以玻璃拟态 Provider 卡片网格为主，信息密度低，模型数量多时首屏与扫读成本高。项目已接入 shadcn/ui（radix-mira + amber），但业务层大量手写 div/颜色，组件体系未统一。

**目标：** 在不改动数据层、API 与轮询逻辑的前提下，用 shadcn/ui 将界面重构为：

**精简顶栏 → 分组折叠行 → 模型表格行 → 行内展开详情**

**成功标准：** 一眼扫完分组与模型健康状态；需要时再展开看时间线/可用性/官方状态；首页与分组页信息架构一致；lint/build 通过并完成手动验收。

## 2. 非目标

- 不修改后端、schema、轮询、缓存、API 契约
- 不改管理端、登录、权限
- 不更换 shadcn preset / 主题色 / 字体（保持 mira + amber + jetbrains-mono）
- 不引入 Sidebar 大布局
- 不做新图表大屏、告警订阅、导出
- 不新增自动化 E2E（项目暂无测试 runner）；以 lint + build + 手动验收为准

## 3. 架构概览

### 3.1 页面职责

| 页面 | 重构后 |
|------|--------|
| `/` | 精简顶栏 + 可拖拽排序的分组列表；每组展开为模型表 |
| `/group/[groupName]` | 顶栏变体（返回 + 分组信息）+ 单组模型表（无分组折叠层） |
| 通知横幅（layout） | 改用 shadcn `Alert`，业务逻辑不变 |

### 3.2 组件拆分

| 组件 | 职责 |
|------|------|
| `DashboardToolbar` | 顶栏：标题、全局状态、搜索、周期、排序、刷新、主题、GitHub |
| `GroupListPanel` | 分组折叠行 + 状态摘要 + DnD 柄 + 详情链接 |
| `ProviderStatusTable` | 模型 Table（统一列定义） |
| `ProviderStatusRow` | 表行 + 展开控件 |
| `ProviderRowDetails` | 展开区：官方状态 Alert + 可用性 + 时间线 |
| `NotificationBanner` | 外壳换 Alert，轮播/关闭逻辑不变 |
| `StatusTimeline` | 保留逻辑，样式适配表格展开区 |
| `AvailabilityStats` | 表列紧凑值 + 展开区明细两种呈现 |

`dashboard-view.tsx` / `group-dashboard-view.tsx` 仅保留数据状态、轮询、筛选/排序/DnD；UI 下沉到上述组件。

`provider-card.tsx` 在迁移完成后删除。

### 3.3 数据与行为（明确不变）

- `/api/dashboard`、`/api/group/[groupName]` 请求与响应形状
- 可用性周期 `7d` / `15d` / `30d` 与缓存策略
- localStorage 键：`check-cx-group-order`、`check-cx-sort-mode`、`check-cx-selected-tags`
- 自动刷新倒计时、维护模式语义、官方状态字段
- 搜索（按分组名）、标签多选、三种排序、分组 DnD
- DnD 的 `useSyncExternalStore` 客户端就绪后再挂传感器，避免 SSR 水合问题

## 4. 顶栏设计（`DashboardToolbar`）

去掉大 Hero 标题与网格背景占位，改为紧凑工具栏（小屏可折成两行）。

| 区域 | 内容 | 组件 |
|------|------|------|
| 左 | 站点短标题（如「模型状态」）+ 全局健康 Badge | `Badge` |
| 中 | 搜索框（按分组名过滤） | `Input` + Search 图标 |
| 右 | 可用性周期 · 排序 · 刷新 · 主题 · GitHub | `ToggleGroup` + `Button` |

### 4.1 全局状态规则

与现有 `STATUS_META` 语义一致：

- 全部 `operational` 或 `maintenance` → 绿「运行正常」
- 存在 `degraded` 且无 failed/error/validation_failed → 琥珀「部分延迟」
- 存在 `failed` / `validation_failed` / `error` → 红「存在异常」

副信息（上次更新时间、轮询间隔、倒计时）用 `text-muted-foreground` 小字放在顶栏下方或右侧。

### 4.2 分组页顶栏变体

- 左：返回首页 ghost `Button` + 分组名 + `GroupTags` + 官网外链
- 中：按模型名过滤（可选但默认实现）
- 右：周期 `ToggleGroup` + 刷新；主题与首页一致

### 4.3 交互约定

1. **周期切换**：调用现有 `refresh(selectedPeriod)`，不改缓存策略
2. **排序**：`custom` 时显示 DnD 柄；`group` / `name` 时隐藏
3. **标签筛选**：有标签时在顶栏下展示可切换多选标签（保留 localStorage）
4. **刷新按钮**：`isRefreshing` 时 `disabled` + `Spinner`
5. **搜索**：过滤仍只作用于分组名（与现网一致）
6. **空状态**：无匹配时用 `Empty` 或简洁 `Card` + 清除筛选按钮

## 5. 分组行 · 模型表 · 行内展开

### 5.1 分组行（`GroupListPanel`）

整组为浅边框容器 + `Collapsible`。

折叠头（始终可见）：

```
[⋮⋮ DnD] [▸]  分组名  [tags] [外链]     5正常 · 1延迟 · 2异常     [详情]
```

| 元素 | 说明 |
|------|------|
| DnD 柄 | 仅 `sortMode === "custom"`；`GripVertical` + 现有 `@dnd-kit` |
| 折叠箭头 | `CollapsibleTrigger`，打开时旋转 |
| 状态摘要 | 小号 Badge 或圆点+数字；语义色走 `STATUS_META` / Badge variant |
| 详情 | `Button asChild` → `Link` 到 `/group/...`；`stopPropagation` |
| 外链 | 官网 ghost icon `Button`，阻止冒泡 |

**默认展开：** 首页仅第一个可见分组默认展开；分组页无分组层，直接渲染表。

### 5.2 模型表（`ProviderStatusTable`）

| 列 | 内容 |
|----|------|
| ▸ | 行展开控件 |
| 模型 | `name` 主行，`model` 作 muted 副行，可截断 |
| Provider | 图标 + `PROVIDER_LABEL` / Badge |
| 状态 | Badge + `STATUS_META` |
| 对话延迟 | mono `xx ms`，无数据 `—` |
| Ping | mono |
| 可用性 | 当前周期 `%`（表内单值；明细在展开区） |
| 官方 | 有 official 异常时警告图标，否则空 |

小屏：允许横向滚动或隐藏次要列（Ping / 可用性次优先）；**模型 + 状态 + 延迟**始终可见。

### 5.3 行内展开（`ProviderRowDetails`）

点击行首 ▸ 或整行（除链接外）切换。展开内容 `colSpan` 占满表宽：

1. **官方状态**（若有）：`Alert` + 文案 + 受影响组件 Badge 列表
2. **可用性**：`AvailabilityStats` 紧凑版（周期标签 + 成功次数说明）
3. **时间线**：现有 `StatusTimeline`（HoverCard 细节保留），适配较窄容器

同组内允许多行同时展开（不做手风琴互斥）。

### 5.4 维护模式

- 状态列显示 maintenance Badge
- 延迟列有值显示值，否则 `—`（沿用现卡逻辑）
- 展开区可用性继续走现有 maintenance 文案

### 5.5 视觉原则

- 语义 token：`bg-card`、`border-border`、`text-muted-foreground`
- 去掉 `CornerPlus`、大圆角玻璃拟态 hover 抬升等装饰
- 间距用 `flex` + `gap-*`，不用 `space-y-*`
- 状态色优先 Badge variant + `STATUS_META`，收敛裸 Tailwind 色类
- 遵循项目 shadcn skill：`cn()`、`size-*`、图标 `data-icon` 等

## 6. 空态 · 加载 · 错误

| 场景 | 表现 |
|------|------|
| 首屏骨架 | 顶栏骨架 + 2～3 条分组行骨架 + 表行 `Skeleton` |
| 无任何模型 | 「暂无监控配置」空态 |
| 搜索/标签无匹配 | 「无匹配分组」+ 清除筛选 |
| 分组内无模型 | 表内提示行，不整页替换 |
| 刷新失败 | 保留上次数据；可选 toast；不整页红屏 |
| 官方状态缺失 | 官方列为空，展开区不渲染 Alert |
| 可用性 null | 显示 `—`，不伪造 0% |

## 7. 新增 shadcn 组件

已安装：`badge`、`button`、`card`、`chart`、`collapsible`、`hover-card`、`table`

预计新增（经 `pnpm dlx shadcn@latest add`）：

- `alert`
- `input`
- `toggle-group`
- `separator`
- `skeleton`
- `tooltip`
- `scroll-area`（表横向溢出时）
- `spinner`（若 registry 提供；否则用 lucide + Button disabled 组合）
- `empty`（若 registry 提供；否则 Card 简洁空态）
- `sonner`（可选，刷新失败反馈）

## 8. 文件变更计划

| 文件 | 动作 |
|------|------|
| `components/dashboard-toolbar.tsx` | 新建 |
| `components/group-list-panel.tsx` | 新建（或由现 GroupPanel 抽出） |
| `components/provider-status-table.tsx` | 新建 |
| `components/provider-status-row.tsx` | 新建 |
| `components/provider-row-details.tsx` | 新建 |
| `components/dashboard-view.tsx` | 改造为数据壳 + 组合 |
| `components/group-dashboard-view.tsx` | 同上，复用 Table/Toolbar |
| `components/dashboard-skeleton.tsx` | 改为表格骨架 |
| `components/notification-banner.tsx` | Alert 外壳 |
| `components/status-timeline.tsx` | 样式适配展开区 |
| `components/availability-stats.tsx` | 表列/展开区双模式或拆分 |
| `components/provider-card.tsx` | 迁移后删除 |
| `app/page.tsx` / `app/group/.../page.tsx` | 仅在页脚/容器间距需配合时微调 |
| `components/ui/*` | CLI 新增组件 |

## 9. 实现顺序

1. 安装缺失 shadcn 组件
2. `DashboardToolbar` + 骨架
3. `ProviderStatusTable` / `Row` / `Details`
4. `GroupListPanel` + 接入 `dashboard-view`
5. 接入 `group-dashboard-view`
6. `NotificationBanner` + 删除 `provider-card`
7. `pnpm lint`、`pnpm build`、手动验收

## 10. 验收标准

1. 首页无大 Hero；顶栏可完成搜索、周期、排序、刷新、主题
2. 分组可折叠；custom 排序可拖拽并持久化；详情链到 `/group/...`
3. 表关键列完整；状态/延迟/可用性一眼可读
4. 行展开：时间线 + 可用性 + 官方 Alert 可用；HoverCard 细节仍在
5. 分组页与首页单组行为一致
6. 通知横幅为 Alert 壳，轮播/关闭逻辑不变
7. 手机可完成展开与查看状态（允许表横向滚动）
8. `pnpm lint` 与 `pnpm build` 通过
9. 新增组件经 shadcn CLI 安装；业务 UI 优先组合官方组件

## 11. 风险与缓解

| 风险 | 缓解 |
|------|------|
| `dashboard-view.tsx` 体量大，改动易回归 | 先抽展示组件，数据 hooks/effects 尽量不动 |
| 表 + 双层折叠在移动端难用 | 关键列常显 + 横向滚动 + 行内展开代替跳页 |
| 多行同时展开性能 | 时间线条数已有上限（60）；必要时再加互斥 |
| shadcn 组件 API 与 skill 规则不一致 | 安装后读 docs / 本地文件，按 project base=radix 使用 `asChild` |

## 12. 决策记录

- 优化方向：布局重构（非仅组件替换）
- 主布局：紧凑列表 + 展开详情
- 展开后模型形态：紧凑表格行
- 分组详情页：与首页同一套列表
- Hero：精简工具栏
- 实现方案：B（分组折叠 + 表格行内展开）
