# 公共 API 迁移表

| 旧入口 | 当前入口 | 迁移说明 |
|---|---|---|
| `useAForm(options)` 返回对象 | `useForm(options)` 返回 `[Form, formApi]` | 旧入口标记 deprecated；两者共享同一个 `FormApi`。 |
| 页面自行镜像表单 errors | `formApi.errors` | 错误状态由 controller 提供，AForm 和字段渲染读取同一份 Ref。 |
| 自建 Dialog 状态与异步确认 | `useModal(options)` + `modalApi` | 使用 `open/close/confirm/cancel/setData/setState`，由 ModalHost 管理遮罩与焦点。 |
| `BasicLayout` 直接承载页面 | `BasicLayoutHost` | 由路由 `meta.layout` 选择默认、mix 或 full-content 壳层。 |
| app 页面深路径导入 core 文件 | 包公开入口（如 `@healseek/components`、`@healseek/layouts`） | app-ui 边界脚本会阻止 `@healseek/*/src/*` 和 `packages/core/*` 导入。 |
| 业务卡片塞入 layouts/core | `app-ui` 组合层 | 保留业务语义、可替换，不绑定 demo 路由/store。 |
| `@healseek/app-ui` 中的通用 `UserCard` / `StatCard` / `StatusBadge` / `EmptyState` / `ResultPage` | 同名导出自 `@healseek/components` | 通用能力已迁移到框架层；app-ui 只保留领域组合，避免同名覆盖。 |

迁移后应运行：

```bash
pnpm lint
pnpm --filter @healseek/forms test
pnpm --filter @healseek/app-ui check:boundaries
pnpm --filter playwright exec vue-tsc --noEmit
```
