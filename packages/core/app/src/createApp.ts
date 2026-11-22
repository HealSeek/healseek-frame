import { createApp as createVueApp, watch, type Component } from 'vue'
import {
    type AppRouterRegistration,
} from '@healseek/router'
import { createAppRouter, getAppRouterRegistration, setActiveAppRouter, type FrameworkRouterOptions } from '@healseek/router/internal'
import { createLayoutsI18n, loadLocalesMapFromDir } from '@healseek/layouts'
import { useAuthStore, useI18nStore } from '@healseek/stores'
import { piniaPersist } from '@healseek/stores/persist'
import { createPinia, setActivePinia } from 'pinia'
import type { Locale } from '@healseek/stores/i18n'
import { resolvePreferences, type DeepPartial, type Preferences } from '@healseek/config/preferences'
import { usePreferencesStore } from '@healseek/stores/preferences'
import { getRequestRegistration, getSessionRestore, installRequest, setRequestClient } from '@healseek/request/internal'
import { installPermission, usePermissionStore } from '@healseek/permission'
import { installTabs } from '@healseek/tabs'
import { registerLocalIcons } from '@healseek/shared/icons'
import { getAppLocaleRegistration } from './localeRegistry'
import { APP_CONTEXT_KEY, type AppContext } from './context'

let activeRuntime: { app: ReturnType<typeof createVueApp>; mounted: boolean } | null = null

export interface FrameworkAppOptions {
    root: Component
    preferences?: DeepPartial<Preferences>
}

export interface FrameworkApp {
    mount: (selector?: string) => void
}

type RouteRecordRaw = FrameworkRouterOptions['routes'][number]
type RouteComponent = NonNullable<FrameworkRouterOptions['pageMap']>[string]

function isRouteRecord(value: unknown): value is RouteRecordRaw {
    return typeof value === 'object' && value !== null
        && ('path' in value || 'redirect' in value || 'component' in value)
}

async function loadRoutes(registration: AppRouterRegistration | null): Promise<RouteRecordRaw[]> {
    const routes: RouteRecordRaw[] = []
    for (const loader of Object.values(registration?.routes ?? {})) {
        const module = await loader()
        const exported = Array.isArray(module) || isRouteRecord(module)
            ? module
            : (module as { default?: RouteRecordRaw | RouteRecordRaw[] }).default
        if (Array.isArray(exported)) routes.push(...exported as RouteRecordRaw[])
        else if (exported) routes.push(exported as RouteRecordRaw)
    }
    return routes
}

function createPageMap(registration: AppRouterRegistration | null): Record<string, RouteComponent> {
    const pageMap: Record<string, RouteComponent> = {}
    for (const [key, loader] of Object.entries(registration?.pages ?? {})) {
        const match = key.replace(/\\/g, '/').match(/(?:^|\/)views\/(.+\.vue)$/)
        if (!match) continue
        if (typeof loader === 'function') {
            pageMap[`/views/${match[1]}`] = (() => Promise.resolve(loader()).then((module) => {
                if (module && typeof module === 'object' && 'default' in module) {
                    return module.default
                }
                return module
            })) as RouteComponent
        } else {
            pageMap[`/views/${match[1]}`] = loader as RouteComponent
        }
    }
    return pageMap
}

