# new-api → HealSeek Frame 组件盘点

- 参考仓库：`QuantumNous/new-api`
- 参考 revision：`a0bf6a8a412764bc296a8e27cf8c4aaa3f3f0ed9`
- 盘点分支：`codex/issue-264-component-inventory`
- 状态枚举：`已存在且行为一致`、`已存在但行为不完整`、`只有 primitive，缺少框架组合`、`完全缺失`、`业务组件，不迁移`
- 范围：框架代码、公共组合组件、demo/template 和文档；`apps/airhaven` 永不进入框架提交。

## 第一批重点盘点

| new-api 源文件 | 组件名称 | HealSeek Frame 落点 | 当前状态 | 缺口 | 优先级 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| `web/src/components/data-table/**`、`toolbar/view-mode-toggle.tsx`、`layout/card-grid.tsx`、`layout/mobile-card-list.tsx`、`layout/card-row-content.tsx`、`layout/card-cell-utils.ts` | DataTable core/layout/toolbar/hooks/view mode/card grid/mobile list | `packages/core/components/src/data-table` | 已存在但行为不完整 | 已补 ViewModeToggle、DataTableCardGrid、DataTableMobileCardList、DataTablePage 自动 mobile list fallback、共享 rows/columns/loading/error/selection/pagination/sort 契约、DataTableEmpty、new-api 键盘列宽分隔柄和 channels 风格 bordered table surface、框架 Select 分页页容量与 SectionPage footer 固定分页；仍需静态表格族、服务端 querySync 与完整跨浏览器矩阵 | P0 | 单测、demo、桌面/移动浏览器矩阵 |
| `web/src/components/json-editor.tsx` | JsonEditor / JsonField | `packages/core/components/src/json-field/JsonField.vue` | 已存在但行为不完整 | 已对齐 new-api 可视化 `space-y-2`、标题/空态/行操作密度、模板 placeholder、对象/数组编辑、模板回填、number 非法值拒绝和 parse-error 保留；仍需更复杂类型推断和完整表单矩阵 | P0 | 单测、表单 demo、键盘/错误/回填浏览器验证 |
| `web/src/components/json-code-editor.tsx` | JsonCodeEditor | `packages/core/components/src/json-field/JsonCodeEditor.vue` | 已存在但行为不完整 | 已对齐 new-api toolbar/surface/disabled token、模板 placeholder、root/textarea form marker，并保留行号层滚动同步、格式化、光标/草稿、剪贴板和错误提示；仍需大文本与跨浏览器矩阵 | P0 | 单测、demo、键盘/剪贴板/非法 JSON 浏览器验证 |
| `web/src/components/layout/components/section-page-layout.tsx` | SectionPageLayout | `packages/core/components/src/section-page/SectionPage.vue` | 已存在但行为不完整 | 已补 sticky title、可选 tabs slot、独立内容滚动层和 footer portal；仍需完整主题/移动键盘矩阵 | P0 | layout 单测、SectionPage 浏览器矩阵 |
| `web/src/components/drawer-layout.ts` | DrawerLayout | `packages/core/components/src/drawer/DrawerLayout.vue` | 已存在但行为不完整 | 已补右侧 `w-3/4`/`sm:max-w-md` 响应式宽度与底部 `mt-24` 间距；header/footer 固定、层级、移动端和焦点恢复仍需长期矩阵核对（Issue #463） | P0 | overlay 单测、桌面/移动浏览器矩阵 |
| `web/src/components/ui/dialog.tsx`、`web/src/components/confirm-dialog.tsx` | Modal / Dialog | `packages/core/components/src/overlay`、`packages/ui-kit/shadcn-vue` | 已存在但行为不完整 | 组合层 API、焦点、Escape/outside、主题 surface 和业务无关性需继续核对 | P0 | overlay 单测、焦点/Escape/outside 浏览器验证 |
| `web/src/components/date-picker.tsx` | DatePicker | `packages/core/components/src/date-picker/DatePicker.vue` | 已存在但行为不完整 | 已补 new-api 默认边界、locale alias/fallback、outside-days、popover trigger ARIA state 和键盘回归；仍需完整 range/disabled 边界、移动密度和 Firefox/Safari 矩阵 | P1 | 单测、demo、Chrome/Edge 键盘与主题验证 |
| `web/src/components/datetime-picker.tsx` | DateTimePicker | `packages/core/components/src/date-picker/DateTimePicker.vue` | 已存在但行为不完整 | 已补秒级输入、清除、日期时间合并、非法时间草稿保留、aria-invalid 和受控越界日期保护；仍需移动布局和完整键盘矩阵 | P1 | 单测、表单 demo、键盘/移动浏览器验证 |
| `web/src/components/password-input.tsx` | PasswordInput | `packages/core/components/src/password-input/PasswordInput.vue`，`packages/core/forms/src/FormField{Render,Nodes}.vue` | 只有 primitive，缺少框架组合 | 已补 new-api 密码/文本切换、Eye/EyeOff、disabled、aria-label、原生属性转发和 `Password` schema 映射；仍需真实认证页面和跨浏览器矩阵 | P1 | 组件/表单单测、demo/template、light/dark、桌面/移动键盘浏览器验证 |
| `web/src/components/tag-input.tsx` | TagInput | `packages/core/components/src/tag-input`，forms 内置 `TagInput` / `tag-input` | 已存在但行为不完整 | 已补受控 string[]、Enter/逗号/blur 提交、空白/去重、删除/退格、中文输入法保护、disabled/readOnly、原生属性和提交式校验；视觉依据及浏览器验证范围见 `docs/tag-input.md` | P1 | 组件/表单单测、公开 demo、light/dark、桌面/移动键盘浏览器验证 |
| `web/src/components/status-badge.tsx` | StatusBadge | `packages/core/components/src/status-badge` | 已存在但行为不完整 | 已补颜色映射、dot/pulse、copyable、text/underline 类型、dark token、copyable focus-visible ring 和 Vue 类型上下文；仍需真实 Firefox/Safari 与复杂嵌套 overlay 矩阵 | P1 | 单测、demo、light/dark/键盘浏览器验证 |
| `web/src/components/empty-state.tsx` | EmptyState | `packages/core/components/src/empty-state/EmptyState.vue` | 已存在但行为不完整 | 已对齐默认图标/标题、300px 高度、w-full/gap-4/rounded-xl/border-dashed/p-6 surface、紧凑标题、action 内容间距和 bordered 语义；仍需无障碍、主题和移动密度矩阵 | P1 | 单测、demo、light/dark/desktop/mobile 浏览器验证 |
| `web/src/components/error-state.tsx` | ErrorState | `packages/core/components/src/empty-state/ErrorState.vue` | 已存在但行为不完整 | 已对齐 retry/action 可选语义、alert/live 区域、new-api surface/标题/图标/action 密度和错误视觉；仍需读屏与主题矩阵 | P1 | 单测、错误状态 demo、键盘/读屏/主题浏览器检查 |
| `web/src/components/loading-state.tsx` | LoadingState | `packages/core/components/src/empty-state/LoadingState.vue` | 已存在但行为不完整 | 已对齐 block/inline 密度、尺寸、aria-busy/live、单一 status 语义、装饰性 loader 和 reduced-motion；仍需主题和移动密度矩阵 | P1 | 单测、loading demo、light/dark/desktop/mobile/reduced-motion 浏览器验证 |
| `web/src/components/table-action.tsx`、`web/src/components/data-table/core/row-action-menu.tsx`、`web/src/components/data-table/static/static-row-actions.tsx` | TableAction / RowAction / StaticRowActions | `packages/core/components/src/data-table/DataTableRowActions.vue`、`StaticRowActions.vue` | 已存在但行为不完整 | 已补 new-api 静态编辑按钮、ellipsis 菜单、w-48 destructive 删除项和独立 disabled/ARIA；仍需 permission/loading 完整组合矩阵 | P1 | 单测、DataTable demo、键盘/焦点/主题浏览器验证 |
| `web/src/components/data-table/toolbar/bulk-actions.tsx` | BulkAction | `packages/core/components/src/data-table/DataTableBulkActions.vue` | 已存在但行为不完整 | 已对齐 floating/inline 视觉、Escape/箭头、tooltip、选择语义和 3 秒 live announcement 生命周期；跨浏览器矩阵仍需持续对照 | P1 | 单测、DataTable 浏览器矩阵 |
| `web/src/components/ui/chart.tsx`、页面 chart compositions | Chart / ChartCard | `packages/core/components/src/chart/ChartCard.vue`、`packages/ui-kit/shadcn-vue/src/components/ui/chart` | 已存在但行为不完整 | 已补 config 驱动 label/color 图例、chart token fallback、new-api tooltip/legend surface、空态、加载/错误、稳定 data-chart root 和响应式容器；仍需跨浏览器 resize 矩阵 | P1 | 单测、图表 demo、light/dark/resize 浏览器验证 |
| `web/src/components/layout/components/app-sidebar.tsx` | Sidebar | `packages/core/layouts`、`packages/ui-kit/shadcn-vue/src/components/ui/sidebar` | 已存在但行为不完整 | 已补 collapsed parent active scope、hover/click、文字颜色、分组/order 和移动抽屉验证；仍需长期跨浏览器矩阵 | P0 | layout 单测、真实浏览器鼠标/键盘/移动验证 |
| `web/src/components/layout/components/nav-group.tsx` | NavGroup | `packages/core/layouts` | 已存在但行为不完整 | 已补分组标题、嵌套菜单、expanded/mobile 父项不误 active、collapsed parent scope、order 和折叠态 tooltip；仍需长期跨浏览器矩阵 | P0 | router/layout 单测、真实浏览器验证 |
| `web/src/components/ui/tooltip.tsx` | Tooltip | `packages/core/components/src/overlay/FrameworkTooltip.vue` | 已存在但行为不完整 | 已补 open/defaultOpen/update:open 受控契约并保留 new-api surface、箭头、delay、disabled；仍需移动端触发差异与 Firefox/Safari 矩阵 | P1 | 单测、demo、Chrome 桌面/移动键盘/hover/focus 验证 |
| `web/src/components/ui/popover.tsx` | Popover | `packages/core/components/src/overlay/FrameworkPopover.vue` | 已存在但行为不完整 | 已对齐 new-api `bg-popover`/foreground、w-72、圆角/间距、ring/shadow、z-index、side-aware 动画和 framework data-slot；仍需 Firefox/Safari 与复杂嵌套 overlay 矩阵 | P1 | 单测、键盘/Escape/outside、主题/移动浏览器验证 |
| `web/src/components/command-menu.tsx`、`web/src/components/ui/command.tsx` | Command | `packages/core/components/src/command-menu`、ui-kit command | 已存在但行为不完整 | 已对齐 root/input/list/group/item/empty/shortcut 的 new-api surface token、间距、选中/禁用/focus-visible 和 top-third surface；异步命令、第三方插件与 Firefox/Safari 矩阵另立 Issue | P1 | 单测、demo、键盘浏览器验证 |
| `web/src/components/ui/combobox.tsx`、`web/src/components/ui/combobox-input.tsx` | Combobox | `packages/core/components/src/select/Combobox.vue` | 已存在但行为不完整 | 已补父子选项搜索路径、aria-controls 指向实际 CommandList/listbox、可用叶子键盘高亮、Escape/选择后焦点恢复和 new-api popup surface；仍需远程异步搜索、多选 chips 与 Firefox/Safari 矩阵 | P1 | 单测、select demo、桌面/移动键盘与主题浏览器验证 |
| `web/src/components/ui/select.tsx` | SelectBox | `packages/core/components/src/select/SelectBox.vue` | 已存在但行为不完整 | 已补 SelectGroup 边界、递归层级、叶子 icon/description/disabled 与 new-api surface；仍需真实桌面/移动键盘矩阵 | P1 | 单测、select demo、键盘/主题浏览器验证 |
| `web/src/components/ui/calendar.tsx` | Calendar | `packages/core/components/src/calendar/FrameworkCalendar.vue`、ui-kit Calendar | 已存在但行为不完整 | 已补 FrameworkCalendar 默认 `showOutsideDays=true` 且允许显式 false；仍需 range/disabled/locale、slot 和主题 token 完整矩阵 | P1 | 单测、date picker demo、键盘/主题浏览器验证 |

