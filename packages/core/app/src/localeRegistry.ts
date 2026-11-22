import type { LocaleLoader } from '@healseek/layouts'

export interface AppLocaleRegistration {
    modules: Record<string, LocaleLoader>
}

let registration: AppLocaleRegistration | null = null

/** Register app locale resources before createApp() starts. */
export function registerAppLocales(value: AppLocaleRegistration): void {
    registration = value
}

export function getAppLocaleRegistration(): AppLocaleRegistration | null {
    return registration
}

export function resetAppLocaleRegistration(): void {
    registration = null
}
