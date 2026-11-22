import { defineStore } from 'pinia'
import { computed, onScopeDispose, ref } from 'vue'

const REFRESH_TOKEN_KEY = 'framework-auth-refresh'
let authStorageKey = REFRESH_TOKEN_KEY

/** Configure before creating auth stores; each runtime captures its own key. */
export function setAuthStorageNamespace(namespace?: string): void {
    authStorageKey = namespace?.trim() ? `${REFRESH_TOKEN_KEY}:${namespace.trim()}` : REFRESH_TOKEN_KEY
}

interface PersistedSession { id: string; refreshToken: string }

function readSession(storageKey: string): PersistedSession | null {
    if (typeof localStorage === 'undefined') return null
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    try {
        const value = JSON.parse(raw) as Partial<PersistedSession>
        return typeof value.id === 'string' && typeof value.refreshToken === 'string'
            && value.id && value.refreshToken ? value as PersistedSession : null
    } catch {
        // Upgrade the previous raw-token format on its next rotation. All old
        // tabs share this lineage; a new login always gets a fresh identity.
        return raw.startsWith('{') ? null : { id: 'legacy', refreshToken: raw }
    }
}

function persistSession(storageKey: string, session: PersistedSession | null): void {
    if (typeof localStorage === 'undefined') return
    if (session) localStorage.setItem(storageKey, JSON.stringify(session))
    else localStorage.removeItem(storageKey)
}

export interface User {
    id: string
    username: string
    email: string
    nickname?: string
    avatar?: string
    roles: string[]
    permissions: string[]
    createdAt?: number
}

export interface AuthTokens {
    accessToken: string
    refreshToken?: string | null
    expiresIn?: number
}

export interface AuthSession extends AuthTokens {
    user: User
}

export const useAuthStore = defineStore('auth', () => {
    const storageKey = authStorageKey
    const persisted = readSession(storageKey)
    const user = ref<User | null>(null)
    const accessToken = ref<string | null>(null)
    const refreshToken = ref<string | null>(persisted?.refreshToken ?? null)
    const sessionId = ref<string | null>(persisted?.id ?? null)
    const tokenExpiresAt = ref<number | null>(null)
    const sessionExpired = ref(false)
    const sessionExpiredRedirect = ref<string | null>(null)

    const isLoggedIn = computed(() => Boolean(accessToken.value && user.value))
    const userRoles = computed(() => user.value?.roles ?? [])
    const userPermissions = computed(() => user.value?.permissions ?? [])

    function setSession(session: AuthSession): void {
        // Access-only responses may retain a refresh token only when the user
        // and persisted identity still match. A different login must not inherit it.
        const retainedRefreshToken = session.refreshToken === undefined
            && user.value?.id === session.user.id && synchronizeSession() ? refreshToken.value : null
        user.value = session.user
        accessToken.value = session.accessToken
        refreshToken.value = session.refreshToken === undefined ? retainedRefreshToken : session.refreshToken
        // Even a same-account reauthentication starts a new lineage. Keep a
        // local identity for access-only sessions too, to guard in-flight work.
        sessionId.value = crypto.randomUUID()
        persistTokens()
        tokenExpiresAt.value = Date.now() + (session.expiresIn ?? 3600) * 1000
        completeReauthentication()
    }

    /** Capture expectedSessionId before awaiting a refresh; false means discard its result. */
    function setTokens(tokens: AuthTokens, expectedSessionId = sessionId.value): boolean {
        // Check memory first so a late result cannot invalidate a newer local
        // login, then storage in case another tab's event has not arrived yet.
        if (expectedSessionId !== sessionId.value || !synchronizeSession()) return false
        if (!sessionId.value && !accessToken.value) return false
        accessToken.value = tokens.accessToken
        if (tokens.refreshToken !== undefined) refreshToken.value = tokens.refreshToken
        persistTokens()
        tokenExpiresAt.value = Date.now() + (tokens.expiresIn ?? 3600) * 1000
        return true
    }

    function setUser(value: User | null): void { user.value = value }

    function resetLocalSession(): void {
        user.value = null
        accessToken.value = null
        refreshToken.value = null
        sessionId.value = null
        tokenExpiresAt.value = null
    }

    function persistTokens(): void {
        if (!refreshToken.value) {
            persistSession(storageKey, null)
            return
        }
        sessionId.value ??= crypto.randomUUID()
        persistSession(storageKey, { id: sessionId.value, refreshToken: refreshToken.value })
    }

    /** Read before refreshing too: background tabs may receive storage events late. */
    function synchronizeSession(): boolean {
        if (typeof localStorage === 'undefined') return true
        const stored = readSession(storageKey)
        // Access-only sessions have a local identity but no persisted token.
        const persistedId = refreshToken.value ? sessionId.value : null
        if ((stored?.id ?? null) !== persistedId) {
            const wasAuthenticated = Boolean(sessionId.value || accessToken.value)
            // Do not adopt a different account or remove its persisted login.
            resetLocalSession()
            if (wasAuthenticated) markSessionExpired()
            return false
        }
        refreshToken.value = stored?.refreshToken ?? null
        return true
    }

    function clearSession(): void {
        // A late failure/logout from an old tab must not erase a newer login.
        if ((readSession(storageKey)?.id ?? null) === sessionId.value) persistSession(storageKey, null)
        resetLocalSession()
    }

    if (typeof window !== 'undefined') {
        const onStorage = (event: StorageEvent) => {
            if (event.storageArea === localStorage && (event.key === storageKey || event.key === null))
                synchronizeSession()
        }
        window.addEventListener('storage', onStorage)
        onScopeDispose(() => window.removeEventListener('storage', onStorage))
    }

    function markSessionExpired(redirect?: string): void {
        sessionExpired.value = true
        sessionExpiredRedirect.value = redirect ?? null
    }

    function clearSessionExpired(): void {
        sessionExpired.value = false
        sessionExpiredRedirect.value = null
    }

    function completeReauthentication(): void {
        clearSessionExpired()
    }

    return {
        user,
        accessToken,
        refreshToken,
        sessionId,
        sessionStorageKey: storageKey,
        tokenExpiresAt,
        sessionExpired,
        sessionExpiredRedirect,
        isLoggedIn,
        userRoles,
        userPermissions,
        setSession,
        setTokens,
        setUser,
        clearSession,
        synchronizeSession,
        markSessionExpired,
        clearSessionExpired,
        completeReauthentication,
    }
})
