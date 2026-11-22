import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createPinia, disposePinia, setActivePinia } from 'pinia'
import { setAuthStorageNamespace, useAuthStore } from './index'

const user = {
    id: '1', username: 'ada', email: 'ada@example.com',
    roles: ['admin'], permissions: ['reports.read'],
}

const otherUser = { ...user, id: '2', username: 'bea', email: 'bea@example.com' }
const pinias: ReturnType<typeof createPinia>[] = []

// Separate Pinia instances model tabs sharing storage, with storage events
// deliberately delayed until a test explicitly dispatches one.
function createTab(): ReturnType<typeof useAuthStore> {
    const pinia = createPinia()
    pinias.push(pinia)
    return useAuthStore(pinia)
}

describe('useAuthStore session state', () => {
    beforeEach(() => {
        localStorage.clear()
        setAuthStorageNamespace()
        const pinia = createPinia()
        pinias.push(pinia)
        setActivePinia(pinia)
    })

    afterEach(() => {
        pinias.splice(0).forEach(disposePinia)
    })

    it('keeps login data and token persistence without performing API calls', () => {
        const auth = useAuthStore()
        expect(auth.isLoggedIn).toBe(false)
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1', expiresIn: 60 })

        expect(auth.isLoggedIn).toBe(true)
        expect(auth.userRoles).toEqual(['admin'])
        expect(auth.userPermissions).toEqual(['reports.read'])
        expect(JSON.parse(localStorage.getItem('framework-auth-refresh')!)).toMatchObject({ refreshToken: 'refresh-1' })

        auth.setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' })
        expect(auth.accessToken).toBe('access-2')
        expect(JSON.parse(localStorage.getItem('framework-auth-refresh')!)).toMatchObject({ refreshToken: 'refresh-2' })

        auth.clearSession()
        expect(auth.isLoggedIn).toBe(false)
        expect(auth.user).toBeNull()
        expect(localStorage.getItem('framework-auth-refresh')).toBeNull()
    })

    it('clears the expired-session state after reauthentication', () => {
        const auth = useAuthStore()
        auth.markSessionExpired('/reports')
        expect(auth.sessionExpiredRedirect).toBe('/reports')
        auth.setSession({ user, accessToken: 'new-access', refreshToken: 'new-refresh' })
        expect(auth.sessionExpired).toBe(false)
        auth.markSessionExpired('/reports')
        auth.completeReauthentication()
        expect(auth.sessionExpired).toBe(false)
    })

    it('treats an explicit null refresh token as a session reset', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        auth.setSession({ user, accessToken: 'access-2', refreshToken: null })

        expect(auth.refreshToken).toBeNull()
        expect(localStorage.getItem('framework-auth-refresh')).toBeNull()
    })

    it.each([user, otherUser])('starts a new session identity when $username logs in again', (nextUser) => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const previousId = auth.sessionId

        auth.setSession({ user: nextUser, accessToken: 'access-2', refreshToken: 'refresh-2' })

        expect(auth.sessionId).not.toBe(previousId)
        expect(JSON.parse(localStorage.getItem(auth.sessionStorageKey)!)).toEqual({
            id: auth.sessionId, refreshToken: 'refresh-2',
        })
    })

    it('invalidates an old tab instead of combining its user with another account token', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const oldTab = createTab()
        oldTab.setUser(user)
        oldTab.setTokens({ accessToken: 'access-1' })

        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })

        expect(oldTab.synchronizeSession()).toBe(false)
        expect(oldTab.user).toBeNull()
        expect(oldTab.accessToken).toBeNull()
        expect(oldTab.refreshToken).toBeNull()
        expect(oldTab.sessionExpired).toBe(true)
        expect(auth.isLoggedIn).toBe(true)
    })

    it('retains an omitted refresh token only for the same current user', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        auth.setSession({ user, accessToken: 'access-2' })
        expect(auth.refreshToken).toBe('refresh-1')

        auth.setSession({ user: otherUser, accessToken: 'access-3' })
        expect(auth.refreshToken).toBeNull()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
    })

    it('does not inherit an unidentified persisted token during an access-only login', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const newTab = createTab()

        newTab.setSession({ user: otherUser, accessToken: 'access-2' })

        expect(newTab.refreshToken).toBeNull()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
    })

    it('does not retain an omitted token from a session another tab has replaced', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        createTab().setSession({ user, accessToken: 'access-2', refreshToken: 'refresh-2' })

        auth.setSession({ user, accessToken: 'access-3' })

        expect(auth.refreshToken).toBeNull()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
    })

    it('keeps local identities for access-only sessions and guards their token updates', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1' })
        const sessionId = auth.sessionId

        expect(sessionId).not.toBeNull()
        expect(auth.synchronizeSession()).toBe(true)
        expect(auth.setTokens({ accessToken: 'access-2' }, sessionId)).toBe(true)
        expect(auth.sessionId).toBe(sessionId)
        auth.setSession({ user: otherUser, accessToken: 'access-3' })

        expect(auth.sessionId).not.toBe(sessionId)
        expect(auth.setTokens({ accessToken: 'late-access' }, sessionId)).toBe(false)
        expect(auth.accessToken).toBe('access-3')
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
    })

    it('keeps the session identity during rotation and synchronizes tokens within that identity', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const sessionId = auth.sessionId
        const otherTab = createTab()
        otherTab.setUser(user)
        otherTab.setTokens({ accessToken: 'access-1' })

        expect(auth.setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' }, sessionId)).toBe(true)
        expect(auth.sessionId).toBe(sessionId)
        expect(otherTab.synchronizeSession()).toBe(true)
        expect(otherTab.user).toEqual(user)
        expect(otherTab.refreshToken).toBe('refresh-2')
        expect(otherTab.sessionExpired).toBe(false)
    })

    it('rejects a late refresh before a replacement login storage event arrives', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const oldTab = createTab()
        oldTab.setUser(user)
        oldTab.setTokens({ accessToken: 'access-1' })
        auth.clearSession()
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })
        const currentSession = localStorage.getItem(auth.sessionStorageKey)

        expect(oldTab.setTokens({ accessToken: 'late-access', refreshToken: 'late-refresh' })).toBe(false)
        expect(localStorage.getItem(auth.sessionStorageKey)).toBe(currentSession)
        expect(oldTab.isLoggedIn).toBe(false)
        expect(oldTab.sessionExpired).toBe(true)
        expect(auth.synchronizeSession()).toBe(true)
    })

    it('does not resurrect a session when a refresh finishes after another tab logs out', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const oldTab = createTab()
        auth.clearSession()

        expect(oldTab.setTokens({ accessToken: 'late-access', refreshToken: 'late-refresh' })).toBe(false)
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
        expect(oldTab.refreshToken).toBeNull()
    })

    it('rejects a captured identity after the same tab logs in again, even if tokens are reused', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'same-refresh' })
        const previousId = auth.sessionId
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'same-refresh' })

        expect(auth.setTokens({ accessToken: 'late-access', refreshToken: 'late-refresh' }, previousId)).toBe(false)
        expect(auth.user).toEqual(otherUser)
        expect(auth.accessToken).toBe('access-2')
        expect(auth.refreshToken).toBe('same-refresh')
        expect(auth.sessionExpired).toBe(false)
    })

    it('does not write tokens into a session that has already been cleared locally', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        auth.clearSession()

        expect(auth.setTokens({ accessToken: 'late-access', refreshToken: 'late-refresh' })).toBe(false)
        expect(auth.accessToken).toBeNull()
        expect(localStorage.getItem(auth.sessionStorageKey)).toBeNull()
    })

    it('preserves a newer persisted login when an old tab clears its local session', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const oldTab = createTab()
        auth.clearSession()
        auth.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })
        const currentSession = localStorage.getItem(auth.sessionStorageKey)

        oldTab.clearSession()

        expect(localStorage.getItem(auth.sessionStorageKey)).toBe(currentSession)
        expect(auth.synchronizeSession()).toBe(true)
    })

    it('isolates namespaces and captures the namespace when a store is created', () => {
        setAuthStorageNamespace('app-one')
        const first = createTab()
        first.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        setAuthStorageNamespace('app-two')
        const second = createTab()
        second.setSession({ user: otherUser, accessToken: 'access-2', refreshToken: 'refresh-2' })

        first.setTokens({ accessToken: 'access-3', refreshToken: 'refresh-3' })
        second.clearSession()

        expect(first.sessionStorageKey).toBe('framework-auth-refresh:app-one')
        expect(first.synchronizeSession()).toBe(true)
        expect(first.refreshToken).toBe('refresh-3')
        expect(localStorage.getItem('framework-auth-refresh:app-two')).toBeNull()
    })

    it('synchronizes storage events and removes the listener when the store is disposed', () => {
        const auth = useAuthStore()
        auth.setSession({ user, accessToken: 'access-1', refreshToken: 'refresh-1' })
        const otherTab = createTab()
        otherTab.setUser(user)
        auth.setTokens({ accessToken: 'access-2', refreshToken: 'refresh-2' })
        window.dispatchEvent(new StorageEvent('storage', { key: auth.sessionStorageKey, storageArea: localStorage }))
        expect(otherTab.refreshToken).toBe('refresh-2')

        otherTab.$dispose()
        auth.clearSession()
        window.dispatchEvent(new StorageEvent('storage', { key: null, storageArea: localStorage }))
        expect(otherTab.refreshToken).toBe('refresh-2')
    })

    it('upgrades legacy token storage during rotation without replacing its identity', () => {
        localStorage.setItem('framework-auth-refresh', 'legacy-refresh')
        const auth = useAuthStore()

        expect(auth.sessionId).toBe('legacy')
        auth.setTokens({ accessToken: 'access-1', refreshToken: 'refresh-1' })

        expect(JSON.parse(localStorage.getItem(auth.sessionStorageKey)!)).toEqual({
            id: 'legacy', refreshToken: 'refresh-1',
        })
    })
})