## 源码范围补充盘点

### DataPanel 状态组合（Issue #459）

`packages/core/components/src/data-panel/DataPanel.vue` 已提供 toolbar、footer、
fixedHeight、loading、empty、error/retry props、状态 slots 和共享状态组件组合。
Issue #459 已补齐 DataPanel 自身的 `loading`/`empty`/`error` 状态契约、测试、
demo/template 和 API 文档；DataTableEmpty、DataTableCardGrid 与 ChartCard 继续
作为独立后续 Issue。

| new-api 源文件 | 组件名称 | HealSeek Frame 落点 | 当前状态 | 缺口 | 优先级 | 验证方式 |
| --- | --- | --- | --- | --- | --- | --- |
| `web/src/components/truncated-text.tsx` | TruncatedText | `packages/core/components/src/data-table/TruncatedText.vue` | 已存在但行为不完整 | 已保留长文本抽取、tooltip、键盘焦点和空值语义；富内容 tooltip slot 与完整 DataTable 组合矩阵仍需持续对照 | P1 | 单测、DataTable demo、键盘/hover 验证 |
| `web/src/components/data-table/core/truncated-cell.tsx` | TruncatedCell | `packages/core/components/src/data-table/TruncatedCell.vue` | 已存在但行为不完整 | 已增加 Vue `#tooltip` 富内容 slot，并保留 badge/VNode 文本抽取、列宽和 tooltip 内容；跨浏览器矩阵仍需持续对照 | P1 | 单测、DataTable 浏览器验证 |
| `web/src/components/multi-select.tsx` | MultiSelect | `packages/core/components/src/select/MultiSelect.vue` | 已存在但行为不完整 | 已补 chip 多选、搜索、disabled、allowCreate、批量输入、maxVisibleChips、hint/icon、copy chip；远程异步搜索和复杂跨浏览器矩阵另立 Issue | P1 | 单测、demo/template、Chrome 交互验证 |
| `web/src/components/layout/components/page-footer.tsx` | PageFooter | `packages/core/components/src/section-page/PageFooter.vue` | 已存在但行为不完整 | 已对齐 SectionPage portal host 的 new-api `bg/border/px/py/empty` surface，并保留 sticky/compact；仍需完整 footer action 组合矩阵 | P2 | 单测、SectionPage 浏览器验证 |
| `web/src/components/config-drawer.tsx` | ConfigDrawer | `packages/core/layouts` / app preference composition | 业务组件，不迁移 | 依赖 new-api 业务偏好和应用状态；仅迁移通用 Drawer/表单/设置项组合能力 | P2 | 记录边界，不迁移业务实现 |
| `web/src/components/layout/components/authenticated-layout.tsx` | AuthenticatedLayout | `packages/core/layouts` / `packages/core/app` | 业务组件，不迁移 | 依赖 new-api 认证和业务导航；只保持 AppShell/layout 合同 | P2 | 记录边界，不迁移业务实现 |
| `web/src/components/layout/components/chat-presets-item.tsx` | ChatPresetsItem | 无 | 业务组件，不迁移 | 依赖聊天业务数据和交互 | P3 | 记录边界，不迁移业务实现 |
| `web/src/components/model-group-selector.tsx` | ModelGroupSelector | 无 | 业务组件，不迁移 | 依赖模型业务和渠道数据 | P3 | 记录边界，不迁移业务实现 |

