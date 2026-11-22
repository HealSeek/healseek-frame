import {
    frameworkDefaultPreferences,
    preferenceManager,
    type DeepPartial,
    type Preferences,
    type PreferencesExtension,
} from '@healseek/config/preferences'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { useMediaQuery } from '@vueuse/core'

/**
 * Preferences store — Pinia wrapper around {@link preferenceManager}.
 *
 * The framework owns the Pinia instance and calls `init()` during
 * `createApp()` startup. Applications only provide their namespace and
 * preference overrides through the public createApp options.
 */
export const usePreferencesStore = defineStore(
    'preferences',
    () => {
        const ready = ref(false)

        /** Initialize or reinitialize the shared manager for this app. */
        async function init(opts: {
            namespace: string
            overrides?: DeepPartial<Preferences>
            extension?: PreferencesExtension<Record<string, unknown>>
        }): Promise<void> {
            ready.value = false
            await preferenceManager.initPreferences(opts)
            ready.value = true
        }

        /** Readonly snapshot of current preferences. */
        const preferences = computed<Readonly<Preferences>>(() => {
            if (!ready.value) return frameworkDefaultPreferences
            return preferenceManager.getPreferences()
        })
        const defaults = computed<Readonly<Preferences>>(() => {
            if (!ready.value) return frameworkDefaultPreferences
            return preferenceManager.getDefaultPreferences()
        })
        const customPreferences = computed(() => ready.value ? preferenceManager.getCustomPreferences() : {})
        const customDefaults = computed(() => ready.value ? preferenceManager.getInitialCustomPreferences() : {})
        const preferencesExtension = computed(() => ready.value ? preferenceManager.getPreferencesExtension() : null)
        const locale = computed(() => preferences.value.locale.current)
        const themeMode = computed(() => preferences.value.theme.mode)
        const layout = computed(() => preferences.value.layout)
        const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)')
        const isDark = computed(() => {
            if (themeMode.value === 'dark') return true
            if (themeMode.value === 'light') return false
            return systemPrefersDark.value
        })

        /** Partially update preferences. */
        function updatePreferences(updates: DeepPartial<Preferences>): void {
            preferenceManager.updatePreferences(updates)
        }

        function updateCustomPreferences(updates: Record<string, unknown>): void {
            preferenceManager.updateCustomPreferences(updates)
        }

        /** Reset to initial defaults. */
        function reset(): void {
            preferenceManager.resetPreferences()
        }

        return {
            ready, preferences, defaults, customPreferences, customDefaults, preferencesExtension,
            locale, themeMode, layout, systemPrefersDark, isDark,
            init, updatePreferences, updateCustomPreferences, reset,
        }
    },
)
