import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import {
    PreferenceManager,
    definePreferencesExtension,
} from '@healseek/config/preferences'
import { usePreferencesStore } from './index'

const extension = definePreferencesExtension<{
    defaultTableSize: number
    tenantMode: 'single' | 'multi'
    showHints: boolean
    reportTitle: string
}>({
    tabLabel: 'preferences.project.tabLabel',
    title: 'preferences.project.title',
    fields: [
        {
            component: 'number',
            key: 'defaultTableSize',
            label: 'Table size',
            defaultValue: 20,
            componentProps: { min: 10, max: 200, step: 10 },
        },
        {
            component: 'select',
            key: 'tenantMode',
            label: 'Tenant mode',
            defaultValue: 'single',
            options: [
                { label: 'Single', value: 'single' },
                { label: 'Multi', value: 'multi' },
            ],
        },
        {
            component: 'switch',
            key: 'showHints',
            label: 'Show hints',
            defaultValue: true,
        },
        {
            component: 'input',
            key: 'reportTitle',
            label: 'Report title',
            defaultValue: '',
        },
    ],
})

describe('preferences manager and store', () => {
    beforeEach(() => {
        setActivePinia(createPinia())
        localStorage.clear()
        document.documentElement.className = ''
        document.documentElement.removeAttribute('data-theme-custom-primary')
        document.documentElement.removeAttribute('data-theme-content-layout')
        document.documentElement.style.removeProperty('--content-max-width')
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('registers app fields through the store and keeps framework preferences in one state', async () => {
        const store = usePreferencesStore()
        await store.init({
            namespace: 'preferences-store-test',
            extension,
            overrides: {
                auth: { loginExpiredMode: 'page' },
                layout: { contentLayout: 'centered', contentMaxWidth: 960 },
            },
        })

        expect(store.preferences.auth?.loginExpiredMode).toBe('page')
        expect(store.preferences.layout.contentMaxWidth).toBe(960)
        expect(store.customPreferences.defaultTableSize).toBe(20)
        expect(store.preferencesExtension?.fields).toHaveLength(4)

        store.updateCustomPreferences({
            defaultTableSize: 40,
            tenantMode: 'multi',
            showHints: false,
            reportTitle: 'Usage report',
        })
        expect(store.customPreferences.defaultTableSize).toBe(40)
        expect(store.customPreferences.tenantMode).toBe('multi')
        expect(store.customPreferences.showHints).toBe(false)

        // Descriptor validation rejects values outside the declared contract.
        store.updateCustomPreferences({ defaultTableSize: 41, tenantMode: 'unknown' })
        expect(store.customPreferences.defaultTableSize).toBe(40)
        expect(store.customPreferences.tenantMode).toBe('multi')
        expect(document.documentElement.dataset.themeContentLayout).toBe('centered')
        expect(document.documentElement.style.getPropertyValue('--content-max-width')).toBe('960px')

        store.reset()
        expect(store.preferences.auth?.loginExpiredMode).toBe('page')
        expect(store.customPreferences.defaultTableSize).toBe(20)
        expect(store.customPreferences.tenantMode).toBe('single')
        expect(localStorage.getItem('framework-preferences-v2-preferences-store-test-custom')).toContain('defaultTableSize')
    })

    it('hydrates custom values from the namespace cache and exposes cloned extension metadata', async () => {
        vi.useFakeTimers()
        const first = new PreferenceManager()
        await first.initPreferences({ namespace: 'preferences-manager-test', extension })
        first.updateCustomPreferences({ defaultTableSize: 60, tenantMode: 'multi', reportTitle: 'Cached' })
        vi.runAllTimers()

        const second = new PreferenceManager()
        await second.initPreferences({ namespace: 'preferences-manager-test', extension })
        expect(second.getCustomPreferences().defaultTableSize).toBe(60)
        expect(second.getCustomPreferences().tenantMode).toBe('multi')
        expect(second.getCustomPreferences().reportTitle).toBe('Cached')
        expect(second.getInitialCustomPreferences().defaultTableSize).toBe(20)

        const metadata = second.getPreferencesExtension()
        expect(metadata?.tabLabel).toBe('preferences.project.tabLabel')
        metadata?.fields.push({ component: 'input', key: 'mutated', label: 'Mutated', defaultValue: '' })
        expect(second.getPreferencesExtension()?.fields).toHaveLength(4)

        second.resetPreferences()
        expect(second.getCustomPreferences().defaultTableSize).toBe(20)
        expect(second.getCustomPreferences().tenantMode).toBe('single')
    })

    it('migrates only user appearance from an old cache', async () => {
        localStorage.setItem('airovo-preferences-legacy-test', JSON.stringify({
            app: { homePath: '/obsolete', menusMod: 'backend' },
            auth: { enabled: false },
            header: { showSearch: false },
            layout: { mode: 'full-content', contentLayout: 'centered' },
            theme: { mode: 'dark' },
            locale: { current: 'en-US' },
        }))
        const manager = new PreferenceManager()
        await manager.initPreferences({ namespace: 'legacy-test', overrides: {
            app: { homePath: '/workspace', menusMod: 'frontend' },
            header: { showSearch: true },
            layout: { mode: 'sidebar' },
        } })
        const actual = manager.getPreferences()
        expect(actual.app.homePath).toBe('/workspace')
        expect(actual.app.menusMod).toBe('frontend')
        expect(actual.auth?.enabled).toBe(true)
        expect(actual.header.showSearch).toBe(true)
        expect(actual.layout.mode).toBe('sidebar')
        expect(actual.layout.contentLayout).toBe('centered')
        expect(actual.theme.mode).toBe('dark')
        expect(actual.locale.current).toBe('en-US')
        expect(localStorage.getItem('airovo-preferences-legacy-test')).toBeNull()
        expect(localStorage.getItem('framework-preferences-v2-legacy-test')).toContain('dark')
    })

    it('reinitializes the shared manager for a different app namespace', async () => {
        const manager = new PreferenceManager()
        await manager.initPreferences({
            namespace: 'first-app',
            overrides: { app: { title: 'First app' }, locale: { current: 'zh-CN' } },
        })
        manager.updatePreferences({ theme: { mode: 'dark' } })

        await manager.initPreferences({
            namespace: 'second-app',
            overrides: { app: { title: 'Second app' }, locale: { current: 'en-US' } },
        })

        expect(manager.getPreferences().app.title).toBe('Second app')
        expect(manager.getPreferences().locale.current).toBe('en-US')
        expect(manager.getPreferences().theme.mode).not.toBe('dark')
    })

    it('marks custom primary colors so shell interaction surfaces follow the hue', async () => {
        const manager = new PreferenceManager()
        await manager.initPreferences({
            namespace: 'custom-primary-test',
            overrides: { theme: { primaryColor: '#22c55e' } },
        })

        expect(document.documentElement.dataset.themeCustomPrimary).toBe('true')
        expect(document.documentElement.style.getPropertyValue('--primary')).toBe('#22c55e')

        manager.updatePreferences({ theme: { primaryColor: '' } })
        expect(document.documentElement.dataset.themeCustomPrimary).toBeUndefined()
        expect(document.documentElement.style.getPropertyValue('--primary')).toBe('')
    })
})
