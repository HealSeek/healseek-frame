# new-api → HealSeek Frame 组件迁移盘点

这份表是长期迁移的范围基线。new-api 只作为行为和交互参考，HealSeek Frame 使用 Vue 3、TypeScript、Reka UI 和 shadcn-vue 重新实现。`apps/airhaven` 只用于本地业务验证，不进入框架提交。

状态含义：

- **已存在且行为一致**：API、主要状态和组合方式已经足够接近。
- **已存在但行为不完整**：已有实现，但缺少 new-api 关键行为或工程化状态。
- **只有 primitive，缺少框架组合**：底层控件存在，页面级复用能力不足。
- **完全缺失**：当前没有可复用的框架实现。
- **业务组件，不迁移**：只保留在 new-api 业务 feature，不抽入框架。

## 第一批组件族

| new-api 源文件 | 组件名称 | HealSeek Frame 落点 | 当前状态 | 主要缺口 | 优先级 | 验证方式 |
|---|---|---|---|---|---|---|
| `components/data-table/core/*`、`layout/*`、`toolbar/*`、`hooks/*` | DataTable 工程化族 | `packages/core/components/src/data-table/*` | 已存在但行为不完整 | querySync、storage migration、ViewOptions、sizing/pinning、ViewModeToggle、DataTableCardGrid、DataTablePage 自动 card fallback、桌面/卡片共享 rows/loading/error/selection/pagination、DataTableEmpty、键盘列宽分隔柄、new-api 分页 Select/按钮密度、SectionPage footer 固定分页已补；完整 querySync 与 desktop/mobile/主题/批量浏览器矩阵仍需继续核对 | P0 | router/component tests、demo、desktop/mobile browser |
| `components/data-table/static/static-data-table.tsx`、`static-data-table-classnames.ts` | StaticDataTable / static class map | `packages/core/components/src/data-table/StaticDataTable.vue`、`static-data-table-classnames.ts` | 已存在且行为一致 | 已补本地数组/children 渲染、row key、row slot/renderRow、空行、TruncatedCell 和 class map；Firefox/Safari 视觉矩阵仍需长期核对 | P1 | component tests、demo/template、desktop/mobile browser |
| `components/json-editor.tsx` | JsonField / JsonEditor | `packages/core/components/src/json-field/*` | 已存在但行为不完整 | 已对齐 new-api visual density/empty surface、模板 placeholder、双模式、回填、复杂嵌套编辑和 number 非法值 parse-error；仍需更完整 FormFieldSchema 组合与 raw editor 矩阵 | P0 | component tests、MyFormDemo、form submit/reset browser |
| `components/json-code-editor.tsx` | JsonCodeEditor | `packages/core/components/src/json-field/JsonCodeEditor.vue` | 已存在但行为不完整 | 已对齐 header/surface/disabled token、root/textarea form marker，并保留 clipboard feedback、FormField 属性和行号层滚动同步；仍需大文本、跨浏览器和更复杂光标矩阵 | P1 | utility/component tests、keyboard browser |
| `components/layout/components/section-page-layout.tsx` | SectionPageLayout | `packages/core/components/src/section-page/SectionPage.vue` | 已存在但行为不完整 | 已补 new-api 标题字重、操作间距、content padding、sticky tabs slot 和独立滚动层；完整 SectionPage/tabs/scroll 真实矩阵由 Issue #423 跟踪 | P0 | component tests、scroll browser |
| `components/ui/drawer.tsx`、`components/drawer-layout.ts` | Drawer / DrawerLayout | `packages/core/components/src/drawer/*`、`packages/core/composables/src/drawer/*` | 已存在但行为不完整 | DrawerLayout 已补 new-api side-drawer surface/header/footer/body visuals；Drawer/Modal desktop/mobile/focus/Escape/outside 矩阵由 Issue #258 跟踪 | P0 | overlay tests、browser focus/escape |
| `components/ui/dialog.tsx`、`components/dialog.tsx` | Dialog / Modal | ui-kit dialog、`packages/core/composables/src/modal/*` | 已存在但行为不完整 | Modal layout class、contentHeight、initialFocus 已补；仍需 close/outside/focus/stack 的完整跨层矩阵 | P1 | overlay tests、browser |
| `components/date-picker.tsx`、`components/datetime-picker.tsx` | DatePicker / DateTimePicker / DatePickerField | `packages/core/components/src/date-picker/*` | 已存在但行为不完整 | DatePicker 已补稳定 YYYY-MM-DD trigger、默认边界、new-api locale alias/fallback、popover trigger ARIA state；DateTimePicker 已补 new-api time/clear row visuals、非法时间草稿保留、aria-invalid 和受控越界日期保护；仍需移动布局、完整 keyboard、disabled/validation 和 form reset 组合 | P1 | date-picker tests、form/browser keyboard |
| `components/status-badge.tsx` | StatusBadge / StatusBadgeList | `packages/core/components/src/status-badge/*` | 已存在但行为不完整 | 已补 new-api variant/type/size/copyable/autoColor、列表组合、copyable focus-visible ring 和 `StatusBadgeTypeProvider`；仍需 Firefox/Safari 与复杂嵌套 overlay 矩阵 | P1 | component tests、demo、theme/browser |
| `components/empty-state.tsx`、`components/error-state.tsx`、`components/loading-state.tsx` | Empty/Error/Loading 状态 | `packages/core/components/src/empty-state/*`、DataPanel | 已存在但行为不完整 | EmptyState 和 ErrorState 已对齐 new-api 的默认图标/标题、300px 高度、w-full/gap-4/rounded-xl/border-dashed/p-6 surface、紧凑标题和 action 内容间距；LoadingState 已对齐 200px block/inline 密度、单一 status 语义、装饰性 loader 和 reduced-motion；仍需统一状态 API、skeleton 和表格/图表组合 | P0 | component tests、demo、Chrome desktop/mobile、light/dark/reduced-motion |
| `components/data-panel.tsx`、状态组件组合 | DataPanel 状态组合 | `packages/core/components/src/data-panel/DataPanel.vue` | 已补齐 Issue #459 | 已统一 loading、empty、error/retry 状态优先级、状态 slots、共享状态组件、测试、demo/template 和文档；DataTable/ChartCard 组合另立 Issue | P0 | DataPanel tests、demo/template、Chrome/Edge desktop/mobile、light/dark、键盘 focus |
| `components/table-action.tsx`、`data-table/core/row-action-menu.tsx`、`data-table/static/static-row-actions.tsx`、`toolbar/bulk-actions.tsx` | TableAction / RowAction / StaticRowActions / BulkAction | `DataTableRowActions.vue`、`StaticRowActions.vue`、`DataTableBulkActions.vue` | 已存在但行为不完整 | BulkActions 已补 floating hover/transition/Tooltip，RowActions 已补 iconOnly/ariaLabel/destructive menu，StaticRowActions 已补 new-api 编辑/ellipsis/destructive 组合；仍需 permission/loading 完整组合矩阵 | P0 | component tests、table browser |
| `components/ui/chart.tsx`、`features/*/charts` | Chart / ChartCard | ui-kit chart、`packages/core/components/src/chart/*` | 已存在但行为不完整 | 已补 config 驱动图例、chart token、new-api tooltip/legend surface、empty/loading/error、稳定 data-chart root 和响应式容器；仍需跨浏览器、light/dark 和主题 preset 矩阵 | P1 | chart tests、theme/browser |
| `components/layout/components/app-sidebar.tsx`、`nav-group.tsx`、`nav-link-item.tsx` | Sidebar / NavGroup | `packages/core/layouts/src/basic/sidebar/*` | 已存在但行为不完整 | 已补 path-driven view registry、返回入口、reduced-motion transition、disabled/aria 状态；仍需 nested overlay focus 的长期浏览器矩阵 | P0 | layout tests、browser |
| `components/data-table/toolbar/view-options.tsx` | ViewOptions / ColumnVisibility | `DataTableViewOptions.vue` | 已存在但行为不完整 | 已补 new-api 分组/150px 菜单、compact trigger、reset menu item、aria 语义和 sizing/pinning storage schema 迁移 | P1 | component tests、browser |
| `components/ui/context-menu.tsx`、`tooltip.tsx`、`popover.tsx`、`command.tsx`、`combobox.tsx`、`calendar.tsx` | ContextMenu / Tooltip / Popover / Command / Combobox / Calendar | `packages/ui-kit/shadcn-vue/src/components/ui/*`、`packages/core/components/src/overlay/*`、`packages/core/components/src/calendar/*` | ContextMenu 基础与高级 primitive 已存在且已完成 Chrome 右键/键盘/submenu 验证；Tooltip/Popover/Calendar/Combobox 父子层级已补框架组合或行为，Popover 已补 new-api surface/动画/data-slot 契约；浏览器矩阵脚本已加入 | Safari/Firefox 和复杂 nested overlay 仍未验证；Calendar/Command/Combobox 完整移动端/主题矩阵由 Issue #252 跟踪 | P1 | primitive tests、keyboard browser |
| `components/ui/select.tsx` | SelectBox | `packages/core/components/src/select/SelectBox.vue` | 已存在但行为不完整 | 已补真实 SelectGroup 边界、递归父子层级、叶子 icon/description/disabled 和 new-api trigger/popup/item token；真实桌面/移动键盘矩阵由 Issue #421 跟踪 | P1 | component tests、select demo、keyboard/theme browser |
| `components/ui/command.tsx` | CommandMenu | `packages/core/components/src/command-menu/*` | 已存在但行为不完整 | 已补业务无关分组、受控打开、搜索、快捷键、选择、键盘组合、真实 DialogContent surface，以及 new-api 的 root/input/list/group/item/empty/shortcut surface token；异步命令与第三方插件另立 Issue | P1 | component tests、demo/template、keyboard browser |
| `components/ui/combobox.tsx`、`combobox-input.tsx` | Combobox | `packages/core/components/src/select/Combobox.vue` | 已存在但行为不完整 | 已补 label/value 搜索、description/icon、openOnFocus、ARIA/表单属性和 Escape 恢复；仍需多选 chips 与跨浏览器矩阵 | P1 | component tests、demo/template、keyboard browser |

