<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Input as UiInput, cn } from '@healseek/uikit-shadcnui'
import { NEW_API_INPUT_CLASS } from '../data-table/new-api-compat'

defineOptions({ name: 'Input', inheritAttrs: false })
const props = defineProps<{
  modelValue?: string | number
  defaultValue?: string | number
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <UiInput
    v-bind="$attrs"
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :class="cn(NEW_API_INPUT_CLASS, props.class)"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
