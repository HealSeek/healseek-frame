import { getAppRouter } from '@healseek/app'
import { toast } from '@healseek/composables'
import { reactive } from 'vue'
import { useAuthStore } from '@healseek/stores/auth'
import { useI18nStore } from '@healseek/stores/i18n'
import { usePreferencesStore } from '@healseek/stores/preferences'
import { login, refresh, register, revoke } from '../api/core/auth'
import { getCurrentUser } from '../api/core/user'
import { normalizeAuthError, type LoginParams, type RegisterParams } from './contract'
import zh from '../locales/zh-CN/auth.json'
import en from '../locales/en-US/auth.json'

type MessageKey = keyof typeof zh.errors

/** Local diagnostics for the auth showcase; every call means one HTTP refresh attempt. */
export const authRefreshDiagnostics = reactive({ attempts: 0, successes: 0 })

function message(key: MessageKey): string {
    return (useI18nStore().locale === 'en-US' ? en : zh).errors[key]
}

function authErrorMessage(error: unknown, operation: 'login' | 'register'): string {
    const details = normalizeAuthError(error, operation)
    if (details.code === 'INVALID_CREDENTIALS') return message('invalidCredentials')
    if (details.code === 'USERNAME_EXISTS') return message('usernameExists')
    if (details.status === 400) return message('invalidRequest')
    if (details.status === 401) return message('unauthorized')
    if (details.status === 403) return message('forbidden')
    if (details.status === 404) return message('notFound')
    if (details.status && details.status >= 500) return message('server')
    return message(operation)
}

export async function handleLogin(values: LoginParams, options: { navigate?: boolean } = {}): Promise<void> {
    if (!values.username || !values.password) {
        const text = (useI18nStore().locale === 'en-US' ? en : zh).login.required
        toast.error(text)
        throw new Error(text)
    }
    try {
        const session = await login(values)
        useAuthStore().setSession(session)
        toast.success((useI18nStore().locale === 'en-US' ? en : zh).login.success)
    } catch (error) {
        const text = authErrorMessage(error, 'login')
        toast.error(text)
        throw new Error(text, { cause: error })
    }
    if (options.navigate !== false) {
        const router = getAppRouter()
        const redirect = router.currentRoute.value.query.redirect
        const homePath = usePreferencesStore().preferences.app.homePath
        await router.replace(typeof redirect === 'string' && redirect.startsWith('/') && !redirect.startsWith('//') ? redirect : homePath)
    }
}

export async function handleRegister(values: RegisterParams): Promise<void> {
    const copy = (useI18nStore().locale === 'en-US' ? en : zh).register
    const invalid = !values.username ? copy.requiredUsername
        : !values.email ? copy.requiredEmail
            : values.password.length < 6 ? copy.passwordLength
                : values.password !== values.confirmPassword ? copy.passwordMismatch : null
    if (invalid) {
        toast.error(invalid)
        throw new Error(invalid)
    }
    try {
        const session = await register(values)
        useAuthStore().setSession(session)
        toast.success((useI18nStore().locale === 'en-US' ? en : zh).register.success)
    } catch (error) {
        const text = authErrorMessage(error, 'register')
        toast.error(text)
        throw new Error(text, { cause: error })
    }
    await getAppRouter().replace(usePreferencesStore().preferences.app.homePath)
}

export async function restoreSession(): Promise<void> {
    const auth = useAuthStore()
    if (!auth.synchronizeSession() || !auth.refreshToken) return
    const sessionId = auth.sessionId
    let expectedRefreshToken = auth.refreshToken
    try {
        const tokens = await refresh(expectedRefreshToken)
        if (!isCurrentSession(auth, sessionId) || auth.refreshToken !== expectedRefreshToken
            || !auth.setTokens(tokens, sessionId)) return
        expectedRefreshToken = auth.refreshToken
        const user = await getCurrentUser()
        if (isCurrentSession(auth, sessionId)) auth.setUser(user)
    } catch {
        // Restore failures belong to the request's session, not a later login
        // or a refresh token another tab has already rotated successfully.
        if (!isCurrentSession(auth, sessionId) || auth.refreshToken !== expectedRefreshToken) return
        auth.clearSession()
        auth.clearSessionExpired()
    }
}

function isCurrentSession(auth: ReturnType<typeof useAuthStore>, sessionId: string | null): boolean {
    return auth.sessionId === sessionId && auth.synchronizeSession()
}

export async function refreshSession(expectedRefreshToken: string): Promise<string | null> {
    const auth = useAuthStore()
    if (!auth.synchronizeSession() || auth.refreshToken !== expectedRefreshToken) return null
    const sessionId = auth.sessionId
    authRefreshDiagnostics.attempts += 1
    try {
        const tokens = await refresh(expectedRefreshToken)
        if (!isCurrentSession(auth, sessionId) || auth.refreshToken !== expectedRefreshToken
            || !auth.setTokens(tokens, sessionId)) return null
        authRefreshDiagnostics.successes += 1
        return tokens.accessToken
    } catch (error) {
        // Do not let the 401 retry policy expire a replacement session when
        // an earlier refresh fails (even if the server reused its token).
        if (!isCurrentSession(auth, sessionId) || auth.refreshToken !== expectedRefreshToken) return null
        throw error
    }
}

export async function logout(options: { navigate?: boolean } = {}): Promise<void> {
    const auth = useAuthStore()
    if (!auth.synchronizeSession()) return
    const sessionId = auth.sessionId
    const tokens = { accessToken: auth.accessToken, refreshToken: auth.refreshToken }
    try { await revoke(tokens) } catch { /* Local logout still completes when revocation is unavailable. */ }
    if (!isCurrentSession(auth, sessionId)) return
    auth.clearSession()
    auth.clearSessionExpired()
    if (options.navigate !== false) await getAppRouter().replace('/login')
}

export async function handleReauthenticate(values: LoginParams): Promise<void> {
    const redirect = useAuthStore().sessionExpiredRedirect
    try {
        const session = await login(values)
        useAuthStore().setSession(session)
        toast.success((useI18nStore().locale === 'en-US' ? en : zh).login.success)
    } catch (error) {
        const text = authErrorMessage(error, 'login')
        toast.error(text)
        throw new Error(text, { cause: error })
    }
    if (redirect) await getAppRouter().replace(redirect)
}
