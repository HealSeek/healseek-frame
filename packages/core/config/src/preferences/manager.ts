import type { DeepPartial, Preferences, PreferencesExtension, PreferencesField } from './types'

import { reactive, readonly, watch } from 'vue'

import { deepMerge } from './merge'
import { frameworkDefaultPreferences } from './defaults'

const STORAGE_PREFIX = 'framework-preferences'
// Keep the pre-rename key so existing users retain their saved preferences.
const LEGACY_STORAGE_PREFIX = 'airovo-preferences'
const STORAGE_VERSION = 2
type CustomPreferencesRecord = Record<string, unknown>

function cloneValue<T>(value: T): T {
    if (Array.isArray(value)) return value.map((item) => cloneValue(item)) as T
    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value as Record<string, unknown>).map(([key, nested]) => [key, cloneValue(nested)]),
        ) as T
    }
    return value
}

/**
 * Only user-adjustable presentation state is persisted. Deployment-time
 * application structure (home route, menu mode, auth enablement, header
 * feature flags and the selected shell) must always come from the app's
 * preferences file so an old browser cache cannot change the application.
 */
function pickPersistedPreferences(value: unknown): DeepPartial<Preferences> {
    const source = value && typeof value === 'object' ? value as Record<string, unknown> : {}
    const theme = source.theme && typeof source.theme === 'object' ? source.theme : undefined
    const locale = source.locale && typeof source.locale === 'object' ? source.locale as Record<string, unknown> : undefined
    const layout = source.layout && typeof source.layout === 'object' ? source.layout as Record<string, unknown> : undefined
    return {
        theme: theme as DeepPartial<Preferences['theme']> | undefined,
        locale: locale
            ? { current: locale.current as Preferences['locale']['current'] }
            : undefined,
        layout: layout
            ? {
                sidebarVariant: layout.sidebarVariant as Preferences['layout']['sidebarVariant'],
                sidebarCollapsible: layout.sidebarCollapsible as Preferences['layout']['sidebarCollapsible'],
                contentLayout: layout.contentLayout as Preferences['layout']['contentLayout'],
                contentMaxWidth: layout.contentMaxWidth as number,
            }
            : undefined,
    }
}

function normalizeCssColor(value: unknown): string | null {
    if (typeof value !== 'string') return null
    const color = value.trim()
    if (!color) return null

    // Keep the preference value CSS-native so callers can use hex, rgb(a),
    // hsl(a), or oklch just like the new-api theme tokens.
    if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
        return CSS.supports('color', color) ? color : null
    }
    return /^(?:#|rgb\(|rgba\(|hsl\(|hsla\(|oklch\(|oklab\(|color\()/i.test(color)
        ? color
        : null
}

