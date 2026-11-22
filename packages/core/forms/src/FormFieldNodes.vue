<script lang="ts" setup>
import {
    Field,
    FieldContent,
    FieldDescription,
    FieldError,
    FieldLabel,
    FieldLegend,
    FieldSet,
} from '@healseek/uikit-shadcnui'
import { ApiMultiSelect, Button, ColorPicker, ImageUpload, Input, Textarea, DatePickerField, DateRangePicker, DateTimeRangePicker, MultiSelect, PasswordInput, SelectBox, TagInput } from '@healseek/components'
import { Field as VeeField, FieldArray as VeeFieldArray, type FieldBindingObject } from 'vee-validate'
import { watchEffect } from 'vue'

import type { FormFieldSchema } from './types'
import { isRequiredRule, parseRules } from './rules'
import FormRequiredMark from './FormRequiredMark.vue'
import { useFieldId } from './form-dom'
import { isMultiSelectFieldComponent, resolveFieldDefault } from './form-defaults'
import { updateFormFieldValue } from './form-field-update'
import { isFormSectionStart } from './form-sections'

const fieldId = useFieldId()

const props = defineProps<{
    schema: FormFieldSchema[]
    api: import('./form-api').FormApi
    /** Path of the object/array row that owns this schema. */
    basePath?: string
    /** Disabled state inherited from the owning object/array field. */
    disabled?: boolean
}>()

const componentMap: Record<string, any> = {
    ImageUpload,
    'image-upload': ImageUpload,
    input: Input,
    Input,
    textarea: Textarea,
    Textarea,
    password: PasswordInput,
    Password: PasswordInput,
    number: Input,
    Number: Input,
    email: Input,
    Email: Input,
    select: SelectBox,
    Select: SelectBox,
    TagInput,
    'tag-input': TagInput,
    ColorPicker,
    'color-picker': ColorPicker,
    MultiSelect,
    'multi-select': MultiSelect,
    ApiMultiSelect,
    'api-multi-select': ApiMultiSelect,
    date: DatePickerField,
    DatePicker: DatePickerField,
    datetime: DatePickerField,
    DateTimePicker: DatePickerField,
    daterange: DateRangePicker,
    DateRangePicker,
    datetimerange: DateTimeRangePicker,
    DateTimeRangePicker,
}

const TEXT_INPUT_COMPONENTS = new Set([
    'input', 'Input',
    'textarea', 'Textarea',
    'password', 'Password',
    'number', 'Number',
    'email', 'Email',
    'TagInput', 'tag-input',
])

const INPUT_TYPES: Record<string, string | undefined> = {
    Number: 'number', number: 'number',
    Email: 'email', email: 'email',
}
const DATE_TYPES: Record<string, 'date' | 'datetime' | undefined> = {
    DatePicker: 'date', date: 'date',
    DateTimePicker: 'datetime', datetime: 'datetime',
}

function getArrayField(item: FormFieldSchema): string {
    return item.ArrayField ?? 'value'
}

function getComponent(component: FormFieldSchema['component']) {
    return typeof component === 'string' ? componentMap[component] || Input : component
}

function resolve<T>(
    value: T | ((context: { values: Record<string, unknown>; api: typeof props.api; fieldName?: string; value?: unknown }) => T) | undefined,
    fallback: T,
    context: { values: Record<string, unknown>; api: typeof props.api; fieldName?: string; value?: unknown } = {
        values: props.api.values.value,
        api: props.api,
    },
): T {
    if (typeof value === 'function') {
        return (value as (context: { values: Record<string, unknown>; api: typeof props.api; fieldName?: string; value?: unknown }) => T)(context)
    }
    return value ?? fallback
}

function readPath(values: Record<string, unknown>, path: string): unknown {
    return path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .filter(Boolean)
        .reduce<unknown>((current, key) => (
            current && typeof current === 'object'
                ? (current as Record<string, unknown>)[key]
                : undefined
        ), values)
}

