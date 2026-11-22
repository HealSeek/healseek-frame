import type { MenusMod } from '@healseek/router'

export type { MenusMod }
export type ThemeMode = 'light' | 'dark' | 'system'
export type LocaleCode = 'zh-CN' | 'en-US'

/** Recursive partial — makes every property optional at every depth. */
export type DeepPartial<T> = {
    [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

export interface AppPreferences {
    /** App identifier — used in `<title>` and brand text. */
    name: string
    /** Page title shown in `<title>` tag and brand area. Falls back to `name`. */
    title: string
    /** Path that `/` redirects to. The router reads this when no explicit `homePath` is passed. */
    homePath: string
    /** Where the sidebar menu ultimately comes from. The router reads this when no explicit `menusMod` is passed. */
    menusMod: MenusMod
    /** Optional logo URL for the site title block. */
    logo?: string
}

export type GrayColor = 'zinc' | 'slate' | 'gray' | 'neutral' | 'stone'
export type LayoutDensity = 'compact' | 'default' | 'loose'
/** Preset names used by the new-api-inspired theme registry. */
export type ThemePreset =
    | 'default'
    | 'anthropic'
    | 'simple-large'
    | 'underground'
    | 'rose-garden'
    | 'lake-view'
    | 'sunset-glow'
    | 'forest-whisper'
    | 'ocean-breeze'
    | 'lavender-dream'
    | 'ocean'
    | 'emerald'
    | 'rose'
    | 'slate'
export type ThemeRadius = 'default' | 'none' | 'sm' | 'md' | 'lg' | 'xl'
export type ThemeFont = 'default' | 'sans' | 'serif'
export type LayoutMode = 'sidebar' | 'mix' | 'full-content'
export type SidebarVariant = 'sidebar' | 'inset' | 'floating'
export type SidebarCollapsible = 'offcanvas' | 'icon' | 'none'
export type ContentLayout = 'full' | 'centered'

export interface LayoutPreferences {
    /** Main application shell selected by the route host. */
    mode: LayoutMode
    /** Visual treatment of the desktop sidebar. */
    sidebarVariant: SidebarVariant
    /** Collapse behavior for the desktop sidebar. */
    sidebarCollapsible: SidebarCollapsible
    /** Whether page content is edge-to-edge or centered in a readable column. */
    contentLayout: ContentLayout
    /** Maximum content width in pixels when `contentLayout` is `centered`. */
    contentMaxWidth?: number
}

/** Presentation used when a request can no longer refresh the session. */
export type LoginExpiredMode = 'modal' | 'page'

/** Authentication-related presentation preferences. */
export interface AuthPreferences {
    /** Whether the framework installs the default authentication guard. */
    enabled: boolean
    loginExpiredMode: LoginExpiredMode
}

export interface ThemePreferences {
    mode: ThemeMode
    preset?: ThemePreset
    radiusScale?: ThemeRadius
    font?: ThemeFont
    /** Primary color hex. Empty string means "use the css variable default". */
    primaryColor?: string
    /** Neutral palette family for surfaces & borders. */
    grayColor?: GrayColor
    /** Corner radius token (CSS rem). Default 0.5. */
    radius?: number
    /** Layout density — drives spacing/padding tokens. */
    layoutDensity?: LayoutDensity
    /** Disable CSS transitions/animations when false. */
    animationEnabled?: boolean
    /** Grayscale filter applied to the entire app. */
    weakMode?: boolean
}

export interface LocalePreferences {
    current: LocaleCode
    fallback: LocaleCode
}

export interface HeaderPreferences {
    showSearch: boolean
    showMessages: boolean
    showLanguage: boolean
    showTheme: boolean
    showSettings: boolean
    showTabs: boolean
}

/**
 * Namespaced sections keep application structure and user appearance settings
 * separate. Applications pass a partial value to createApp().
 */
export interface Preferences {
    app: AppPreferences
    /** Optional for source compatibility; framework defaults always provide it. */
    auth?: AuthPreferences
    theme: ThemePreferences
    layout: LayoutPreferences
    locale: LocalePreferences
    header: HeaderPreferences
}

/**
 * Field descriptor for the settings drawer UI. The `key` is a path
 * into the Preferences object (e.g. `'app.homePath'`) or a free-form key
 * for app-owned preferences. This descriptor remains available to lower-level
 * PreferenceManager integrations, outside the createApp() startup contract.
 *
 * The generic `T` lets an app augment which keys the drawer knows about.
 */
export interface PreferencesField<T = Preferences> {
    component: 'Switch' | 'Select' | 'InputNumber' | 'Input' | 'switch' | 'select' | 'number' | 'input'
    /** Dotted path into Preferences, or a free-form key for app extensions. */
    key: keyof T | string
    label: string
    defaultValue: unknown
    options?: { label: string; value: unknown }[]
    componentProps?: Record<string, unknown>
    disabled?: boolean
    placeholder?: string
    tip?: string
}

export interface PreferencesExtension<T = Preferences> {
    /** Label shown on the settings drawer tab. */
    tabLabel: string
    /** Title of the section inside the tab. */
    title?: string
    fields: PreferencesField<T>[]
}