## 统一组件验收清单

每个后续组件 Issue/PR 必须逐项报告：

- API：props、emits、slots、默认值和受控/非受控语义
- 状态：disabled、loading、empty、error、active、hover、focus-visible
- 交互：鼠标、键盘、Escape、outside click、焦点进入和恢复
- 布局：desktop、mobile、折叠、滚动容器和层级
- 主题：light、dark、theme preset、颜色 token、focus ring、radius、density
- 可访问性：role、aria-label、aria-controls、aria-expanded、aria-invalid、live region
- 组合：与 Form、Modal、Drawer、Tabs、DataTable 的实际组合
- 交付：单元测试、边界测试、demo、create-app template、README/API 文档
- 差异：明确记录尚未验证的维度和后续 Issue，不在当前 PR 无限扩展

## 框架边界

- 组件代码只能进入 `packages/core`、`packages/ui-kit` 和必要的 demo/template/docs。
- `app-ui` 只放业务扩展。
- `apps/airhaven` 仅用于本地验证，不能提交、推送或进入 PR。
- 不迁移 new-api 的业务页面、渠道 API、用户 API、权限业务规则。

## 2026-10-15 证据快照

以下结果来自当前 `dev` 工作区和 new-api revision
`a0bf6a8a412764bc296a8e27cf8c4aaa3f3f0ed9`。快照记录已验证事实，不代表整张盘点表已经完成迁移。

