<script lang="ts" setup>
import { Button } from '@healseek/uikit-shadcnui'
import { CommandMenu, type CommandMenuItem } from '@healseek/components/command-menu'
import { Icon } from '@healseek/shared/icons'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import type { SidebarMenuItemType } from '../../sidebar/types'
import { buildSearchMenuGroups } from './searchMenus'

defineOptions({ name: 'CommandSearch' })

const props = defineProps<{
    menus?: SidebarMenuItemType[]
}>()

const open = ref(false)
const isApple = ref(false)
const router = useRouter()
const { t, te, locale } = useI18n({ useScope: 'global' })

function label(key: string | undefined, fallback: string): string {
    return key && te(key) ? t(key) : fallback
}

const groups = computed(() => buildSearchMenuGroups(props.menus ?? [], label).map(group => ({
    ...group,
    items: group.items.map(item => ({ ...item, value: item.url })),
})))
const entries = computed(() => new Map(groups.value.flatMap(group => group.items.map(item => [item.id, item] as const))))

/** Use the permission-filtered sidebar tree for both search and navigation. */
function onSelect(selection: CommandMenuItem): void {
    const item = entries.value.get(selection.id)
    if (!item || item.disabled) return
    open.value = false
    if (item.external) window.open(item.url, '_blank', 'noopener,noreferrer')
    else void router.push(item.url)
}

function onShortcut(event: KeyboardEvent): void {
    if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey || event.shiftKey) return
    if (event.key.toLowerCase() !== 'k' || !(event.ctrlKey || event.metaKey)) return
    event.preventDefault()
    open.value = !open.value
}

onMounted(() => {
    isApple.value = /Mac|iPhone|iPad|iPod/.test(navigator.platform)
    document.addEventListener('keydown', onShortcut)
})
onBeforeUnmount(() => document.removeEventListener('keydown', onShortcut))
</script>

<template>
    <Button
        data-slot="header-search"
        type="button"
        variant="outline"
        :aria-label="t('header.menuSearch')"
        :aria-keyshortcuts="isApple ? 'Meta+K' : 'Control+K'"
        :aria-expanded="open"
        aria-haspopup="dialog"
        :title="t('header.menuSearch')"
        class="group h-8 w-8 shrink-0 justify-center gap-2 rounded-md bg-muted/25 p-0 font-normal text-muted-foreground shadow-none hover:bg-accent hover:text-foreground sm:w-40 sm:justify-start sm:px-2.5 md:w-52 lg:w-56 xl:w-64"
        @click="open = true">
        <Icon icon="lucide:search" data-icon="inline-start" aria-hidden="true" />
        <span class="hidden min-w-0 flex-1 truncate text-start sm:inline">{{ t('header.menuSearch') }}</span>
        <kbd aria-hidden="true" class="pointer-events-none ms-auto hidden h-5 shrink-0 items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium select-none sm:flex group-hover:bg-accent">
            <span>{{ isApple ? '⌘' : 'Ctrl' }}</span>K
        </kbd>
    </Button>

    <CommandMenu
        :key="locale"
        v-model:open="open"
        :groups="groups"
        :title="t('header.menuSearch')"
        :description="t('header.menuSearchDescription')"
        :placeholder="t('header.menuSearchPlaceholder')"
        :empty-text="t('header.menuSearchEmpty')"
        content-class="header-menu-search top-[min(15vh,6rem)] max-h-[calc(100dvh-2rem)] gap-0"
        @select="onSelect"
    >
        <template #item="{ item }">
            <Icon :icon="entries.get(item.id)?.icon || 'lucide:arrow-right'" aria-hidden="true" />
            <span class="min-w-0 flex-1 truncate">
                <span v-if="entries.get(item.id)?.breadcrumb.length" class="text-muted-foreground">
                    {{ entries.get(item.id)?.breadcrumb.join(' / ') }} /
                </span>
                {{ item.label }}
            </span>
            <!-- Command filters rendered text, so URLs remain searchable without visual clutter. -->
            <span class="sr-only">{{ entries.get(item.id)?.url }}</span>
            <Icon v-if="entries.get(item.id)?.external" icon="lucide:arrow-up-right" aria-hidden="true" />
        </template>
    </CommandMenu>
</template>

<style>
.header-menu-search [data-slot='command'] {
    min-height: 0;
}

.header-menu-search [data-slot='command-list'] {
    min-height: 0;
    max-height: min(18rem, calc(100dvh - 8rem));
    overscroll-behavior: contain;
    scrollbar-width: none;
}

.header-menu-search [data-slot='command-list']::-webkit-scrollbar {
    display: none;
}
</style>
