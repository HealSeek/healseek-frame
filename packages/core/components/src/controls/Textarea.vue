<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Textarea as UiTextarea, cn } from '@healseek/uikit-shadcnui'

defineOptions({ name: 'Textarea', inheritAttrs: false })
const props = defineProps<{
  modelValue?: string | number
  defaultValue?: string | number
  class?: HTMLAttributes['class']
}>()
const emit = defineEmits<{ 'update:modelValue': [value: string | number] }>()
</script>

<template>
  <UiTextarea
    v-bind="$attrs"
    :model-value="props.modelValue"
    :default-value="props.defaultValue"
    :class="cn('border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 disabled:bg-input/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex field-sizing-content max-h-96 min-h-16 w-full overflow-y-auto rounded-lg border bg-transparent px-2.5 py-2 text-base shadow-none transition-colors outline-none focus-visible:ring-3 focus-visible:ring-inset disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 aria-invalid:ring-inset motion-reduce:transition-none md:text-sm', props.class)"
    @update:model-value="emit('update:modelValue', $event)"
  />
</template>