### 自动化验证

| 命令 | 结果 |
| --- | --- |
| `pnpm lint` | 通过；全仓 22 个 lint task 完成 |
| `pnpm --filter @healseek/components test` | 通过；60 个测试文件、177 个测试 |
| `pnpm --filter @healseek/forms test` | 通过；5 个测试文件、55 个测试 |
| `pnpm --filter @healseek/layouts test` | 通过；6 个测试文件、15 个测试 |
| `pnpm --filter @healseek/router test` | 通过；2 个测试文件、21 个测试 |
| `pnpm --filter @healseek/stores test` | 通过；3 个测试文件、13 个测试 |
| `pnpm --filter playwright build` | 通过；保留既有 `@theme`、Rolldown annotation、chunk size 警告 |
| `pnpm build` | 通过；playwright、mock-api、airhaven 本地构建均完成，未提交 airhaven 产物 |

### 浏览器矩阵

Chrome 和 Edge 均使用本机可执行文件运行，demo 地址为
`http://127.0.0.1:5290`：

- `verify:primitives`：Calendar、Command、Combobox、dark、mobile 通过；Chrome 与 Edge 均通过。
- `verify:overlays`：Dialog、Drawer、右侧 Drawer、mobile Escape、focus 通过；Chrome 与 Edge 均通过。
- `verify:sidebar`：展开/折叠、active/hover/focus/disabled、dropdown Escape、主题、mobile Sheet 通过；Chrome 与 Edge 均通过。
- `verify:sectionpage`：sticky title、tabs、footer portal、长滚动、light/dark、320×844 通过；Chrome 与 Edge 均通过。
- `verify:datatable`：桌面、选择、ViewOptions、暗色、移动卡片通过；Chrome 与 Edge 均通过。
- `verify:json-form`：自定义 FormField、非法草稿保留、validate、reset 通过；Chrome 与 Edge 均通过。

