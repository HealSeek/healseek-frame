# Authentication views

`Login` and `Register` are presentation components exported from `@healseek/views/auth`.
Applications own authentication, verification emails and account recovery APIs.

`Register` keeps its original four fields by default. Optional registration fields
can be enabled without replacing the whole view:

```vue
<Register
  :password-min-length="10"
  :display="{ showSecurityFields: true, showVerificationToken: true }"
  :loading="submitting"
  @submit="registerAccount"
/>
```

- `passwordMinLength` defaults to `6`; invalid or nonpositive values use `6`.
  The field hint, placeholder and validation message use the same minimum.
- `showSecurityFields` enables required `securityQuestion` and `securityAnswer`.
- `showVerificationToken` enables an optional `verificationToken`; empty input
  submits `undefined`. Disabled optional fields are absent from the payload.
- These field/validation options are initialization settings. Remount the view
  to change them. `loading` continues to update the existing form.
- `text` overrides the display copy. Framework Chinese and English translations
  include the optional fields and parameterized password policy messages.

These options only configure presentation and emitted `RegisterValues`. An
application must enforce its policy and validate verification tokens on its server.

Run the auth view regressions through the existing form test toolchain:

```sh
pnpm --filter @healseek/forms exec vitest run --config ../views/vitest.config.mts
```