/** Create one framework runtime; application modules register their policies before this call. */
export async function createApp(options: FrameworkAppOptions): Promise<FrameworkApp> {
    if (!options?.root) throw new Error('[framework/app] root is required')
    // A framework runtime is a singleton per page. Tear down a previous
    // runtime before HMR/tests create another one so its mounted component
    // tree cannot keep reacting to the new app's preferences and router.
    if (activeRuntime?.mounted) activeRuntime.app.unmount()
    activeRuntime = null
    registerLocalIcons()
    const defaults = resolvePreferences(options.preferences)
    const routerRegistration = getAppRouterRegistration()
    const requestRegistration = getRequestRegistration()
    const localeRegistration = getAppLocaleRegistration()

    const pinia = createPinia()
    // Make the framework-owned container the active instance even before the
    // Vue root is mounted. This keeps app-side stores and startup guards on
    // the same Pinia instance during tests, HMR, and async bootstrap.
    setActivePinia(pinia)
    pinia.use(piniaPersist)
    const i18n = createLayoutsI18n()
    const app = createVueApp(options.root)
    app.use(pinia)
    app.use(i18n)

    const preferencesStore = usePreferencesStore()
    await preferencesStore.init({ namespace: defaults.app.name, overrides: defaults })
    const preferences = preferencesStore.preferences
    if (typeof document !== 'undefined') document.title = preferences.app.title || preferences.app.name

    const localeLoaders = loadLocalesMapFromDir(localeRegistration?.modules ?? {})
    const i18nStore = useI18nStore()
    i18nStore.configure({
        loaders: Object.fromEntries(Object.entries(localeLoaders).map(([locale, loader]) => [locale, async () => {
            const loaded = await loader()
            if (loaded && typeof loaded === 'object') i18n.global.mergeLocaleMessage(locale, loaded)
        }])) as Partial<Record<Locale, () => Promise<void>>>,
    })
    const globalI18n = i18n.global as unknown as {
        locale: { value: Locale }
        fallbackLocale: { value: Locale } | Locale
    }
    i18nStore.bindExternal(globalI18n.locale)
    if (typeof globalI18n.fallbackLocale === 'object') {
        globalI18n.fallbackLocale.value = preferences.locale.fallback
    } else {
        globalI18n.fallbackLocale = preferences.locale.fallback
    }
    await i18nStore.loadLocale(preferences.locale.fallback)
    await i18nStore.setLocale(preferences.locale.current)

    const auth = useAuthStore()
    const routes = await loadRoutes(routerRegistration)
    if (!routes.some((route) => route.path === '/')) {
        routes.push({ path: '/', redirect: preferences.app.homePath })
    }
    const router = createAppRouter({
        routes,
        pageMap: createPageMap(routerRegistration),
        menusMod: preferences.app.menusMod,
        menus: routerRegistration?.menus,
        history: routerRegistration?.history,
        base: routerRegistration?.base,
    })
    setActiveAppRouter(router.router)

    const request = installRequest(app, {
        baseURL: requestRegistration?.baseURL ?? '',
        timeout: requestRegistration?.timeout,
        debug: requestRegistration?.debug,
        hooks: requestRegistration?.hooks,
        errorHandler: requestRegistration?.errorHandler,
        useStore: () => ({
            getAccessToken: () => auth.accessToken,
        }),
    })
    setRequestClient(request)
    await requestRegistration?.setup?.({ client: request })

    await getSessionRestore()?.()

    let dynamicMenusLoaded = false
    router.router.beforeEach((to) => {
        if (!preferences.auth?.enabled) return true
        if (to.path === '/login' && auth.isLoggedIn) return { path: preferences.app.homePath }
        // A catch-all route is only a temporary match for a backend page
        // until its menu has been loaded. It must not bypass authentication.
        const isNotFoundFallback = to.matched.some((record) =>
            record.name === 'NotFoundFallback' || record.path.includes(':pathMatch'),
        )
        if (to.meta.public && !isNotFoundFallback) return true
        if (!auth.isLoggedIn) return { path: '/login', query: { redirect: to.fullPath } }
        return true
    })
    installPermission(app, {
        getAuth: () => ({
            userRoles: auth.userRoles,
            userPermissions: auth.userPermissions,
            isLoggedIn: auth.isLoggedIn,
        }),
        router,
        onDeny: '/403',
    })
    router.router.beforeEach(async (to) => {
        if (preferences.app.menusMod === 'frontend' || !routerRegistration?.menus?.load) return true
        if (preferences.auth?.enabled && !auth.isLoggedIn) return true
        if (dynamicMenusLoaded) return true
        dynamicMenusLoaded = await router.refreshMenus()
        if (!dynamicMenusLoaded) {
            // A menu request can be the first request that discovers an
            // expired session. In page mode the request interceptor has
            // already cleared auth and marked the session expired; cancel the
            // in-flight protected navigation instead of letting it render
            // once after the redirect attempt.
            if (preferences.auth?.loginExpiredMode === 'page' && auth.sessionExpired && !auth.isLoggedIn) {
                return { path: '/login', query: { redirect: to.fullPath }, replace: true }
            }
            return true
        }
        return { path: to.path, query: to.query, hash: to.hash, replace: true }
    })
    watch(() => auth.isLoggedIn, (loggedIn) => {
        if (!loggedIn && dynamicMenusLoaded) {
            router.clearDynamicRoutes()
            dynamicMenusLoaded = false
        }
    }, { flush: 'sync' })
    watch(() => [auth.userRoles.join(','), auth.userPermissions.join(',')], () => {
        if (!auth.isLoggedIn) return
        const permission = usePermissionStore()
        permission.syncFromAuth({
            userRoles: auth.userRoles,
            userPermissions: auth.userPermissions,
            isLoggedIn: auth.isLoggedIn,
        })
        if (dynamicMenusLoaded) void router.refreshMenus()
        const current = router.router.currentRoute.value
        if (current.path !== '/403' && !permission.canAccessRoute(current)) {
            void router.router.replace('/403')
        }
    })
    installTabs(app, {
        router: router.router,
        defaultTabPath: preferences.app.homePath,
        storageKey: `framework-tabs:${preferences.app.name}`,
    })
    for (const guard of routerRegistration?.beforeEach ?? []) {
        router.router.beforeEach(guard as Parameters<typeof router.router.beforeEach>[0])
    }
    for (const guard of routerRegistration?.beforeResolve ?? []) {
        router.router.beforeResolve(guard as Parameters<typeof router.router.beforeResolve>[0])
    }
    for (const guard of routerRegistration?.afterEach ?? []) {
        router.router.afterEach(guard as Parameters<typeof router.router.afterEach>[0])
    }

    const context: AppContext = {
        i18n,
        menus: router.menus,
        progress: router.progress,
    }
    app.provide(APP_CONTEXT_KEY, context)
    app.config.errorHandler = (error, _instance, info) => {
        console.error('[framework/app] unhandled error:', error, info)
    }
    app.use(router.router)

    activeRuntime = { app, mounted: false }

    return {
        mount: (selector = '#app') => {
            app.mount(selector)
            if (activeRuntime?.app === app) activeRuntime.mounted = true
        },
    }
}
