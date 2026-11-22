<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@healseek/uikit-shadcnui'

const props = defineProps<{ class?: HTMLAttributes['class'] }>()
</script>

<template>
    <span
        aria-hidden="true"
        data-slot="pagination-ellipsis"
        :class="cn('text-muted-foreground/60 px-0.5 text-sm @lg/pagination:px-1', props.class)"
    >
        ...
        <span class="sr-only">More pages</span>
    </span>
</template>
