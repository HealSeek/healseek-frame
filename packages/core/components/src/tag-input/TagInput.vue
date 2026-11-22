<script setup lang="ts">
import { computed, ref, type HTMLAttributes } from 'vue'
import { X } from '@lucide/vue'
import { Badge, cn } from '@healseek/uikit-shadcnui'
import { Button } from '../controls'
import type { TagInputProps } from './types'

defineOptions({ name: 'TagInput', inheritAttrs: false })

const props = withDefaults(defineProps<TagInputProps>(), {
    modelValue: () => [],
    disabled: false,
    readOnly: false,
    placeholder: 'Add tags...',
    removeTagLabel: (tag: string) => `Remove ${tag}`,
})

const emit = defineEmits<{
    'update:modelValue': [value: string[]]
    blur: [event: FocusEvent]
    focus: [event: FocusEvent]
}>()

const input = ref<HTMLInputElement>()
const draft = ref('')
const composing = ref(false)
// Never mutate the caller's array; a committed edit emits a fresh value.
const tags = computed(() => [...new Set(props.modelValue.map((tag) => tag.trim()).filter(Boolean))])
const editable = computed(() => !props.disabled && !props.readOnly)

function focus(): void {
    if (!props.disabled) input.value?.focus()
}

function commit(): void {
    if (!editable.value || composing.value) return
    const tag = draft.value.trim()
    if (tag && !tags.value.includes(tag)) emit('update:modelValue', [...tags.value, tag])
    // An empty or duplicate draft is finished too, rather than staying stuck.
    draft.value = ''
}

function remove(tag: string): void {
    if (!editable.value) return
    emit('update:modelValue', tags.value.filter((value) => value !== tag))
    focus()
}

function onKeydown(event: KeyboardEvent): void {
    // IME Enter confirms a composition. It must not create a tag or delete one.
    if (event.isComposing || composing.value || event.keyCode === 229) {
        if (event.key === 'Enter' || event.key === ',') event.stopPropagation()
        return
    }
    if (event.key === 'Enter' || event.key === ',') {
        event.preventDefault()
        event.stopPropagation()
        commit()
    } else if (event.key === 'Backspace' && !draft.value && tags.value.length && editable.value) {
        event.preventDefault()
        remove(tags.value.at(-1)!)
    }
}

function onBlur(event: FocusEvent): void {
    commit()
    emit('blur', event)
}

defineExpose({ focus, blur: () => input.value?.blur() })
</script>

<template>
    <div
        data-slot="tag-input"
        :data-disabled="props.disabled || undefined"
        :data-readonly="props.readOnly || undefined"
        :aria-invalid="$attrs['aria-invalid'] as HTMLAttributes['aria-invalid']"
        :class="cn(
            'border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-9 w-full min-w-0 flex-wrap items-center gap-2 rounded-md border bg-transparent px-3 py-2 text-base shadow-xs transition-[color,box-shadow] motion-reduce:transition-none outline-none focus-within:ring-3 data-disabled:cursor-not-allowed data-disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:ring-3 md:text-sm',
            props.class,
        )"
        @click="focus"
    >
        <Badge
            v-for="tag in tags"
            :key="tag"
            variant="secondary"
            data-slot="tag-input-tag"
            class="h-5 max-w-full min-w-0 gap-1 rounded-full pr-1"
        >
            <span class="min-w-0 truncate" :title="tag">{{ tag }}</span>
            <Button
                v-if="editable"
                type="button"
                variant="ghost"
                size="icon-sm"
                data-slot="tag-input-remove"
                :aria-label="props.removeTagLabel(tag)"
                class="hover:bg-secondary-foreground/20 size-auto rounded-sm p-0 dark:hover:bg-secondary-foreground/20"
                @mousedown.prevent
                @click.stop="remove(tag)"
            >
                <X class="size-3" aria-hidden="true" />
            </Button>
        </Badge>
        <input
            v-bind="$attrs"
            ref="input"
            v-model="draft"
            data-slot="tag-input-control"
            type="text"
            :disabled="props.disabled"
            :readonly="props.readOnly"
            :placeholder="tags.length ? '' : props.placeholder"
            :class="cn('placeholder:text-muted-foreground min-w-[120px] max-w-full flex-1 border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-0 disabled:cursor-not-allowed', props.inputClass)"
            @keydown="onKeydown"
            @compositionstart="composing = true"
            @compositionend="composing = false"
            @blur="onBlur"
            @focus="emit('focus', $event)"
        >
    </div>
</template>
