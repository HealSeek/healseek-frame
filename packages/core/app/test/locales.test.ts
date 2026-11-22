import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { loadLocalesMapFromDir } from '@healseek/layouts'
import { registerAppRouter } from '@healseek/router'
import { resetAppRouterRegistration } from '@healseek/router/internal'
import { resetRequestRegistration } from '@healseek/request/internal'
import { createApp } from '../src/createApp'
import { useAppContext } from '../src/context'
import { getAppLocaleRegistration, registerAppLocales, resetAppLocaleRegistration } from '../src/localeRegistry'

describe('application locale registration', () => {
    beforeEach(() => {
        localStorage.clear()
        window.history.replaceState({}, '', '/secret')
        resetAppRouterRegistration()
        resetRequestRegistration()
        resetAppLocaleRegistration()
    })

    it('registers async locale modules and groups them by locale and namespace', async () => {
        const loadCurrent = vi.fn(async () => ({ default: {
            login: { title: 'Application sign in' },
        } }))
        const loadCurrentCustom = vi.fn(async () => ({ default: {
            dashboard: 'Application dashboard',
        } }))
        const loadFallback = vi.fn(async () => ({ default: {
            fallbackOnly: '应用后备文案',
        } }))
        registerAppLocales({ modules: {
            './locales/en-US/auth.json': loadCurrent,
            './locales/en-US/custom.json': loadCurrentCustom,
            './locales/zh-CN/custom.json': loadFallback,
        } })
        const registration = getAppLocaleRegistration()
        expect(registration?.modules).toHaveProperty('./locales/en-US/auth.json')
        const grouped = loadLocalesMapFromDir(registration?.modules ?? {})
        const current = await grouped['en-US']?.()
        const fallback = await grouped['zh-CN']?.()
        expect(loadCurrent).toHaveBeenCalledOnce()
        expect(loadCurrentCustom).toHaveBeenCalledOnce()
        expect(loadFallback).toHaveBeenCalledOnce()
        expect(current).toEqual({ auth: { login: { title: 'Application sign in' } }, custom: { dashboard: 'Application dashboard' } })
        expect(fallback).toEqual({ custom: { fallbackOnly: '应用后备文案' } })
    })

    it('merges app keys over framework messages and loads fallback before mount', async () => {
        let translations: { t: (key: string) => string } | undefined
        const Root = defineComponent({
            setup() {
                translations = useAppContext().i18n.global as unknown as { t: (key: string) => string }
                return () => null
            },
        })
        const loadCurrent = vi.fn(async () => ({ default: { login: { title: 'Application sign in' } } }))
        const loadFallback = vi.fn(async () => ({ default: { fallbackOnly: '应用后备文案' } }))
        registerAppLocales({ modules: {
            './locales/en-US/auth.json': loadCurrent,
            './locales/zh-CN/custom.json': loadFallback,
        } })
        registerAppRouter({ routes: {
            './routes/modules/core.ts': async () => ({ default: [
                { path: '/secret', name: 'Secret', component: Root, meta: { public: true } },
            ] }),
        } })

        const created = await createApp({
            root: Root,
            preferences: {
                app: { name: 'locale-overlay-test', homePath: '/secret' },
                auth: { enabled: false },
                locale: { current: 'en-US', fallback: 'zh-CN' },
            },
        })
        const host = document.createElement('div')
        host.id = 'locale-overlay-host'
        document.body.append(host)
        created.mount('#locale-overlay-host')

        expect(loadCurrent).toHaveBeenCalledOnce()
        expect(loadFallback).toHaveBeenCalledOnce()
        expect(translations?.t('auth.login.title')).toBe('Application sign in')
        expect(translations?.t('auth.login.password')).toBe('Password')
        expect(translations?.t('custom.fallbackOnly')).toBe('应用后备文案')
        expect(document.documentElement.lang).toBe('en-US')
        host.remove()
    })
})