function scopedTriggerPath(trigger: string): string {
    if (trigger.startsWith('$root.')) return trigger.slice('$root.'.length)
    if (trigger.startsWith('$row.')) {
        return props.basePath ? `${props.basePath}.${trigger.slice('$row.'.length)}` : trigger.slice('$row.'.length)
    }
    if (trigger.startsWith('.')) return `${props.basePath ?? ''}${trigger}`
    return props.basePath ? `${props.basePath}.${trigger}` : trigger
}

function hasPath(values: Record<string, unknown>, path: string): boolean {
    const segments = path.replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean)
    let current: unknown = values
    for (const segment of segments) {
        if (!current || typeof current !== 'object' || !Object.hasOwn(current, segment)) return false
        current = (current as Record<string, unknown>)[segment]
    }
    return true
}

function fieldPath(item: FormFieldSchema): string {
    return props.basePath ? `${props.basePath}.${item.fieldName}` : item.fieldName
}

function isTextInput(component: FormFieldSchema['component']): boolean {
    if (isMultiSelectFieldComponent(component)) return false
    return typeof component !== 'string' || TEXT_INPUT_COMPONENTS.has(component)
}

function getExtraProps(item: FormFieldSchema): Record<string, unknown> {
    const context = { values: props.api.values.value, api: props.api, fieldName: fieldPath(item) }
    const configuredProps = typeof item.componentProps === 'function'
        ? item.componentProps(context)
        : item.componentProps
    const dependencyProps = resolve(item.dependencies?.componentProps, {}, context)
    const userProps = { ...(configuredProps ?? {}), ...dependencyProps } as Record<string, unknown>
    return {
        ...userProps,
        placeholder: userProps.placeholder ?? (isTextInput(item.component)
            ? `请输入${item.label}`
            : `请选择${item.label}`),
        type: userProps.type ?? (typeof item.component === 'string'
            ? DATE_TYPES[item.component] ?? INPUT_TYPES[item.component]
            : undefined),
    }
}

function dependencyValue<T>(item: FormFieldSchema, key: 'if' | 'show' | 'disabled', fallback: T): T {
    const values = props.api.values.value
    for (const trigger of item.dependencies?.triggerFields ?? []) readPath(values, scopedTriggerPath(trigger))
    const dependency = item.dependencies?.[key]
    return resolve(dependency as T | ((context: { values: Record<string, unknown>; api: typeof props.api }) => T) | undefined, fallback, {
        values,
        api: props.api,
        fieldName: fieldPath(item),
    })
}

function isRendered(item: FormFieldSchema): boolean {
    return dependencyValue(item, 'if', true)
        && dependencyValue(item, 'show', true)
        && resolve(item.show, true)
}

function isVisible(item: FormFieldSchema): boolean {
    return dependencyValue(item, 'show', true) && resolve(item.show, true)
}

function isDisabled(item: FormFieldSchema): boolean {
    return Boolean(props.disabled) || props.api.disabled || props.api.loading
        || dependencyValue(item, 'disabled', false) || resolve(item.disabled, false)
}

function addRow(item: FormFieldSchema, length: number, push: (value: unknown) => void): void {
    if (isDisabled(item) || (typeof item.maxItems === 'number' && length >= item.maxItems)) return
    push(createRow(item))
}

function removeRow(item: FormFieldSchema, index: number, remove: (index: number) => void): void {
    if (!isDisabled(item)) remove(index)
}

function getError(path: string, item: FormFieldSchema): string | undefined {
    return props.api.errors.value[path]
        ?? props.api.errors.value[fieldPath(item)]
}

function createRow(item: FormFieldSchema): Record<string, unknown> {
    if (item.children?.length) {
        return Object.fromEntries(item.children.map((child) => [
            child.fieldName,
            child.array
                ? [createRow(child)]
                : child.children?.length
                    ? createRow(child)
                    : resolveFieldDefault(child, { values: props.api.values.value, api: props.api }),
        ]))
    }
    return { [getArrayField(item)]: resolveFieldDefault(item, { values: props.api.values.value, api: props.api }) }
}

