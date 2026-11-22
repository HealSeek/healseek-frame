# UI 源码对照表

这份表只记录已经读取过的参考源码和在本项目中的落点，避免凭截图猜测布局行为。

## new-api UI

| new-api 源码 | 读取到的行为 | HealSeek Frame 落点 |
|---|---|---|
| `web/src/components/layout/components/authenticated-layout.tsx` | 认证壳层组合 Header、SidebarProvider、SidebarInset；内容区作为独立 inset 工作区 | `packages/core/layouts/src/basic/layout.vue`、`LayoutHost.vue` |
| `web/src/components/layout/components/header.tsx`、`app-header.tsx` | Header 与侧栏共享壳层，工具区承载搜索、语言、通知、主题/设置和用户操作 | `packages/core/layouts/src/basic/header/header.vue` 与 `basic/components/*`；业务导航交由 `business` 插槽 |
| `web/src/components/layout/components/app-sidebar.tsx`、`nav-group.tsx`、`nav-link-item.tsx` | 分组导航、父子菜单、普通项 muted hover、当前项 sidebar-accent active 及独立滚动 | `packages/core/layouts/src/basic/sidebar/sidebar.vue`、`packages/core/layouts/src/basic/theme.css`、`packages/ui-kit/shadcn-vue/src/components/ui/sidebar/*`；菜单项和文字统一 pointer 光标 |
| `web/src/components/ui/sidebar.tsx` | inset 变体使用 margin、圆角和阴影；侧栏可折叠且内容区独立滚动 | `packages/ui-kit/shadcn-vue/src/components/ui/sidebar/*`、`packages/core/layouts/src/basic/layout.vue`；展开态由原生 shadow 表现左边缘，rail 保持可命中，`SidebarInset` 不加自定义 `z-10` |
| `web/src/components/config-drawer.tsx`、`drawer-layout.ts` | 设置抽屉头尾固定，中部内容滚动，提供预览和 reset | `packages/core/layouts/src/basic/components/LayoutSettings/*`、`packages/core/composables/src/*` |
| `web/src/context/theme-customization-provider.tsx`、`lib/theme-customization.ts` | 主题 preset/font/radius/scale/contentLayout 统一状态并映射为 data 属性 | `packages/core/config/src/preferences/*`、`packages/core/stores/src/preferences/*` |
| `web/src/context/theme-provider.tsx`、`context/theme-customization-provider.tsx` | 主题模式、系统主题监听、偏好状态与 DOM class/data 属性同步 | `packages/core/stores/src/theme/*`、`packages/core/stores/src/preferences/*`、`packages/core/config/src/preferences/*` |
| `web/src/styles/theme.css`、`styles/theme-presets.css`、`lib/theme-radius.ts`、`lib/theme-storage.ts` | 主题 token、预设、圆角映射和持久化键集中定义 | `packages/ui-kit/shadcn-vue/src/styles/globals.css`、`packages/core/config/src/preferences/*`、`packages/core/stores/src/preferences/*` |
| `web/src/lib/lobe-icon.tsx`、`components/react-icon-by-name.tsx`、`assets/custom/icon-theme-*.tsx` | 图标按名称解析，主题/布局预览使用本地 SVG 图标组件 | `packages/shared/src/icons/*`（本地 Lucide collection，85 项）、`packages/core/layouts/src/basic/components/LayoutSettings/*` |
| `web/src/components/layout/components/section-page-layout.tsx` | 页面标题、面包屑、操作区和内容区通过复合布局插槽组合 | `packages/core/components/src/section-page/SectionPage.vue` |
| `web/src/components/ui/card.tsx`、`features/dashboard/components/ui/stat-card.tsx` | Card 使用 `bg-card`/ring/圆角构成容器层级；StatCard 组合图标、数值、趋势和可选 sparkline | 本仓库尚无独立 `Card` primitive；对应 token 与容器样式用于 `packages/core/components/src/stat-card/*`、`data-panel/*`、`metric-strip/*`，不能把该行视为 Card API 已迁移 |
| `web/src/components/ui/dialog.tsx`、`sheet.tsx`、`drawer.tsx`、`scroll-area.tsx` | Dialog/Sheet/Drawer 的遮罩、方向动画和滚动区域由基础组件统一提供 | `packages/ui-kit/shadcn-vue/src/components/ui/dialog/*`、`sheet/*`、`scroll-area/*` 提供基础控件；独立公开 Drawer API（Header/Footer/Body）位于 `packages/core/components/src/drawer/*`，基于 reka Dialog primitive；Modal controller 位于 `packages/core/composables/src/modal/*`。Drawer 尚待浏览器复测 |
| `web/src/components/search.tsx`、`command-menu.tsx` | 命令搜索由 header 入口打开，搜索内容与导航状态解耦 | `packages/core/layouts/src/basic/components/CommandSearch/index.vue` |
| `web/src/components/language-switcher.tsx`、`src/i18n/languages.ts` | 语言菜单使用统一 locale 列表并切换全局消息 | `packages/core/layouts/src/basic/components/LanguageSwitch/index.vue`、`packages/core/layouts/src/i18n.ts` |
| `web/src/components/notification-popover.tsx`、`stores/notification-store.ts` | 消息入口与通知状态分离 | `packages/core/layouts/src/basic/components/MessageDropdown/index.vue` |
| `web/src/components/layout/components/mobile-drawer.tsx` | 移动端使用抽屉承载导航，桌面端保留固定侧栏 | `packages/core/layouts/src/basic/layout.vue`、`packages/ui-kit/shadcn-vue/src/components/ui/sheet/*` |
| `web/src/components/ui/__tests__/dialog-layout.test.tsx` | 对话框内容布局和滚动区域边界需稳定 | `packages/core/composables/src/ModalHost.vue` 与 ui-kit Dialog/Sheet |
| `web/src/components/layout/components/authenticated-layout.tsx` 中的内容区结构 | tabs 应与页面一起位于 inset 工作区，不形成额外顶部空白 | `packages/core/layouts/src/basic/layout.vue` 的 `tabs` 插槽及 `packages/core/tabs/src/components/BasicTabBar.vue`；tab strip 不使用 `sticky`、`z-30` 或顶部偏移 |
| `web/src/components/ui/*` 中可复用的数据、状态、页面组合 | 通用交互与外观属于框架能力，与应用业务语义分离 | `packages/core/components/src/*`；`app-ui` 仅存开发者扩展，不作为框架组件所在地 |

