import { describe, expect, it, beforeEach } from 'vitest'
import { createApp, defineComponent, nextTick } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'
import { useTabStore } from '@healseek/stores/tabs'
import { installTabs } from '../src/index'

function makeRoute(
    path: string,
    meta: Record<string, unknown> = {},
): RouteLocationNormalized {
    return {
        path: path.split('?')[0]!,
        fullPath: path,
        name: path
            .split('?')[0]!
            .replace(/[/:?&=]/g, '_') as RouteLocationNormalized['name'],
        meta,
        query: {},
        params: {},
        matched: [],
        hash: '',
        redirectedFrom: undefined,
    } as unknown as RouteLocationNormalized
}

describe('@healseek/tabs', () => {
    beforeEach(() => setActivePinia(createPinia()))

    it('addOrActivate creates a new tab for an unseen route', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/dashboard', { title: '仪表盘' }))

        expect(store.tabs).toHaveLength(1)
        expect(store.tabs[0]?.title).toBe('仪表盘')
        expect(store.activeTabId).toBeTruthy()
    })

    it('addOrActivate activates an existing tab without duplicating', () => {
        const store = useTabStore()
        const r = makeRoute('/dashboard', { title: '仪表盘' })
        store.addOrActivate(r)
        const id = store.activeTabId!
        store.addOrActivate(r)
        expect(store.tabs).toHaveLength(1)
        expect(store.activeTabId).toBe(id)
    })

    it('uses the explicit cacheName instead of the route name for KeepAlive', () => {
        const store = useTabStore()
        store.addOrActivate(
            makeRoute('/users', {
                title: '用户',
                cacheName: 'UsersPage',
            }),
        )

        expect(store.tabs[0]?.componentName).toBe('UsersPage')
        expect(store.cachedComponentNames).toContain('UsersPage')
        expect(store.cachedComponentNames).not.toContain('_users')
    })

    it('discovers the matched Vue component name when cacheName is omitted', () => {
        const store = useTabStore()
        const route = makeRoute('/users', { title: '用户' })
        route.matched = [
            {
                components: { default: defineComponent({ name: 'UsersPage' }) },
            },
        ] as never
        store.addOrActivate(route)

        expect(store.tabs[0]?.componentName).toBe('UsersPage')
        expect(store.cachedComponentNames).toContain('UsersPage')
    })

    it('closeTab removes non-affix tabs', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A' }))
        store.addOrActivate(makeRoute('/b', { title: 'B' }))
        const aId = store.tabs[0]!.id
        store.closeTab(aId)
        expect(store.tabs.find((t) => t.id === aId)).toBeUndefined()
    })

    it('closeTab refuses to remove affix tabs', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A', affix: true }))
        const id = store.tabs[0]!.id
        store.closeTab(id)
        expect(store.tabs).toHaveLength(1)
    })

    it('closeOthers keeps only the current tab + affixes', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A', affix: true }))
        store.addOrActivate(makeRoute('/b', { title: 'B' }))
        store.addOrActivate(makeRoute('/c', { title: 'C' }))
        const cId = store.tabs.find((t) => t.path === '/c')!.id
        store.closeOthers(cId)
        expect(store.tabs.map((t) => t.path)).toEqual(['/a', '/c'])
    })

    it('closeAll removes everything except affixes', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A', affix: true }))
        store.addOrActivate(makeRoute('/b', { title: 'B' }))
        store.closeAll()
        expect(store.tabs.map((t) => t.path)).toEqual(['/a'])
    })

    it('refreshTab evicts the id from cachedTabIds then re-adds it', async () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A' }))
        const id = store.activeTabId!
        expect(store.cachedTabIds).toContain(id)
        store.refreshTab(id)
        // Immediately after refresh, the id is evicted.
        expect(store.cachedTabIds).not.toContain(id)
        // After nextTick it's re-added (because it's still active).
        await new Promise((r) => setTimeout(r, 10))
        expect(store.cachedTabIds).toContain(id)
    })

    it('re-adds a refreshed inactive tab when it is activated later', async () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A' }))
        const firstId = store.activeTabId!
        store.addOrActivate(makeRoute('/b', { title: 'B' }))
        store.refreshTab(firstId)
        expect(store.cachedTabIds).not.toContain(firstId)
        store.activate(firstId)
        expect(store.cachedTabIds).toContain(firstId)
    })

    it('hideInTab route is skipped by addOrActivate callers', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A' }))
        store.addOrActivate(makeRoute('/b', { title: 'B', hideInTab: true }))
        // The second route's hideInTab is an opt-out; the store-level
        // check lives in installTabs (router.afterEach). The store
        // itself is permissive so the router can decide.
        expect(store.tabs.map((t) => t.path)).toEqual(['/a', '/b'])
    })

    it('tracks maximize state as a reversible tab action', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a', { title: 'A' }))
        const id = store.activeTabId!
        store.maximizeTab(id)
        expect(store.maximizedTabId).toBe(id)
        store.maximizeTab(null)
        expect(store.maximizedTabId).toBeNull()
    })

    it('keeps a tab scroll position when the tab is activated again', () => {
        const store = useTabStore()
        const first = makeRoute('/reports?range=week', { title: '周报' })
        const second = makeRoute('/reports?range=month', { title: '月报' })
        store.addOrActivate(first)
        const firstId = store.activeTabId!
        store.setScrollTop(firstId, 320)
        store.addOrActivate(second)
        store.addOrActivate(first)

        expect(store.activeTabId).toBe(firstId)
        expect(store.tabs.find((tab) => tab.id === firstId)?.scrollTop).toBe(
            320,
        )
        expect(
            store.tabs.find((tab) => tab.fullPath === second.fullPath)
                ?.scrollTop,
        ).toBe(0)
    })

    it('discovers a compiled script-setup component name', () => {
        const store = useTabStore()
        const route = makeRoute('/users')
        route.matched = [
            { components: { default: { __name: 'UsersPage' } } },
        ] as never
        store.addOrActivate(route)
        expect(store.cachedComponentNames).toEqual(['UsersPage'])
    })

    it('keeps fullPath identity for separate query tabs', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/reports?range=week'))
        store.addOrActivate(makeRoute('/reports?range=month'))
        expect(store.tabs).toHaveLength(2)
        expect(store.tabs[0]?.id).not.toBe(store.tabs[1]?.id)
    })

    it('refreshes restored route metadata without resetting user tab state', () => {
        const store = useTabStore()
        store.addOrActivate(
            makeRoute('/revisit', {
                title: 'Old title',
                titleKey: 'old.title',
                icon: 'old:icon',
                affix: true,
                cacheName: 'OldPage',
            }),
        )
        const tab = store.tabs[0]!
        tab.pinned = true // A restored record may contain both fixed flags.
        store.setScrollTop(tab.id, 120)
        store.addOrActivate(makeRoute('/second'))
        const order = store.tabs.map((item) => item.id)

        store.addOrActivate(
            makeRoute('/revisit', {
                title: 'New title',
                titleKey: 'new.title',
                icon: 'new:icon',
                affix: false,
                closable: false,
                cacheName: 'NewPage',
            }),
        )
        expect(tab).toMatchObject({
            title: 'New title',
            titleKey: 'new.title',
            icon: 'new:icon',
            affix: false,
            closable: false,
            componentName: 'NewPage',
            pinned: true,
            scrollTop: 120,
        })
        expect(store.tabs.map((item) => item.id)).toEqual(order)
        expect(store.cachedComponentNames).not.toContain('OldPage')
        expect(store.cachedComponentNames).toContain('NewPage')

        store.addOrActivate(makeRoute('/revisit'))
        expect(tab.title).toBe('_revisit')
        expect(tab.icon).toBeUndefined()
        expect(tab.titleKey).toBeUndefined()
        expect(tab.componentName).toBe('_revisit')
        expect(tab.closable).toBe(true)
        expect(tab.pinned).toBe(true)
        store.pinTab(tab.id)
        expect(store.isClosable(tab)).toBe(true)

        store.addOrActivate(makeRoute('/revisit', { affix: true }))
        expect(tab.affix).toBe(true)
        expect(tab.closable).toBe(false)
        expect(store.isClosable(tab.id)).toBe(false)
    })

    it('orders affix, pinned and normal groups stably', () => {
        const store = useTabStore()
        for (const path of [
            '/normal-a',
            '/pinned-a',
            '/fixed-a',
            '/pinned-b',
            '/fixed-b',
            '/normal-b',
        ]) {
            store.addOrActivate(
                makeRoute(path, { affix: path.startsWith('/fixed') }),
            )
        }
        for (const tab of store.tabs.filter((tab) =>
            tab.path.startsWith('/pinned'),
        ))
            store.pinTab(tab.id)
        expect(store.orderedTabs.map((tab) => tab.path)).toEqual([
            '/fixed-a',
            '/fixed-b',
            '/pinned-a',
            '/pinned-b',
            '/normal-a',
            '/normal-b',
        ])
    })

    it('protects route-fixed, user-fixed and application-protected tabs in all close actions', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/fixed', { affix: true }))
        store.addOrActivate(makeRoute('/pinned'))
        const pinned = store.tabs[1]!
        store.pinTab(pinned.id)
        store.addOrActivate(makeRoute('/protected'))
        store.tabs[2]!.closable = false
        store.addOrActivate(makeRoute('/normal'))
        for (const tab of store.tabs.slice(0, 3)) {
            expect(store.isClosable(tab)).toBe(false)
            expect(store.isClosable(tab.id)).toBe(false)
            store.closeTab(tab.id)
        }
        expect(store.tabs).toHaveLength(4)
        store.closeAll()
        expect(store.tabs.map((tab) => tab.path)).toEqual([
            '/fixed',
            '/pinned',
            '/protected',
        ])
        expect(store.tabs.some((tab) => tab.id === store.activeTabId)).toBe(
            true,
        )
        store.pinTab(pinned.id)
        expect(store.isClosable(pinned.id)).toBe(true)
        store.closeTab(pinned.id)
        expect(store.tabs.map((tab) => tab.path)).toEqual([
            '/fixed',
            '/protected',
        ])
    })

    it('chooses the visible next neighbour when closing an active tab', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/normal-a'))
        const normalA = store.tabs[0]!
        store.addOrActivate(makeRoute('/pinned'))
        store.pinTab(store.tabs[1]!.id)
        store.addOrActivate(makeRoute('/normal-b'))
        const normalB = store.tabs[2]!
        store.activate(normalA.id)
        store.closeTab(normalA.id)
        expect(store.activeTabId).toBe(normalB.id)
        store.closeTab(normalB.id)
        expect(store.activeTabId).toBe(store.tabs[0]!.id)
    })

    it('closes other tabs around an inactive target and activates that target', () => {
        const store = useTabStore()
        for (const path of ['/fixed', '/target', '/pinned', '/active'])
            store.addOrActivate(makeRoute(path, { affix: path === '/fixed' }))
        const target = store.tabs[1]!
        store.pinTab(store.tabs[2]!.id)
        store.closeOthers(target.id)
        expect(store.orderedTabs.map((tab) => tab.path)).toEqual([
            '/fixed',
            '/pinned',
            '/target',
        ])
        expect(store.activeTabId).toBe(target.id)
    })

    it('closes left and right according to the displayed order while preserving fixed tabs', () => {
        const store = useTabStore()
        for (const path of ['/left', '/pinned', '/target', '/right', '/fixed'])
            store.addOrActivate(makeRoute(path, { affix: path === '/fixed' }))
        store.pinTab(store.tabs[1]!.id)
        const target = store.tabs[2]!
        const right = store.tabs[3]!
        store.activate(store.tabs[0]!.id)
        store.closeLeft(target.id)
        expect(store.orderedTabs.map((tab) => tab.path)).toEqual([
            '/fixed',
            '/pinned',
            '/target',
            '/right',
        ])
        expect(store.activeTabId).toBe(target.id)
        store.activate(right.id)
        store.closeRight(target.id)
        expect(store.orderedTabs.map((tab) => tab.path)).toEqual([
            '/fixed',
            '/pinned',
            '/target',
        ])
        expect(store.activeTabId).toBe(target.id)
    })

    it('ignores unknown activation, maximization and close targets', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a'))
        const active = store.activeTabId
        store.maximizeTab(active)
        store.activate('missing')
        store.maximizeTab('missing')
        store.closeOthers('missing')
        store.closeLeft('missing')
        store.closeRight('missing')
        expect(store.activeTabId).toBe(active)
        expect(store.maximizedTabId).toBe(active)
        expect(store.tabs).toHaveLength(1)
    })

    it('clears the active and maximized state after the final tab closes', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/only'))
        const id = store.activeTabId!
        store.maximizeTab(id)
        store.closeTab(id)
        expect(store.activeTabId).toBeNull()
        expect(store.maximizedTabId).toBeNull()
        expect(store.cachedTabIds).toEqual([])
        expect(store.cachedComponentNames).toEqual([])
    })

    it('prunes closed maximized state and cache entries during bulk closes', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/keep'))
        const keep = store.tabs[0]!
        store.addOrActivate(makeRoute('/close'))
        store.maximizeTab(store.activeTabId)
        store.closeOthers(keep.id)
        expect(store.maximizedTabId).toBeNull()
        expect(store.cachedTabIds).toEqual([keep.id])
        expect(store.cachedComponentNames).toEqual([keep.componentName])
    })

    it('moves tabs only within their displayed group and preserves active state', () => {
        const store = useTabStore()
        for (const path of [
            '/a',
            '/fixed',
            '/b',
            '/pinned-a',
            '/pinned-b',
            '/c',
        ])
            store.addOrActivate(makeRoute(path, { affix: path === '/fixed' }))
        const byPath = (path: string) =>
            store.tabs.find((tab) => tab.path === path)!.id
        store.pinTab(byPath('/pinned-a'))
        store.pinTab(byPath('/pinned-b'))
        const active = store.activeTabId
        store.moveTab(byPath('/a'), byPath('/c'))
        expect(store.orderedTabs.map((tab) => tab.path)).toEqual([
            '/fixed',
            '/pinned-a',
            '/pinned-b',
            '/b',
            '/c',
            '/a',
        ])
        store.moveTab(byPath('/pinned-b'), byPath('/pinned-a'))
        expect(store.orderedTabs.map((tab) => tab.path)).toEqual([
            '/fixed',
            '/pinned-b',
            '/pinned-a',
            '/b',
            '/c',
            '/a',
        ])
        const stable = store.tabs.map((tab) => tab.id)
        store.moveTab(byPath('/fixed'), byPath('/a'))
        store.moveTab(byPath('/b'), byPath('/pinned-a'))
        store.moveTab('missing', byPath('/a'))
        expect(store.tabs.map((tab) => tab.id)).toEqual(stable)
        expect(store.activeTabId).toBe(active)
    })

    it('never caches a non-keepalive tab when refreshed', async () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/fresh', { keepAlive: false }))
        const tab = store.tabs[0]!
        store.refreshTab(tab.id)
        await nextTick()
        expect(tab.refreshVersion).toBe(1)
        expect(store.cachedTabIds).toEqual([])
        expect(store.cachedComponentNames).toEqual([])
    })

    it('removes stale cache membership when the route disables keepalive', () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/changing'))
        store.addOrActivate(makeRoute('/changing', { keepAlive: false }))
        expect(store.cachedTabIds).toEqual([])
        expect(store.cachedComponentNames).toEqual([])
    })

    it('does not resurrect a tab closed while refresh is pending', async () => {
        const store = useTabStore()
        store.addOrActivate(makeRoute('/a'))
        const id = store.activeTabId!
        store.refreshTab(id)
        store.closeTab(id)
        await nextTick()
        expect(store.tabs).toEqual([])
        expect(store.cachedTabIds).toEqual([])
        expect(store.cachedComponentNames).toEqual([])
        store.refreshTab('missing')
        await nextTick()
        expect(store.cachedTabIds).toEqual([])
    })

    it('deduplicates pending refreshes and discards callbacks across clear/reopen', async () => {
        const store = useTabStore()
        store.defaultTabPath = '/home'
        store.addOrActivate(makeRoute('/a'))
        const id = store.activeTabId!
        store.refreshTab(id)
        store.refreshTab(id)
        await nextTick()
        expect(store.cachedTabIds).toEqual([id])
        expect(store.tabs[0]!.refreshVersion).toBe(2)
        store.refreshTab(id)
        store.clear()
        expect(store.activeTabId).toBeNull()
        expect(store.maximizedTabId).toBeNull()
        expect(store.defaultTabPath).toBe('/home')
        store.addOrActivate(makeRoute('/a'))
        await nextTick()
        expect(store.tabs[0]!.refreshVersion).toBe(0)
        expect(store.cachedTabIds).toEqual([id])
    })
})

