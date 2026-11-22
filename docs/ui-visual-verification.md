# 视觉验收记录

> 各记录只证明对应日期、版本与范围内的实际观察。README 预览截图与历史交互验收分开记录，不使用历史截图推断当前版本已通过完整验收。

## README 预览截图（2026-11-22）

- 源码版本：`4f2fdba`，HealSeek Frame 品牌与 `@healseek/*` 包名更名提交；未包含本地未提交的认证逻辑改动。
- 运行方式：`pnpm dev:demo`，使用公开 Demo 与独立 Nitro Mock API。默认前端端口 `5174` 已占用，本次实例实际使用 `http://localhost:5175`；未停止原有服务。
- 视口：1280 × 720，桌面浏览器；使用本地 Mock 演示账号，不使用私有业务应用或真实业务数据。
- 已观察并保存：概览页浅色与深色切换、表单系统页面顶部的 JsonField 编辑区、媒体组件页的本地图标选择器展开状态；页面标题显示 `HealSeek Frame Demo`。
- 截图：[浅色工作台](assets/readme/overview-light.jpg)、[深色工作台](assets/readme/overview-dark.jpg)、[表单系统](assets/readme/form-system.jpg)、[媒体与图标组件](assets/readme/components.jpg)。
- 验证限制：本轮是 README 静态展示取景，不代表全部组件交互、移动端、主题持久化、权限与认证流程已完成浏览器回归。
- 额外观察（未定位）：一次站内切换至数据展示子页后正文为空；浏览器日志另有两条 `CommandSearch.onShortcut` 读取 `undefined.toLowerCase` 的异常。未将这些情况报告为通过，也未在本轮品牌与文档工作中修改实现，需另行独立复现。

## 2026-09-28 历史验收环境

以下 `5174` 记录使用临时 Chrome CDP fallback；当时 `5174` 子进程曾重启，恢复后 `/src/main.ts` 返回 200。未列入当日“已实测”的目标清单，不使用历史截图推断为已完成。

## 本轮 5174 验收（已实测部分，2026-09-28）

- 视口：1440×900、1280×800、390×844。
- 壳层：Header/Sidebar 融合、inset 内容区、侧栏展开/折叠、父子菜单和移动 Sheet。
- Header：搜索、语言、消息、主题、设置和用户入口在实际使用的 Header 中可见并可交互。
- 组件页：Dialog、`useModal`、DatePicker/DateTimePicker（popover）和 DataTable 正常渲染并完成基本操作。
- 工程链路：表单验证、KeepAlive 缓存行为、并发 401 刷新和登录过期 Modal 已完成实际操作；控制台、页面异常和请求失败检查为 0。
- 左边缘复核：移除 `SidebarInset` 自定义 `z-10` 后，1440px 展开态 rail 全宽可命中，点击可折叠；内容区左边缘使用参考组件的 shadow，并非实体 border。
- 证据截图：`C:/Users/Admin/AppData/Local/Temp/airovo-qa-final-components.png`、`airovo-qa-final-desktop-expanded.png`、`airovo-qa-final-desktop-collapsed.png`、`airovo-qa-final-theme.png`、`airovo-qa-final-mobile.png`。

## 本轮 5174 待补验项目

- 新增底部 Drawer 已有 `ComponentsDemo` 入口，尚需实际验证打开/关闭、固定 header/footer、body 滚动、遮罩与弹出/收起动画。
- 登录过期 `page` 模式及 redirect 恢复。
- 完整 tabs 操作矩阵：刷新、关闭当前/其他/全部、钉住、右键菜单、最大化和 query/params 场景。
- 主题偏好刷新持久化、抽屉/Sheet 动画 easing，以及自定义滚动条的可见性和交互。
- 权限过滤、`v-permission`、backend/mixed 菜单变化，以及语言切换后的路由/菜单/面包屑/tab 标题。
- `Analytics`、`NavigationDemo`、`Preferences`、`MyFormDemo`、`LayoutDemo` 等页面的逐页视觉复验。

## 历史动态复测（2026-09-28，供参考）

- 页面身份：`http://localhost:5174/dashboard/overview`，标题为 `Playwright Demo`，无 Vite/运行时错误覆盖层，控制台 error/warn 为 0。
- 侧栏叶子链接：实际渲染为 `[data-sidebar="menu-button"]` 的原生 `<a>`，`分析` 链接 href 为 `/dashboard/analytics`。
- 键盘导航：聚焦侧栏 `分析` 后按 Enter，进入 `/dashboard/analytics`；20ms 内顶部 `route-progress` 宽度约 383px、opacity 约 0.74，导航完成后淡出。
- 修饰键导航：Ctrl+左键侧栏 `分析` 在新标签页打开 `/dashboard/analytics`，当前标签页保持 `/dashboard/overview`；测试标签页已关闭。
- 父子导航：`导航示例2` 从 `closed` 切换为 `open`，显示 `父子导航` 与 `布局示例` 两个子链接；再次点击回到 `closed`，子链接不可见。
- 主题抽屉：抽屉 x=992、宽度 448、高度 900；header 高 79px、footer 高 65px，重置按钮可见。切换深色后 `dark` class 和 `airovo-preferences-playwright-newapi-layout-demo-v3` 持久化值变为 `dark`；点击“恢复全部默认”后恢复 `system` 并移除 `dark` class。深色按钮文字色为 `oklch(0.808 0.114 19.571)`，背景为半透明深色，具备可读对比度。
- 动态证据：`C:/Users/Admin/AppData/Local/Temp/airovo-qa/navigation-theme-dynamic-results.json`、`navigation-parent-results.json` 及对应 PNG 截图。

