import { computed, onBeforeUnmount, ref, watch, type Component, type ComputedRef, type Ref } from 'vue'
import type { DataTableRow, UseDataTableReturn } from '@healseek/components'
import { useAForm, type UseFormOptions } from './useAForm'
import type { FormApi } from './form-api'
import type { FormFieldSchema } from './types'

export type QueryFormValues = Record<string, unknown>

export type QueryFormNormalizer = (
    values: QueryFormValues,
    context: { schema: FormFieldSchema[] },
) => QueryFormValues

export interface DataTableQueryFormOptions<T extends DataTableRow = DataTableRow> {
    schema: FormFieldSchema[]
    initialValues?: QueryFormValues
    /** Apply normalized values to a table. Omit when the parent owns the request. */
    table?: Pick<UseDataTableReturn<T>, 'setFilters'>
    onApply?: (filters: QueryFormValues) => void | Promise<void>
    normalizeValues?: QueryFormNormalizer
    submitOnChange?: boolean
    changeDebounceMs?: number
    form?: Omit<UseFormOptions, 'schema' | 'initialValues' | 'handleSubmit'>
}

export interface DataTableQueryFormReturn {
    Form: Component
    api: FormApi
    draftValues: ComputedRef<QueryFormValues>
    appliedValues: Ref<QueryFormValues>
    submitting: ComputedRef<boolean>
    submit: () => Promise<QueryFormValues | null>
    reset: () => Promise<QueryFormValues | null>
    cancelPendingChange: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isWrappedValue(value: unknown): value is { value: unknown } {
    return isRecord(value) && Object.hasOwn(value, 'value')
}

/**
 * FormApi deliberately keeps one-field values in Vben-compatible
 * `{ field: [{ value }] }` form. Query adapters generally want a plain object,
 * so unwrap that transport shape while retaining real arrays and objects.
 */
export function unwrapQueryFormValue(value: unknown): unknown {
    if (Array.isArray(value)) {
        if (value.length === 1 && isWrappedValue(value[0])) {
            return unwrapQueryFormValue(value[0].value)
        }
        if (value.every(isWrappedValue)) {
            return value.map((item) => unwrapQueryFormValue(item.value))
        }
        return value.map(unwrapQueryFormValue)
    }
    if (isRecord(value)) {
        return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, unwrapQueryFormValue(item)]))
    }
    return value
}

function isEmptyQueryValue(value: unknown): boolean {
    if (value === undefined || value === null || value === '') return true
    return Array.isArray(value) && value.length === 0
}

/** Remove empty query controls without dropping valid `0` and `false` values. */
export function cleanQueryFormValues(values: QueryFormValues): QueryFormValues {
    return Object.fromEntries(Object.entries(values)
        .filter(([, value]) => !isEmptyQueryValue(value))
        .map(([key, value]) => [key, isRecord(value) ? cleanQueryFormValues(value) : value])
        .filter(([, value]) => !isRecord(value) || Object.keys(value).length > 0))
}

export function normalizeQueryFormValues(
    values: QueryFormValues,
    schema: FormFieldSchema[],
    normalizeValues?: QueryFormNormalizer,
): QueryFormValues {
    const unwrapped = unwrapQueryFormValue(values) as QueryFormValues
    const normalized = normalizeValues?.(unwrapped, { schema }) ?? unwrapped
    return cleanQueryFormValues(normalized)
}

function wrappedInitialValues(schema: FormFieldSchema[], values: QueryFormValues): QueryFormValues {
    const output: QueryFormValues = { ...values }
    for (const field of schema) {
        if (!Object.hasOwn(output, field.fieldName)) continue
        const value = output[field.fieldName]
        // FormApi's scalar field renderer expects one Vee row. Keep explicit
        // array fields untouched so advanced callers can opt into them.
        if (field.array || (Array.isArray(value) && value.every(isWrappedValue))) continue
        output[field.fieldName] = [{ value }]
    }
    return output
}

/**
 * Owns the draft/applied split between a compact query form and a server-side
 * DataTable. It intentionally knows only the table's `setFilters` contract,
 * keeping request clients and URL serialization in the application.
 */
export function useDataTableQueryForm<T extends DataTableRow = DataTableRow>(
    options: DataTableQueryFormOptions<T>,
): DataTableQueryFormReturn {
    let applyPromise: Promise<void> | undefined
    const applying = ref(false)
    const appliedValues = ref<QueryFormValues>({})
    const initialValues = wrappedInitialValues(options.schema, options.initialValues ?? {})
    const normalized = (values: QueryFormValues) => normalizeQueryFormValues(
        values,
        options.schema,
        options.normalizeValues,
    )

    const handleSubmit = async (values: QueryFormValues): Promise<void> => {
        const filters = normalized(values)
        appliedValues.value = { ...filters }
        applying.value = true
        applyPromise = (async () => {
            await options.table?.setFilters(filters)
            await options.onApply?.(filters)
        })()
        try {
            await applyPromise
        } finally {
            applying.value = false
            applyPromise = undefined
        }
    }
    const formOptions: UseFormOptions = {
        ...(options.form ?? {}),
        schema: options.schema,
        initialValues,
        showDefaultActions: options.form?.showDefaultActions ?? false,
        compact: options.form?.compact ?? true,
        layout: options.form?.layout ?? 'horizontal',
        handleSubmit,
    }
    const { api, AForm: Form } = useAForm(formOptions)
    const draftValues = computed(() => api.values.value)
    const submitting = computed(() => api.loading || applying.value)
    let timer: ReturnType<typeof setTimeout> | undefined
    let firstChange = true

    function cancelPendingChange(): void {
        if (timer) clearTimeout(timer)
        timer = undefined
    }

    async function submit(): Promise<QueryFormValues | null> {
        cancelPendingChange()
        const result = await api.validateAndSubmit()
        await applyPromise
        return result ? { ...appliedValues.value } : null
    }

    async function reset(): Promise<QueryFormValues | null> {
        cancelPendingChange()
        api.resetForm()
        return submit()
    }

    if (options.submitOnChange) {
        watch(api.values, () => {
            if (firstChange) {
                firstChange = false
                return
            }
            cancelPendingChange()
            timer = setTimeout(() => { void submit() }, Math.max(0, options.changeDebounceMs ?? 300))
        }, { deep: true })
    }

    onBeforeUnmount(cancelPendingChange)

    return {
        Form,
        api,
        draftValues,
        appliedValues,
        submitting,
        submit,
        reset,
        cancelPendingChange,
    }
}
