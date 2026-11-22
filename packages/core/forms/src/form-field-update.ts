import {
    ApiMultiSelect, ApiSelect, ColorPicker, Combobox, DatePicker, DatePickerField, DateRangePicker,
    DateTimePicker, DateTimeRangePicker, IconPicker, ImageUpload, MultiSelect, SearchSelect, SelectBox, TagInput,
} from '@healseek/components'
import { toRaw } from 'vue'
import type { FieldBindingObject } from 'vee-validate'
import type { FormFieldSchema } from './types'

const COMMIT_COMPONENT_NAMES = new Set([
    'Select', 'select', 'date', 'DatePicker', 'datetime', 'DateTimePicker',
    'daterange', 'DateRangePicker', 'datetimerange', 'DateTimeRangePicker',
    'IconPicker', 'icon-picker',
    'ColorPicker', 'color-picker',
    'ImageUpload', 'image-upload',
    'TagInput', 'tag-input',
    'MultiSelect', 'multi-select', 'ApiMultiSelect', 'api-multi-select',
])
const COMMIT_COMPONENTS = new Set<unknown>([
    ApiMultiSelect, ApiSelect, ColorPicker, Combobox, DatePicker, DatePickerField, DateRangePicker,
    DateTimePicker, DateTimeRangePicker, IconPicker, ImageUpload, MultiSelect, SearchSelect, SelectBox, TagInput,
])

/** A picker emits a committed value; a text field can still be mid-keystroke. */
export function updateFormFieldValue(
    component: FormFieldSchema['component'],
    field: Pick<FieldBindingObject, 'onInput' | 'onChange'>,
    value: unknown,
    validateOnModelUpdate?: boolean,
): void {
    // Identify actual framework components, including direct component objects.
    // Unknown custom editors retain their input behavior; their names are not a contract.
    const committed = validateOnModelUpdate ?? (typeof component === 'string'
        ? COMMIT_COMPONENT_NAMES.has(component)
        : COMMIT_COMPONENTS.has(toRaw(component)))
    if (committed) field.onChange(value)
    else field.onInput(value)
}
