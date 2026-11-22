<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { Icon } from '@healseek/shared/icons'

defineOptions({ name: 'DrawerSectionHeader' })

const props = withDefaults(defineProps<{
    title: string
    description?: string
    icon?: string
    iconTone?: 'default' | 'success' | 'warning' | 'info' | 'destructive'
    class?: HTMLAttributes['class']
}>(), {
    iconTone: 'default',
})

const iconToneClass: Record<NonNullable<typeof props.iconTone>, string> = {
    default: 'bg-muted text-muted-foreground',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning-foreground',
    info: 'bg-info/15 text-info',
    destructive: 'bg-destructive/15 text-destructive',
}
</script>

<template>
    <div :class="['flex items-start gap-3', props.class]">
        <div v-if="props.icon || $slots.icon" :class="['flex size-8 shrink-0 items-center justify-center rounded-md [&>svg]:size-4', iconToneClass[props.iconTone]]">
            <slot name="icon"><Icon :icon="props.icon!" aria-hidden="true" /></slot>
        </div>
        <div class="min-w-0 flex-1">
            <h3 class="text-sm leading-none font-semibold tracking-tight">{{ props.title }}</h3>
            <p v-if="props.description" class="mt-1 text-xs leading-5 text-muted-foreground">{{ props.description }}</p>
        </div>
        <div v-if="$slots.actions" class="shrink-0"><slot name="actions" /></div>
    </div>
</template>
