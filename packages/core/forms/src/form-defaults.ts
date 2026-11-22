import type { FormFieldContext, FormFieldSchema } from './types'
import { ApiMultiSelect, ColorPicker, MultiSelect, TagInput } from '@healseek/components'
import { toRaw } from 'vue'

const DATE_COMPONENTS = new Set([
    'DatePicker',
    'date',
    'DateTimePicker',
    'datetime',
    'DateRangePicker',
    'daterange',
    'DateTimeRangePicker',
    'datetimerange',
])
const MULTI_SELECT_NAMES = new Set(['MultiSelect', 'multi-select', 'ApiMultiSelect', 'api-multi-select'])
const MULTI_SELECT_COMPONENTS = new Set<unknown>([MultiSelect, ApiMultiSelect])

/**
 * Date controls use `undefined` for an empty model value. Preserve that
 * contract instead of applying the text field's empty-string fallback.
 */
export function isDateFieldComponent(component: FormFieldSchema['component']): boolean {
    return typeof component === 'string' && DATE_COMPONENTS.has(component)
}

/** A tag editor holds one string array; it is not a repeated form field. */
export function isTagInputFieldComponent(component: FormFieldSchema['component'] | undefined): boolean {
    return typeof component === 'string'
        ? component === 'TagInput' || component === 'tag-input'
        : Boolean(component) && toRaw(component) === TagInput
}

/** Multi-selectors use one string array, even inside a repeated form row. */
export function isMultiSelectFieldComponent(component: FormFieldSchema['component'] | undefined): boolean {
    return typeof component === 'string'
        ? MULTI_SELECT_NAMES.has(component)
        : Boolean(component) && MULTI_SELECT_COMPONENTS.has(toRaw(component))
}

export function isArrayValueFieldComponent(component: FormFieldSchema['component'] | undefined): boolean {
    return isTagInputFieldComponent(component) || isMultiSelectFieldComponent(component)
}

export function isColorPickerFieldComponent(component: FormFieldSchema['component'] | undefined): boolean {
    return typeof component === 'string'
        ? component === 'ColorPicker' || component === 'color-picker'
        : Boolean(component) && toRaw(component) === ColorPicker
}

export function resolveFieldDefault(
    item: FormFieldSchema,
    context: FormFieldContext,
): unknown {
    const value = typeof item.defaultValue === 'function'
        ? item.defaultValue(context)
        : item.defaultValue
    if (value !== undefined && value !== null) return value
    if (isArrayValueFieldComponent(item.component)) return []
    return isDateFieldComponent(item.component) ? undefined : ''
}
