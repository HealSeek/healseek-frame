<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { TabsContentProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { TabsContent } from 'reka-ui'
import { cn } from '@healseek/uikit-shadcnui'

const props = defineProps<TabsContentProps & { class?: HTMLAttributes['class'] }>()
const forwarded = reactiveOmit(props, 'class')
</script>

<template>
    <TabsContent
        data-slot="tabs-content"
        v-bind="forwarded"
        :class="cn('flex-1 text-sm outline-none', props.class)"
    >
        <slot />
    </TabsContent>
</template>
