/**
 * Augment vue-router's RouteMeta with the fields the permission
 * system uses. Apps (and the framework) can set these on their
 * route definitions:
 *
 *   {
 *     path: '/admin/users',
 *     meta: {
 *       title: '用户管理',
 *       permissions: ['sys.user.read'],  // any-of: user needs at least one
 *       roles: ['admin'],                // any-of
 *       keepAlive: true,                 // tab stays mounted
 *       affix: true,                     // tab cannot be closed
 *       hideInTab: true,                 // don't show a tab
 *       requiresAuth: true,              // explicit auth requirement
 *     }
 *   }
 *
 * The `title` / `icon` / `hideInMenu` / `active` / `public` /
 * `ignoreLayout` fields already live in `@healseek/router`'s own
 * RouteMeta declaration; we don't redefine them.
 */
import 'vue-router'

declare module 'vue-router' {
    interface RouteMeta {
        /** Roles allowed to access this route (any-of). */
        roles?: string[]
        /** Permission codes allowed to access this route (any-of). */
        permissions?: string[]
        /** Override `!public` for explicit auth requirement. */
        requiresAuth?: boolean
        /** Wrap the route's component in <KeepAlive> (tabs). */
        keepAlive?: boolean
        /** Pin the tab (cannot be closed by user). */
        affix?: boolean
        /** Do not show a tab for this route. */
        hideInTab?: boolean
    }
}

export type { RouteMeta } from 'vue-router'