## Primitive 对照

| new-api primitive | ui-kit 当前状态 | 下一步 |
|---|---|---|
| Button / Input / Textarea / Label / Badge / Separator / Skeleton | 已存在 | 补状态和 visual regression，不重复实现 |
| Select / NativeSelect / Dialog / Drawer / Sheet / Tooltip / Popover / Command / ScrollArea | 已存在 | 对照 keyboard、focus、outside、mobile |
| Accordion / Alert / AlertDialog / AspectRatio / Card / Checkbox / Empty / Pagination / Progress / RadioGroup / Slider / Spinner / Switch / Table / Tabs / Toggle / ToggleGroup | 已存在但行为不完整 | 已有公开 API、测试、Demo 和模板；继续补 light/dark、mobile、visual regression 和组合验证 |
| ButtonGroup / ContextMenu / InputGroup / Kbd / Menubar / TagsInput / InputOTP / NumberField | 已存在但行为不完整 | 已有公开 API和基础测试；继续补 keyboard/focus、主题和 browser matrix |
| Carousel / Resizable | 已存在但行为不完整 | Carousel 已补 loop/autoplayInterval；第三方 plugin 仍未迁移；Resizable 已补 `storageKey` 多 panel 持久化，仍需 mobile matrix |
| Calendar / Chart / Field / Form / Item / NativeSelect / Stepper | 已存在或已有近似 | 补框架组合和主题/可访问性验证 |