## vue-vben-admin 工程

| vben 源码 | 读取到的行为 | HealSeek Frame 落点 |
|---|---|---|
| `packages/@core/preferences/src/preferences.ts`、`use-preferences.ts`、`update-css-variables.ts` | 偏好集中管理，状态变化同步 CSS token | `packages/core/config/src/preferences/manager.ts`、`packages/core/stores/src/preferences/index.ts` |
| `packages/locales/src/i18n.ts`、`apps/web-antd/src/locales/index.ts` | 框架消息先装载，应用语言包按需合并，切换同步 HTML lang | `packages/core/layouts/src/i18n.ts`、`packages/core/stores/src/i18n/index.ts`、`packages/core/app/src/createApp.ts` |
| `apps/web-antd/src/router/guard.ts`、`access.ts`、`router/index.ts` | 路由守卫、访问模式和动态路由分层 | `packages/core/router/src/createRouter.ts`、`packages/core/app/src/createApp.ts`、`packages/core/permission/*` |
| `vue-vben-admin` 的 preferences drawer 源码 | 偏好入口和设置抽屉作为布局能力复用 | `packages/core/layouts/src/basic/components/LayoutSettings/*` |
| `packages/@core/ui-kit/shadcn-ui/src/ui/form/useFormField.ts` | 表单字段上下文和错误状态通过 composable 统一暴露 | `packages/core/forms/src/useForm.ts`、`AForm.vue`、`FormApi` |
| `packages/@core/ui-kit/tabs-ui/src/tabs-view.vue`、`components/tabs/tabs.vue`、`components/tabs-chrome/tabs.vue`、`use-tabs-view-scroll.ts` | 标签页视图、Chrome 风格标签、刷新/关闭工具和滚动位置独立管理 | `packages/core/tabs/src/components/BasicTabBar.vue`、`packages/core/stores/src/tabs/*`、`packages/core/layouts/src/basic/useTabScroll.ts` |
| `packages/@core/preferences/src/config.ts`、`use-preferences.ts`、`apps/web-antd/src/router/routes/modules/demos.ts` | `tabbar.keepAlive` 与路由 `keepAlive` 元数据共同决定缓存行为 | `packages/core/stores/src/tabs/*`、`apps/playwright/src/App.vue` 的 `KeepAlive`、`RouteMeta.cacheName` |
| `packages/@core/ui-kit/popup-ui/src/modal/use-modal.ts`、`modal.vue`、`modal-api.ts`、`__tests__/use-modal.test.ts` | Modal 由 controller/API 驱动，支持 payload、异步确认、关闭钩子、焦点和 loading | `packages/core/composables/src/modal/*`（`useModal`、`ModalApi`、`ModalHost`） |
| `apps/web-antd/src/router/guard.ts`、`router/access.ts`、`layouts/auth.vue`、`layouts/basic.vue` | 认证守卫、登录页、访问菜单/路由过滤和登录过期弹窗在应用壳层协作 | `packages/core/app/src/createApp.ts`、`packages/core/router/*`、`packages/core/permission/*`、`packages/core/views/src/Login.vue`、`apps/playwright/src/App.vue` |
| `packages/@core/preferences/src/types.ts`、`config.ts`，以及 `packages/locales/src/langs/*/authentication.json` | refresh token 开关、登录过期模式和认证文案属于可配置契约；当前参考快照未提供独立 request/auth transport 包 | `packages/core/stores/src/auth/*`、`packages/core/request/src/interceptor.ts`、`packages/core/config/src/preferences/*`、`packages/core/layouts/src/locales/*` |
| vben composable/controller patterns | Modal/Form 由 controller 驱动，页面只消费 API | `packages/core/composables`、`packages/core/forms` |

## 维护规则

1. 新增布局或工程能力前先在这里记录参考源码路径和可观察行为。
2. 参考项目只提供交互/结构依据；组件实现仍遵循本仓库的 Vue 3、shadcn-vue/reka-ui 分层。框架级组件放 `packages/core`，`app-ui` 是应用扩展层。
3. 视觉差异要记录实际视口和截图文件，不使用主观“看起来像”作为验收标准。