function addLabel(item: FormFieldSchema): string {
    return item.addButtonText ?? '+ 添加'
}

function removeLabel(item: FormFieldSchema): string {
    return item.removeButtonText ?? '删除'
}

function isRequired(item: FormFieldSchema): boolean {
    return isRequiredRule(fieldRules(item))
}

function fieldRules(item: FormFieldSchema): FormFieldSchema['rules'] {
    const context = {
        values: props.api.values.value,
        api: props.api,
        fieldName: fieldPath(item),
    }
    const rules = resolve(item.dependencies?.rules, item.rules, context)
    const required = resolve(item.dependencies?.required, false, context)
    if (!required) return rules
    if (typeof rules === 'string') {
        return rules.split(',').some((token) => token.trim() === 'required')
            ? rules
            : rules ? `${rules},required` : 'required'
    }
    return rules ?? 'required'
}

function handleInput(item: FormFieldSchema, field: Pick<FieldBindingObject, 'onInput' | 'onChange'>, value: unknown): void {
    updateFormFieldValue(item.component, field, value, item.validateOnModelUpdate)
    const callback = item.dependencies?.onChange
    if (!callback) return
    void callback(value, {
        values: props.api.values.value,
        api: props.api,
        fieldName: fieldPath(item),
        value,
    })
}

function handleParseError(item: FormFieldSchema, message?: string): void {
    props.api.setFieldError(fieldPath(item), message)
}

watchEffect(() => {
    const values = props.api.values.value
    for (const item of props.schema) {
        const path = fieldPath(item)
        if (!isRendered(item) || hasPath(values, path)) continue
        props.api.setFieldValue(
            path,
            item.array || item.children?.length
                ? item.array
                    ? [createRow(item)]
                    : createRow(item)
                : resolveFieldDefault(item, { values, api: props.api }),
        )
    }
}, { flush: 'post' })
</script>