### 仍未验证的范围

- Firefox、Safari 及其特有的 focus/portal/scroll 行为。
- 复杂嵌套 overlay 的跨层 focus stack、第三方浏览器差异。
- DataTable 全量服务端过滤/排序/取消请求在真实业务网络下的长时间并发行为。
- 业务应用组合、权限语义和真实生产数据；这些属于应用层验证，不进入框架 PR。

## 2026-10-15 continuation evidence

The following framework-only increments are merged into `dev` after the prior
snapshot: [#338](https://github.com/Airsado/airovo-frame/pull/338)
MultiSelect chips/input, [#340](https://github.com/Airsado/airovo-frame/pull/340)
Combobox input group, [#342](https://github.com/Airsado/airovo-frame/pull/342)
DateTimePicker row visuals, [#344](https://github.com/Airsado/airovo-frame/pull/344)
FrameworkTooltip trigger/surface, [#346](https://github.com/Airsado/airovo-frame/pull/346)
FrameworkPopover trigger/surface,
[#348](https://github.com/Airsado/airovo-frame/pull/348) DataTable row surfaces,
[#350](https://github.com/Airsado/airovo-frame/pull/350) DataTable density,
[#352](https://github.com/Airsado/airovo-frame/pull/352) SelectBox surface,
[#354](https://github.com/Airsado/airovo-frame/pull/354) SearchSelect input,
[#356](https://github.com/Airsado/airovo-frame/pull/356) collapsed sidebar child
surface, and [#358](https://github.com/Airsado/airovo-frame/pull/358)
DataTableToolbar search surface, and [#365](https://github.com/Airsado/airovo-frame/issues/365)
DataTableViewModeToggle with table/card persistence.

### Current automated evidence

| Command | Result |
| --- | --- |
| `pnpm lint` | Passed; all 22 workspace lint tasks |
| `pnpm --filter @healseek/components test` | Passed; 66 test files, 192 tests |
| `pnpm --filter @healseek/layouts test` | Passed; 6 test files, 15 tests |
| `pnpm --filter playwright exec vue-tsc --noEmit` | Passed |
| `pnpm build` | Passed; existing LightningCSS `@theme`, Rolldown annotation, and chunk-size warnings remain |

Recent Chrome evidence includes the DataTable matrix (desktop selection,
ViewOptions, dark theme and mobile cards), Sidebar matrix (collapsed dropdown
active states, reduced motion, mobile Sheet/Escape/outside), SelectBox and
SearchSelect desktop/mobile selection, overlay click/Escape/outside/focus, and
the DateTimePicker, Tooltip and Popover targeted demos. These targeted checks
were run against temporary local demo ports and are evidence for the listed
surfaces only; they do not mark the inventory complete.

Firefox and Safari remain unverified. Long-running server-side DataTable
concurrency, complex nested overlay stacks, and real business application
composition remain outside framework completion evidence. `apps/airhaven` was
not changed or included in these increments.
