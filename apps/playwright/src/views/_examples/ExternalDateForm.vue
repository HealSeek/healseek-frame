<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { DatePicker, DateTimePicker } from '@healseek/components'
import { useForm } from '@healseek/forms'

defineProps<{ testPrefix: string }>()

// Pass framework components directly in schema; each child owns one form.
const [DateForm, formApi] = useForm({
    layout: 'vertical',
    showDefaultActions: false,
    // Date controls use undefined for an empty value rather than an input string.
    initialValues: { date: [{ value: undefined }], dateTime: [{ value: undefined }] },
    schema: [
        { fieldName: 'date', label: '日期', component: markRaw(DatePicker), componentProps: { placeholder: '选择日期' } },
        { fieldName: 'dateTime', label: '日期和时间', component: markRaw(DateTimePicker), componentProps: { placeholder: '选择日期和时间' } },
    ],
})

const values = computed(() => JSON.stringify(formApi.values.value))
</script>

<template>
    <div :data-test="`${testPrefix}-form`" class="flex min-w-0 flex-col gap-3">
        <DateForm />
        <p :data-test="`${testPrefix}-value`" class="break-all text-xs text-muted-foreground" aria-live="polite">当前表单值：{{ values }}</p>
    </div>
</template>
