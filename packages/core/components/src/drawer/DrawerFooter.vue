<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@healseek/uikit-shadcnui'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="drawer-footer" :class="cn('mt-auto flex shrink-0 flex-col gap-2 border-t p-4', props.class)">
    <slot />
  </div>
</template>
