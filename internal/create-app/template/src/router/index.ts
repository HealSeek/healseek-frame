import { registerAppRouter } from '@healseek/app'
import type { AppRouteLoaders } from '@healseek/router'
import { loadMenus, normalizeMenus } from '../api/core/menu'
import { appEnv } from '../config/env'

registerAppRouter({
    routes: import.meta.glob('./routes/modules/**/*.ts', { eager: false }) as AppRouteLoaders,
    pages: import.meta.glob('../views/**/*.vue'),
    menus: { load: loadMenus, normalize: normalizeMenus },
    history: appEnv.routerHistory,
    base: appEnv.base,
})