describe('installTabs routing', () => {
    beforeEach(() => setActivePinia(createPinia()))

    function makeRouter() {
        const component = defineComponent({ render: () => null })
        return createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: '/home', component, meta: { title: 'Home' } },
                { path: '/blocked', component },
                { path: '/hidden', component, meta: { hideInTab: true } },
                { path: '/login', component, meta: { ignoreLayout: true } },
            ],
        })
    }

    it('records fallback configuration without opening an unvisited route', () => {
        const router = makeRouter()
        const { tabStore } = installTabs(createApp({}), {
            router,
            defaultTabPath: '/home',
        })
        expect(tabStore.defaultTabPath).toBe('/home')
        expect(tabStore.tabs).toEqual([])
        expect(tabStore.activeTabId).toBeNull()
    })

    it('initializes an already resolved route and tracks only successful navigations', async () => {
        const router = makeRouter()
        await router.push('/home')
        const { tabStore } = installTabs(createApp({}), { router })
        const homeId = tabStore.activeTabId
        expect(tabStore.tabs.map((tab) => tab.path)).toEqual(['/home'])
        router.beforeEach((to) => to.path !== '/blocked')
        await router.push('/blocked')
        await router.push('/home') // A duplicate-navigation failure is also ignored.
        expect(tabStore.tabs.map((tab) => tab.path)).toEqual(['/home'])
        expect(tabStore.activeTabId).toBe(homeId)
        await router.push('/home?range=week')
        expect(tabStore.tabs.map((tab) => tab.fullPath)).toEqual([
            '/home',
            '/home?range=week',
        ])
        expect(
            tabStore.tabs.find((tab) => tab.id === tabStore.activeTabId)
                ?.fullPath,
        ).toBe(router.currentRoute.value.fullPath)
    })

    it('skips hidden and standalone routes on installation and subsequent navigation', async () => {
        const router = makeRouter()
        await router.push('/hidden')
        const { tabStore } = installTabs(createApp({}), { router })
        expect(tabStore.tabs).toEqual([])
        await router.push('/home')
        const activeId = tabStore.activeTabId
        await router.push('/hidden')
        await router.push('/login')
        expect(tabStore.tabs.map((tab) => tab.path)).toEqual(['/home'])
        expect(tabStore.activeTabId).toBe(activeId)
    })

    it('does not track an asynchronous navigation superseded by a newer destination', async () => {
        const router = makeRouter()
        const { tabStore } = installTabs(createApp({}), { router })
        await router.push('/home')
        let releaseGuard!: () => void
        let notifyGuard!: () => void
        const enteredGuard = new Promise<void>((resolve) => {
            notifyGuard = resolve
        })
        router.beforeEach((to) => {
            if (to.path !== '/blocked') return true
            notifyGuard()
            return new Promise<boolean>((resolve) => {
                releaseGuard = () => resolve(true)
            })
        })
        const pending = router.push('/blocked')
        await enteredGuard
        await router.push('/home?range=week')
        releaseGuard()
        await pending
        expect(tabStore.tabs.map((tab) => tab.fullPath)).toEqual([
            '/home',
            '/home?range=week',
        ])
        expect(
            tabStore.tabs.find((tab) => tab.id === tabStore.activeTabId)
                ?.fullPath,
        ).toBe('/home?range=week')
    })

    it.each(['hideInTab', 'ignoreLayout'] as const)(
        'respects parent %s when child metadata overrides it',
        async (flag) => {
            const router = makeRouter()
            const component = defineComponent({ render: () => null })
            router.addRoute({
                path: '/parent',
                component,
                meta: { [flag]: true },
                children: [
                    { path: 'child', component, meta: { [flag]: false } },
                ],
            })
            await router.push('/parent/child')
            expect(router.currentRoute.value.meta[flag]).toBe(false)
            const { tabStore } = installTabs(createApp({}), { router })
            expect(tabStore.tabs).toEqual([])
            await router.push('/home')
            const homeId = tabStore.activeTabId
            await router.push('/parent/child?visit=new')
            expect(tabStore.tabs.map((tab) => tab.path)).toEqual(['/home'])
            expect(tabStore.activeTabId).toBe(homeId)
        },
    )
})
