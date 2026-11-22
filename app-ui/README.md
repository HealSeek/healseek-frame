# @healseek/app-ui

`@healseek/app-ui` 是给开发者放置业务级组合组件和 DIY 扩展的可选目录。

框架通用组件从公开包导入：

- `@healseek/components`：页面容器、数据展示、统计卡片、状态徽章、结果页和空状态。
- `@healseek/layouts`：BasicLayout、header、sidebar 和布局级插槽。
- `@healseek/uikit-shadcnui`：Button、Dialog、Sheet、DatePicker 等基础 UI。
- `@healseek/forms` / `@healseek/composables`：表单和 Modal controller。

开发者可以在这里组合业务语义、接口数据和应用专属交互，而不修改框架组件。框架升级时，业务扩展层保持独立。

当前示例导出 `ServiceHealthCard`，脚手架的 `DeveloperDemo` 会直接展示它。它把服务健康状态、业务指标和操作插槽组合在一起，内部只依赖
`@healseek/components` 的 `StatusBadge` 等公开组件；真实项目可以按领域替换数据和插槽，而不会改变框架实现。

原先位于此目录的通用组件已迁移到 `@healseek/components`，不会在这里保留同名副本：

| 旧组件 | 框架入口 | 迁移说明 |
| --- | --- | --- |
| `UserCard` | `@healseek/components` | 通用用户展示和操作插槽 |
| `StatCard` | `@healseek/components` | 通用指标、趋势和 loading/error 状态 |
| `StatusBadge` | `@healseek/components` | new-api 风格状态展示 |
| `EmptyState` | `@healseek/components` | 空列表和操作提示 |
| `ResultPage` | `@healseek/components` | 结果/错误页面容器 |

因此 `app-ui` 不会覆盖框架组件，也不需要重新导出这些通用组件。应用只需从框架公开入口导入，
再在本目录组合领域语义组件。

运行 `pnpm --filter @healseek/app-ui check:boundaries` 可检查公开导入边界。
