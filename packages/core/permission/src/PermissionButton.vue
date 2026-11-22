<script setup lang="ts">
import { computed } from 'vue'
import { Button, type ButtonVariants } from '@healseek/uikit-shadcnui'
import { usePermissionStore } from './store'

defineOptions({ name: 'PermissionButton', inheritAttrs: false })

const props = withDefaults(defineProps<{
    permission?: string | string[]
    roles?: string[]
    requiresAuth?: boolean
    denied?: 'hide' | 'disable'
    disabled?: boolean
    variant?: ButtonVariants['variant']
    size?: ButtonVariants['size']
}>(), {
    denied: 'hide',
    disabled: false,
})

const store = usePermissionStore()
const allowed = computed(() => store.hasAccess({
    permissions: props.permission
        ? Array.isArray(props.permission) ? props.permission : [props.permission]
        : undefined,
    roles: props.roles,
    requiresAuth: props.requiresAuth,
}))
</script>

<template>
    <Button
        v-if="allowed || denied === 'disable'"
        v-bind="$attrs"
        :disabled="disabled || !allowed"
        :variant="variant"
        :size="size"
    >
        <slot />
    </Button>
</template>
