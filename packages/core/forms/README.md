# @healseek/forms

`useForm` creates the form renderer and its controller in a Vue component setup:

```vue
<script setup lang="ts">
import { useForm } from '@healseek/forms'

const [Form, formApi] = useForm({
  schema: [
    { fieldName: 'name', label: 'Name', component: 'Input', rules: 'required' },
  ],
  handleSubmit: async (values) => {
    await save(values)
  },
})

function reset() {
  formApi.resetForm()
}
</script>

<template>
  <Form />
</template>
```

The older `useAForm` object return remains available for existing apps and uses the same `FormApi` controller. `AForm` is the internal renderer and reads schema, errors, values and runtime props from its `api` prop.

Several `useForm`/`useAForm` calls can share one component setup, including forms rendered in separate or nested modals. Each renderer scopes validation, values, errors and field arrays to its own controller, including when rendering `<AForm :api="formApi" />` directly. Controllers belong to the calling component's lifecycle: `await formApi.setValues(values)` works before opening a modal, and temporarily unmounting its form renderer does not clear the controller. Reset explicitly with `resetForm()` when a new editing cycle should discard saved values.

Every field value has the existing array shape: `{ name: [{ value: 'Ada' }] }`. Set `ArrayField` to change the row key and `array: true` to allow multiple rows. `initialValues` uses that same shape.

Built-in `component: 'Password'` (and the lowercase `password` alias) maps to
`@healseek/components` `PasswordInput`. It owns the `password`/`text` type toggle
and forwards the schema's native attributes to the input. A schema `type` value
is ignored by that component so callers cannot bypass the visibility state;
use `toggleAriaLabel` to provide a localized accessible label. The same mapping
is used for top-level fields and nested `children` fields.

Built-in `ColorPicker` / `color-picker` fields select one HEX string. The
top-level shape is `{ theme: [{ value: '#c2410c' }] }`, with `''` as the empty
default. Nested fields store the string directly. `componentProps` forwards
`presets`, `showAlpha`, `clearable`, `readonly` and other picker options.
Optional/required rules validate HEX format and explicit Zod rules remain
unchanged. Picker changes clear committed validation errors; reset and disabled
state use the normal form controller contract.

Built-in `DatePicker`/`date` and `DateTimePicker`/`datetime` fields map to
`DatePickerField`. When no `defaultValue` is provided, their empty value is
`undefined`, matching the date picker model contract; explicit defaults are
preserved. This applies to top-level fields, nested `children`, and rows added
to array fields.

`DateRangePicker`/`daterange` and `DateTimeRangePicker`/`datetimerange` expose
one range field with a `[Date, Date] | undefined` value. The datetime version
includes time selection; `componentProps` forwards options such as `presets`,
`minDate`, `maxDate`, `locale` and `clearable`. A top-level form value retains
the standard row wrapper: `{ period: [{ value: [start, end] }] }`; nested
non-array children use the tuple directly. Empty ranges default to `undefined`.
Use `rules: 'required'` for a required range, or an explicit tuple schema such
as `z.tuple([z.date(), z.date()])` for custom validation. Convert dates into API formats in the
application, keeping inclusive/exclusive end-time rules out of the component.

The controller exposes `getValues`, `setValues`, `setFieldValue`, `setFieldError`, `resetForm`, `resetFields`, `validate`, `validateField`, `clearValid`, `submitForm`, `updateSchema`, `resetSchema`, `appendSchemaByField`, `removeSchemaByField`, `setProps` and `scrollToField`. `formApi.values` and `formApi.errors` are reactive refs. Custom components that emit `parse-error` are synchronized into `FormApi.errors` by the renderer, so JSON draft errors participate in FieldError, aria-invalid, validation and reset flows. `setProps({ disabled, loading, showDefaultActions, layout, wrapperClass, handleSubmit })` updates the rendered form. The default layout is vertical, placing labels above inputs; pass `layout: 'horizontal'` when a specific form needs inline labels. Input, Textarea and action buttons use the public core control compositions.

`formApi.isDirty` reports whether current values differ from the form baseline.
After loading an edit record, use `resetForm(recordValues)` to establish that
record as a pristine baseline. `markPristine()` adopts current values after a
successful save without changing them. Both preserve false, zero and empty
values; independent form controllers retain independent baselines. Calling
`resetForm()` without values continues to restore the configured `initialValues`.

Schema fields can use `show`, `disabled`, `defaultValue` and `componentProps` functions with `{ values, api }`. For fields whose state depends on other fields, use the Vben-inspired `dependencies` contract:

```ts
{
  fieldName: 'notificationEmail',
  label: '通知邮箱',
  component: 'Email',
  dependencies: {
    triggerFields: ['notify'],
    show: ({ values }) => values.notify?.[0]?.value === 'enabled',
    required: ({ values }) => values.notify?.[0]?.value === 'enabled',
    rules: ({ values }) => values.notify?.[0]?.value === 'enabled'
      ? 'required,email'
      : undefined,
    componentProps: ({ values }) => ({
      placeholder: values.notify?.[0]?.value === 'enabled'
        ? '请输入通知邮箱'
        : '未启用通知',
    }),
    onChange: (value, { api }) => {
      // A dependent field may update another field through the same controller.
      api.setFieldValue('lastChanged[0].value', value)
    },
  },
}
```

`triggerFields` documents the values that drive the dependency. `if` removes a field from the render tree, `show` keeps it mounted while hiding it, `disabled` controls the input, `required` adds/removes the framework required marker and required validation, `rules` replaces the field rule, and `componentProps` patches component props. `onChange` runs after the field value is written and receives the public field path and current form controller. The generated Zod schema follows visible fields and dynamic rules. Passing an explicit `validation` Zod schema overrides generated validation; its author is responsible for hidden-field rules. Async Zod refinements are supported.

The demo app uses this contract together with `useModal`: a dense advanced-configuration field opens a child form, confirmation writes the child values back through `FormApi.setFieldValue`, and cancel/close/escape leave the parent form unchanged. This is an application-side composition pattern; the framework form renderer remains reusable and does not own business dialogs.

Fields whose `rules` contain the `required` token, or whose Zod schema is not optional, automatically append a red `*` to the framework label/legend and expose `aria-required="true"` on the rendered control. Fields without a required rule, and fields using an optional Zod schema, keep the label unchanged; the base shadcn/vue field components are not modified.

Validation errors appear below the corresponding field, without a form-level summary banner. Invalid submissions still focus the first invalid control and emit `submit-fail` for application handling.

Generated control IDs are scoped to each mounted renderer with Vue `useId`; do not rely on the old `AForm-<field>` IDs in application selectors. Labels and array legends reference their own renderer's controls. `scrollToField('name[0].value')` accepts the rendered field path and searches only the controller's mounted forms. Closing a renderer unregisters its DOM while preserving controller values for reopening.

Run `pnpm --filter @healseek/forms test` for controller and rendered-form tests, then typecheck the consuming app with `vue-tsc`.
