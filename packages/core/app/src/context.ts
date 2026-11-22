import { inject, type Ref } from 'vue'
import type { MenuItem } from '@healseek/router'

/**
 * App context key for dependency injection.
 * Exposes only the shell-facing reactive state. The framework-owned Vue app,
 * Pinia container, and router remain internal to `createApp()`.
 */
export const APP_CONTEXT_KEY = Symbol('frameworkAppContext')

export interface AppContext {
    i18n: unknown
    menus: Ref<MenuItem[]>
    progress: Ref<number>
}

/**
 * Inject app context. Must be used within a component that's a descendant
 * of an `createApp()` call.
 */
export function useAppContext(): AppContext {
    const ctx = inject<AppContext>(APP_CONTEXT_KEY)
    if (!ctx) {
        throw new Error(
            'useAppContext() must be used within an app created by createApp()',
        )
    }
    return ctx
}
