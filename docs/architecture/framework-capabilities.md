# 框架能力接入契约

## 启动入口

应用模块通过副作用导入完成自注册，启动入口只负责传入根组件和偏好覆盖：

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

`createApp()` 只接受 `{ root, preferences? }`，只返回 `{ mount }`。框架内部创建并
安装 Pinia、i18n、唯一 Axios、Router、权限、tabs 和布局上下文；应用不能注入第二个
Pinia 或替换框架实例。

## 注册器

- `registerRequestSetup()` 注册 base URL、应用请求 hooks 和业务错误处理。
- `registerSessionRestore()` 注册硬刷新时的 refresh token 恢复流程。
- `registerAppRouter()` 注册应用路由 glob、页面 glob、菜单获取/转换和三阶段守卫。
- `registerAppLocales()` 注册应用语言包 glob，框架语言包作为 fallback。
- `getRequestClient()` 和 `getAppRouter()` 供应用 API、handlers 获取框架创建的实例。

路由和语言包必须在 `createApp()` 之前注册。Vite 的 `import.meta.glob()` 使用应用
源码中的字面量路径：

```ts
registerAppRouter({
  routes: import.meta.glob('./routes/modules/**/*.ts', { eager: false }),
  pages: import.meta.glob('../views/**/*.vue'),
  menus: { load: loadMenus, normalize: normalizeMenus },
})
```

注册器是应用装配点，不是 `createApp()` 的兼容参数。

## Preferences、主题与 i18n

框架提供默认 preferences，应用在 `src/preferences.ts` 用 `definePreferences()` 只
覆盖需要修改的字段。结构配置（首页、菜单模式、布局和 header 入口）不会被旧缓存
覆盖；主题、语言、密度、侧栏状态和内容宽度按 storage version 持久化。

正式字段包括 `app.homePath`、`app.menusMod`、`auth`、`layout`、`theme`、`locale`、
`header.showSearch`、`showMessages`、`showLanguage`、`showTheme`、`showSettings`、
`showTabs`。主题设置由 AppShell 的 LayoutSettings 统一承载。

应用语言包覆盖框架同名 key，语言状态由 preferences/i18n store 统一管理。菜单、路由
标题和 tabs 可以使用 `titleKey`、`groupKey`。

## 路由、菜单与权限

支持 `frontend`、`backend`、`mixed` 三种菜单模式。后端菜单使用 vben 风格的页面
路径，例如：

```json
{
  "name": "DashboardOverview",
  "path": "/dashboard/overview",
  "component": "/views/dashboard/Overview.vue"
}
```

框架只从应用 `views` glob 白名单解析 `/views/...`，不执行任意文件路径。菜单合并、权限过滤、动态路由、403 跳转和
tabs/KeepAlive 协作由框架完成。

守卫顺序固定为：框架加载进度和基础守卫、认证守卫、权限守卫、动态菜单/路由处理、
应用追加的 `beforeEach[]`、`beforeResolve[]`、`afterEach[]`。

## 认证与请求边界

框架 auth store 只保存 session/token 状态：`setSession`、`setTokens`、`setUser`、
`clearSession`、`synchronizeSession`、`markSessionExpired`、`clearSessionExpired`、
`completeReauthentication`。登录、注册、刷新、用户信息、登出和重认证函数由应用的
`src/auth/handlers.ts` 实现，并调用应用 `src/api/core/*`。

`createApp()` 使用 `preferences.app.name` 隔离认证存储。每次登录或重认证调用
`setSession()` 都会建立新的 `sessionId`；刷新调用 `setTokens()` 保留身份。
异步刷新前先执行 `synchronizeSession()` 并记录 `sessionId` 和 refresh token，
响应返回时再次核对它们，再调用 `setTokens(tokens, expectedSessionId)`；返回 `false`
表示会话已失效，应丢弃结果。恢复用户信息、失败清理和异步登出也必须核对原会话，
不能将旧请求的结果写入新登录。Demo 和脚手架的 handlers 提供了完整接入示例。

框架 request 层只负责：

- 创建唯一 Axios 实例；
- 注入默认 Bearer token 和基础 JSON 请求头；
- 执行应用的请求/响应 hooks；
- 将 Axios/Nitro 错误标准化为 `RequestError`。

应用 `src/api/request.ts` 负责业务请求头、响应解包、错误 toast、401 单飞 refresh、
refresh 失败清理 session 和 `markSessionExpired()`。框架不强制弹窗。

## AppShell 与页面

AppShell 统一承载 sidebar、header、tabs、路由内容、加载条、Toaster 和会话过期重认证
弹窗。应用可以通过 `header`、`header-left`、`header-tools`、`header-right`、
`business`、`sidebar`、`tabs`、`content`、`footer` 插槽扩展业务内容。

框架 Login/Register 是纯 UI，只接收 loading/文案/显示项并 emit `submit(values)`。
应用在 `src/views/_core/*` 保留转发文件，需要自定义时直接替换应用文件。

## 表单、Modal 与 app-ui

`useForm`、`useAForm`、`AForm` 与 `FormApi` 共享字段 schema、校验、必填标记和提交
契约；`useModal` 提供框架 modal controller。`packages/core` 只维护框架级组件和布局，
`app-ui` 只维护业务组合、第三方组件接入和应用 DIY，不放框架内置组件。
