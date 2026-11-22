<script lang="ts" setup>
import { useSidebar, SidebarTrigger } from '@healseek/uikit-shadcnui'
import { Icon } from '@healseek/shared/icons'
import type { SidebarMenuItemType } from '../sidebar/types'

import UserDropDown from '../components/UserDropDown/index.vue'
import BasicSiteTitle from '../components/SiteTitle/index.vue'
import LanguageSwitch from '../components/LanguageSwitch/index.vue'
import MessageDropdown from '../components/MessageDropdown/index.vue'
import CommandSearch from '../components/CommandSearch/index.vue'
import LayoutSettings from '../components/LayoutSettings/index.vue'
import ThemeToggle from '../components/ThemeToggle/index.vue'

const { isMobile } = useSidebar()

defineOptions({ name: 'BasicHeader' })

const props = withDefaults(
    defineProps<{
        title?: string
        logo?: string
        menus?: SidebarMenuItemType[]
        showSearch?: boolean
        showMessages?: boolean
        showTheme?: boolean
        showLanguage?: boolean
        showSettings?: boolean
        onLogout?: () => void | Promise<void>
    }>(),
    {
        title: 'Framework',
        logo: '',
        menus: () => [] as SidebarMenuItemType[],
        showSearch: true,
        showMessages: true,
        showTheme: true,
        showLanguage: true,
        showSettings: true,
    },
)

</script>

<template>
    <header data-layout-header="basic-header" class="sticky top-0 z-40 h-[var(--app-header-height,3rem)] w-full shrink-0 bg-transparent">
        <div class="flex h-full items-center gap-1.5 px-2 sm:gap-2 sm:px-3">
            <div class="flex h-full min-w-0 items-center gap-2">
                <SidebarTrigger class="size-8 cursor-pointer">
                    <Icon icon="lucide:sidebar" />
                </SidebarTrigger>
                <BasicSiteTitle :title="props.title" :logo="props.logo" />
                <slot name="left" />
            </div>

            <slot name="tools">
                <div data-slot="header-tools" class="ms-auto flex h-(--header-height) shrink-0 items-center justify-end gap-1.5 sm:gap-2">
                    <nav v-if="!isMobile" class="me-1 hidden items-center gap-4 lg:flex">
                        <slot name="business">
                            <span data-slot="header-business-demo" class="text-sm font-medium text-muted-foreground select-none">开发者菜单</span>
                        </slot>
                    </nav>
                    <CommandSearch v-if="props.showSearch" :menus="props.menus" />
                    <MessageDropdown v-if="props.showMessages" />
                    <LanguageSwitch v-if="props.showLanguage" />
                    <LayoutSettings v-if="props.showSettings" />
                    <ThemeToggle v-if="props.showTheme" />
                    <UserDropDown class="pl-2.5 sm:pl-0" :on-logout="props.onLogout" />
                </div>
            </slot>
            <slot name="right" />
        </div>
    </header>
</template>