## 迁移规则

## 视觉对齐契约

后续每个组件迁移都必须同时对照 new-api 的 DOM 结构和视觉类。功能行为通过不代表组件迁移完成；以下维度必须有源码依据、组件测试或真实浏览器证据：

- 颜色 token、文字色、背景色、边框、ring 和图标颜色；
- 尺寸、圆角、间距、对齐、最大宽度和内容密度；
- hover、active、selected、focus-visible、disabled、loading、empty、error；
- light/dark、主题 preset、desktop/mobile 和窄容器响应式布局；
- 键盘焦点、Escape/outside、ARIA 状态和视觉反馈之间的对应关系。

实现时应优先复用 new-api 对应的语义 token 和状态类。框架已有样式只有在源码对照后才能保留；如果 Vue/Reka UI 的实现需要不同结构，必须记录可见差异和原因。每个 PR 的验证部分要区分“功能通过”和“视觉已验证”，未运行的主题、浏览器或视口必须明确写未验证。

组件停止点新增：

- [ ] 默认、交互、禁用和错误状态的视觉类已对照 new-api；
- [ ] light/dark 或主题 preset 至少完成一组真实渲染验证；
- [ ] desktop/mobile 或窄容器至少完成一组真实渲染验证；
- [ ] 剩余视觉差异已写入 Issue/PR，不以功能测试通过代替视觉完成。

