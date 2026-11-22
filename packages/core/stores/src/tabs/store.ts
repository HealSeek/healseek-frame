/**
 * useTabStore — multi-tab state with localStorage persistence.
 *
 * The store holds the open tab list, the active tab id, the cached
 * tab ids (for keep-alive), and the maximized tab id. It does NOT
 * own the rendering — that's BasicTabBar's job (in @healseek/tabs).
 */
import { defineStore } from 'pinia'
import { computed, ref, nextTick } from 'vue'
// Keep Pinia's `persist` option augmentation available when this subpath is
// imported directly (`@healseek/stores/tabs`) without first traversing the
// package root export that installs the persistence plugin.
import type {} from 'pinia-plugin-persistedstate'
import type {
    RouteLocationNormalized,
    RouteLocationResolvedGeneric,
} from 'vue-router'
import type { TabItem } from './types'

// A browser may host more than one framework application (for example the
// playground and a business app) at the same origin.  The tab state belongs
// to the application runtime, so its persistence key is selected by
// installTabs before the store is first created.  Keep the historic key as
// the fallback for consumers that use the store directly.
let configuredTabStorageKey = 'framework-tabs'

export function setTabStorageKey(key?: string): void {
    const normalized = key?.trim()
    if (normalized) configuredTabStorageKey = normalized
}

function hashId(
    to: RouteLocationNormalized | RouteLocationResolvedGeneric,
): string {
    // Non-cryptographic — same fullPath always yields the same id.
    let h = 0
    for (let i = 0; i < to.fullPath.length; i++) {
        h = (h * 31 + to.fullPath.charCodeAt(i)) | 0
    }
    return `${to.fullPath}#${Math.abs(h)}`
}

/**
 * Resolve the name Vue KeepAlive will see for a route component.
 *
 * Route names and component names are independent in vue-router. Falling
 * back to `to.name` for every route means an app that names a route
 * `DashboardUsers` but its SFC `Users` silently loses KeepAlive caching. An
 * explicit `meta.cacheName` remains the strongest contract; when it is not
 * supplied we can still discover names for eagerly registered components
 * from the matched route records before falling back to the route name.
 */
function componentNameFor(
    to: RouteLocationNormalized | RouteLocationResolvedGeneric,
): string | undefined {
    const cacheName = to.meta?.cacheName
    if (typeof cacheName === 'string' && cacheName) return cacheName

    const matched =
        'matched' in to && Array.isArray(to.matched) ? to.matched : []
    for (let index = matched.length - 1; index >= 0; index -= 1) {
        const component = matched[index]?.components?.default
        if (!component || typeof component !== 'object') continue
        const namedComponent = component as { name?: unknown; __name?: unknown }
        const name = namedComponent.name || namedComponent.__name
        if (typeof name === 'string' && name) return name
    }

    return typeof to.name === 'string' ? to.name : undefined
}

