import { getAppRouter, registerRequestSetup, registerSessionRestore } from '@healseek/app'
import { toast } from '@healseek/composables'
import { useAuthStore } from '@healseek/stores/auth'
import { useI18nStore } from '@healseek/stores/i18n'
import { usePreferencesStore } from '@healseek/stores/preferences'
import type { AxiosError, AxiosInstance } from 'axios'
import { refreshSession, restoreSession } from '../auth/handlers'
import zh from '../locales/zh-CN/auth.json'
import en from '../locales/en-US/auth.json'
import { appEnv } from '../config/env'
import { createAuthRetryHandler, type AppRetryConfig } from './auth-retry'
import { unwrapAppResponse } from './envelope'

export type AppRequestClient = ReturnType<typeof import('@healseek/app').getRequestClient>

type RetriableConfig = AppRetryConfig

interface RequestFailure extends Error {
    httpStatus?: number
    config?: RetriableConfig
    cause?: AxiosError
}

const baseURL = appEnv.apiBase

function requestErrorMessage(status?: number): string {
    const copy = (useI18nStore().locale === 'en-US' ? en : zh).errors
    if (status === 403) return copy.forbidden
    if (status === 404) return copy.notFound
    if (status && status >= 500) return copy.server
    if (!status) return copy.network
    return copy.request
}

async function expireSession(): Promise<void> {
    const auth = useAuthStore()
    auth.clearSession()
    const router = getAppRouter()
    const redirect = router.currentRoute.value.fullPath
    auth.markSessionExpired(redirect)
    if (usePreferencesStore().preferences.auth?.loginExpiredMode === 'page') {
        await router.push({ path: '/login', query: { redirect } })
    }
}

function installAppInterceptors(client: AxiosInstance): void {
    client.interceptors.request.use((config) => {
        config.headers.set('X-Request-Source', appEnv.appName)
        config.headers.set('Accept-Language', document.documentElement.lang || 'zh-CN')
        return config
    })

    const retry401 = createAuthRetryHandler({
        getSession: () => {
            const auth = useAuthStore()
            auth.synchronizeSession()
            return { accessToken: auth.accessToken, refreshToken: auth.refreshToken }
        },
        refresh: refreshSession,
        expireSession,
        retry: (config) => client(config),
    })
    client.interceptors.response.use(undefined, (error: RequestFailure) => retry401(error))
}

registerRequestSetup({
    baseURL,
    hooks: {
        onResponse: unwrapAppResponse,
        onError(context) {
            const config = context.config as RetriableConfig | undefined
            // Auth views own their messages; 401 may still be recovered by the app interceptor.
            if (config?.__skipAuth || context.httpStatus === 401) return false
            toast.error(requestErrorMessage(context.httpStatus))
            return false
        },
    },
    setup({ client }) { installAppInterceptors(client) },
})

registerSessionRestore(restoreSession)
