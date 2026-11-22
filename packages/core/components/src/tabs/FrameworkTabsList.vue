<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { TabsListProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { TabsList } from 'reka-ui'
import { cn } from '@healseek/uikit-shadcnui'

type TabsVariant = 'default' | 'line'

const props = withDefaults(defineProps<TabsListProps & {
    class?: HTMLAttributes['class']
    variant?: TabsVariant
}>(), {
    variant: 'default',
})
const forwarded = reactiveOmit(props, 'class', 'variant')
</script>

<template>
    <TabsList
        data-slot="tabs-list"
        :data-variant="props.variant"
        v-bind="forwarded"
        :class="cn(
            'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-[orientation=horizontal]/tabs:h-8 group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col data-[variant=default]:bg-muted data-[variant=line]:gap-1 data-[variant=line]:rounded-none data-[variant=line]:bg-transparent',
            props.class,
        )"
    >
        <slot />
    </TabsList>
</template>
