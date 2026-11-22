import type { ThemeMode } from '@healseek/config/preferences'

import { defineStore } from 'pinia'
import { computed } from 'vue'

import { usePreferencesStore } from '../preferences'

export type Theme = ThemeMode

export interface ThemeState {
    theme: Theme
    prefersDark: boolean
    isDark: boolean
}

/** Facade over the preferences manager; no second theme storage key. */
export const useThemeStore = defineStore('theme', () => {
    const preferences = usePreferencesStore()
    const prefersDark = computed(() => preferences.systemPrefersDark)

    const theme = computed<Theme>({
        get: () => preferences.preferences.theme.mode,
        set: (value) => preferences.updatePreferences({ theme: { mode: value } }),
    })
    const isDark = computed(() => preferences.isDark)

    function toggle(): void {
        theme.value = isDark.value ? 'light' : 'dark'
    }

    return { theme, prefersDark, isDark, toggle }
})
