# CLAUDE.md

Repository guidance for coding agents working on a reusable Vue 3 admin framework.
The public overview is in README.md; this file records implementation boundaries.

## Workspace and commands

- pnpm 9.15.4 and Node 20.19.x (or >= 22.12.0) are required by Vite 8. Run `pnpm install` after editing a
  package manifest or the workspace catalog.
- `pnpm dev` selects an app from `apps/*` interactively and asks whether to include
  the Nitro mock API. `pnpm dev <app>` starts only that app; add `--mock` when needed.
  `pnpm dev:demo` starts the demo with mock API (127.0.0.1:4174; demo port 5174).
  `pnpm dev:all` starts all apps, excluding internal tool watchers. These commands
  retain Turbo's dependency builds. `pnpm dev --list` lists runnable apps.
- `pnpm --filter playwright exec vue-tsc --noEmit` typechecks the demo and the
  source-consumed framework packages.
- `pnpm --filter @healseek/<package> test` runs a package's Vitest suite.
- `pnpm lint` runs package lint tasks; `pnpm build` runs the dependency-ordered
  build. Rebuild `@healseek/vite-config` after changing its source because apps
  consume its dist output.
- `pnpm create:app <name>` builds the local CLI and scaffolds an app.

## Ownership

```text
apps/playwright/          demo app and integration showcase
apps/mock-api/            Nitro API for the demo and starter
packages/core/app/        createApp, AppShell, locale registration
packages/core/config/     Preferences defaults, resolution and persistence
packages/core/router/     routing, menu modes, dynamic routes and progress
packages/core/request/    one Axios client, token injection, error normalization
packages/core/stores/     framework Pinia stores, including auth and tabs
packages/core/layouts/    sidebar, header, inset layout and settings
packages/core/components/ framework UI compositions
packages/core/views/      default UI views, including Login and Register
packages/core/forms/      useForm, useAForm, AForm and FormApi
packages/ui-kit/shadcn-vue/ CLI-managed shadcn-vue primitives
app-ui/                   application-owned business compositions and DIY extensions
internal/create-app/      app starter template and CLI
```

Do not put framework UI in app-ui or hand-edit shadcn-vue primitives for framework
styling. Compose primitives in packages/core/components. Third-party component
providers belong in the application, not a framework adapter package.

## Startup contract

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

`createApp()` accepts only `root` and optional partial `preferences`; it returns
only `mount`. It creates the single Pinia, i18n, Axios and Router runtime. Do not
pass an Axios instance, Pinia instance, route modules, auth API or component
provider through `createApp()`.

Application modules register before startup:

- `api/request.ts` calls `registerRequestSetup()` for baseURL, headers,
  interceptors and error toasts, plus `registerSessionRestore()`.
- `router/index.ts` calls `registerAppRouter()` with lazy route-module glob,
  views glob, menu source and optional navigation guards.
- `locales/index.ts` calls `registerAppLocales()` with app translations.
- `api/core/*.ts` calls `getRequestClient()` after runtime startup.
- `auth/handlers.ts` owns login, registration, token refresh, session restore,
  logout and reauthentication. Framework auth stores only session state.

The starter and demo are integration examples. Keep app endpoints and backend
payload conversion in those apps. Framework request code injects the access token
and normalizes failures; the app owns 401 single-flight refresh and user-facing
error handling.

## Routing and shell

Route modules and page components must be discovered with literal app-side Vite
`import.meta.glob()` calls. Dynamic backend menu components use a `/views/*.vue`
path and can resolve only against the registered app views glob. The router
supports frontend, backend and mixed menu modes. The framework installs
progress, auth, permission and dynamic-menu guards before application guards.

Render `AppShell` from the app root. It owns layout, route content, tabs,
loading bar, toaster and session-expired dialog. AppShell slots provide header,
sidebar, tabs, content and footer extensions; app auth handlers are passed as
props. Default Login/Register views are presentation-only: application wrapper
views call the app's auth handlers.

The layout's outer height is `h-svh`; its flex children need `min-h-0` and
`min-w-0`. The content area is the scroll container. Tabs live within the
content area and should not receive sticky positioning or a top offset.

## Preferences and i18n

Framework defaults live in `packages/core/config/src/preferences`. Each app
defines `src/preferences.ts` with `definePreferences({ ... })` and passes the
partial value to `createApp()`. App structure settings such as home path,
menu mode, auth enablement, layout mode and header visibility are not restored
from user cache. Appearance settings such as theme, locale, density, sidebar
state and content width may be persisted. The storage key is versioned.

Framework translations are the fallback. App locale modules merge on top;
the framework preference and i18n stores own the active language.

## Forms and source consumption

`useForm(options)` returns `[Form, formApi]`; `useAForm(options)` returns the
object-style surface. Both use the same `FormApi`, schema, values, errors and
submit behavior. The form implementation and tests are in
`packages/core/forms/src`. Form schema dynamic properties receive
`{ values, api }` and required fields render an explicit label mark.

Most core packages and shadcn-vue are consumed from source. The app's
`vue-tsc --noEmit` catches cross-package type errors. The shadcn-vue CSS
scans core packages through its Tailwind `@source` directives.

The `@` alias is reserved for shadcn-vue internals; app source uses `#`.
Do not redefine `@` in an app Vite config. Source packages used by the demo
must remain in the Vite dependency exclusion list.
