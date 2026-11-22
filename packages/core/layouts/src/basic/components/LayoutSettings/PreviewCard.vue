<script setup lang="ts">
import { Icon } from '@healseek/shared/icons'
defineProps<{ selected?: boolean }>()
</script>
<template>
    <div class="ring-border relative flex aspect-[80/52] w-full items-center justify-center overflow-visible rounded-md bg-card p-1.5 ring-1 transition duration-200 group-focus-visible:ring-2" :class="selected ? 'ring-2 ring-primary shadow-2xl' : ''">
        <slot />
        <span v-if="selected" class="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm"><Icon icon="lucide:check" class="size-3" /></span>
    </div>
</template>
