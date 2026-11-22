# Routing and forms

This note describes the current runtime path. The demo and starter are the
reference applications; framework packages do not own business routes or APIs.

## Router registration

`apps/<app>/src/router/index.ts` registers its route modules and view whitelist
before `createApp()`:

```ts
registerAppRouter({
  routes: import.meta.glob('./routes/modules/**/*.ts', { eager: false }),
  pages: import.meta.glob('../views/**/*.vue'),
  menus: { load: loadMenus, normalize: normalizeMenus },
  beforeEach: [],
  beforeResolve: [],
  afterEach: [],
})
```

The literal globs must remain in app source so Vite can find the files. A
backend menu's `component` value is a `/views/...vue` path. The framework
resolves it only from the registered `pages` map. Route metadata in
`packages/core/router/src/routeTypes.ts` controls labels, groups, icons,
visibility, layout, permissions, tabs and KeepAlive.

`createApp({ root, preferences })` resolves preferences, creates one Pinia,
i18n, router and Axios client, runs the app's request setup and session
restoration, installs framework guards, permission filtering and tabs, then
installs vue-router. It returns only `{ mount }`.

On navigation, the progress guard runs first, followed by authentication,
permission, dynamic-menu handling and finally application guards. The
framework's `beforeResolve` and `afterEach` hooks finish before app hooks
registered for those stages. The auth guard sends guests to `/login`; the
permission guard sends denied routes to `/403`. The menu source is called in
`backend` and `mixed` modes, and the framework registers its permitted
pages as dynamic routes. The application may add guards but does not replace
these framework guards.

`FrameworkRouter.menus` is computed from local and dynamic menus with the
permission filter. `FrameworkRouter.progress` drives the AppShell loading
bar. AppShell renders layout, route content, tabs, toaster and the expired
session dialog. It selects `route.meta.layout` before
`preferences.layout.mode`; routes marked `ignoreLayout` render directly.
AppShell slots let an app extend header, sidebar, tabs, content and footer.

## Form contract

`useForm(options)` returns `[Form, formApi]`. `useAForm(options)` returns
`{ AForm, api, values, errors, isSubmitting, submitForm }`. Both use one
`FormApi` implementation and the same vee-validate context. The composables
are not Pinia stores.

```ts
const [Form, formApi] = useForm({
  schema: [
    {
      fieldName: 'email',
      label: 'Email',
      component: 'Input',
      rules: z.string().email(),
    },
  ],
  handleSubmit: async (values) => { /* app action */ },
})
```

`FormApi` owns schema changes, values, validation, submit and field focus.
Its `errors` is a Vue `Ref<Record<string, string>>`; the form context watch
updates that ref. `AForm` and field renderers read it for form-level and
field-level messages. Required fields render a visible mark beside the label.
Schema conditions and component props can be functions receiving
`{ values, api }`. The form renderer maps framework field types to primitive
controls and framework compositions, including SelectBox.

Focused tests are in `packages/core/forms/src/*.test.ts`. Run
`pnpm --filter @healseek/forms test` for behavior and
`pnpm --filter playwright exec vue-tsc --noEmit` for the source-consumed
cross-package type contract.
