import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import type { MenuItem } from '../src'
import { createAppRouter } from '../src/internal'

const Page = defineComponent({ name: 'Page', template: '<div />' })

function dynamicMenus(): MenuItem[] {
    return [{
        title: 'Admin', url: '/admin', name: 'admin', meta: { roles: ['admin'] },
        children: [{
            title: 'Users', url: '/admin/users', name: 'admin-users',
            component: '/views/Users.vue', meta: { permissions: ['users:read'] },
            children: [{ title: 'Details', url: '/admin/users/details', name: 'admin-user-details', component: '/views/Details.vue' }],
        }],
    }]
}

describe('@healseek/router dynamic routes', () => {
    afterEach(() => {
        vi.useRealTimers()
    })

    it('only shows route progress when a path is loaded for the first time', async () => {
        vi.useFakeTimers()
        const appRouter = createAppRouter({
            routes: [
                { path: '/dashboard', name: 'dashboard', component: Page, meta: { title: 'Dashboard' } },
                { path: '/reports', name: 'reports', component: Page, meta: { title: 'Reports' } },
            ],
            history: 'hash',
        })

        await appRouter.router.push('/dashboard')
        expect(appRouter.progress.value).toBe(100)
        vi.advanceTimersByTime(300)
        expect(appRouter.progress.value).toBe(0)

        // A query-only navigation reuses the already loaded tab path and
        // must not flash the top loading bar again.
        await appRouter.router.push('/dashboard?tab=activity')
        expect(appRouter.progress.value).toBe(0)

        await appRouter.router.push('/reports')
        expect(appRouter.progress.value).toBe(100)
        vi.advanceTimersByTime(300)
        expect(appRouter.progress.value).toBe(0)

        // Returning to an existing tab is also instant.
        await appRouter.router.push('/dashboard')
        expect(appRouter.progress.value).toBe(0)
    })

    it('filters frontend menus by hideInMenu and permission', () => {
        const appRouter = createAppRouter({
            routes: [{
                path: '/workspace', name: 'workspace', component: Page, meta: { title: 'Workspace' },
                children: [{ path: 'secret', name: 'secret', component: Page, meta: { title: 'Secret', permissions: ['secret.read'] } }],
            }, { path: '/hidden', name: 'hidden', component: Page, meta: { title: 'Hidden', hideInMenu: true } }],
            menusMod: 'frontend', history: 'hash',
            permissionFilter: (meta) => !(meta as { permissions?: string[] } | undefined)?.permissions?.length,
        })
        expect(appRouter.menus.value).toEqual([])
        expect(appRouter.router.hasRoute('secret')).toBe(true)
    })

    it('resolves backend vben view paths against the static page map', () => {
        const users = defineComponent({ name: 'UsersPage', template: '<div />' })
        const details = defineComponent({ name: 'DetailsPage', template: '<div />' })
        const appRouter = createAppRouter({
            routes: [], menusMod: 'backend', history: 'hash',
            pageMap: { '/views/Users.vue': users, '/views/Details.vue': details },
        })
        appRouter.registerDynamicRoutes(dynamicMenus())
        expect(appRouter.router.hasRoute('admin')).toBe(true)
        expect(appRouter.router.hasRoute('admin-users')).toBe(true)
        expect(appRouter.router.getRoutes().find((route) => route.name === 'admin-users')?.components?.default).toBe(users)
        expect(appRouter.router.getRoutes().find((route) => route.name === 'admin-user-details')?.components?.default).toBe(details)
    })

    it('accepts vben-style `path` fields from backend menus', () => {
        const users = defineComponent({ name: 'UsersPage', template: '<div />' })
        const appRouter = createAppRouter({
            routes: [], menusMod: 'backend', history: 'hash',
            pageMap: { '/views/Users.vue': users },
        })
        appRouter.registerDynamicRoutes([{
            title: 'Users', path: '/admin/users', name: 'admin-users',
            component: '/views/Users.vue',
        }])
        expect(appRouter.menus.value[0]?.url).toBe('/admin/users')
        expect(appRouter.router.hasRoute('admin-users')).toBe(true)
    })

    it('preserves order from local route metadata and backend menu metadata', () => {
        const appRouter = createAppRouter({
            routes: [
                { path: '/late', name: 'late', component: Page, meta: { title: 'Late', group: 'Main', order: 20 } },
                { path: '/early', name: 'early', component: Page, meta: { title: 'Early', group: 'Main', order: 10 } },
            ],
            menusMod: 'frontend',
            history: 'hash',
        })
        expect(appRouter.menus.value.map((item) => item.order)).toEqual([20, 10])

        const backend = createAppRouter({ routes: [], menusMod: 'backend', history: 'hash' })
        backend.registerDynamicRoutes([
            { title: 'Backend', url: '/backend', order: 3, meta: { order: 99 } },
            { title: 'Meta only', url: '/meta-only', meta: { order: -1 } },
            { title: 'Unordered', url: '/unordered' },
        ])
        expect(backend.menus.value.map(item => item.order)).toEqual([3, -1, undefined])
        expect(backend.router.getRoutes().find((route) => route.path === '/backend')?.meta.order).toBe(3)
        expect(backend.router.getRoutes().find((route) => route.path === '/meta-only')?.meta.order).toBe(-1)
    })

    it('keeps local order when a mixed-mode override omits it and respects an explicit zero', () => {
        const appRouter = createAppRouter({
            routes: [{ path: '/reports', name: 'reports', component: Page, meta: { title: 'Reports', order: 20 } }],
            menusMod: 'mixed', history: 'hash',
        })
        appRouter.registerDynamicRoutes([{ title: 'Backend reports', url: '/reports' }])
        expect(appRouter.menus.value[0]?.order).toBe(20)
        expect(appRouter.router.getRoutes().find(route => route.path === '/reports')?.meta.order).toBe(20)

        appRouter.registerDynamicRoutes([{ title: 'Backend reports', url: '/reports', meta: { order: 0 } }])
        expect(appRouter.menus.value[0]?.order).toBe(0)
        expect(appRouter.router.getRoutes().find(route => route.path === '/reports')?.meta.order).toBe(0)

        appRouter.clearDynamicRoutes()
        expect(appRouter.menus.value[0]?.order).toBe(20)
        expect(appRouter.router.getRoutes().find(route => route.path === '/reports')?.meta.order).toBe(20)
    })

    it('applies mixed-mode backend permissions to an existing local route and restores them', () => {
        const appRouter = createAppRouter({
            routes: [{
                path: '/reports', name: 'Reports', component: Page,
                meta: { title: 'Local reports', requiresAuth: true },
            }],
            menusMod: 'mixed', history: 'hash',
        })

        appRouter.registerDynamicRoutes([{
            title: 'Reports', url: '/reports',
            meta: { permissions: ['reports.read'], title: 'Backend reports' },
        }])

        const route = appRouter.router.getRoutes().find((candidate) => candidate.path === '/reports')
        expect(route?.meta.title).toBe('Backend reports')
        expect(route?.meta.requiresAuth).toBe(true)
        expect(route?.meta.permissions).toEqual(['reports.read'])

        appRouter.clearDynamicRoutes()
        expect(route?.meta.title).toBe('Local reports')
        expect(route?.meta.requiresAuth).toBe(true)
        expect(route?.meta.permissions).toBeUndefined()
    })

    it('hides a local menu when a denied backend item overrides its path in mixed mode', () => {
        const appRouter = createAppRouter({
            routes: [{
                path: '/reports', name: 'Reports', component: Page,
                meta: { title: 'Local reports' },
            }],
            menusMod: 'mixed', history: 'hash',
            permissionFilter: (meta) => !(meta as { permissions?: string[] } | undefined)?.permissions?.length,
        })

        appRouter.registerDynamicRoutes([{
            title: 'Backend reports', url: '/reports',
            meta: { permissions: ['reports.read'] },
        }])

        expect(appRouter.menus.value).toEqual([])
        appRouter.setPermissionFilter(() => true)
        expect(appRouter.menus.value[0]?.title).toBe('Backend reports')
    })

    it('registers a nested dynamic tree once without duplicate route records', () => {
        const appRouter = createAppRouter({
            routes: [], menusMod: 'backend', history: 'hash',
            pageMap: { '/views/Users.vue': Page, '/views/Details.vue': Page },
        })
        const errors = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            appRouter.registerDynamicRoutes(dynamicMenus())
            expect(appRouter.router.getRoutes().filter((route) => route.path === '/admin').length).toBe(1)
            expect(appRouter.router.getRoutes().filter((route) => route.path === '/admin/users').length).toBe(1)
            expect(appRouter.router.getRoutes().filter((route) => route.path === '/admin/users/details').length).toBe(1)
            expect(errors).not.toHaveBeenCalled()
        } finally {
            errors.mockRestore()
        }
    })
    it('uses a visible fallback when the backend path is not in the page map', () => {
        const appRouter = createAppRouter({ routes: [], menusMod: 'backend', history: 'hash' })
        appRouter.registerDynamicRoutes([{ title: 'Unknown', url: '/unknown', component: '/views/Missing.vue' }])
        expect(appRouter.router.getRoutes().find((route) => route.path === '/unknown')?.components?.default).toBeTruthy()
    })

    it('filters nested dynamic menus and clears routes', () => {
        const appRouter = createAppRouter({
            routes: [], menusMod: 'backend', history: 'hash',
            pageMap: { '/views/Users.vue': Page, '/views/Details.vue': Page },
            permissionFilter: (meta) => {
                const value = meta as { roles?: string[]; permissions?: string[] } | undefined
                return !value?.roles?.length && !value?.permissions?.length
            },
        })
        appRouter.registerDynamicRoutes(dynamicMenus())
        expect(appRouter.menus.value).toEqual([])
        appRouter.setPermissionFilter((meta) => {
            const value = meta as { roles?: string[]; permissions?: string[] } | undefined
            return !value?.roles?.length || value.roles?.includes('admin') === true || value.permissions?.includes('users:read') === true
        })
        expect(appRouter.menus.value[0]?.children?.[0]?.children?.[0]?.title).toBe('Details')
        appRouter.clearDynamicRoutes()
        expect(appRouter.router.hasRoute('admin')).toBe(false)
    })

    it('ignores stale menu responses', async () => {
        let resolveOld: ((value: MenuItem[]) => void) | undefined
        const loadMenus = vi.fn()
            .mockImplementationOnce(() => new Promise<MenuItem[]>((resolve) => { resolveOld = resolve }))
            .mockResolvedValueOnce([{ title: 'Current', url: '/current', component: '/views/Current.vue' }])
        const appRouter = createAppRouter({ routes: [], menusMod: 'backend', history: 'hash', menus: { load: loadMenus } })
        const oldRefresh = appRouter.refreshMenus()
        await appRouter.refreshMenus()
        resolveOld?.([{ title: 'Stale', url: '/stale', component: '/views/Stale.vue' }])
        await oldRefresh
        expect(appRouter.menus.value.map((menu) => menu.url)).toEqual(['/current'])
    })

    it('reports a failed menu load so the next navigation can retry', async () => {
        const loadMenus = vi.fn()
            .mockRejectedValueOnce(new Error('offline'))
            .mockResolvedValueOnce([{ title: 'Recovered', url: '/recovered', component: '/views/Recovered.vue' }])
        const appRouter = createAppRouter({
            routes: [], menusMod: 'backend', history: 'hash',
            menus: { load: loadMenus },
            pageMap: { '/views/Recovered.vue': Page },
        })
        const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
        try {
            expect(await appRouter.refreshMenus()).toBe(false)
            expect(await appRouter.refreshMenus()).toBe(true)
            expect(loadMenus).toHaveBeenCalledTimes(2)
            expect(appRouter.router.hasRoute('dynamic:/recovered')).toBe(true)
        } finally {
            consoleError.mockRestore()
        }
    })
})
