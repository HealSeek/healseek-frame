<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@healseek/uikit-shadcnui'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="drawer-header" :class="cn('flex shrink-0 flex-col gap-1 p-4 text-left', props.class)">
    <slot />
  </div>
</template>
