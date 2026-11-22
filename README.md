# HealSeek Frame

[![GitHub](https://img.shields.io/badge/GitHub-HealSeek%20Frame-181717?logo=github)](https://github.com/Airsado/airovo-frame)
[![Branch](https://img.shields.io/badge/branch-dev-orange)](https://github.com/Airsado/airovo-frame/tree/dev)
[![Node](https://img.shields.io/badge/Node.js-20.19%2B-339933?logo=node.js)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9.15.4-F69220?logo=pnpm)](https://pnpm.io/)

一个面向 Vue 3 中后台应用的可复用框架工作区。项目把**框架能力**与**业务应用**分开：框架提供布局、主题、i18n、认证状态、权限、请求基础能力、路由守卫、tabs 和表单系统；应用负责页面、业务路由、API、认证流程和业务组件。

当前代码位于 `dev` 分支，属于持续完善中的早期版本。它适合学习、二次开发和构建演示应用；在稳定 API 和正式版本发布前，请不要把它当作生产版本依赖。

## 命名

- 框架名称：**HealSeek Frame**；根工作区包名：`healseek-frame`（不发布）。
- 框架与工具包统一使用 `@healseek/*`，例如 `@healseek/app`、`@healseek/forms`、`@healseek/vite-config`。
- 脚手架包：`@healseek/create-app`，CLI 入口：`create-healseek`；仓库内仍使用 `pnpm create:app <name>`。
- 应用名称和 `VITE_APP_NAMESPACE` 保持不变，避免更名后丢失已有登录状态和偏好设置；历史存储键继续兼容。

执行 `pnpm test:branding` 检查工作区包名、内部依赖、源码引用和生产环境配置的一致性。

GitHub 链接仍指向当前实际仓库。本地更名不包含 GitHub 仓库转移、远端更名或 npm 发布。

## 特性

- `createApp({ root, preferences })` 作为应用唯一启动入口。
- 应用通过副作用导入自注册请求、路由、语言包和会话恢复逻辑。
- 基于 new-api 风格的工作区布局：融合的 header/sidebar、圆角内容区、主题设置和 tabs。
- 基于 vben-admin 思路的 preferences、路由、i18n、权限和请求边界。
- 框架级组件位于 `packages/core`；`app-ui` 只承载应用业务组合和 DIY 扩展。
- `AForm`、`useAForm`、`useForm` 和 `FormApi` 共用一套表单契约，支持校验、动态字段、必填标记和 Modal 联动。
- 框架 `DataTable` 与 `useDataTable` 分离展示和请求状态，支持服务端分页、筛选、排序、当前页选择、取消旧请求和错误重试。
- 框架 SSE transport/session 支持 Last-Event-ID、退避重连、心跳监测、终态、暂停恢复和有界去重缓冲。
- Nitro mock API 提供登录、注册、refresh token、动态菜单、权限和错误处理演示。
- `create-app` 脚手架生成可直接连接 mock API 的业务应用模板。
- shadcn-vue 基础组件源码保留在 ui-kit 中，由框架组件进行组合。

## 环境要求

- Node.js `20.19.x` 或 `22.12+`
- pnpm `9.15.4`

```bash
corepack enable
corepack prepare pnpm@9.15.4 --activate
pnpm --version
```

仓库的 `preinstall` 会检查 pnpm 版本。修改依赖或 workspace 配置后重新执行 `pnpm install`。

## 快速开始

```bash
pnpm install

# 启动演示应用及其 Nitro mock API
pnpm dev:demo
```

打开 <http://localhost:5174/dashboard/overview>，使用演示账号 `admin / 123456` 登录。mock API 默认地址为 <http://127.0.0.1:4174>。

根目录的启动命令会自动发现 `apps/*` 中包含 `dev` 脚本的应用，新建应用无需修改启动脚本：

```bash
# 方向键选择应用，回车确认；随后选择是否同时启动 Mock API
pnpm dev

# 直接启动指定应用（支持 package.json 的 name 或应用目录名）
pnpm dev my-app
pnpm dev --app @scope/my-app

# 使用默认 Mock API 的应用可在同一个终端同时启动
pnpm dev my-app --mock

# 列出应用，或显式启动所有应用
pnpm dev --list
pnpm dev:all

# 只查看将运行的 Turbo 任务，不启动服务
pnpm dev my-app --dry-run
```

选定应用后仍由 Turbo 执行依赖预构建，但不会顺带启动其它应用或脚手架的监听任务。
交互中按 `Ctrl+C` 可取消；没有交互终端时必须明确指定应用或使用 `dev:all`。
接入真实后端时不加 `--mock`；演示应用和新生成模板默认使用 Mock API。
需要透传 Vite 参数时，继续使用 `pnpm --filter <package-name> dev --port 5180`。

当只需要验证框架包时，可以运行：

```bash
pnpm build
pnpm lint
pnpm --filter playwright build
pnpm --filter mock-api typecheck
pnpm --filter @healseek/forms test
pnpm --filter @healseek/app test
```

## 创建业务应用

脚手架只能在当前工作区根目录或 `apps/` 目录运行，因为生成应用使用 workspace 依赖：

```bash
pnpm create:app my-app
pnpm install
pnpm dev my-app --mock
```

生成的应用会包含：

```text
apps/my-app/
  src/main.ts                  # 导入注册模块并调用 createApp()
  src/preferences.ts           # 覆写框架默认偏好
  src/api/request.ts           # 应用请求头、响应解包和错误处理
  src/api/core/                # 业务 API
  src/auth/handlers.ts         # 登录、注册、恢复、重认证和退出
  src/router/                  # 业务路由和动态菜单
  src/locales/                 # 应用语言包
  src/views/_core/             # 可替换的默认登录/注册/错误页面
  .env*                        # 应用标题、端口和 API 地址
```

## 启动契约

```ts
import './api/request'
import './router'
import './locales'

import App from './App.vue'
import preferences from './preferences'
import { createApp } from '@healseek/app'

const { mount } = await createApp({
  root: App,
  preferences,
})

mount('#app')
```

`createApp()` 只接收 `root` 和可选的 `preferences`，只返回 `mount()`。Pinia、i18n、Axios、Router、认证守卫、权限、tabs 和布局上下文由框架创建；应用不需要注入第二个 Pinia、Axios 或 Router。

应用通过这些注册器接入框架：

- `registerRequestSetup()`：注册 baseURL、业务请求头、拦截器和应用错误处理。
- `registerSessionRestore()`：在硬刷新时恢复 refresh token 和用户信息。
- `registerAppRouter()`：注册业务路由、页面 glob、动态菜单和追加守卫。
- `registerAppLocales()`：注册应用语言包，覆盖框架 fallback。
- `getRequestClient()`：从框架获取唯一 Axios 实例。

## 框架与应用边界

```text
apps/
  playwright/                 # 完整演示应用
  mock-api/                   # Nitro mock 服务
app-ui/                       # 应用业务组合组件和 DIY 扩展
packages/
  core/app/                   # createApp、AppShell、启动上下文
  core/components/            # 框架级页面容器和业务无关组件
  core/composables/           # useModal、toast 等控制器
  core/config/                # Preferences 类型、默认值和持久化
  core/forms/                 # AForm、useForm、useAForm、FormApi
  core/layouts/               # header、sidebar、tabs 容器和主题设置
  core/permission/            # RBAC、菜单过滤和权限指令
  core/request/               # Axios、token 注入和 RequestError
  core/router/                # 路由、动态菜单和默认守卫
  core/stores/                # auth、theme、i18n、preferences、tabs
  core/tabs/                  # tabs/KeepAlive 控制器
  core/views/                 # 纯 UI 的默认登录、注册、错误页面
  ui-kit/shadcn-vue/          # shadcn-vue 基础组件源码
  shared/                     # 图标和通用工具
internal/
  create-app/                 # 应用脚手架
  vite-config/                # defineViteConfig()
```

框架负责通用能力，应用负责业务。需要替换登录界面时，直接修改应用的 `src/views/_core/Login.vue`；需要修改登录 API 时，修改应用的 `src/api/core/auth.ts` 和 `src/auth/handlers.ts`，不需要改动框架包。

## 环境变量

演示应用和脚手架按 `.env`、`.env.development`、`.env.production` 分层：

- `VITE_APP_TITLE`、`VITE_APP_NAMESPACE`：应用身份。
- `VITE_PORT`、`VITE_BASE`：前端开发和部署设置。
- `VITE_GLOB_API_URL`：请求 API 地址。
- `VITE_NITRO_MOCK`：是否启用本地 mock 代理。
- `VITE_ROUTER_HISTORY`：路由 history 模式。

`VITE_*` 会被 Vite 注入浏览器，不能放密码、私钥或其他敏感信息。机器相关覆盖请放在 `.env.local` 或 `.env.<mode>.local`，这些文件不会提交。

## 文档

- [框架能力与启动契约](docs/architecture/framework-capabilities.md)
- [新应用接入指南](docs/architecture/starter-integration.md)
- [路由、请求和认证迁移说明](docs/architecture/api-migration.md)
- [表单与路由架构](docs/architecture/routing-and-forms.md)
- [Issue 能力边界](docs/architecture/issue-capabilities.md)
- [贡献与修复流程](CONTRIBUTING.md)
- [Issue 模板、标签与 agent 操作规范](docs/issue-management.md)
- [Agent 仓库入口](AGENTS.md)
- [UI 参考源码映射](docs/ui-source-map.md)
- [UI 视觉验收记录](docs/ui-visual-verification.md)
- [app-ui 使用边界](app-ui/README.md)
- [Playwright 演示说明](apps/playwright/README.md)
- [Nitro mock API 说明](apps/mock-api/README.md)

## 开发约定

- 框架组件放在 `packages/core`，不要放进 `app-ui`。
- shadcn-vue 组件保持基础层定位；需要框架行为时在 `packages/core` 组合，不直接把业务逻辑写进基础组件。
- 应用路由、页面、API、认证 handlers 和第三方 Provider 放在 `apps/<name>`。
- 应用源代码使用 `#` 别名；`@` 保留给 shadcn-vue 内部路径。
- 修改 `internal/vite-config/src/config.ts` 后，先运行 `pnpm --filter @healseek/vite-config build`。
- 提交前至少执行与改动相关的 typecheck、lint、test 或 build。

## 项目状态

当前版本仍在 `dev` 分支迭代。后续会在 API、主题、布局、表单、认证、路由和脚手架稳定后，再合并到主分支并发布正式版本。欢迎通过 Issue 或 Pull Request 提交问题、建议和改进；涉及大范围架构调整时，请先说明使用场景和兼容性影响。

正式开源发布前还需要补充根目录许可证和版本发布流程；当前包内的 `MIT` 声明仅表示包级别的预期许可证信息。贡献和 Issue 修复流程见 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 参考项目与资料

本项目参考了以下开源项目和官方资料。参考内容主要用于布局、交互、工程分层和基础组件设计；本项目保留自己的 API、目录结构和实现，不将参考项目作为运行时适配层。

### 项目参考

- [new-api](https://github.com/QuantumNous/new-api) —— 参考后台布局、侧栏导航、工作区圆角容器、主题视觉、抽屉和交互细节。重点对照了其 [`app-sidebar.tsx`](https://github.com/QuantumNous/new-api/blob/main/web/src/components/layout/components/app-sidebar.tsx)、[`nav-group.tsx`](https://github.com/QuantumNous/new-api/blob/main/web/src/components/layout/components/nav-group.tsx)、[`nav-link-item.tsx`](https://github.com/QuantumNous/new-api/blob/main/web/src/components/layout/components/nav-link-item.tsx)、[`sidebar.tsx`](https://github.com/QuantumNous/new-api/blob/main/web/src/components/ui/sidebar.tsx) 和 [`theme.css`](https://github.com/QuantumNous/new-api/blob/main/web/src/styles/theme.css)。
- [vue-vben-admin](https://github.com/vbenjs/vue-vben-admin) —— 参考通用中后台工程结构、preferences、路由守卫、i18n、请求层、表单和 Modal controller。重点对照了其 [`preferences`](https://github.com/vbenjs/vue-vben-admin/tree/main/packages/%40core/preferences)、[`router`](https://github.com/vbenjs/vue-vben-admin/tree/main/packages/%40core/router)、[`request`](https://github.com/vbenjs/vue-vben-admin/tree/main/packages/%40core/request)、[`form-ui`](https://github.com/vbenjs/vue-vben-admin/tree/main/packages/%40core/ui-kit/shadcn-ui/src/ui/form) 和 [`modal`](https://github.com/vbenjs/vue-vben-admin/tree/main/packages/%40core/ui-kit/shadcn-ui/src/ui/modal) 相关实现。
- [shadcn-vue](https://www.shadcn-vue.com/) —— 参考可复制源码组件的组织方式和 CLI 工作流；基础组件位于 [`packages/ui-kit/shadcn-vue`](packages/ui-kit/shadcn-vue)。
- [Nitro](https://nitro.build/) —— 用于 `apps/mock-api` 的独立 mock 服务和演示 API。

### 官方资料

- [Vue 3 文档](https://vuejs.org/guide/introduction.html)
- [Vite 文档](https://vite.dev/guide/)
- [Tailwind CSS v4 文档](https://tailwindcss.com/docs)
- [Vue Router 文档](https://router.vuejs.org/)
- [Pinia 文档](https://pinia.vuejs.org/)
- [Vue I18n 文档](https://vue-i18n.intlify.dev/)
- [vee-validate 文档](https://vee-validate.logaretm.com/v4/)
- [pnpm workspace 文档](https://pnpm.io/workspaces)
