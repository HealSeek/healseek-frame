/**
 * Standard RBAC for the framework.
 *
 * Provides:
 *   - \`usePermissionStore\`         — hasRole / hasPermission / hasAccess
 *   - \`v-permission\` directive     — hide elements the user can't use
 *   - \`installPermission(app, { getAuth, onDenyRoute })\`
 *   - \`permissionFilter\` helper     — drop menu items the user can't see
 *
 * Depends on \`@healseek/stores\` for the auth surface and
 * \`@healseek/uikit-shadcnui\` for nothing (kept for symmetry; remove
 * if a circular dep surfaces).
 */
import { watchEffect, type App } from 'vue'
import type { RouteLocationRaw } from 'vue-router'
import type { FrameworkRouter } from '@healseek/router/internal'
import { usePermissionStore, type AuthSurface } from './store'
import { registerVPermission } from './directive'
import { permissionFilter } from './menu-filter'

export { usePermissionStore } from './store'
export type { AuthSurface } from './store'
export { registerVPermission } from './directive'
export { permissionFilter } from './menu-filter'
export { default as PermissionButton } from './PermissionButton.vue'
export type { RouteMeta } from './types'

export interface InstallPermissionOptions {
    /** Accessor returning the current auth surface (roles, permissions, isLoggedIn). */
    getAuth: () => AuthSurface
    /** Framework router — uses `setPermissionFilter` for menu filtering + `beforeEach` for guards. */
    router: FrameworkRouter
    /**
     * Where to send users when they hit a route they don't have access
     * to. Default: the route named 'Forbidden' (apps should register it).
     * Set to a string path or { name, query } for custom handling.
     */
    onDeny?: RouteLocationRaw
    /**
     * If true, the router's built-in auth guard will also enforce
     * role/permission meta on every navigation. Default: true.
     */
    guardRoutes?: boolean
}

/**
 * Install the permission layer. Wires up:
 *   1. \`v-permission\` directive
 *   2. A route filter that drops inaccessible menu items
 *      (installed via \`router.setPermissionFilter\` so the
 *      \`menus\` computed re-evaluates when login/logout flips roles)
 *   3. (Optional) a beforeEach guard that redirects on deny
 */
export function installPermission(app: App, options: InstallPermissionOptions): void {
    const store = usePermissionStore()

    // Keep menus and directives current when roles change on the same page.
    // The accessor reads the auth store's reactive values inside watchEffect.
    watchEffect(() => store.syncFromAuth(options.getAuth()), { flush: 'sync' })

    // 1. Directive
    registerVPermission(app)

    // 2. Menu filter — actually inject the filter into the router so
    //    RBAC-driven menu filtering works. Before this assignment the
    //    filter was a no-op (the previous code reassigned router.menus
    //    to itself, which doesn't re-trigger the computed).
    options.router.setPermissionFilter(
        permissionFilter({ hasAccess: (meta) => store.hasAccess(meta) }),
    )

    // 3. Route guard (uses the underlying vue-router)
    if (options.guardRoutes !== false) {
        options.router.router.beforeEach((to) => {
            if (store.canAccessRoute(to)) return true
            return options.onDeny ?? { name: 'Forbidden' }
        })
    }
}
