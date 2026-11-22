import { definePreferences } from '@healseek/config/preferences'
import { appEnv } from './config/env'

const appPreferences = definePreferences({
    app: {
        name: appEnv.appName,
        title: appEnv.appTitle,
        homePath: '/dashboard/overview',
        menusMod: 'mixed' as const,
    },
    layout: {
        mode: 'sidebar' as const,
        sidebarVariant: 'inset' as const,
        sidebarCollapsible: 'icon' as const,
        contentLayout: 'full' as const,
    },
})

export { appPreferences }
export default appPreferences
