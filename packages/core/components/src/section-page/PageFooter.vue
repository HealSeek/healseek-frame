<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@healseek/uikit-shadcnui'

defineOptions({ name: 'PageFooter' })

const props = withDefaults(defineProps<{
    compact?: boolean
    sticky?: boolean
    class?: HTMLAttributes['class']
}>(), { compact: false, sticky: false })
</script>

<template>
    <footer
        data-slot="page-footer"
        role="contentinfo"
        :class="cn('flex shrink-0 flex-wrap items-center justify-between gap-2 border-t bg-background px-3 py-2.5 sm:px-4 sm:py-3', props.compact && 'py-1.5 text-sm', props.sticky && 'sticky bottom-0 z-10', props.class)"
    >
        <div class="min-w-0 flex-1"><slot /></div>
        <div v-if="$slots.actions" class="flex shrink-0 flex-wrap items-center justify-end gap-2"><slot name="actions" /></div>
    </footer>
</template>
