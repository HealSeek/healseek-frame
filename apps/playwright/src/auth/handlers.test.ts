// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, getActivePinia, setActivePinia } from 'pinia'
import { setAuthStorageNamespace, useAuthStore, type AuthTokens } from '@healseek/stores/auth'
import { refresh, revoke } from '../api/core/auth'
import { getCurrentUser } from '../api/core/user'
import { authRefreshDiagnostics, logout, refreshSession, restoreSession } from './handlers'

vi.mock('@healseek/app', () => ({ getAppRouter: vi.fn() }))
vi.mock('@healseek/composables', () => ({ toast: { success: vi.fn(), error: vi.fn() } }))
vi.mock('../api/core/auth', () => ({ login: vi.fn(), register: vi.fn(), refresh: vi.fn(), revoke: vi.fn() }))
vi.mock('../api/core/user', () => ({ getCurrentUser: vi.fn() }))

const user = { id: '1', username: 'ada', email: 'ada@example.com', roles: ['admin'], permissions: [] }
const otherUser = { ...user, id: '2', username: 'bea', email: 'bea@example.com' }
const tokens = { accessToken: 'rotated-access', refreshToken: 'rotated-refresh' }
const pinias: ReturnType<typeof createPinia>[] = []

function deferred<T>() {
    let resolve!: (value: T) => void
    let reject!: (reason: Error) => void
    const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
    return { promise, resolve, reject }
}

function createTab(): ReturnType<typeof useAuthStore> {
    const activePinia = getActivePinia()
    const pinia = createPinia()
    pinias.push(pinia)
    const auth = useAuthStore(pinia)
    setActivePinia(activePinia)
    return auth
}

