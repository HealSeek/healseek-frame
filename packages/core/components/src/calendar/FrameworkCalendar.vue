<script setup lang="ts">
import type { CalendarRootProps, DateValue } from 'reka-ui'
import { Calendar } from '@healseek/uikit-shadcnui/components/ui/calendar'
import { computed, useAttrs } from 'vue'

defineOptions({ name: 'FrameworkCalendar', inheritAttrs: false })

const props = withDefaults(defineProps<CalendarRootProps & {
    class?: string
    layout?: 'month-and-year' | 'month-only' | 'year-only'
    yearRange?: DateValue[]
    showOutsideDays?: boolean
}>(), {
    class: '',
    showOutsideDays: true,
})

const emit = defineEmits<{
    (event: 'update:modelValue', value: CalendarRootProps['modelValue']): void
    (event: 'update:placeholder', value: DateValue): void
}>()

const attrs = useAttrs()
const forwardedProps = computed(() => {
    const { class: className, ...rest } = props
    return { ...rest, ...attrs, class: className }
})
</script>

<template>
    <div data-slot="framework-calendar" data-framework-component="calendar" class="contents">
        <Calendar
            v-bind="forwardedProps"
            :class="['group/calendar bg-background p-2 [--cell-radius:var(--radius-md)] [--cell-size:1.75rem]', props.class]"
            @update:model-value="(value) => emit('update:modelValue', value)"
            @update:placeholder="(value) => emit('update:placeholder', value)"
        >
        <template v-if="$slots['calendar-heading']" #calendar-heading="slotProps">
            <slot name="calendar-heading" v-bind="slotProps" />
        </template>
        <template v-if="$slots['calendar-prev-icon']" #calendar-prev-icon>
            <slot name="calendar-prev-icon" />
        </template>
        <template v-if="$slots['calendar-next-icon']" #calendar-next-icon>
            <slot name="calendar-next-icon" />
        </template>
        </Calendar>
    </div>
</template>
