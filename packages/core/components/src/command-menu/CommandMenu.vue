<script lang="ts" setup>
import { computed, ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandShortcut,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@healseek/uikit-shadcnui'
import type { CommandMenuGroup, CommandMenuItem, CommandMenuProps } from './types'

defineOptions({ name: 'CommandMenu' })

const props = defineProps({
    groups: { type: Array as PropType<readonly CommandMenuGroup[]>, default: () => [] },
    // An explicit undefined default keeps the prop distinguishable from a controlled false value.
    open: { type: Boolean as PropType<boolean | undefined>, default: undefined },
    defaultOpen: { type: Boolean, default: false },
    title: { type: String, default: undefined },
    description: { type: String, default: undefined },
    placeholder: { type: String, default: undefined },
    emptyText: { type: String, default: undefined },
    closeOnSelect: { type: Boolean, default: true },
    contentClass: { type: [String, Array, Object] as PropType<CommandMenuProps['contentClass']>, default: undefined },
})

const { t, te } = useI18n({ useScope: 'global' })
function copy(key: string, fallback: string): string { return te(key) ? t(key) : fallback }
const resolvedTitle = computed(() => props.title ?? copy('common.commandTitle', 'Command Palette'))
const resolvedDescription = computed(() => props.description ?? copy('common.commandDescription', 'Search for a command to run...'))
const resolvedPlaceholder = computed(() => props.placeholder ?? copy('common.commandPlaceholder', '搜索命令…'))
const resolvedEmptyText = computed(() => props.emptyText ?? copy('common.commandEmpty', '没有找到结果。'))

const emit = defineEmits<{
    (event: 'update:open', value: boolean): void
    (event: 'select', item: CommandMenuItem, group: CommandMenuGroup): void
}>()

const internalOpen = ref(props.defaultOpen)
const isOpen = computed(() => props.open ?? internalOpen.value)

/** Keep keyboard focus in the command input when the dialog opens. */
function focusCommandInput(event: Event): void {
    event.preventDefault()
    const content = event.target instanceof HTMLElement ? event.target : undefined
    const input = content?.querySelector<HTMLInputElement>('[data-slot="command-input"]')
    input?.focus()
}

/** Update the dialog visibility while preserving the controlled v-model contract. */
function updateOpen(value: boolean): void {
    if (props.open === undefined) internalOpen.value = value
    emit('update:open', value)
}

/** Emit the selected business item and optionally close the command palette. */
function selectItem(item: CommandMenuItem, group: CommandMenuGroup): void {
    emit('select', item, group)
    if (props.closeOnSelect) updateOpen(false)
}
</script>

<template>
    <Dialog :open="isOpen" @update:open="updateOpen">
        <DialogContent
            :show-close-button="false"
            :class="['command-menu-content top-1/3 translate-y-0 overflow-hidden rounded-xl p-0', props.contentClass]"
            @open-auto-focus="focusCommandInput"
        >
            <DialogHeader class="sr-only">
                <DialogTitle>{{ resolvedTitle }}</DialogTitle>
                <DialogDescription>{{ resolvedDescription }}</DialogDescription>
            </DialogHeader>
            <Command class="size-full rounded-xl p-1">
                <CommandInput
                    :placeholder="resolvedPlaceholder"
                    class="h-8 rounded-lg border border-input/30 bg-input/30 px-3 py-1 text-sm shadow-none"
                />
                <CommandList class="no-scrollbar max-h-72 outline-none">
                    <CommandEmpty class="py-6 text-center text-sm">{{ resolvedEmptyText }}</CommandEmpty>
                    <template v-for="(group, groupIndex) in props.groups" :key="group.id">
                        <slot name="group" :group="group" :index="groupIndex">
                            <CommandGroup :heading="group.label" class="p-1">
                                <CommandItem
                                    v-for="item in group.items"
                                    :key="item.id"
                                    :value="item.value ?? item.label"
                                    :disabled="item.disabled"
                                    class="transition-colors data-[highlighted]:bg-muted data-[highlighted]:text-foreground data-[state=checked]:bg-muted data-[state=checked]:text-foreground focus-visible:ring-2 focus-visible:ring-ring in-data-[slot=dialog-content]:rounded-lg"
                                    @select="selectItem(item, group)"
                                >
                                    <slot name="item" :item="item" :group="group">
                                        {{ item.label }}
                                    </slot>
                                    <CommandShortcut v-if="item.shortcut" class="text-muted-foreground data-[highlighted]:text-foreground">{{ item.shortcut }}</CommandShortcut>
                                </CommandItem>
                            </CommandGroup>
                        </slot>
                    </template>
                    <slot />
                </CommandList>
            </Command>
        </DialogContent>
    </Dialog>
</template>

<style>
.command-menu-content [data-slot='command-input-wrapper'] {
    position: relative;
    height: auto;
    gap: 0;
    border-bottom: 0;
    padding: 0.25rem 0.25rem 0;
}

.command-menu-content [data-slot='command-input-wrapper'] > svg {
    position: absolute;
    top: 50%;
    right: 0.75rem;
    z-index: 1;
    transform: translateY(-50%);
}

.command-menu-content [data-slot='command-input'] {
    padding-right: 2.5rem;
}

.command-menu-content [data-slot='command-item'][data-highlighted] {
    background-color: var(--muted);
    color: var(--foreground);
}

.command-menu-content [data-slot='command-item'][data-highlighted] [data-slot='command-shortcut'] {
    color: var(--foreground);
}

.command-menu-content [data-slot='command-item']:focus-visible {
    outline: 2px solid color-mix(in oklab, var(--ring) 50%, transparent);
    outline-offset: -2px;
}
</style>
