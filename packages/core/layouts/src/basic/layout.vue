<script lang="ts" setup>
import { computed, ref } from 'vue'
import { SidebarInset, SidebarProvider } from '@healseek/uikit-shadcnui'
import { usePreferencesStore } from '@healseek/stores'
import { BasicHeader, BasicSidebar } from './index'
import type { SidebarMenuItemType } from './sidebar/types'
import type { SidebarView } from './sidebar/sidebarViews'
import { useTabScroll } from './useTabScroll'

defineOptions({ name: 'BasicLayout' })

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
    /** Render the framework tab strip through the named `tabs` slot. */
    showTabs?: boolean
    /** Hide the shell chrome while the active tab is maximized. */
    maximized?: boolean
    sidebarVariant?: 'sidebar' | 'inset' | 'floating'
    collapsible?: 'offcanvas' | 'icon' | 'none'
    onLogout?: () => void | Promise<void>
}>(), {
    menus: () => [] as SidebarMenuItemType[],
    sidebarViews: () => [] as SidebarView[],
    siteTitle: 'Framework',
    siteLogo: '',
    showSearch: true,
    showMessages: true,
    showTheme: true,
    showLanguage: true,
    showTabs: true,
    maximized: false,
})

const preferences = usePreferencesStore()
const layout = computed(() => preferences.preferences.layout)
const effectiveVariant = computed(() => props.sidebarVariant ?? layout.value.sidebarVariant)
const effectiveCollapsible = computed(() => props.collapsible ?? layout.value.sidebarCollapsible)
// The preference manager writes --content-max-width so apps can override the
// centered rail without replacing the layout component.
const contentClass = computed(() => layout.value.contentLayout === 'centered'
    ? 'mx-auto w-full max-w-[var(--content-max-width,1280px)]'
    : 'w-full')
// Keep the framework settings entry available by default. Apps can still
// explicitly hide it with `show-settings="false"`.
const showSettings = computed(() => props.showSettings ?? true)
const contentScroll = ref<HTMLElement | null>(null)
useTabScroll(contentScroll)
</script>

<template>
    <div data-layout-shell class="h-svh overflow-hidden bg-sidebar [--app-header-height:3rem] [--header-height:3rem]">
        <SidebarProvider
            class="flex h-full flex-col"
            :style="{ '--sidebar-width': '13rem', '--sidebar-width-icon': '2.75rem' }"
        >
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
                    <template v-if="$slots.business" #business>
                        <slot name="business" />
                    </template>
                    <template v-if="$slots['header-tools']" #tools><slot name="header-tools" /></template>
                    <template v-if="$slots['header-right']" #right><slot name="header-right" /></template>
                </BasicHeader>
            </slot>
            <div class="flex min-h-0 w-full flex-1">
                <slot v-if="!props.maximized" name="sidebar" :menus="menus" :sidebar-views="sidebarViews" :variant="effectiveVariant" :collapsible="effectiveCollapsible">
                    <BasicSidebar :menus="menus" :sidebar-views="sidebarViews" :variant="effectiveVariant" :collapsible="effectiveCollapsible" />
                </slot>
                <SidebarInset
                    class="@container/content relative min-h-0 min-w-0 overflow-hidden"
                    :class="props.maximized
                        ? 'md:h-svh'
                        : 'md:h-[calc(100svh-var(--app-header-height,0px))] md:peer-data-[variant=inset]:h-[calc(100svh-var(--app-header-height,0px)-(var(--spacing)*4))]'"
                >
                    <main class="flex min-h-0 flex-1 flex-col overflow-hidden">
                        <slot v-if="props.showTabs" name="tabs" />
                        <div ref="contentScroll" data-slot="layout-content-scroll" class="hover-scrollbar min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto">
                            <div :class="[contentClass, 'h-full min-h-0']">
                                <slot name="content">
                                    <slot />
                                </slot>
                            </div>
                        </div>
                        <slot name="footer" />
                    </main>
                </SidebarInset>
            </div>
        </SidebarProvider>
    </div>
</template>

<style src="./theme.css"></style>