export const useTabStore = defineStore(
    'tabs',
    () => {
        const tabs = ref<TabItem[]>([])
        const activeTabId = ref<string | null>(null)
        const cachedTabIds = ref<string[]>([])
        const cachedComponentNames = ref<string[]>([])
        const maximizedTabId = ref<string | null>(null)
        const defaultTabPath = ref<string | null>(null)
        const orderedTabs = computed(() =>
            [...tabs.value].sort(
                (left, right) => tabGroup(left) - tabGroup(right),
            ),
        )

        function tabGroup(tab: TabItem): number {
            return tab.affix ? 0 : tab.pinned ? 1 : 2
        }

        /** Fixed tabs and application-protected tabs survive every close action. */
        function isClosable(tabOrId: TabItem | string): boolean {
            const tab =
                typeof tabOrId === 'string'
                    ? tabs.value.find((item) => item.id === tabOrId)
                    : tabOrId
            return Boolean(
                tab && !tab.affix && !tab.pinned && tab.closable !== false,
            )
        }

        function syncCachedState(): void {
            const cachedIds = new Set(cachedTabIds.value)
            const cachedTabs = tabs.value.filter(
                (tab) => tab.keepAlive !== false && cachedIds.has(tab.id),
            )
            cachedTabIds.value = cachedTabs.map((tab) => tab.id)
            cachedComponentNames.value = [
                ...new Set(
                    cachedTabs
                        .map((tab) => tab.componentName)
                        .filter((name): name is string => Boolean(name)),
                ),
            ]
        }

        function cacheTab(tab: TabItem): void {
            if (tab.keepAlive === false) return
            if (!cachedTabIds.value.includes(tab.id))
                cachedTabIds.value.push(tab.id)
            syncCachedState()
        }

        /** Pick a surviving neighbour in the same order that the strip renders. */
        function removeTabs(
            shouldClose: (tab: TabItem) => boolean,
            activateId?: string,
        ): void {
            const previousOrder = orderedTabs.value
            const previousActiveId = activeTabId.value
            const previousActiveIndex = previousOrder.findIndex(
                (tab) => tab.id === activeTabId.value,
            )
            tabs.value = tabs.value.filter(
                (tab) => !isClosable(tab) || !shouldClose(tab),
            )
            const survivingIds = new Set(tabs.value.map((tab) => tab.id))
            if (activateId && survivingIds.has(activateId)) {
                activeTabId.value = activateId
            } else if (
                !activeTabId.value ||
                !survivingIds.has(activeTabId.value)
            ) {
                const following = previousOrder
                    .slice(previousActiveIndex + 1)
                    .find((tab) => survivingIds.has(tab.id))
                const preceding = previousOrder
                    .slice(0, Math.max(0, previousActiveIndex))
                    .reverse()
                    .find((tab) => survivingIds.has(tab.id))
                activeTabId.value =
                    following?.id ??
                    preceding?.id ??
                    orderedTabs.value[0]?.id ??
                    null
            }
            if (maximizedTabId.value && !survivingIds.has(maximizedTabId.value))
                maximizedTabId.value = null
            syncCachedState()
            const active = tabs.value.find(
                (tab) => tab.id === activeTabId.value,
            )
            if (active && active.id !== previousActiveId) cacheTab(active)
        }

        function addOrActivate(
            to: RouteLocationNormalized | RouteLocationResolvedGeneric,
        ) {
            const id = hashId(to)
            const componentName = componentNameFor(to)
            const existing = tabs.value.find((t) => t.id === id)
            if (!existing) {
                tabs.value.push({
                    id,
                    path: to.path,
                    fullPath: to.fullPath,
                    title:
                        (to.meta?.title as string | undefined) ??
                        (typeof to.name === 'string' ? to.name : '未命名'),
                    titleKey: to.meta?.titleKey as string | undefined,
                    icon: to.meta?.icon as string | undefined,
                    affix: to.meta?.affix === true,
                    pinned: false,
                    closable:
                        to.meta?.affix !== true && to.meta?.closable !== false,
                    scrollTop: 0,
                    query: { ...(to.query as Record<string, unknown>) },
                    params: { ...(to.params as Record<string, unknown>) },
                    componentName,
                    keepAlive: to.meta?.keepAlive !== false,
                    refreshVersion: 0,
                })
            } else {
                // Route configuration is authoritative over restored metadata;
                // user choices (pinning, order and scroll position) stay intact.
                existing.componentName = componentName
                existing.keepAlive = to.meta?.keepAlive !== false
                existing.affix = to.meta?.affix === true
                existing.closable =
                    to.meta?.affix !== true && to.meta?.closable !== false
                existing.icon = to.meta?.icon as string | undefined
                existing.titleKey = to.meta?.titleKey as string | undefined
                existing.title =
                    (to.meta?.title as string | undefined) ??
                    (typeof to.name === 'string' ? to.name : '未命名')
            }
            activeTabId.value = id
            // Keep the historic id list for consumers that evict a specific
            // tab, and expose component names for Vue KeepAlive.
            const active = tabs.value.find((tab) => tab.id === id)!
            if (active.keepAlive === false)
                cachedTabIds.value = cachedTabIds.value.filter(
                    (cachedId) => cachedId !== id,
                )
            cacheTab(active)
            syncCachedState()
        }

        function closeTab(id: string): void {
            if (!isClosable(id)) return
            removeTabs((tab) => tab.id === id)
        }

        function closeOthers(id: string): void {
            if (!tabs.value.some((tab) => tab.id === id)) return
            removeTabs((tab) => tab.id !== id, id)
        }

        function closeAll(): void {
            removeTabs(() => true)
        }

        function closeLeft(id: string): void {
            const index = orderedTabs.value.findIndex((tab) => tab.id === id)
            if (index < 0) return
            const closingIds = new Set(
                orderedTabs.value.slice(0, index).map((tab) => tab.id),
            )
            removeTabs((tab) => closingIds.has(tab.id))
        }

        function closeRight(id: string): void {
            const index = orderedTabs.value.findIndex((tab) => tab.id === id)
            if (index < 0) return
            const closingIds = new Set(
                orderedTabs.value.slice(index + 1).map((tab) => tab.id),
            )
            removeTabs((tab) => closingIds.has(tab.id))
        }

        /** Move to the target's position without crossing fixed/pinned groups. */
        function moveTab(dragId: string, targetId: string): void {
            const from = tabs.value.findIndex((tab) => tab.id === dragId)
            const to = tabs.value.findIndex((tab) => tab.id === targetId)
            if (from < 0 || to < 0 || from === to) return
            const dragged = tabs.value[from]!
            const target = tabs.value[to]!
            if (
                dragged.affix ||
                target.affix ||
                tabGroup(dragged) !== tabGroup(target)
            )
                return
            tabs.value.splice(from, 1)
            tabs.value.splice(to, 0, dragged)
        }

        function refreshTab(id: string): void {
            const tab = tabs.value.find((item) => item.id === id)
            if (!tab) return
            tab.refreshVersion = (tab.refreshVersion ?? 0) + 1
            const version = tab.refreshVersion
            cachedTabIds.value = cachedTabIds.value.filter((c) => c !== id)
            syncCachedState()
            nextTick(() => {
                // A close/reopen or a second refresh invalidates this pending callback.
                const current = tabs.value.find((item) => item.id === id)
                if (
                    current === tab &&
                    current.refreshVersion === version &&
                    id === activeTabId.value
                )
                    cacheTab(current)
            })
        }

        function pinTab(id: string): void {
            const t = tabs.value.find((x) => x.id === id)
            if (t && !t.affix) t.pinned = !t.pinned
        }

        function activate(id: string): void {
            const tab = tabs.value.find((item) => item.id === id)
            if (!tab) return
            activeTabId.value = id
            // Persisted tab records from pre-keepAlive versions do not have
            // this field. Treat an absent value as the historical default.
            cacheTab(tab)
        }

        function maximizeTab(id: string | null): void {
            if (id === null || tabs.value.some((tab) => tab.id === id))
                maximizedTabId.value = id
        }

        function clear(): void {
            tabs.value = []
            activeTabId.value = null
            cachedTabIds.value = []
            cachedComponentNames.value = []
            maximizedTabId.value = null
        }

        function setScrollTop(id: string, scrollTop: number): void {
            const t = tabs.value.find((x) => x.id === id)
            if (t) t.scrollTop = scrollTop
        }

        return {
            tabs,
            orderedTabs,
            activeTabId,
            cachedTabIds,
            cachedComponentNames,
            maximizedTabId,
            defaultTabPath,
            addOrActivate,
            closeTab,
            closeOthers,
            closeAll,
            refreshTab,
            pinTab,
            activate,
            maximizeTab,
            setScrollTop,
            isClosable,
            closeLeft,
            closeRight,
            moveTab,
            clear,
        }
    },
    {
        persist: {
            pick: ['tabs', 'cachedTabIds', 'cachedComponentNames'],
            // Resolve the key when the persisted-state plugin creates the
            // store.  `installTabs()` runs after this module is imported, so
            // evaluating the variable here would freeze the historic
            // `framework-tabs` key and make every app share its tab cache.
            key: () => configuredTabStorageKey,
            storage: localStorage,
        },
    },
)
