# @healseek/layouts

框架层的布局壳、导航和布局级插槽。

本包负责 `BasicLayout`、`BasicHeader`、`BasicSidebar` 和设置/i18n；面向业务页面的通用框架组件从 `@healseek/components` 导入：

布局系统参考 new-api 的后台工作区模式独立重写，框架负责壳层、导航和视觉偏好，业务包只提供菜单与页面内容。内置 `LayoutSettings` 设置抽屉，可切换侧栏布局、侧栏样式、内容宽度、主题和密度；偏好由 `@healseek/config` / `@healseek/stores` 持久化。

应用的 Tailwind CSS 入口应依次引入 `@healseek/uikit-shadcnui/style.css` 与
`@healseek/layouts/style.css`（脚手架已配置）。后者注册框架语义色工具类并加载主题；
布局组件自动加载的 `theme.css` 只含标准 CSS，不携带需 Tailwind 编译的指令。

- `LayoutSettings`：统一调整布局和外观偏好的设置抽屉。
- `CommandSearch`：Header 内置的菜单搜索，复用 `@healseek/components/command-menu`。
  点击或使用 `Ctrl+K`（macOS 为 `⌘K`）打开，输入后可用方向键和 Enter 导航，
  Escape 关闭并恢复焦点。搜索仅索引应用传入的可见菜单，按侧栏分组和顺序展示，
  支持一级菜单、多层子菜单名称及路径；禁用菜单不可跳转，外链在新标签页打开。
  `header.menuSearch*` locale keys 提供搜索文案。

`LayoutSettings` 的抽屉标题、说明、打开按钮和恢复默认按钮使用全局
`common.layoutSettings*` locale keys；显式 title/description props 仍优先。

这些组件属于框架内置能力，业务包只负责提供领域语义组件。布局包不再承载通用组件，也不再 re-export `@healseek/components`；应用应直接从 `@healseek/components` 导入页面、数据和交互封装。

```vue
<BasicLayoutHost :menus="menus">
  <RouterView />
</BasicLayoutHost>
```

For new-api-style contextual navigation, register optional path-driven sidebar
views. A matching view replaces the root menu, renders a back affordance, and
keeps the same grouping, ordering, active-state and collapsed-dropdown rules:

```ts
import type { SidebarView } from "@healseek/layouts";

const sidebarViews: SidebarView[] = [
  {
    id: "settings",
    pathPattern: /^\/settings(?:\/|$)/,
    parent: { title: "Dashboard", url: "/" },
    menus: [
      {
        title: "Profile",
        url: "/settings/profile",
        group: "Settings",
        order: 10,
      },
      {
        title: "Security",
        url: "/settings/security",
        group: "Settings",
        order: 20,
      },
    ],
  },
];
```

Pass the registry through `AppShell` or `BasicLayoutHost`:

```vue
<AppShell :sidebar-views="sidebarViews" />
```

The view transition respects `prefers-reduced-motion`; applications that do
not register views continue to render the root `menus` tree unchanged.

Menu entries may be kept visible but unavailable with `disabled: true`. The
framework preserves that state in sorted copies of the menu tree, exposes
`aria-disabled`, removes disabled anchors from the tab order, prevents route
navigation, and applies the primitive disabled opacity in expanded and
collapsed rendering:

```ts
{
  title: 'Restricted settings',
  url: '/settings/restricted',
  disabled: true,
}
```

The Playwright demo and create-app template include a disabled entry in the
contextual view fixture. Their mobile sidebar is opened through the standard
Sidebar trigger so outside dismissal and focus behavior can be checked without
using business routes.

For a repeatable browser pass, start the demo with `pnpm dev` and run
`pnpm verify:sidebar`. Set `SIDEBAR_MATRIX_URL`, `SIDEBAR_MATRIX_USERNAME`,
`SIDEBAR_MATRIX_PASSWORD`, or `SIDEBAR_MATRIX_BROWSER` when the demo is served
elsewhere or a specific browser executable is required. Set
`SIDEBAR_MATRIX_ENGINE=firefox` to launch Firefox instead of Chromium. The script reports the
desktop, theme, reduced-motion and mobile assertions as one JSON result.

The visible implementation differences from new-api are intentional: Vue uses
the framework's `SidebarView` prop registry instead of React context hooks,
`<Transition>` instead of `motion.div`, and the existing Reka Sheet/Dropdown
primitives instead of copying React primitives. The semantic tokens, menu
states, back affordance and route-driven replacement remain aligned.

Active state follows the new-api split between a parent scope and an exact
leaf: in expanded/mobile layouts, selecting a child opens its parent group but
does not paint the parent as selected; in collapsed desktop, the parent trigger
uses the active scope because its child is rendered in a dropdown. Leaf entries
use the `sidebar-accent-foreground` token, while an active child inside the
collapsed dropdown uses the new-api `secondary` surface and foreground token;
unselected entries only receive the muted hover surface. The framework marker
`data-app-sidebar-active="true"` is authoritative over primitive utility
classes so application CSS order cannot remove the selected text color.

The framework additionally emphasizes enabled navigation items with a 500 font
weight on hover (including parent, child and collapsed dropdown entries). This
is a framework presentation choice; new-api's reference only applies medium
weight to active top-level entries. Disabled entries retain their existing
appearance. These overrides live in the layout theme, not the ui-kit source.

Default typography follows new-api's browser `sans-serif` stack. Public Sans
is reserved for the explicit Sans font preference. At the default scale and a
16px root size, primary and child menu labels use `text-sm` (14px / 20px), while
group labels use 11px. Typography is configured in the framework theme without
changing ui-kit primitives or hard-coding sidebar sizes that bypass theme scale.

Header 右侧的业务区通过 `business` 插槽提供。默认只显示“开发者菜单”演示文本，框架不会把真实路由菜单复制到 Header；业务应用可以按需放入自己的链接或操作：

```vue
<BasicLayoutHost :menus="menus">
  <template #business>
    <nav class="flex items-center gap-4 text-sm">
      <RouterLink to="/orders">订单</RouterLink>
      <RouterLink to="/reports">报表</RouterLink>
    </nav>
  </template>
</BasicLayoutHost>
```

如果应用提供了完整的 `header` 插槽，该插槽会替换内置 Header，此时由自定义 Header 自己决定业务区内容。

`BasicLayoutHost` 也提供壳层插槽，应用可以替换局部实现而不复制整个布局：

```vue
<BasicLayoutHost :menus="menus">
  <template #header="{ title }">
    <MyHeader :title="title" />
  </template>
  <template #sidebar="{ menus, variant, collapsible }">
    <MySidebar :menus="menus" :variant="variant" :collapsible="collapsible" />
  </template>
  <template #content>
    <RouterView />
  </template>
  <template #footer>
    <AppFooter />
  </template>
</BasicLayoutHost>
```

没有提供这些具名插槽时，框架会使用内置 header、sidebar 和默认内容插槽。路由切换进度由 AppShell 读取框架布局上下文并驱动 `BasicLoadingBar`，应用不需要在每个页面重复处理加载状态。

默认布局读取 `preferences.layout`。路由的 `meta.layout` 仍可对单个页面覆盖，支持 `sidebar`、`mix` 和 `full-content`。

```vue
<PageContainer>
  <template #title>记录</template>
  <DataPanel>
    <DataTable :columns="columns" :data="rows" caption="记录列表">
      <template #cell-status="{ value }"><StatusBadge :status="value" /></template>
    </DataTable>
  </DataPanel>
</PageContainer>
```
