<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@healseek/shared/icons'

defineOptions({ name: 'LoadingState' })

const props = withDefaults(defineProps<{
    message?: string
    size?: 'sm' | 'md' | 'lg'
    inline?: boolean
    ariaLabel?: string
    class?: string
}>(), {
    message: undefined,
    size: 'md',
    inline: false,
})

const { t, te } = useI18n({ useScope: 'global' })
const resolvedMessage = computed(() => props.message ?? (te('common.loading') ? t('common.loading') : '加载中…'))
const resolvedLabel = computed(() => props.ariaLabel ?? resolvedMessage.value)
const iconSizeClass = { sm: 'size-4', md: 'size-6', lg: 'size-8' }[props.size]
const loaderClass = computed(() => [iconSizeClass, 'animate-spin motion-reduce:animate-none'])
</script>

<template>
    <span v-if="props.inline" :class="['inline-flex items-center gap-2', props.class]" role="status" :aria-label="resolvedLabel" aria-live="polite" aria-busy="true">
        <Icon icon="lucide:loader-circle" :class="loaderClass" aria-hidden="true" />
        <span v-if="props.message != null" class="text-sm text-muted-foreground">{{ props.message }}</span>
    </span>
    <div v-else :class="['flex min-h-[200px] flex-col items-center justify-center gap-3', props.class]" role="status" :aria-label="resolvedLabel" aria-live="polite" aria-busy="true">
        <Icon icon="lucide:loader-circle" :class="loaderClass" aria-hidden="true" />
        <p v-if="resolvedMessage" class="text-sm text-muted-foreground">{{ resolvedMessage }}</p>
    </div>
</template>
