<script lang="ts" setup>
import { Icon } from '@healseek/shared/icons'
import { Skeleton } from '@healseek/uikit-shadcnui'
import type { Metric, MetricTone } from './types'

defineOptions({ name: 'MetricStrip' })

defineProps<{
    metrics: Metric[]
    tone?: MetricTone
    class?: string
}>()

const TONE_CLASS: Record<MetricTone, string> = {
    default: 'text-foreground',
    info: 'text-info',
    success: 'text-success',
    warning: 'text-warning',
    danger: 'text-destructive',
}
</script>

<template>
    <div class="grid grid-cols-2 overflow-hidden rounded-lg border bg-card sm:grid-cols-3 lg:[grid-template-columns:repeat(auto-fit,minmax(0,1fr))]" :class="$props.class">
        <div v-for="(metric, index) in metrics" :key="metric.key" class="min-w-0 border-b px-3 py-2.5 last:border-b-0 sm:px-4 sm:py-3 lg:border-b-0 lg:border-r lg:last:border-r-0" :class="index % 2 === 0 ? 'border-r' : 'sm:border-r'">
            <div class="flex items-center gap-1.5 text-xs text-muted-foreground sm:gap-2">
                <Icon v-if="metric.icon && !metric.loading" :icon="metric.icon" class="size-4 shrink-0" />
                <Skeleton v-else-if="metric.loading" class="size-4 rounded-sm" />
                <span class="truncate">{{ metric.label }}</span>
            </div>
            <Skeleton v-if="metric.loading" class="mt-2 h-6 w-20" />
            <div v-else class="mt-1 flex items-baseline gap-1.5">
                <strong class="truncate text-lg font-semibold tabular-nums sm:text-xl" :class="TONE_CLASS[metric.tone ?? tone ?? 'default']">{{ metric.value }}</strong>
            </div>
            <p v-if="metric.hint && !metric.loading" class="mt-1 truncate text-[11px] text-muted-foreground">{{ metric.hint }}</p>
        </div>
    </div>
</template>