## 当前基线（2026-10-13）

`dev` 已合并 ContextMenu 高级组合、DatePicker 秒级时间、TruncatedCell
slot 文本提取与富内容 tooltip slot、RowActions/ViewOptions dropdown API、collapsed Sidebar
parent active、PageFooterPortal host surface、ChartCard 空 dataset 状态、Modal/Drawer layout/
initialFocus、ResponsiveCardList mobile selection、Resizable storageKey、
Carousel loop/autoplay 和 DataTable querySync subscribe 等后续增量。
这些能力已有组件测试、demo/template 和部分 Chrome 证据，但完整的
desktop/mobile、light/dark、focus、nested overlay 和业务组合矩阵仍未完成。
未完成差异继续按本表和独立 Issue 管理，不将当前增量宣称为完整迁移。

最近可追溯的框架合并包括：[#167](https://github.com/Airsado/airovo-frame/pull/167)、
[#169](https://github.com/Airsado/airovo-frame/pull/169)、
[#171](https://github.com/Airsado/airovo-frame/pull/171)、
[#173](https://github.com/Airsado/airovo-frame/pull/173)、
[#175](https://github.com/Airsado/airovo-frame/pull/175)、
[#177](https://github.com/Airsado/airovo-frame/pull/177)、
[#179](https://github.com/Airsado/airovo-frame/pull/179)、
[#181](https://github.com/Airsado/airovo-frame/pull/181)、
[#183](https://github.com/Airsado/airovo-frame/pull/183)、
[#185](https://github.com/Airsado/airovo-frame/pull/185)、
[#187](https://github.com/Airsado/airovo-frame/pull/187)、
[#189](https://github.com/Airsado/airovo-frame/pull/189)、
[#191](https://github.com/Airsado/airovo-frame/pull/191)、
[#193](https://github.com/Airsado/airovo-frame/pull/193)、
[#195](https://github.com/Airsado/airovo-frame/pull/195)、
[#197](https://github.com/Airsado/airovo-frame/pull/197)、
[#199](https://github.com/Airsado/airovo-frame/pull/199)。

1. 每个组件族先引用本表中的 new-api 源文件，再创建独立 Issue。
2. 只迁移跨业务可复用的 props、slots、events、状态和组合；渠道、用户、权限、统计接口留在应用层。
3. 不直接复制 React 代码，也不修改 shadcn-vue primitive 来承载业务行为。
4. 每个 PR 必须同步单测、demo、create-app template 和 README/API 文档。
5. `apps/airhaven` 只允许本地验证，永远不加入 commit、push 或 PR。
6. 组件达到 API 冻结、核心状态测试、demo 可操作、类型检查通过后停止；剩余差异另开 Issue。