function colorForeground(color: string): string {
    const normalized = color.trim().toLowerCase()

    // Prefer a dark foreground for light custom colors. This covers the
    // values emitted by <input type="color"> and the common text formats
    // accepted by the preference UI; unknown formats use the safe white
    // foreground used by the new-api presets.
    let lightness: number | null = null
    const hex = normalized.match(/^#([\da-f]{3,8})$/i)
    if (hex) {
        const value = hex[1]
        const expand = (part: string) => part.length === 1 ? `${part}${part}` : part
        const short = value.length === 3 || value.length === 4
        const red = Number.parseInt(short ? expand(value.slice(0, 1)) : value.slice(0, 2), 16)
        const green = Number.parseInt(short ? expand(value.slice(1, 2)) : value.slice(2, 4), 16)
        const blue = Number.parseInt(short ? expand(value.slice(2, 3)) : value.slice(4, 6), 16)
        if ([red, green, blue].every(Number.isFinite)) {
            const toLinear = (channel: number) => {
                const value = channel / 255
                return value <= 0.03928
                    ? value / 12.92
                    : ((value + 0.055) / 1.055) ** 2.4
            }
            const luminance = 0.2126 * toLinear(red) + 0.7152 * toLinear(green) + 0.0722 * toLinear(blue)
            return luminance > 0.42 ? 'oklch(0.145 0 0)' : 'oklch(1 0 0)'
        }
    }

    const oklch = normalized.match(/oklch\(\s*([\d.]+%?)/)
    if (oklch) {
        const raw = Number.parseFloat(oklch[1])
        lightness = oklch[1].endsWith('%') ? raw / 100 : raw
    }
    const hsl = normalized.match(/hsla?\(\s*[-\d.]+(?:deg)?\s+([\d.]+)%\s+([\d.]+)%/)
    if (hsl) lightness = Number.parseFloat(hsl[2]) / 100
    const rgb = normalized.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/)
    if (rgb) {
        const red = Number.parseFloat(rgb[1]) / 255
        const green = Number.parseFloat(rgb[2]) / 255
        const blue = Number.parseFloat(rgb[3]) / 255
        lightness = 0.2126 * red + 0.7152 * green + 0.0722 * blue
    }

    return lightness !== null && lightness > 0.62
        ? 'oklch(0.145 0 0)'
        : 'oklch(1 0 0)'
}

export class PreferenceManager {
    private isInitialized = false
    private namespace = ''
    private state!: Preferences
    private initialPreferences!: Preferences
    private customPreferencesExtension: PreferencesExtension<Record<string, unknown>> | null = null
    private customState = reactive<CustomPreferencesRecord>({})
    private initialCustomPreferences: CustomPreferencesRecord = {}
    private saveTimer: ReturnType<typeof setTimeout> | null = null
    private stopThemeWatcher: (() => void) | null = null
    private stopSystemThemeWatcher: (() => void) | null = null

    constructor() {
        this.resetState()
    }

    /** Initialize with namespace and optional overrides. */
    async initPreferences({
        namespace,
        overrides,
        extension,
    }: {
        namespace: string
        overrides?: DeepPartial<Preferences>
        extension?: PreferencesExtension<Record<string, unknown>>
    }): Promise<void> {
        if (this.isInitialized) {
            if (this.saveTimer) {
                clearTimeout(this.saveTimer)
                // Persist pending appearance changes under the previous
                // namespace before rebuilding defaults for this app.
                this.saveToCache()
            }
            this.saveTimer = null
            this.stopThemeWatcher?.()
            this.stopSystemThemeWatcher?.()
            this.stopThemeWatcher = null
            this.stopSystemThemeWatcher = null
            // Keep the reactive object stable for stores already reading it.
            Object.keys(this.state).forEach((key) => Reflect.deleteProperty(this.state, key))
        }

        this.namespace = namespace
        this.customPreferencesExtension = extension ?? null
        // Only persisted appearance fields may override application defaults.
        this.initialPreferences = deepMerge<Preferences>(
            frameworkDefaultPreferences as Preferences,
            overrides ?? {},
        )
        this.initialCustomPreferences = this.resolveCustomPreferencesDefaults(extension)

        // Load only user-adjustable cached prefs. The version marker is kept
        // for future schema migrations while old v1 values are safely
        // reduced to the same presentation whitelist.
        const cached = this.loadFromCache()
        if (cached) {
            Object.assign(this.state, deepMerge<Preferences>(this.initialPreferences, pickPersistedPreferences(cached)))
        } else {
            Object.assign(this.state, this.initialPreferences)
        }

        const cachedCustom = this.loadCustomFromCache()
        this.replaceCustomPreferences(
            cachedCustom
                ? { ...this.initialCustomPreferences, ...this.sanitizeCustomPreferences(cachedCustom) }
                : this.initialCustomPreferences,
        )

        // Complete the version migration eagerly. This keeps the legacy key
        // from being selected again on a later startup and writes only the
        // appearance fields allowed by `pickPersistedPreferences()`.
        if (cached) this.saveToCache()

        // Apply to DOM
        this.applyTheme()
        this.setupWatchers()
        this.isInitialized = true
    }

    /** Get current preferences (readonly). */
    getPreferences(): Readonly<Preferences> {
        return readonly(this.state)
    }

    /** Defaults after application overrides, before persisted user choices. */
    getDefaultPreferences(): Readonly<Preferences> {
        return this.initialPreferences ?? frameworkDefaultPreferences
    }

    /** Get app-defined preferences (readonly). */
    getCustomPreferences<T extends CustomPreferencesRecord = CustomPreferencesRecord>(): Readonly<T> {
        return readonly(this.customState) as Readonly<T>
    }

    /** Get app-defined defaults before persisted user choices. */
    getInitialCustomPreferences<T extends CustomPreferencesRecord = CustomPreferencesRecord>(): Readonly<T> {
        return cloneValue(this.initialCustomPreferences) as Readonly<T>
    }

    /** Get the currently registered app extension. */
    getPreferencesExtension(): Readonly<PreferencesExtension<Record<string, unknown>>> | null {
        return this.customPreferencesExtension
            ? cloneValue(this.customPreferencesExtension)
            : null
    }

    /** Partially update preferences, merge + persist + apply. */
    updatePreferences(updates: DeepPartial<Preferences>): void {
        const merged = deepMerge<Preferences>(this.state, updates)
        Object.assign(this.state, merged)
        this.handleUpdates(updates)
        this.debouncedSave()
    }

    /** Update app-defined fields after descriptor validation. */
    updateCustomPreferences(updates: CustomPreferencesRecord): void {
        if (!this.customPreferencesExtension) return
        const sanitized = this.sanitizeCustomPreferences(updates)
        if (Object.keys(sanitized).length === 0) return
        this.replaceCustomPreferences({ ...this.customState, ...sanitized })
        this.debouncedSave()
    }

    /** Reset to initial defaults. */
    resetPreferences(): void {
        Object.assign(this.state, this.initialPreferences ?? frameworkDefaultPreferences)
        this.replaceCustomPreferences(this.initialCustomPreferences)
        this.applyTheme()
        this.saveToCache()
    }

    // ── private ──

    private resetState(): void {
        this.state = reactive<Preferences>(deepMerge<Preferences>(frameworkDefaultPreferences, {}))
    }

    private storageKey(): string {
        return `${STORAGE_PREFIX}-v${STORAGE_VERSION}-${this.namespace}`
    }

    private legacyStorageKey(): string {
        return `${STORAGE_PREFIX}-${this.namespace}`
    }

    private historicalStorageKey(): string {
        return `${LEGACY_STORAGE_PREFIX}-${this.namespace}`
    }

    private customStorageKey(): string {
        return `${this.storageKey()}-custom`
    }

    private loadFromCache(): Preferences | null {
        try {
            const raw = localStorage.getItem(this.storageKey())
                ?? localStorage.getItem(this.legacyStorageKey())
                ?? localStorage.getItem(this.historicalStorageKey())
            return raw ? JSON.parse(raw) as Preferences : null
        } catch {
            return null
        }
    }

    private loadCustomFromCache(): CustomPreferencesRecord | null {
        try {
            const raw = localStorage.getItem(this.customStorageKey())
            const parsed = raw ? JSON.parse(raw) : null
            return parsed && typeof parsed === 'object' ? parsed : null
        } catch {
            return null
        }
    }

    private saveToCache(): void {
        try {
            localStorage.setItem(this.storageKey(), JSON.stringify(pickPersistedPreferences(this.state)))
            localStorage.removeItem(this.legacyStorageKey())
            localStorage.removeItem(this.historicalStorageKey())
            if (this.customPreferencesExtension) {
                localStorage.setItem(this.customStorageKey(), JSON.stringify(this.customState))
            } else {
                localStorage.removeItem(this.customStorageKey())
            }
        } catch (e) {
            console.error('[PreferenceManager] Failed to save to cache:', e)
        }
    }

    private debouncedSave(): void {
        if (this.saveTimer) clearTimeout(this.saveTimer)
        this.saveTimer = setTimeout(() => this.saveToCache(), 150)
    }

    private handleUpdates(updates: DeepPartial<Preferences>): void {
        const { theme, layout } = updates
        if ((theme && Object.keys(theme).length > 0) || (layout && Object.keys(layout).length > 0)) {
            this.applyTheme()
        }
    }

    private replaceCustomPreferences(preferences: CustomPreferencesRecord): void {
        Object.keys(this.customState).forEach((key) => Reflect.deleteProperty(this.customState, key))
        Object.assign(this.customState, cloneValue(preferences))
    }

    private resolveCustomPreferencesDefaults(extension: PreferencesExtension<Record<string, unknown>> | undefined): CustomPreferencesRecord {
        if (!extension) return {}
        return Object.fromEntries(extension.fields.map((field) => [String(field.key), field.defaultValue]))
    }

    private sanitizeCustomPreferences(updates: CustomPreferencesRecord): CustomPreferencesRecord {
        if (!this.customPreferencesExtension) return {}
        const result: CustomPreferencesRecord = {}
        for (const field of this.customPreferencesExtension.fields) {
            const key = String(field.key)
            const value = updates[key]
            if (value !== undefined && this.isValidCustomPreferenceValue(field, value)) {
                result[key] = value
            }
        }
        return result
    }

    private isValidCustomPreferenceValue(field: PreferencesField<Record<string, unknown>>, value: unknown): boolean {
        const component = String(field.component).toLowerCase()
        if (component === 'switch') return typeof value === 'boolean'
        if (component === 'number' || component === 'inputnumber') {
            if (typeof value !== 'number' || !Number.isFinite(value)) return false
            const props = field.componentProps ?? {}
            const min = typeof props.min === 'number' ? props.min : undefined
            const max = typeof props.max === 'number' ? props.max : undefined
            const step = typeof props.step === 'number' ? props.step : undefined
            if (min !== undefined && value < min) return false
            if (max !== undefined && value > max) return false
            if (step !== undefined && step > 0) {
                const base = min ?? 0
                const count = (value - base) / step
                if (Math.abs(count - Math.round(count)) > Number.EPSILON * 10) return false
            }
            return true
        }
        if (component === 'select') return Boolean(field.options?.some((option) => option.value === value))
        return typeof value === 'string'
    }

    get initialized(): boolean { return this.isInitialized }

    /** Remove the current namespace cache without changing in-memory state. */
    clearCache(): void {
        if (this.saveTimer) {
            clearTimeout(this.saveTimer)
            this.saveTimer = null
        }
        try {
            localStorage.removeItem(this.storageKey())
            localStorage.removeItem(this.customStorageKey())
            localStorage.removeItem(this.legacyStorageKey())
            localStorage.removeItem(this.historicalStorageKey())
        } catch { /* storage unavailable */ }
    }

    /** Resolve actual theme mode and toggle dark class. */
    private applyTheme(): void {
        if (typeof document === 'undefined') return
        const root = document.documentElement
        const mode = this.resolveTheme()
        const isDark = mode === 'dark'
        root.classList.toggle('dark', isDark)

        // ── Theme tokens (P2-B C4) ──
        const t = this.state.theme
        const docStyle = root.style

        // Primary color — write the semantic tokens, not only the generated
        // Tailwind aliases. This keeps button text, focus rings, active menu
        // text, and every `*-foreground` utility in sync with a custom color.
        const primary = normalizeCssColor(t.primaryColor)
        const customPrimaryTokens = [
            '--primary',
            '--primary-foreground',
            '--sidebar-primary',
            '--sidebar-primary-foreground',
            // Active navigation surfaces are derived from the framework
            // preset. Clear aliases left by older theme implementations so
            // shadcn's stock accent cannot remain inline on <html> during
            // HMR or an in-place preference update.
            '--accent',
            '--accent-foreground',
            '--sidebar-accent',
            '--sidebar-accent-foreground',
            '--ring',
            '--sidebar-ring',
            // Clean up the aliases written by versions before the semantic
            // token migration, including during HMR in a running demo.
            '--color-primary',
            '--color-sidebar-primary',
            '--color-sidebar-accent',
            '--color-sidebar-accent-foreground',
        ]
        if (primary) {
            const foreground = colorForeground(primary)
            root.dataset.themeCustomPrimary = 'true'
            docStyle.setProperty('--primary', primary)
            docStyle.setProperty('--primary-foreground', foreground)
            docStyle.setProperty('--sidebar-primary', primary)
            docStyle.setProperty('--sidebar-primary-foreground', foreground)
            docStyle.removeProperty('--accent')
            docStyle.removeProperty('--accent-foreground')
            docStyle.removeProperty('--sidebar-accent')
            docStyle.removeProperty('--sidebar-accent-foreground')
            docStyle.setProperty('--ring', primary)
            docStyle.setProperty('--sidebar-ring', primary)
            docStyle.removeProperty('--color-primary')
            docStyle.removeProperty('--color-sidebar-primary')
            docStyle.removeProperty('--color-sidebar-accent')
            docStyle.removeProperty('--color-sidebar-accent-foreground')
        } else {
            delete root.dataset.themeCustomPrimary
            customPrimaryTokens.forEach((token) => docStyle.removeProperty(token))
        }

        // Corner radius (CSS rem).
        if (typeof t.radius === 'number') {
            docStyle.setProperty('--radius', `${t.radius}rem`)
        } else docStyle.removeProperty('--radius')

        // Neutral palette family + density — applied as data attrs so
        // globals.css can scope overrides per variant.
        if (t.grayColor) root.dataset.gray = t.grayColor
        else delete root.dataset.gray

        if (t.layoutDensity) root.dataset.density = t.layoutDensity
        else delete root.dataset.density

        if (t.preset && t.preset !== 'default') root.dataset.themePreset = t.preset
        else delete root.dataset.themePreset
        if (t.radiusScale && t.radiusScale !== 'default') root.dataset.themeRadius = t.radiusScale
        else delete root.dataset.themeRadius
        if (t.font && t.font !== 'default') root.dataset.themeFont = t.font
        else delete root.dataset.themeFont

        // Animations toggle: add/remove a class that globals.css can
        // hook into to disable transitions.
        if (t.animationEnabled === false) root.classList.add('no-anim')
        else root.classList.remove('no-anim')

        // Weak mode (grayscale filter).
        if (t.weakMode) root.classList.add('weak')
        else root.classList.remove('weak')

        if (this.state.layout.contentLayout) root.dataset.themeContentLayout = this.state.layout.contentLayout
        else delete root.dataset.themeContentLayout

        const contentMaxWidth = this.state.layout.contentMaxWidth
        if (typeof contentMaxWidth === 'number' && Number.isFinite(contentMaxWidth) && contentMaxWidth > 0) {
            docStyle.setProperty('--content-max-width', `${contentMaxWidth}px`)
        } else {
            docStyle.removeProperty('--content-max-width')
        }
    }

    private resolveTheme(): 'light' | 'dark' {
        const mode = this.state.theme.mode
        if (mode === 'light' || mode === 'dark') return mode
        // system
        if (typeof window !== 'undefined' && window.matchMedia) {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
        }
        return 'light'
    }

    private setupWatchers(): void {
        // Watch for system color scheme changes in 'system' mode
        if (typeof window !== 'undefined' && window.matchMedia) {
            const query = window.matchMedia('(prefers-color-scheme: dark)')
            const listener = () => {
                if (this.state.theme.mode === 'system') this.applyTheme()
            }
            query.addEventListener('change', listener)
            this.stopSystemThemeWatcher = () => query.removeEventListener('change', listener)
        }

        // Watch theme changes in state and apply
        this.stopThemeWatcher = watch(
            () => this.state.theme.mode,
            () => this.applyTheme(),
        )
    }
}

/** Singleton instance — one per app. */
export const preferenceManager = new PreferenceManager()

export function getInitialPreferences(overrides: DeepPartial<Preferences> = {}): Preferences {
    return deepMerge<Preferences>(frameworkDefaultPreferences as Preferences, overrides)
}
