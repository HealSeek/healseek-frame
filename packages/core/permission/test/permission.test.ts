import { describe, expect, it } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ObjectDirective } from 'vue'
import { usePermissionStore, type AuthSurface } from '../src/store'
import { permissionFilter } from '../src/menu-filter'
import { permissionDirective } from '../src/directive'

function makeAuthSurface(overrides: Partial<AuthSurface> = {}): AuthSurface {
    return {
        userRoles: [],
        userPermissions: [],
        isLoggedIn: true,
        ...overrides,
    }
}

describe('@healseek/permission', () => {
    it('hasRole returns true for held roles and false otherwise', () => {
        setActivePinia(createPinia())
        const store = usePermissionStore()
        store.syncFromAuth(makeAuthSurface({ userRoles: ['admin', 'editor'] }))

        expect(store.hasRole('admin')).toBe(true)
        expect(store.hasRole('editor')).toBe(true)
        expect(store.hasRole('viewer')).toBe(false)
    })

    it('* wildcard grants all permissions', () => {
        setActivePinia(createPinia())
        const store = usePermissionStore()
        store.syncFromAuth(makeAuthSurface({ userPermissions: ['*'] }))

        expect(store.hasPermission('sys.user.read')).toBe(true)
        expect(store.hasPermission('anything.at.all')).toBe(true)
    })

    it('hasAccess is any-of for both roles and permissions', () => {
        setActivePinia(createPinia())
        const store = usePermissionStore()
        store.syncFromAuth(makeAuthSurface({
            userRoles: ['editor'],
            userPermissions: ['sys.post.read'],
        }))

        // matches role
        expect(store.hasAccess({ roles: ['admin', 'editor'] })).toBe(true)
        // matches permission
        expect(store.hasAccess({ permissions: ['sys.user.read', 'sys.post.read'] })).toBe(true)
        // matches neither
        expect(store.hasAccess({ roles: ['admin'], permissions: ['sys.user.read'] })).toBe(false)
        // no constraints → allowed
        expect(store.hasAccess({})).toBe(true)
        expect(store.hasAccess(null)).toBe(true)
    })

    it('denies protected routes while logged out and allows public routes', () => {
        setActivePinia(createPinia())
        const store = usePermissionStore()
        store.syncFromAuth(makeAuthSurface({ isLoggedIn: false }))

        expect(store.hasAccess({ requiresAuth: true })).toBe(false)
        expect(store.canAccessRoute({ meta: { requiresAuth: true } } as never)).toBe(false)
        expect(store.canAccessRoute({ meta: { public: true, requiresAuth: true } } as never)).toBe(true)

        store.syncFromAuth(makeAuthSurface({ isLoggedIn: true }))
        expect(store.hasAccess({ requiresAuth: true })).toBe(true)
    })

    it('checks every matched record so child metadata cannot bypass a parent restriction', () => {
        setActivePinia(createPinia())
        const store = usePermissionStore()
        store.syncFromAuth(makeAuthSurface({
            userRoles: ['admin'],
            userPermissions: [],
        }))

        const parent = { meta: { roles: ['admin'] } }
        const child = { meta: { permissions: ['users.read'] } }
        expect(store.canAccessRoute({
            meta: { permissions: ['users.read'] },
            matched: [parent, child],
        } as never)).toBe(false)

        store.syncFromAuth(makeAuthSurface({
            userRoles: [],
            userPermissions: ['users.read'],
        }))
        expect(store.canAccessRoute({
            meta: { permissions: ['users.read'] },
            matched: [parent, child],
        } as never)).toBe(false)

        expect(store.canAccessRoute({
            meta: {},
            matched: [
                { meta: { public: true } },
                { meta: { permissions: ['users.read'] } },
            ],
        } as never)).toBe(true)
    })

    it('permissionFilter stays pure and can be composed with menu filtering', () => {
        setActivePinia(createPinia())
        const store = usePermissionStore()
        store.syncFromAuth(makeAuthSurface({ userPermissions: ['user.read'] }))
        const filter = permissionFilter({ hasAccess: store.hasAccess })

        expect(filter({ permissions: ['user.read'] })).toBe(true)
        expect(filter({ permissions: ['user.delete'] })).toBe(false)
        expect(filter(undefined)).toBe(true)
    })

    it('v-permission reacts to store changes without a component update', () => {
        setActivePinia(createPinia())
        const store = usePermissionStore()
        const element = { style: { display: 'inline-flex' } } as HTMLElement
        const directive = permissionDirective as ObjectDirective<HTMLElement, string | string[]>
        const binding = { value: ['user.edit', 'user.delete'] } as never

        store.syncFromAuth(makeAuthSurface({ userPermissions: ['user.read'] }))
        directive.mounted?.(element, binding, {} as never, {} as never)
        expect(element.style.display).toBe('none')

        store.syncFromAuth(makeAuthSurface({ userPermissions: ['user.edit'] }))
        expect(element.style.display).toBe('inline-flex')

        directive.updated?.(element, { value: 'user.delete' } as never, {} as never, {} as never)
        expect(element.style.display).toBe('none')

        directive.unmounted?.(element, binding, {} as never, {} as never)
        expect(element.style.display).toBe('inline-flex')
        store.syncFromAuth(makeAuthSurface({ userPermissions: ['user.delete'] }))
        expect(element.style.display).toBe('inline-flex')
    })
})
