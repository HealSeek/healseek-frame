<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { Icon } from '@healseek/shared/icons'
import {
    STATUS_DOT_COLOR,
    STATUS_PRESET_LABEL,
    STATUS_TEXT_COLOR,
    type StatusBadgeSize,
    type StatusBadgeType,
    type StatusVariant,
} from './types'
import { useProvidedStatusBadgeType } from './statusBadgeContext'

defineOptions({ name: 'StatusBadge' })

const props = defineProps({
    status: { type: String as PropType<StatusVariant>, default: undefined },
    variant: { type: String as PropType<StatusVariant | null>, default: undefined },
    label: { type: String, default: undefined },
    text: { type: String, default: undefined },
    icon: { type: String, default: undefined },
    pulse: { type: Boolean, default: false },
    showDot: { type: Boolean, default: false },
    copyable: { type: Boolean, default: true },
    copyText: { type: String, default: undefined },
    autoColor: { type: String, default: undefined },
    type: { type: String as PropType<StatusBadgeType>, default: undefined },
    size: { type: String as PropType<StatusBadgeSize>, default: 'sm' },
    class: { type: String, default: undefined },
})

const emit = defineEmits<{ (event: 'copy', value: string): void }>()

const SIZE_CLASS: Record<StatusBadgeSize, string> = {
    sm: 'h-5 gap-1 px-1.5 text-sm leading-none',
    md: 'h-5 gap-1 px-1.5 text-sm leading-none',
    lg: 'h-6 gap-1.5 px-2 text-sm leading-none',
}
const TEXT_SIZE_CLASS: Record<StatusBadgeSize, string> = {
    sm: 'gap-1 text-sm leading-none',
    md: 'gap-1 text-sm leading-none',
    lg: 'gap-1.5 text-sm leading-none',
}
const COLOR_VARIANTS: StatusVariant[] = [
    'success', 'warning', 'danger', 'info', 'neutral', 'purple', 'amber', 'blue', 'cyan', 'green',
    'grey', 'indigo', 'light-blue', 'light-green', 'lime', 'orange', 'pink', 'red', 'teal', 'violet', 'yellow',
]

const variant = computed<StatusVariant>(() => {
    if (props.autoColor) {
        let hash = 0
        for (const character of props.autoColor) hash = (hash * 31 + character.charCodeAt(0)) | 0
        return COLOR_VARIANTS[Math.abs(hash) % COLOR_VARIANTS.length] ?? 'neutral'
    }
    return props.variant ?? props.status ?? 'neutral'
})
const label = computed(() => props.label ?? props.text ?? STATUS_PRESET_LABEL[variant.value] ?? variant.value)
const iconName = computed(() => props.icon)
const copyValue = computed(() => props.copyText ?? label.value)
const isCopyable = computed(() => props.copyable && copyValue.value.length > 0)
const contextType = useProvidedStatusBadgeType()
const resolvedType = computed<StatusBadgeType>(() => props.type ?? contextType?.value ?? 'badge')
const typeClass = computed(() => resolvedType.value === 'badge' ? SIZE_CLASS[props.size] : TEXT_SIZE_CLASS[props.size])

async function copy(): Promise<void> {
    if (!isCopyable.value || typeof navigator === 'undefined' || !navigator.clipboard) return
    try {
        await navigator.clipboard.writeText(copyValue.value)
        emit('copy', copyValue.value)
    } catch {
        // Clipboard permissions are caller/browser state; a denied copy must not break the badge.
    }
}

function onKeydown(event: KeyboardEvent): void {
    if (!isCopyable.value || (event.key !== 'Enter' && event.key !== ' ')) return
    event.preventDefault()
    void copy()
}
</script>

<template>
    <span
        data-slot="status-badge"
        :class="[
            'inline-flex w-fit max-w-full min-w-0 shrink items-center font-medium tracking-normal whitespace-nowrap transition-colors',
            resolvedType === 'badge' ? 'rounded-4xl' : resolvedType === 'underline' && 'border-b border-current pb-px',
            typeClass,
            STATUS_TEXT_COLOR[variant],
            props.pulse && 'animate-pulse',
            isCopyable && 'cursor-copy hover:brightness-95 active:scale-95 dark:hover:brightness-110',
            isCopyable && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            props.class,
        ]"
        :title="isCopyable ? `Click to copy: ${copyValue}` : label"
        :role="isCopyable ? 'button' : undefined"
        :tabindex="isCopyable ? 0 : undefined"
        @click="copy"
        @keydown="onKeydown"
    >
        <span v-if="props.showDot" :class="['inline-block size-1.5 shrink-0 rounded-full', STATUS_DOT_COLOR[variant]]" aria-hidden="true" />
        <Icon v-if="iconName" :icon="iconName" class="size-3.5 shrink-0" />
        <span v-if="label" class="min-w-0 truncate leading-normal"><slot>{{ label }}</slot></span>
        <slot v-else />
    </span>
</template>
