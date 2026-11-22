<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import type { TabsRootEmits, TabsRootProps } from 'reka-ui'
import { reactiveOmit } from '@vueuse/core'
import { TabsRoot, useForwardPropsEmits } from 'reka-ui'
import { cn } from '@healseek/uikit-shadcnui'

const props = defineProps<TabsRootProps & { class?: HTMLAttributes['class'] }>()
const emit = defineEmits<TabsRootEmits>()
const forwarded = useForwardPropsEmits(reactiveOmit(props, 'class'), emit)
</script>

<template>
    <TabsRoot
        data-slot="tabs"
        v-bind="forwarded"
        :class="cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', props.class)"
    >
        <slot />
    </TabsRoot>
</template>
