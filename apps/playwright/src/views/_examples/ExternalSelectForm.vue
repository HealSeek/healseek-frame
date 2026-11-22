<script setup lang="ts">
import { computed, watch } from 'vue'
import { useForm } from '@healseek/forms'

const props = withDefaults(defineProps<{
    label?: string
    testPrefix?: string
}>(), {
    label: '外部子表单分类',
    testPrefix: 'external-select',
})

const emit = defineEmits<{ change: [category: string] }>()

// Each component owns one form context. This example tests popup ownership,
// without requiring several useForm calls in the hosting page's setup.
const [SelectForm, selectFormApi] = useForm({
    layout: 'vertical',
    showDefaultActions: false,
    schema: [{
        component: 'Select',
        fieldName: 'category',
        label: props.label,
        rules: 'required',
        defaultValue: 'general',
        componentProps: {
            'aria-label': props.label,
            'data-test': `${props.testPrefix}-category`,
            options: [
                { label: '常规', value: 'general' },
                { label: '自定义', value: 'custom' },
                { label: '停用（不可选）', value: 'disabled', disabled: true },
            ],
        },
    }],
})

const selectedCategory = computed(() => {
    const value = selectFormApi.values.value.category
    return String(Array.isArray(value) ? value[0]?.value ?? '' : value ?? '')
})

watch(selectedCategory, (category) => emit('change', category), { immediate: true })
</script>

<template>
    <div :data-test="`${testPrefix}-form`">
        <SelectForm />
        <p class="mt-2 text-xs text-muted-foreground" :data-test="`${testPrefix}-value`">
            当前分类：{{ selectedCategory }}
        </p>
    </div>
</template>
