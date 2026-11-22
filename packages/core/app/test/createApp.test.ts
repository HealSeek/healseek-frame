import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { useAuthStore } from '../src/index'
import { useTabStore } from '@healseek/stores/tabs'
import { getAppRouter, registerAppRouter } from '@healseek/router'
import { resetAppRouterRegistration } from '@healseek/router/internal'
import {
    getRequestClient,
    registerRequestSetup,
    registerSessionRestore,
} from '@healseek/request'
import { resetRequestRegistration } from '@healseek/request/internal'
import { createApp } from '../src/createApp'
import { useAppContext } from '../src/context'
import { registerAppLocales, resetAppLocaleRegistration } from '../src/localeRegistry'

const Page = defineComponent({ name: 'TestPage', template: '<div />' })
const user = {
    id: '1', username: 'ada', email: 'ada@example.com',
    roles: ['admin'], permissions: ['secret.read'],
}

describe('createApp self-registration', () => {
    beforeEach(() => {
        localStorage.clear()
        window.history.replaceState({}, '', '/secret')
        resetAppRouterRegistration()
        resetRequestRegistration()
        resetAppLocaleRegistration()
    })

    it('restores the session before initial navigation and exposes only mount', async () => {
        const order: string[] = []
        registerRequestSetup({
            baseURL: 'http://app-api',
            setup: ({ client }) => {
                // Request configuration runs after the framework router has
                // been created, so app interceptors may resolve it lazily.
                expect(() => getAppRouter()).not.toThrow()
                order.push('request')
                client.defaults.adapter = async (config) => ({
                    data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config,
                })
            },
        })
        registerSessionRestore(() => {
            order.push('restore')
            useAuthStore().setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        })
        registerAppRouter({
            routes: {
                './routes/modules/core.ts': async () => ({ default: [
                    { path: '/login', name: 'Login', component: Page, meta: { public: true, hideInMenu: true } },
                    { path: '/secret', name: 'Secret', component: Page, meta: { title: 'Secret', permissions: ['secret.read'] } },
                    { path: '/second', name: 'Second', component: Page, meta: { title: 'Second' } },
                    { path: '/403', name: 'Forbidden', component: Page, meta: { public: true, hideInMenu: true } },
                ] }),
            },
            beforeEach: [() => { order.push('app-guard') }],
            afterEach: [(to) => {
                const tabs = useTabStore()
                order.push(`app-after:${to.path}:${tabs.tabs.some((tab) => tab.fullPath === to.fullPath && tab.id === tabs.activeTabId)}`)
            }],
        })
        registerAppLocales({ modules: {
            './locales/en-US.json': async () => ({ default: { app: { greeting: 'Hello' } } }),
        } })

        const created = await createApp({
            root: Page,
            preferences: { app: { name: 'registration-test', homePath: '/secret' } },
        })
        await getAppRouter().isReady()

        expect(Object.keys(created)).toEqual(['mount'])
        expect(getAppRouter().currentRoute.value.name).toBe('Secret')
        expect(order.slice(0, 2)).toEqual(['request', 'restore'])
        expect(order).toContain('app-guard')
        await getAppRouter().push('/second')
        expect(order).toContain('app-after:/second:true')
        await getAppRouter().push('/secret')
        expect(getRequestClient().defaults.baseURL).toBe('http://app-api')
        expect(useAuthStore().isLoggedIn).toBe(true)
        await expect(getRequestClient().get('/ping')).resolves.toMatchObject({ data: { ok: true } })

        useAuthStore().setUser({ ...user, permissions: [] })
        await vi.waitFor(() => expect(getAppRouter().currentRoute.value.path).toBe('/403'))
    })

    it('awaits app locale loaders and overlays framework keys', async () => {
        let translations: { t: (key: string) => string } | undefined
        const Root = defineComponent({
            setup() {
                translations = useAppContext().i18n.global as unknown as { t: (key: string) => string }
                return () => null
            },
        })
        const loadCurrent = vi.fn(async () => ({ default: { login: { title: 'Application sign in' } } }))
        const loadCurrentCustom = vi.fn(async () => ({ default: { dashboard: 'Application dashboard' } }))
        const loadFallback = vi.fn(async () => ({ default: { fallbackOnly: '应用后备文案' } }))
        registerAppLocales({ modules: {
            './locales/en-US/auth.json': loadCurrent,
            './locales/en-US/custom.json': loadCurrentCustom,
            './locales/zh-CN/custom.json': loadFallback,
        } })
        registerAppRouter({ routes: {
            './routes/modules/core.ts': async () => ({ default: [
                { path: '/secret', name: 'Secret', component: Page, meta: { public: true } },
            ] }),
        } })

        const created = await createApp({
            root: Root,
            preferences: {
                app: { name: 'locale-overlay-test', homePath: '/secret' },
                auth: { enabled: false },
                locale: { current: 'en-US', fallback: 'zh-CN' },
            },
        })
        const host = document.createElement('div')
        host.id = 'locale-overlay-host'
        document.body.append(host)
        created.mount('#locale-overlay-host')

        expect(loadCurrent).toHaveBeenCalledOnce()
        expect(loadCurrentCustom).toHaveBeenCalledOnce()
        expect(loadFallback).toHaveBeenCalledOnce()
        expect(translations?.t('auth.login.title')).toBe('Application sign in')
        expect(translations?.t('auth.login.password')).toBe('Password')
        expect(translations?.t('custom.dashboard')).toBe('Application dashboard')
        expect(translations?.t('custom.fallbackOnly')).toBe('应用后备文案')
        expect(document.documentElement.lang).toBe('en-US')
        host.remove()
    })

    it('authenticates a direct backend route before loading its menu', async () => {
        window.history.replaceState({}, '', '/dynamic')
        const loadMenus = vi.fn(async () => [{
            title: 'Dynamic', url: '/dynamic', component: '/views/Dynamic.vue',
        }])
        registerAppRouter({
            routes: { './routes/modules/core.ts': async () => ({ default: [
                { path: '/login', name: 'Login', component: Page, meta: { public: true } },
                { path: '/403', name: 'Forbidden', component: Page, meta: { public: true } },
                { path: '/:pathMatch(.*)*', name: 'NotFoundFallback', component: Page, meta: { public: true } },
            ] }) },
            pages: { '../views/Dynamic.vue': async () => ({ default: Page }) },
            menus: { load: loadMenus },
        })

        await createApp({
            root: Page,
            preferences: { app: { name: 'dynamic-auth-test', homePath: '/dynamic', menusMod: 'backend' } },
        })
        const router = getAppRouter()
        await router.isReady()
        expect(router.currentRoute.value.path).toBe('/login')
        expect(router.currentRoute.value.query.redirect).toBe('/dynamic')
        expect(loadMenus).not.toHaveBeenCalled()

        useAuthStore().setSession({ user, accessToken: 'access-1' })
        await router.push('/dynamic')
        expect(loadMenus).toHaveBeenCalledOnce()
        expect(router.currentRoute.value.path).toBe('/dynamic')
        expect(router.currentRoute.value.name).toBe('dynamic:/dynamic')
    })

    it('cancels a protected navigation when a page-mode menu request expires the session', async () => {
        window.history.replaceState({}, '', '/dynamic')
        const loadMenus = vi.fn(async () => {
            const auth = useAuthStore()
            auth.clearSession()
            auth.markSessionExpired('/dynamic')
            throw new Error('access token expired')
        })
        registerSessionRestore(() => {
            useAuthStore().setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        })
        registerAppRouter({
            routes: { './routes/modules/core.ts': async () => ({ default: [
                { path: '/login', name: 'Login', component: Page, meta: { public: true } },
                { path: '/403', name: 'Forbidden', component: Page, meta: { public: true } },
                { path: '/:pathMatch(.*)*', name: 'NotFoundFallback', component: Page, meta: { public: true } },
            ] }) },
            menus: { load: loadMenus },
        })

        await createApp({
            root: Page,
            preferences: {
                app: { name: 'dynamic-expired-page-test', homePath: '/dynamic', menusMod: 'backend' },
                auth: { enabled: true, loginExpiredMode: 'page' },
            },
        })
        const router = getAppRouter()
        await router.isReady()
        expect(loadMenus).toHaveBeenCalledOnce()
        expect(router.currentRoute.value.path).toBe('/login')
        expect(router.currentRoute.value.query.redirect).toBe('/dynamic')
    })

})
