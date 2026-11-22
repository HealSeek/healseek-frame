import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    createApp,
    defineComponent,
    h,
    nextTick,
    onActivated,
    onDeactivated,
    onMounted,
    onUnmounted,
    ref,
    type App,
} from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createI18n } from 'vue-i18n'
import { createMemoryHistory, createRouter, onBeforeRouteLeave, useRoute } from 'vue-router'
import { usePreferencesStore } from '@healseek/stores/preferences'
import { useTabStore } from '@healseek/stores/tabs'
import { APP_CONTEXT_KEY } from '../src/context'
import AppShell from '../src/AppShell.vue'

vi.mock('@healseek/components', () => ({ FrameworkToaster: () => null }))
vi.mock('@healseek/layouts', async () => {
    const { defineComponent, h } = await import('vue')
    return {
        BasicLoadingBar: () => null,
        BasicLayoutHost: defineComponent({
            setup(_, { slots }) { return () => h('main', slots.content?.()) },
        }),
    }
})
vi.mock('@healseek/tabs', () => ({ BasicTabBar: () => null }))
vi.mock('@healseek/uikit-shadcnui', () => ({
    Button: () => null,
    Dialog: () => null,
    DialogContent: () => null,
    DialogDescription: () => null,
    DialogFooter: () => null,
    DialogHeader: () => null,
    DialogTitle: () => null,
    Input: () => null,
}))

interface LifecycleRecord {
    id: number
    path: string
    events: string[]
}

let app: App | undefined
let host: HTMLDivElement

beforeEach(() => {
    localStorage.clear()
    host = document.createElement('div')
    document.body.append(host)
})

afterEach(() => {
    app?.unmount()
    app = undefined
    host.remove()
})

async function mountShell() {
    const records: LifecycleRecord[] = []
    const leaveGuard = vi.fn()
    const optionsLeaveGuard = vi.fn()
    const Page = defineComponent({
        name: 'SharedQueryPage',
        props: { label: String },
        beforeRouteLeave: optionsLeaveGuard,
        setup(props) {
            const route = useRoute()
            const record = { id: records.length + 1, path: route.fullPath, events: [] as string[] }
            records.push(record)
            onMounted(() => record.events.push('mounted'))
            onActivated(() => record.events.push('activated'))
            onDeactivated(() => record.events.push('deactivated'))
            onUnmounted(() => record.events.push('unmounted'))
            onBeforeRouteLeave(leaveGuard)
            return () => h('div', {
                'data-instance': record.id,
                'data-label': props.label,
                'data-path': record.path,
            }, record.path)
        },
    })
    const pinia = createPinia()
    setActivePinia(pinia)
    await usePreferencesStore().init({
        namespace: 'app-shell-cache-test',
        overrides: { theme: { animationEnabled: false } },
    })
    const tabs = useTabStore()
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: '/page', name: 'Page', component: Page, props: route => ({ label: route.query.id }), meta: { title: 'Page' } },
            { path: '/uncached', name: 'Uncached', component: Page, meta: { title: 'Uncached', keepAlive: false } },
        ],
    })
    router.afterEach((to, _from, failure) => { if (!failure) tabs.addOrActivate(to) })
    await router.push('/page?id=A')
    await router.isReady()
    const i18n = createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': {} } })
    app = createApp(AppShell)
    app.use(pinia)
    app.use(router)
    app.use(i18n)
    app.provide(APP_CONTEXT_KEY, { i18n, menus: ref([]), progress: ref(0) })
    app.mount(host)

    async function settle(path: string) {
        await nextTick()
        await vi.waitFor(() => expect(host.querySelector('[data-path]')?.getAttribute('data-path')).toBe(path))
        await nextTick()
    }

    async function navigate(path: string) {
        await router.push(path)
        await settle(path)
    }

    await settle('/page?id=A')
    return { records, leaveGuard, optionsLeaveGuard, tabs, router, navigate, settle }
}

