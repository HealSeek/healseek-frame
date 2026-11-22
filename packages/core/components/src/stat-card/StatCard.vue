<script lang="ts" setup>
import { computed } from 'vue'
import { Icon } from '@healseek/shared/icons'
import { Skeleton } from '@healseek/uikit-shadcnui'

export type StatTrendDirection = 'up' | 'down' | 'flat'
export interface StatTrend {
    value: number
    direction: StatTrendDirection
    label?: string
    inverse?: boolean
}

const props = withDefaults(
    defineProps<{
        title: string
        value: string | number
        description?: string
        icon?: string
        trend?: StatTrend
        loading?: boolean
        error?: boolean
        variant?: 'plain' | 'outlined'
        formatter?: (value: string | number) => string | number
        class?: string
    }>(),
    {
        loading: false,
        error: false,
        variant: 'plain',
    },
)

const displayValue = computed(() => {
    if (props.loading) return ''
    if (props.error) return '--'
    return props.formatter ? props.formatter(props.value) : props.value
})

const trendIcon = computed(() => {
    if (!props.trend) return ''
    return props.trend.direction === 'up'
        ? 'lucide:trending-up'
        : props.trend.direction === 'down'
          ? 'lucide:trending-down'
          : 'lucide:minus'
})

const trendColor = computed(() => {
    if (!props.trend) return ''
    const isPositive = props.trend.inverse
        ? props.trend.direction === 'down'
        : props.trend.direction === 'up'
    if (props.trend.direction === 'flat') return 'text-muted-foreground'
    return isPositive
        ? 'text-success'
        : 'text-destructive'
})

const trendSign = computed(() => {
    if (!props.trend) return ''
    return props.trend.direction === 'up'
        ? '+'
        : props.trend.direction === 'down'
          ? '-'
          : ''
})
</script>

<template>
    <div
        class="group/stat-card flex min-w-0 flex-col justify-between gap-3 text-card-foreground"
        :class="[
            variant === 'outlined' &&
                'rounded-xl bg-card p-4 ring-1 ring-foreground/10',
            props.class,
        ]"
    >
        <div class="flex min-w-0 items-center justify-between gap-2">
            <div
                class="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground"
            >
                <span
                    v-if="icon"
                    class="flex size-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground transition-colors group-hover/stat-card:bg-primary/10 group-hover/stat-card:text-primary"
                >
                    <Icon :icon="icon" class="size-3.5" />
                </span>
                <span class="truncate">{{ title }}</span>
            </div>
            <slot name="action" />
        </div>
        <div class="min-w-0">
            <Skeleton v-if="loading" class="h-7 w-28" />
            <p
                v-else
                class="break-all font-mono text-2xl font-semibold tabular-nums"
                :class="error && 'text-muted-foreground'"
            >
                {{ displayValue }}
            </p>
            <div
                class="mt-1 flex min-h-4 flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground"
            >
                <template v-if="trend && !loading && !error">
                    <span
                        :class="[
                            'inline-flex items-center gap-1 font-medium',
                            trendColor,
                        ]"
                    >
                        <Icon :icon="trendIcon" class="size-3" />
                        {{ trendSign }}{{ Math.abs(trend.value) }}%
                    </span>
                    <span v-if="trend.label">{{ trend.label }}</span>
                </template>
                <span v-else-if="description">{{ description }}</span>
            </div>
        </div>
        <slot name="extra" />
    </div>
</template>