<template>
    <template v-for="(item, itemIndex) in props.schema" :key="fieldPath(item)">
        <div
            v-if="isFormSectionStart(props.schema, itemIndex, isRendered)"
            class="col-span-full border-b border-border/70 pb-2 pt-1"
        >
            <p class="text-sm font-semibold tracking-tight">{{ item.section }}</p>
        </div>
        <VeeFieldArray
            v-if="item.array && isRendered(item)"
            v-slot="{ fields, push, remove }"
            :name="fieldPath(item)"
        >
            <FieldSet v-show="isVisible(item)" :disabled="isDisabled(item)">
                <FieldLegend :id="`${fieldId(fieldPath(item))}-label`" variant="label">
                    {{ item.label || item.fieldName }}
                    <FormRequiredMark :required="!item.children?.length && isRequired(item)" />
                </FieldLegend>
                <div v-for="(row, index) in fields" :key="row.key" class="flex items-start gap-2">
                    <div v-if="item.children?.length" class="min-w-0 flex-1">
                        <FormFieldNodes
                            :schema="item.children"
                            :api="props.api"
                            :disabled="isDisabled(item)"
                            :base-path="`${fieldPath(item)}[${index}]`"
                        />
                    </div>
                    <VeeField
                        v-else
                        v-slot="{ field, errors, handleBlur }"
                        :name="`${fieldPath(item)}[${index}].${getArrayField(item)}`"
                        :rules="(parseRules(fieldRules(item), item.component) as any)"
                    >
                        <Field
                            :orientation="props.api.props.layout === 'horizontal' ? 'horizontal' : 'vertical'"
                            :class="['min-w-0 flex-1', item.fieldClass]"
                            :data-invalid="!!getError(`${fieldPath(item)}[${index}].${getArrayField(item)}`, item) || !!errors.length"
                        >
                            <FieldContent>
                                <component
                                    :is="getComponent(item.component)"
                                    :id="fieldId(`${fieldPath(item)}[${index}].${getArrayField(item)}`)"
                                    :name="`${fieldPath(item)}[${index}].${getArrayField(item)}`"
                                    :model-value="field.value"
                                    v-bind="getExtraProps(item)"
                                    :disabled="isDisabled(item)"
                                    :aria-invalid="!!getError(`${fieldPath(item)}[${index}].${getArrayField(item)}`, item) || !!errors.length"
                                    :aria-labelledby="`${fieldId(fieldPath(item))}-label`"
                                    :aria-required="isRequired(item) || undefined"
                                    @parse-error="(message: string) => handleParseError(item, message)"
                                    @update:model-value="handleInput(item, field, $event)"
                                    @blur="handleBlur"
                                />
                                <FieldDescription v-if="item.description && index === 0">
                                    {{ item.description }}
                                </FieldDescription>
                                <FieldError
                                    v-if="getError(`${fieldPath(item)}[${index}].${getArrayField(item)}`, item) || errors.length"
                                    :errors="[getError(`${fieldPath(item)}[${index}].${getArrayField(item)}`, item) ?? errors[0]]"
                                />
                            </FieldContent>
                        </Field>
                    </VeeField>
                    <Button
                        v-if="fields.length > 1"
                        type="button"
                        variant="ghost"
                        size="sm"
                        class="text-muted-foreground"
                        :disabled="isDisabled(item)"
                        @click="removeRow(item, index, remove)"
                    >
                        {{ removeLabel(item) }}
                    </Button>
                </div>
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    :disabled="isDisabled(item) || (typeof item.maxItems === 'number' && fields.length >= item.maxItems)"
                    @click="addRow(item, fields.length, push)"
                >
                    {{ addLabel(item) }}
                    <span v-if="item.maxItems" class="ml-1 text-xs text-muted-foreground">
                        ({{ fields.length }}/{{ item.maxItems }})
                    </span>
                </Button>
            </FieldSet>
        </VeeFieldArray>

        <FieldSet v-else-if="item.children?.length && isRendered(item)" v-show="isVisible(item)" :disabled="isDisabled(item)">
            <FieldLegend v-if="item.label" variant="label">
                {{ item.label }}
            </FieldLegend>
            <FormFieldNodes
                :schema="item.children"
                :api="props.api"
                :disabled="isDisabled(item)"
                :base-path="fieldPath(item)"
            />
        </FieldSet>

        <VeeField
            v-else-if="isRendered(item)"
            v-slot="{ field, errors, handleBlur }"
            :name="fieldPath(item)"
            :rules="(parseRules(fieldRules(item), item.component) as any)"
        >
            <Field
                :orientation="props.api.props.layout === 'horizontal' ? 'horizontal' : 'vertical'"
                :class="item.fieldClass"
                :data-invalid="!!getError(fieldPath(item), item) || !!errors.length"
            >
                <FieldContent>
                    <FieldLabel :for="fieldId(fieldPath(item))">
                        {{ item.label || item.fieldName }}
                        <FormRequiredMark :required="isRequired(item)" />
                    </FieldLabel>
                    <component
                        :is="getComponent(item.component)"
                        :id="fieldId(fieldPath(item))"
                        :name="fieldPath(item)"
                        :model-value="field.value"
                        v-bind="getExtraProps(item)"
                        :disabled="isDisabled(item)"
                        :aria-invalid="!!getError(fieldPath(item), item) || !!errors.length"
                        :aria-required="isRequired(item) || undefined"
                        @parse-error="(message: string) => handleParseError(item, message)"
                        @update:model-value="handleInput(item, field, $event)"
                        @blur="handleBlur"
                    />
                    <FieldDescription v-if="item.description">
                        {{ item.description }}
                    </FieldDescription>
                    <FieldError
                        v-if="getError(fieldPath(item), item) || errors.length"
                        :errors="[getError(fieldPath(item), item) ?? errors[0]]"
                    />
                </FieldContent>
            </Field>
        </VeeField>
    </template>
</template>