describe('AppShell per-tab route cache', () => {
    it('preserves query siblings while closing and reopening one creates a new instance', async () => {
        const { records, tabs, router, navigate } = await mountShell()
        const firstA = records[0]!
        expect(host.querySelector('[data-label]')?.getAttribute('data-label')).toBe('A')
        await navigate('/page?id=B')
        const firstB = records[1]!
        expect(firstA.events).toContain('deactivated')
        expect(firstB.events).toContain('activated')

        const tabA = tabs.tabs.find(tab => tab.fullPath === '/page?id=A')!
        tabs.closeTab(tabA.id)
        await vi.waitFor(() => expect(firstA.events).toContain('unmounted'))
        expect(firstB.events).not.toContain('unmounted')
        expect(router.currentRoute.value.matched[0]!.instances.default?.$props.label).toBe('B')

        await navigate('/page?id=A')
        expect(records).toHaveLength(3)
        expect(records[2]!.id).not.toBe(firstA.id)
        await navigate('/page?id=B')
        expect(records).toHaveLength(3)
        expect(host.querySelector('[data-instance]')?.getAttribute('data-instance')).toBe(String(firstB.id))
        expect(firstB.events).not.toContain('unmounted')
    })

    it('refreshes only the selected query tab and releases each old revision', async () => {
        const { records, tabs, navigate, settle } = await mountShell()
        const firstA = records[0]!
        await navigate('/page?id=B')
        const firstB = records[1]!
        await navigate('/page?id=A')
        const tabA = tabs.tabs.find(tab => tab.fullPath === '/page?id=A')!

        tabs.refreshTab(tabA.id)
        await vi.waitFor(() => expect(firstA.events).toContain('unmounted'))
        await vi.waitFor(() => expect(records).toHaveLength(3))
        await settle('/page?id=A')
        const secondA = records[2]!
        expect(secondA.path).toBe('/page?id=A')
        expect(firstB.events).not.toContain('unmounted')

        tabs.refreshTab(tabA.id)
        await vi.waitFor(() => expect(secondA.events).toContain('unmounted'))
        await vi.waitFor(() => expect(records).toHaveLength(4))
        await settle('/page?id=A')
        await navigate('/page?id=B')
        expect(records).toHaveLength(4)
        expect(host.querySelector('[data-instance]')?.getAttribute('data-instance')).toBe(String(firstB.id))
    })

    it('does not cache routes opting out of keepAlive even when a sibling uses the same component', async () => {
        const { records, tabs, navigate } = await mountShell()
        const cachedA = records[0]!
        await navigate('/uncached')
        const uncached = records[1]!
        expect(uncached.events).not.toContain('activated')
        await navigate('/page?id=A')
        await vi.waitFor(() => expect(uncached.events).toContain('unmounted'))
        expect(records).toHaveLength(2)
        expect(cachedA.events).not.toContain('unmounted')
        expect(tabs.cachedTabIds).not.toContain(tabs.tabs.find(tab => tab.fullPath === '/uncached')!.id)

        await navigate('/uncached')
        expect(records).toHaveLength(3)
        expect(records[2]!.id).not.toBe(uncached.id)
    })

    it('releases a background revision while preserving the active sibling Options API guard', async () => {
        const { records, tabs, router, optionsLeaveGuard, navigate } = await mountShell()
        const firstA = records[0]!
        await navigate('/page?id=B')
        const firstB = records[1]!
        const tabA = tabs.tabs.find(tab => tab.fullPath === '/page?id=A')!

        tabs.refreshTab(tabA.id)
        await vi.waitFor(() => expect(firstA.events).toContain('unmounted'))
        expect(records).toHaveLength(2)
        expect(firstB.events).not.toContain('unmounted')
        expect(router.currentRoute.value.matched[0]!.instances.default?.$props.label).toBe('B')
        optionsLeaveGuard.mockClear()
        await navigate('/uncached')
        expect(optionsLeaveGuard).toHaveBeenCalledOnce()
        await navigate('/page?id=A')
        expect(records.filter(record => record.path === '/page?id=A')).toHaveLength(2)
    })

    it('preserves RouterView instance registration, route props, and leave guards through the wrapper', async () => {
        const { router, leaveGuard, navigate } = await mountShell()
        const matched = router.currentRoute.value.matched[0]!
        expect(matched.instances.default).toBeTruthy()
        expect(host.querySelector('[data-label]')?.getAttribute('data-label')).toBe('A')
        await navigate('/uncached')
        expect(leaveGuard).toHaveBeenCalledOnce()
        expect(matched.instances.default).toBeTruthy()
    })
})