describe('application auth session races', () => {
    beforeEach(() => {
        vi.resetAllMocks()
        localStorage.clear()
        setAuthStorageNamespace()
        const pinia = createPinia()
        pinias.push(pinia)
        setActivePinia(pinia)
        authRefreshDiagnostics.attempts = 0
        authRefreshDiagnostics.successes = 0
        vi.mocked(refresh).mockResolvedValue(tokens)
        vi.mocked(getCurrentUser).mockResolvedValue(user)
    })

    afterEach(() => {
        pinias.splice(0).forEach(disposePinia)
    })

    it('applies a current refresh without changing the session identity', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const sessionId = auth.sessionId

        await expect(refreshSession('refresh-1')).resolves.toBe(tokens.accessToken)

        expect(auth.sessionId).toBe(sessionId)
        expect(auth.accessToken).toBe(tokens.accessToken)
        expect(authRefreshDiagnostics).toMatchObject({ attempts: 1, successes: 1 })
    })

    it('reads a rotation from storage before sending a stale refresh token', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        createTab().setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' })
        setActivePinia(pinias[0])

        await expect(refreshSession('refresh-1')).resolves.toBeNull()

        expect(refresh).not.toHaveBeenCalled()
        expect(auth.refreshToken).toBe('refresh-2')
    })

    it.each(['login', 'logout'] as const)('ignores a refresh response after another tab performs %s', async (operation) => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const response = deferred<AuthTokens>()
        vi.mocked(refresh).mockReturnValueOnce(response.promise)
        const pending = refreshSession('refresh-1')
        const otherTab = createTab()
        if (operation === 'login') otherTab.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })
        else otherTab.clearSession()
        setActivePinia(pinias[0])
        const stored = localStorage.getItem(auth.sessionStorageKey)

        response.resolve(tokens)

        await expect(pending).resolves.toBeNull()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBe(stored)
        expect(auth.isLoggedIn).toBe(false)
        expect(authRefreshDiagnostics.successes).toBe(0)
    })

    it('rejects a refresh after the same tab logs in again with a reused refresh token', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'same-refresh' })
        const response = deferred<AuthTokens>()
        vi.mocked(refresh).mockReturnValueOnce(response.promise)
        const pending = refreshSession('same-refresh')
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'same-refresh' })

        response.resolve(tokens)

        await expect(pending).resolves.toBeNull()
        expect(auth.user).toEqual(otherUser)
        expect(auth.accessToken).toBe('access-2')
    })

    it('does not surface an old refresh failure against a replacement session', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'same-refresh' })
        const response = deferred<AuthTokens>()
        vi.mocked(refresh).mockReturnValueOnce(response.promise)
        const pending = refreshSession('same-refresh')
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'same-refresh' })

        response.reject(new Error('old refresh failed'))

        await expect(pending).resolves.toBeNull()
        expect(auth.user).toEqual(otherUser)
        expect(auth.sessionExpired).toBe(false)
    })

    it('still propagates a refresh failure for the current session to the retry policy', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const error = new Error('invalid refresh token')
        vi.mocked(refresh).mockRejectedValueOnce(error)

        await expect(refreshSession('refresh-1')).rejects.toBe(error)

        expect(authRefreshDiagnostics.successes).toBe(0)
    })

    it('preserves a newer rotation when an earlier refresh returns late', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const response = deferred<AuthTokens>()
        vi.mocked(refresh).mockReturnValueOnce(response.promise)
        const pending = refreshSession('refresh-1')
        createTab().setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' })
        setActivePinia(pinias[0])

        response.resolve(tokens)

        await expect(pending).resolves.toBeNull()
        expect(auth.refreshToken).toBe('refresh-2')
    })

    it('restores the current session and user normally', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        auth.setUser(null)

        await restoreSession()

        expect(auth.isLoggedIn).toBe(true)
        expect(auth.accessToken).toBe(tokens.accessToken)
        expect(auth.user).toEqual(user)
    })

    it('can restore an access-only session when the server explicitly clears its refresh token', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        auth.setUser(null)
        vi.mocked(refresh).mockResolvedValueOnce({ accessToken: 'access-only', refreshToken: null })

        await restoreSession()

        expect(auth.user).toEqual(user)
        expect(auth.accessToken).toBe('access-only')
        expect(auth.refreshToken).toBeNull()
        expect(auth.synchronizeSession()).toBe(true)
    })

    it.each(['success', 'failure'] as const)('ignores an old restore refresh %s after the same tab logs in again', async (outcome) => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'same-refresh' })
        const response = deferred<AuthTokens>()
        vi.mocked(refresh).mockReturnValueOnce(response.promise)
        const pending = restoreSession()
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'same-refresh' })
        if (outcome === 'success') response.resolve(tokens)
        else response.reject(new Error('old refresh failed'))

        await pending

        expect(getCurrentUser).not.toHaveBeenCalled()
        expect(auth.user).toEqual(otherUser)
        expect(auth.accessToken).toBe('access-2')
        expect(auth.refreshToken).toBe('same-refresh')
    })

    it.each(['login', 'logout'] as const)('does not restore tokens after another tab performs %s', async (operation) => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const response = deferred<AuthTokens>()
        vi.mocked(refresh).mockReturnValueOnce(response.promise)
        const pending = restoreSession()
        const otherTab = createTab()
        if (operation === 'login') otherTab.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })
        else otherTab.clearSession()
        setActivePinia(pinias[0])
        const stored = localStorage.getItem(auth.sessionStorageKey)

        response.resolve(tokens)
        await pending

        expect(getCurrentUser).not.toHaveBeenCalled()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBe(stored)
        expect(auth.isLoggedIn).toBe(false)
    })

    it('does not overwrite a new login with a late restored user', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const response = deferred<typeof user>()
        vi.mocked(getCurrentUser).mockReturnValueOnce(response.promise)
        const pending = restoreSession()
        await vi.waitFor(() => expect(getCurrentUser).toHaveBeenCalledOnce())
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })

        response.resolve(user)
        await pending

        expect(auth.user).toEqual(otherUser)
        expect(auth.accessToken).toBe('access-2')
    })

    it('does not clear a replacement login when an old restore fails', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const response = deferred<typeof user>()
        vi.mocked(getCurrentUser).mockReturnValueOnce(response.promise)
        const pending = restoreSession()
        await vi.waitFor(() => expect(getCurrentUser).toHaveBeenCalledOnce())
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })

        response.reject(new Error('old user request failed'))
        await pending

        expect(auth.user).toEqual(otherUser)
        expect(auth.isLoggedIn).toBe(true)
        expect(auth.refreshToken).toBe('refresh-2')
    })

    it.each(['success', 'failure'] as const)('ignores a late restored-user %s after another tab changes account', async (outcome) => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const response = deferred<typeof user>()
        vi.mocked(getCurrentUser).mockReturnValueOnce(response.promise)
        const pending = restoreSession()
        await vi.waitFor(() => expect(getCurrentUser).toHaveBeenCalledOnce())
        createTab().setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })
        setActivePinia(pinias[0])
        const stored = localStorage.getItem(auth.sessionStorageKey)

        if (outcome === 'success') response.resolve(user)
        else response.reject(new Error('old user request failed'))
        await pending

        expect(auth.user).toBeNull()
        expect(auth.isLoggedIn).toBe(false)
        expect(auth.sessionExpired).toBe(true)
        expect(localStorage.getItem(auth.sessionStorageKey)).toBe(stored)
    })

    it('still clears the current session after a genuine restore failure', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        vi.mocked(refresh).mockRejectedValueOnce(new Error('invalid refresh token'))

        await restoreSession()

        expect(auth.isLoggedIn).toBe(false)
        expect(auth.refreshToken).toBeNull()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
    })

    it('does not log out a new login when an earlier revocation finishes', async () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const response = deferred<void>()
        vi.mocked(revoke).mockReturnValueOnce(response.promise)
        const pending = logout({ navigate: false })
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })

        response.resolve()
        await pending

        expect(auth.user).toEqual(otherUser)
        expect(auth.isLoggedIn).toBe(true)
    })

    it.each(['success', 'failure'] as const)('clears the current session after revocation %s', async (outcome) => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        if (outcome === 'failure') vi.mocked(revoke).mockRejectedValueOnce(new Error('revocation unavailable'))

        await logout({ navigate: false })

        expect(auth.isLoggedIn).toBe(false)
        expect(auth.refreshToken).toBeNull()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
    })
})
