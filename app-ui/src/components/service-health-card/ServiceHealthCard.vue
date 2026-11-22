<script setup lang="ts">
import { computed } from 'vue'
import { StatusBadge, type StatusPreset } from '@healseek/components'

export type ServiceHealth = 'healthy' | 'degraded' | 'offline'

export interface ServiceHealthMetric {
    label: string
    value: string | number
}

const props = withDefaults(
    defineProps<{
        name: string
        description?: string
        health?: ServiceHealth
        healthLabel?: string
        metrics?: ServiceHealthMetric[]
        class?: string
    }>(),
    {
        health: 'healthy',
        metrics: () => [],
    },
)

const HEALTH_PRESET: Record<
    ServiceHealth,
    { status: StatusPreset; label: string }
> = {
    healthy: { status: 'success', label: '运行正常' },
    degraded: { status: 'warning', label: '性能下降' },
    offline: { status: 'error', label: '暂时离线' },
}

const health = computed(() => HEALTH_PRESET[props.health])
const label = computed(() => props.healthLabel ?? health.value.label)
</script>

<template>
    <article
        :class="[
            'group/service-health-card flex min-w-0 flex-col gap-4 rounded-xl bg-card p-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-muted/20 sm:p-5',
            props.class,
        ]"
    >
        <header class="flex min-w-0 items-start justify-between gap-3">
            <div class="min-w-0">
                <div class="flex min-w-0 items-center gap-2">
                    <slot name="icon" />
                    <h3 class="truncate text-sm font-semibold">{{ name }}</h3>
                </div>
                <p v-if="description" class="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {{ description }}
                </p>
            </div>
            <StatusBadge :status="health.status" :text="label" />
        </header>

        <dl v-if="metrics.length" class="grid min-w-0 grid-cols-2 gap-2">
            <div
                v-for="metric in metrics"
                :key="metric.label"
                class="min-w-0 rounded-lg bg-muted/40 px-2.5 py-2"
            >
                <dt class="truncate text-[11px] font-medium text-muted-foreground">
                    {{ metric.label }}
                </dt>
                <dd class="mt-1 truncate text-xs font-semibold tabular-nums">
                    {{ metric.value }}
                </dd>
            </div>
        </dl>

        <footer v-if="$slots.footer || $slots.actions" class="flex items-center justify-between gap-3 border-t pt-3">
            <slot name="footer" />
            <div v-if="$slots.actions" class="ml-auto flex shrink-0 items-center gap-2">
                <slot name="actions" />
            </div>
        </footer>
    </article>
</template>
