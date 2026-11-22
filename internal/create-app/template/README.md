# __APP_NAME__

This app is scaffolded with `@healseek/app`. It owns the business routes, API
modules, authentication handlers, and application-level components while the
framework provides the shell, request client, session state, permissions,
theme, and i18n services.

## Configure the app

The generated app follows the vben-admin environment layout. `.env` contains
stable application identity, while `.env.development` and `.env.production`
contain mode-specific server and API settings. Use `.env.local` or
`.env.<mode>.local` for ignored machine-specific overrides:

```text
VITE_APP_TITLE=__APP_TITLE__
VITE_APP_NAMESPACE=__APP_NAME__
VITE_PORT=5173
VITE_BASE=/
VITE_GLOB_API_URL=/api
VITE_NITRO_MOCK=true
VITE_ROUTER_HISTORY=web
```

`VITE_GLOB_API_URL` is used by the app request layer. During production builds
the framework Vite config emits it to `_app.config.js`, so a deployed bundle
can point at another API without being rebuilt. Keep secrets out of `VITE_*`
variables because Vite embeds them in the browser bundle.

The starter includes framework capability demonstrations:

- `dashboard/components`: DataTable and StaticDataTable (server-side query
  state and local array tables), Drawer, Modal, selectors, status components
  and bounded SSE LiveLog;
- `dashboard/my-form`: `useForm`, `AForm`, `FormApi`, dynamic fields,
  dependencies and nested Modal/Dialog form results;
- `dashboard/developer`: app-ui composition, permissions, request refresh and
  the controller-style form API.

The template's API modules and auth handlers remain application-owned. Replace
`src/api/core/*` and `src/auth/handlers.ts` when connecting a real backend;
framework packages should not be edited for business endpoint changes.

```bash
pnpm dev __APP_NAME__ --mock
```

Run `pnpm dev` to select an app interactively. When connecting a real backend,
disable `VITE_NITRO_MOCK` and start with `pnpm dev __APP_NAME__` instead.