## 收尾复核（2026-09-28）

- 此前端口无监听期间未把历史截图当作侧栏修复后的证据；上方记录仅作为此前交互结果，本轮边缘修复另见“本轮 5174 验收”。
- 静态检查与动态结果一致：叶子菜单、展开子项和折叠菜单子项均使用 `router.resolve(item.url).href` 生成原生链接；普通左键由 Vue Router 接管，修饰键和非左键保留浏览器原生行为。

## 组件演示页复测（2026-09-28）

- 入口：`http://localhost:5174/dashboard/components`，页面不再出现空白，组件演示内容完整渲染。
- 已验证 Dialog 打开/关闭、`useModal` 打开/取消、DatePicker/DateTimePicker 控件渲染和 DataTable 排序表头。
- 该页面及桌面布局复测期间 console error、page exception 和 request failure 均为 0。
- 证据截图：`C:/Users/Admin/AppData/Local/Temp/airovo-qa-final-components.png`、`airovo-qa-final-desktop-expanded.png`、`airovo-qa-final-desktop-collapsed.png`、`airovo-qa-final-theme.png`、`airovo-qa-final-mobile.png`。

## 早期视觉复验（2026-09-28，非本轮完成度证据）

- 入口：`http://localhost:5174/dashboard/overview`。
- 登录：用户授权的 mock 账号 `admin / 123456`。
- 视口：1440×900、1280×800、390×844。
- 交互：主题设置抽屉、Header 搜索/语言/主题/消息/用户入口、父子导航、移动端 Sheet。
- 结果：三种视口均无横向溢出；`body` 保持 `overflow: hidden`；console error 与 page exception 均为 0。
- 临时证据：`C:/Users/Admin/AppData/Local/Temp/airovo-frame-visual-20260928/visual-results.json` 及同目录三张 PNG 截图。

## 验收范围

以下历史验收的目标页面为 `/dashboard/overview`，服务地址为 `http://localhost:5174`。用户已授权使用本地 mock 账号 `admin / 123456`。本轮服务状态见文首，历史结果不能替代本轮待补验项目。

## 验收结果（2026-09-27）

| 文件 | 视口 | 观察结果 |
|---|---:|---|
| [`overview-1440.png`](assets/ui-visual/overview-1440.png) | 1440×900 | 登录成功并进入 overview；Header、侧栏和 inset 工作区可见。搜索、语言、设置、消息四个入口均有 DOM 且可见。内容区独立滚动，inset 圆角约 22.4px。 |
| [`overview-1280.png`](assets/ui-visual/overview-1280.png) | 1280×800 | 桌面 Header 工具区可见，窄视口布局正常。 |
| [`overview-390.png`](assets/ui-visual/overview-390.png) | 390×844 | 移动端按响应式保留搜索、主题和账户入口，无页面宽度溢出；移动端 Sheet 导航可见并带 `data-mobile=true`。 |
| [`settings-1440.png`](assets/ui-visual/settings-1440.png) | 1440×900 | 主题设置抽屉成功打开。抽屉 x=992、宽度 448、高度 900；中部滚动区域约 745px，header/footer 位置固定。 |

浏览器验收全程无 console errors 或 page errors；body 高度和宽度均未溢出视口。mock 用户头像已移除外部 URL。

## 历史交互与状态记录（非本轮完成度证据）

- 搜索、语言、消息、设置、用户菜单均可打开（交互脚本结果均为 `true`）。
- 语言切换后 HTML `lang` 可变为 `en-US`，恢复中文后为 `zh-CN`。
- 深色模式切换后 `dark` class 和 preferences localStorage 均生效。
- 主题设置抽屉中部可滚动，header/footer 保持固定。
- 路由切换时顶部 progress DOM 存在；点击“分析”期间 opacity 为 1，宽度从 523 增长到 1436，导航完成后逐步淡出。
- 移动端 Sheet 可见且无错误。
- 认证硬刷新后仍停留在 `/dashboard/overview`；直接访问 `/dashboard/navigation` 保持登录并进入目标路由。

## 历史检查清单（已记录能力，不等同本轮逐项验收）

- [x] 1440×900、1280×800、390×844 布局与 Header 入口。
- [x] inset 内容区、独立滚动和无 body 溢出。
- [x] 搜索、语言、消息、设置、用户菜单入口交互。
- [x] 主题模式与 preferences localStorage 持久化。
- [x] 主题设置抽屉中部滚动、固定 header/footer。
- [x] radius token 对齐 new-api：`--radius: 1rem`，`sm=.6rem`、`md=.8rem`、`lg=1rem`、`xl=1.4rem`。
- [x] 路由顶部加载条显示、增长和淡出。
- [x] 移动端 Sheet 导航可见且无错误。
- [x] 认证硬刷新和 direct navigation。
- [x] 控制台与页面错误检查。
- [x] 抽屉 reset 按钮的完整业务效果与深色模式对比度。
- [x] 父子导航展开/折叠与子链接可见性。

差异判断结合 new-api 源码对照表 [`ui-source-map.md`](ui-source-map.md) 与实际 Vue/CSS 渲染树。
