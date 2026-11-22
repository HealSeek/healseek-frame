<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@healseek/uikit-shadcnui'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
  <div data-slot="drawer-body" :class="cn('hover-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4', props.class)">
    <slot />
  </div>
</template>
