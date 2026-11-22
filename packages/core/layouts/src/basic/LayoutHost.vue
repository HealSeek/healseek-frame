<script setup lang="ts">
/**
 * LayoutHost — resolves `route.meta.layout` before the configured default.
 *
 * Supported values of `meta.layout`:
 *   - 'mix'           → BasicLayoutMix (header-nav + sidebar skeleton)
 *   - 'full-content'  → BasicLayoutFullContent (no chrome)
 *   - undefined/other → BasicLayout
 */
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { usePreferencesStore } from '@healseek/stores/preferences'
import BasicLayout from './layout.vue'
import BasicLayoutMix from './layouts/mix.vue'
import BasicLayoutFullContent from './layouts/full-content.vue'
import type { SidebarMenuItemType } from './sidebar/types'
import type { SidebarView } from './sidebar/sidebarViews'

defineOptions({ name: 'BasicLayoutHost', inheritAttrs: false })

const route = useRoute()
const preferences = usePreferencesStore()
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
    showSearch: true,
    showMessages: true,
    showTheme: true,
    showLanguage: true,
    showSettings: true,
    showTabs: true,
    maximized: false,
})
const Layout = computed(() => {
    const routeLayout = (route.meta as { layout?: string } | undefined)?.layout
    const key = routeLayout ?? preferences.preferences.layout.mode
    if (key === 'mix') return BasicLayoutMix
    if (key === 'full-content') return BasicLayoutFullContent
    return BasicLayout
})
const layoutProps = computed(() => Layout.value === BasicLayout || Layout.value === BasicLayoutMix ? props : {})
</script>

<template>
    <component :is="Layout" v-bind="layoutProps">
        <template v-if="$slots.header" #header="slotProps"><slot name="header" v-bind="slotProps" /></template>
        <template v-if="$slots.business" #business><slot name="business" /></template>
        <template v-if="$slots['header-left']" #header-left><slot name="header-left" /></template>
        <template v-if="$slots['header-tools']" #header-tools><slot name="header-tools" /></template>
        <template v-if="$slots['header-right']" #header-right><slot name="header-right" /></template>
        <template v-if="$slots.sidebar" #sidebar="slotProps"><slot name="sidebar" v-bind="slotProps" /></template>
        <template v-if="$slots.content" #content="slotProps"><slot name="content" v-bind="slotProps" /></template>
        <template v-if="$slots.footer" #footer="slotProps"><slot name="footer" v-bind="slotProps" /></template>
        <template v-if="$slots.tabs" #tabs="slotProps"><slot name="tabs" v-bind="slotProps" /></template>
        <slot />
    </component>
</template>
