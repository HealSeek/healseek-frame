<script setup lang="ts">
import { computed, ref } from 'vue'
import { SidebarInset, SidebarProvider } from '@healseek/uikit-shadcnui'
import { usePreferencesStore } from '@healseek/stores/preferences'
import BasicHeader from '../header/header.vue'
import BasicSidebar from '../sidebar/sidebar.vue'
import type { SidebarMenuItemType } from '../sidebar/types'
import type { SidebarView } from '../sidebar/sidebarViews'
import { useTabScroll } from '../useTabScroll'

defineOptions({ name: 'BasicLayoutMix' })

const props = withDefaults(defineProps<{
    menus?: SidebarMenuItemType[]
    sidebarViews?: SidebarView[]
    siteTitle?: string
    siteLogo?: string
    showSearch?: boolean
    showMessages?: boolean
    showTheme?: boolean
    showLanguage?: boolean
    showSettings?: boolean
    showTabs?: boolean
    maximized?: boolean
    sidebarVariant?: 'sidebar' | 'inset' | 'floating'
    collapsible?: 'offcanvas' | 'icon' | 'none'
    onLogout?: () => void | Promise<void>
}>(), {
    menus: () => [],
    sidebarViews: () => [] as SidebarView[],
    siteTitle: 'Framework',
    showSearch: true,
    showMessages: true,
    showTheme: true,
    showLanguage: true,
    showSettings: true,
    showTabs: true,
    maximized: false,
})

const preferences = usePreferencesStore()
const effectiveVariant = computed(() => props.sidebarVariant ?? preferences.preferences.layout.sidebarVariant)
const effectiveCollapsible = computed(() => props.collapsible ?? preferences.preferences.layout.sidebarCollapsible)
const contentClass = computed(() => preferences.preferences.layout.contentLayout === 'centered'
    ? 'mx-auto w-full max-w-[var(--content-max-width,1280px)]'
    : 'w-full')
const contentScroll = ref<HTMLElement | null>(null)
useTabScroll(contentScroll)
</script>

<template>
    <div data-layout-shell class="flex h-svh flex-col overflow-hidden bg-sidebar [--app-header-height:3rem] [--header-height:3rem]">
        <SidebarProvider class="flex h-full flex-col">
            <slot v-if="!props.maximized" name="header" :title="siteTitle" :menus="menus">
                <BasicHeader
                    :title="siteTitle"
                    :logo="siteLogo"
                    :menus="menus"
                    :show-search="showSearch"
                    :show-messages="showMessages"
                    :show-theme="showTheme"
                    :show-language="showLanguage"
                    :show-settings="showSettings"
                    :on-logout="onLogout"
                >
                    <template v-if="$slots['header-left']" #left><slot name="header-left" /></template>
                    <template v-if="$slots.business" #business><slot name="business" /></template>
                    <template v-if="$slots['header-tools']" #tools><slot name="header-tools" /></template>
                    <template v-if="$slots['header-right']" #right><slot name="header-right" /></template>
                </BasicHeader>
            </slot>
            <div class="flex min-h-0 flex-1">
                <slot v-if="!props.maximized" name="sidebar" :menus="menus" :sidebar-views="sidebarViews" :variant="effectiveVariant" :collapsible="effectiveCollapsible">
                    <BasicSidebar :menus="menus" :sidebar-views="sidebarViews" :variant="effectiveVariant" :collapsible="effectiveCollapsible" />
                </slot>
                <SidebarInset class="@container/content relative min-h-0 min-w-0 overflow-hidden md:h-[calc(100svh-var(--app-header-height))]">
                    <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <slot v-if="props.showTabs" name="tabs" />
                        <div ref="contentScroll" data-slot="layout-content-scroll" class="hover-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                            <div :class="[contentClass, 'h-full min-h-0']">
                                <slot name="content"><slot name="main"><slot /></slot></slot>
                            </div>
                        </div>
                        <slot name="footer" />
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    </div>
</template>
