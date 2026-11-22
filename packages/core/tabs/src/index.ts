/**
 * @healseek/tabs — vben-style multi-tab system.
 *
 * Exports:
 *   - BasicTabBar          — the strip component (slot it into your layout)
 *   - useCachedTabNames    — pair with <KeepAlive :include="..."> in App.vue
 *   - installTabs(app, { router, defaultTabPath? })
 *
 * The tab state itself (`useTabStore`, `TabItem`) lives in
 * `@healseek/stores/tabs` — every framework store is centralised there
 * to keep the import surface predictable. This package only owns the
 * UI + the router wiring.
 */
import { computed } from 'vue'
import type { App } from 'vue'
import type { RouteLocationNormalized, Router } from 'vue-router'
import { setTabStorageKey, useTabStore } from '@healseek/stores/tabs'
import BasicTabBar from './components/BasicTabBar.vue'

export { useTabStore } from '@healseek/stores/tabs'
export type { TabItem } from '@healseek/stores/tabs'
export { BasicTabBar }

export function useCachedTabNames() {
    const store = useTabStore()
    return computed(() => store.cachedComponentNames)
}

export interface InstallTabsOptions {
    /** The Vue Router instance. */
    router: Router
    /**
     * Fallback path for actions that close the last tab (e.g. '/dashboard').
     * It is recorded without creating a tab before navigation succeeds.
     */
    defaultTabPath?: string
    /** Storage namespace for this application's opened tabs. */
    storageKey?: string
}

function shouldTrackRoute(
    route: Pick<RouteLocationNormalized, 'meta' | 'matched'>,
): boolean {
    if (route.meta.hideInTab === true || route.meta.ignoreLayout === true)
        return false
    // A child cannot accidentally opt back into a standalone/hidden parent.
    return !route.matched.some(
        (record) =>
            record.meta.hideInTab === true || record.meta.ignoreLayout === true,
    )
}

/**
 * Install the tabs system: registers BasicTabBar as a global
 * component and wires router.afterEach to keep the tab list in sync.
 */
export function installTabs(
    app: App,
    options: InstallTabsOptions,
): { tabStore: ReturnType<typeof useTabStore> } {
    setTabStorageKey(options.storageKey)
    const store = useTabStore()

    // BasicLayout consumes the tab strip through its named slot. Registering
    // it globally keeps the framework install path useful for apps that use
    // the layout without importing the component into every root.
    app.component('BasicTabBar', BasicTabBar)

    store.defaultTabPath = options.defaultTabPath ?? null

    // Route guards can cancel or supersede a navigation. Only the route
    // actually displayed by the router may become an active tab.
    options.router.afterEach((to, _from, failure) => {
        if (failure) return
        if (!shouldTrackRoute(to)) return
        store.addOrActivate(to)
    })

    // Consumers may install tabs after initial navigation has already settled.
    // START_LOCATION has no matched records and must not create a phantom '/'.
    const current = options.router.currentRoute.value
    if (current.matched.length > 0 && shouldTrackRoute(current)) {
        store.addOrActivate(current)
    }

    return { tabStore: store }
}
