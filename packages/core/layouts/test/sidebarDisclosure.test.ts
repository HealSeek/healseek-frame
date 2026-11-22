import { readFileSync } from 'node:fs'
import { URL as NodeURL } from 'node:url'
import { mount, flushPromises, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter } from 'vue-router'
import { SidebarProvider, useSidebar } from '@healseek/uikit-shadcnui'
import BasicSidebar from '../src/basic/sidebar/sidebar.vue'
import type { SidebarMenuItemType } from '../src/basic/sidebar/types'
import zhCN from '../src/locales/zh-CN.json'

const wrappers: VueWrapper[] = []
const menus: SidebarMenuItemType[] = [
    { title: '首页', url: '/start' },
    {
        title: '内容', url: '/resources', children: [
            { title: '视频', url: '/resources/videos' },
            { title: '未开放', url: '/resources/restricted', disabled: true },
        ],
    },
    { title: '用户', url: '/users', children: [{ title: '用户列表', url: '/users/list' }] },
]

/** Render the actual provider, Reka disclosure, dropdown and mobile Sheet. */
async function mountSidebar(options: { mobile?: boolean; collapsed?: boolean; path?: string } = {}) {
    vi.stubGlobal('matchMedia', vi.fn((query: string) => ({
        matches: Boolean(options.mobile) && query === '(max-width: 768px)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })))
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: '/:pathMatch(.*)*', component: defineComponent({ render: () => null }) }],
    })
    await router.push(options.path ?? '/start')
    await router.isReady()
    let sidebar!: ReturnType<typeof useSidebar>
    const SidebarHarness = defineComponent({
        setup() {
            sidebar = useSidebar()
            return () => h(BasicSidebar, { menus })
        },
    })
    const wrapper = mount(defineComponent({
        setup: () => () => h(SidebarProvider, { defaultOpen: !options.collapsed }, {
            default: () => h(SidebarHarness),
        }),
    }), {
        attachTo: document.body,
        global: { plugins: [router, createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': zhCN } })] },
    })
    wrappers.push(wrapper)
    await flushPromises()
    return { wrapper, router, sidebar }
}

const parent = (url: string) => `[data-sidebar-menu-kind="parent"][data-menu-url="${url}"]`
const child = (url: string) => `[data-sidebar-menu-kind="child"][data-menu-url="${url}"]`

afterEach(() => {
    for (const wrapper of wrappers.splice(0)) wrapper.unmount()
    document.body.replaceChildren()
    vi.unstubAllGlobals()
})

describe('sidebar parent disclosure', () => {
    it('opens and closes the real measured panel without navigating or breaking the single-open rule', async () => {
        const { wrapper, router } = await mountSidebar()
        const resources = wrapper.get(parent('/resources'))
        expect(resources.attributes('aria-expanded')).toBe('false')
        await resources.trigger('click')
        expect(resources.attributes('aria-expanded')).toBe('true')
        expect(router.currentRoute.value.path).toBe('/start')
        const panel = wrapper.get('.app-sidebar-submenu[data-state="open"]')
        expect(panel.element.style.getPropertyValue('--reka-collapsible-content-height')).toMatch(/px$/)
        expect(panel.find(child('/resources/videos')).exists()).toBe(true)

        await wrapper.get(parent('/users')).trigger('click')
        expect(resources.attributes('aria-expanded')).toBe('false')
        expect(wrapper.get(parent('/users')).attributes('aria-expanded')).toBe('true')
        await wrapper.get(parent('/users')).trigger('click')
        expect(wrapper.get(parent('/users')).attributes('aria-expanded')).toBe('false')
        expect(router.currentRoute.value.path).toBe('/start')
    })

    it('keeps active routes and disabled children correct after route-driven opening', async () => {
        const { wrapper, router } = await mountSidebar()
        await router.push('/resources/videos')
        await flushPromises()
        expect(wrapper.get(parent('/resources')).attributes('aria-expanded')).toBe('true')
        expect(wrapper.get(child('/resources/videos')).attributes('aria-current')).toBe('page')
        const disabled = wrapper.get(child('/resources/restricted'))
        expect(disabled.attributes('aria-disabled')).toBe('true')
        expect(disabled.attributes('tabindex')).toBe('-1')
        await disabled.trigger('click')
        expect(router.currentRoute.value.path).toBe('/resources/videos')

        await router.push('/users/list')
        await flushPromises()
        expect(wrapper.get(parent('/resources')).attributes('aria-expanded')).toBe('false')
        expect(wrapper.get(parent('/users')).attributes('aria-expanded')).toBe('true')
        expect(wrapper.get(child('/users/list')).attributes('aria-current')).toBe('page')
    })

    it('preserves dropdown navigation when the desktop sidebar is collapsed', async () => {
        const { wrapper, router } = await mountSidebar({ collapsed: true })
        expect(wrapper.find(parent('/resources')).exists()).toBe(false)
        await wrapper.get('[data-sidebar-menu-kind="parent-collapsed"][data-menu-url="/resources"]').trigger('click')
        await flushPromises()
        const link = document.body.querySelector<HTMLElement>('[data-sidebar-menu-kind="collapsed-child"][data-menu-url="/resources/videos"]')
        expect(link).not.toBeNull()
        link!.click()
        await flushPromises()
        expect(router.currentRoute.value.path).toBe('/resources/videos')
    })

    it('uses the same disclosure in the mobile Sheet and closes it when a child is selected', async () => {
        const { sidebar, router } = await mountSidebar({ mobile: true, collapsed: true })
        sidebar.setOpenMobile(true)
        await flushPromises()
        const sheet = document.body.querySelector<HTMLElement>('[data-sidebar="sidebar"][data-mobile="true"]')
        expect(sheet).not.toBeNull()
        const trigger = sheet!.querySelector<HTMLButtonElement>(parent('/resources'))!
        trigger.click()
        await flushPromises()
        expect(trigger.getAttribute('aria-expanded')).toBe('true')
        expect(sheet!.querySelector('.app-sidebar-submenu[data-state="open"]')).not.toBeNull()
        expect(router.currentRoute.value.path).toBe('/start')
        sheet!.querySelector<HTMLAnchorElement>(child('/resources/videos'))!.click()
        await flushPromises()
        expect(router.currentRoute.value.path).toBe('/resources/videos')
        expect(sidebar.openMobile.value).toBe(false)
    })

    it('applies New API timing to measured height only when motion is permitted, including portaled mobile panels', () => {
        // DOM emulators cannot play CSS animations; assert the CSS contract here,
        // while desktop/mobile interpolation is checked in the actual browser.
        const css = readFileSync(new NodeURL('../src/basic/theme.css', import.meta.url), 'utf8')
        expect(css).toMatch(/(?:^|\n)\.app-sidebar-submenu\s*\{\s*overflow:\s*hidden;/)
        expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*no-preference\)\s*\{\s*\.app-sidebar-submenu\[data-state='open'\]\s*\{\s*animation:\s*app-sidebar-submenu-down 300ms ease-out;\s*\}\s*\.app-sidebar-submenu\[data-state='closed'\]\s*\{\s*animation:\s*app-sidebar-submenu-up 300ms ease-out;/)
        expect(css).toMatch(/@keyframes app-sidebar-submenu-down\s*\{\s*from\s*\{\s*height:\s*0;\s*\}\s*to\s*\{\s*height:\s*var\(--reka-collapsible-content-height\);/)
        expect(css).toMatch(/@keyframes app-sidebar-submenu-up\s*\{\s*from\s*\{\s*height:\s*var\(--reka-collapsible-content-height\);\s*\}\s*to\s*\{\s*height:\s*0;/)
    })
})
