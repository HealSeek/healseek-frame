# Starter 接入指南

`pnpm create:app <name>` 会在 `apps/<name>` 生成一个业务应用起点。模板已经包含
preferences、请求自注册、路由自注册、语言包自注册、认证 handlers 和默认 `_core`
页面，可直接连接仓库内 Nitro mock API。

## 入口装配

```ts
import './api/request'
import './router'
import './locales'

import App from './App.vue'
import preferences from './preferences'
import { createApp } from '@healseek/app'

const { mount } = await createApp({ root: App, preferences })
mount('#app')
```

`createApp()` 不接收 auth、Axios、Pinia、路由模块、菜单函数或第三方适配器。

## 应用目录

```text
src/
  preferences.ts
  api/
    request.ts
    core/auth.ts
    core/user.ts
    core/menu.ts
  auth/handlers.ts
  router/index.ts
  router/routes/modules/*.ts
  locales/index.ts
  views/_core/*.vue
  views/*.vue
```

### 请求和认证

`src/api/request.ts` 调用 `registerRequestSetup()` 注册 baseURL、业务请求头、错误
toast 和响应解包，并调用 `registerSessionRestore(restoreSession)`。应用的
`src/api/core/auth.ts`、`user.ts`、`menu.ts` 通过 `getRequestClient()` 获取框架唯一
Axios 实例。

`src/auth/handlers.ts` 统一实现 `handleLogin`、`handleRegister`、`restoreSession`、
`logout`、`handleReauthenticate`。refresh、用户信息、业务错误码和路由跳转都属于
应用层；框架 auth store 只保存 session/token 状态。

### 路由和动态菜单

`src/router/index.ts` 使用静态字面量 glob：

```ts
registerAppRouter({
  routes: import.meta.glob('./routes/modules/**/*.ts', { eager: false }),
  pages: import.meta.glob('../views/**/*.vue'),
  menus: { load: loadMenus, normalize: normalizeMenus },
})
```

后端菜单的 `component` 使用 `/views/...` 页面路径，框架只允许解析应用 pages glob
中的文件。`frontend`、`backend`、`mixed` 模式由 `preferences.app.menusMod` 控制。
应用追加的 `beforeEach[]`、`beforeResolve[]`、`afterEach[]` 按框架守卫顺序执行。

### 页面和 app-ui

登录、注册、个人资料和错误页在 `src/views/_core/` 保留应用级文件，默认引用
`@healseek/views`，需要自定义时直接编辑应用文件。业务页面放在 `src/views/`；业务组合
组件放在 `app-ui/`。`packages/core/components`、`layouts`、`forms`、`composables`
提供框架级能力，不能把这些内置组件复制回 `app-ui`。

## 运行和验证

```bash
pnpm dev <name> --mock         # 同时启动应用和 127.0.0.1:4174 的 Mock API
pnpm --filter <name> exec vue-tsc --noEmit
pnpm --filter @healseek/app test
```

模板默认可演示登录、注册错误、401 refresh、硬刷新恢复、动态菜单、权限过滤、403、
404、主题、语言、tabs、会话过期重认证，以及 DataTable 服务端查询、Modal/Drawer
嵌套表单、SSE 实时日志和 follow-tail。模板中的业务 API、响应 envelope 和认证
handlers 仍属于应用层，接入真实后端时替换 `src/api/core/*` 与
`src/auth/handlers.ts` 即可。
