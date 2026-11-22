import {
    cloneVNode,
    computed,
    defineComponent,
    nextTick,
    watch,
    type Component,
    type ComponentPublicInstance,
    type VNode,
} from 'vue'
import type { TabItem } from '@healseek/stores/tabs'
import type { RouteRecordNormalized } from 'vue-router'

interface TabCacheSource {
    tabs: TabItem[]
    cachedTabIds: string[]
}

interface CachedView {
    fullPath: string
    name: string
    component: Component
    instance?: ComponentPublicInstance | null
    routeRecord?: RouteRecordNormalized
}

interface ViewRoute {
    fullPath: string
    matched?: RouteRecordNormalized[]
}

/**
 * KeepAlive filters component names rather than vnode keys. Give each tab
 * revision its own transparent component so evicting one query variant does
 * not retain it merely because another tab uses the same page component.
 */
export function useTabViewCache(tabs: TabCacheSource, route: ViewRoute) {
    const views = new Map<string, CachedView>()
    let serial = 0

    function tabKey(tab: TabItem): string {
        return JSON.stringify([tab.id, tab.refreshVersion ?? 0])
    }

    function restoreActiveInstance(): void {
        const current = [...views.values()].reverse().find(view => view.fullPath === route.fullPath)
        const { instance, routeRecord } = current ?? {}
        if (!instance || instance.$.isUnmounted || !routeRecord || !route.matched?.includes(routeRecord)) return
        // RouterView clears its shared record when any cached query instance
        // unmounts. Restore the surviving active sibling after those hooks.
        if (!routeRecord.instances.default) routeRecord.instances.default = instance
    }

    function ensureView(key: string, fullPath: string, routeRecord?: RouteRecordNormalized): CachedView {
        const existing = views.get(key)
        if (existing) return existing

        const name = `HealSeekTabView${serial++}`
        const view: CachedView = { fullPath, name, component: {}, routeRecord }
        const component = defineComponent({
            name,
            inheritAttrs: false,
            setup(_, { slots }) {
                return () => {
                    const child = slots.default?.()[0]
                    if (!child) return null
                    // cloneVNode merges these hooks with RouterView's own
                    // hooks and retains its original props and instance ref.
                    return cloneVNode(child, {
                        onVnodeMounted(vnode: VNode) { view.instance = vnode.component?.proxy },
                        onVnodeUnmounted() {
                            view.instance = undefined
                            void nextTick(restoreActiveInstance)
                        },
                    })
                }
            },
        })
        view.component = component
        views.set(key, view)
        return view
    }

    function viewFor(viewRoute: ViewRoute): CachedView {
        const tab = tabs.tabs.find(item => item.fullPath === viewRoute.fullPath)
        const routeRecord = viewRoute.matched?.find(record => record.components)
        if (tab) {
            const view = ensureView(tabKey(tab), tab.fullPath, routeRecord)
            view.routeRecord = routeRecord
            return view
        }

        // Closing an active tab can precede its replacement navigation. Keep
        // its current vnode stable until the route changes, but do not cache it.
        const current = [...views.values()].reverse().find(view => view.fullPath === viewRoute.fullPath)
        return current ?? ensureView(JSON.stringify([viewRoute.fullPath]), viewRoute.fullPath, routeRecord)
    }

    const cachedViewNames = computed(() => {
        const cachedIds = new Set(tabs.cachedTabIds)
        return tabs.tabs
            .filter(tab => tab.keepAlive !== false && cachedIds.has(tab.id))
            .map(tab => ensureView(tabKey(tab), tab.fullPath).name)
    })

    watch(
        () => [route.fullPath, ...tabs.tabs.map(tabKey)],
        () => {
            const retained = new Set(tabs.tabs.map(tabKey))
            const current = viewFor(route)
            for (const [key, view] of views) {
                if (!retained.has(key) && view !== current) views.delete(key)
            }
        },
        { flush: 'post' },
    )

    return { cachedViewNames, viewFor }
}
