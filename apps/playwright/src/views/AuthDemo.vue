<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { Badge, Button } from '@healseek/uikit-shadcnui'
import { SectionPage } from '@healseek/components'
import { useToast } from '@healseek/composables'
import { useRequest } from '@healseek/request'
import { useAuthStore } from '@healseek/stores/auth'
import { usePreferencesStore } from '@healseek/stores/preferences'
import { createDemoApi } from '../api/demo'
import { authRefreshDiagnostics, handleLogin, logout, refreshSession } from '../auth/handlers'

defineOptions({ name: 'AuthDemo' })

const { t } = useI18n()
const demoApi = createDemoApi(useRequest())
const authStore = useAuthStore()
const preferencesStore = usePreferencesStore()
const toast = useToast()

const busy = ref(false)
const result = ref<{ status: 'idle' | 'success' | 'error'; message: string }>({
    status: 'idle',
    message: '',
})

const isLoggedIn = computed(() => authStore.isLoggedIn)
const statusLabel = computed(() => isLoggedIn.value ? t('auth.demo.loggedIn') : t('auth.demo.loggedOut'))
const statusVariant = computed(() => isLoggedIn.value ? 'default' : 'secondary')

function setResult(status: 'success' | 'error', message: string, notify = true): void {
    result.value = { status, message }
    if (notify) {
        if (status === 'success') toast.success(t('auth.demo.success'))
        else toast.error(message)
    }
}

async function signIn(): Promise<void> {
    busy.value = true
    try {
        await handleLogin({ username: 'admin', password: '123456' }, { navigate: false })
        setResult('success', `${t('auth.demo.success')}: ${authStore.accessToken}`, false)
    } catch (error) {
        setResult('error', error instanceof Error ? error.message : t('auth.errors.request'), false)
    } finally {
        busy.value = false
    }
}

async function signOut(): Promise<void> {
    busy.value = true
    try {
        await logout()
    } finally {
        busy.value = false
    }
}

async function refresh(): Promise<void> {
    if (!authStore.refreshToken) await signIn()
    if (!authStore.refreshToken) return
    busy.value = true
    try {
        const token = await refreshSession(authStore.refreshToken)
        if (!token) throw new Error(t('auth.demo.error'))
        setResult('success', `${t('auth.demo.success')}: ${token}`)
    } catch (error) {
        setResult('error', error instanceof Error ? error.message : t('auth.errors.request'))
    } finally {
        busy.value = false
    }
}

function expireAccessToken(): void {
    const currentRefresh = authStore.refreshToken || `mock-refresh-${Date.now()}`
    authStore.setTokens({
        accessToken: `mock-access-expired-${Date.now()}`,
        refreshToken: currentRefresh,
        expiresIn: 0,
    })
}

async function requestWithRefresh(concurrent: boolean): Promise<void> {
    if (!authStore.isLoggedIn) await signIn()
    if (!authStore.isLoggedIn) return

    expireAccessToken()
    const attemptsBefore = authRefreshDiagnostics.attempts
    busy.value = true
    try {
        const responses = await demoApi.protectedResources(concurrent)
        const refreshes = authRefreshDiagnostics.attempts - attemptsBefore
        if (refreshes !== 1) throw new Error(t('auth.demo.unexpectedRefreshCount', { count: refreshes }))
        setResult('success', t('auth.demo.requestResult', { count: responses.length, refreshes }))
    } catch (error) {
        setResult('error', error instanceof Error ? error.message : t('auth.demo.error'), false)
    } finally {
        busy.value = false
    }
}

async function expireSession(mode: 'modal' | 'page'): Promise<void> {
    if (!authStore.isLoggedIn) await signIn()
    if (!authStore.isLoggedIn) return
    preferencesStore.updatePreferences({
        auth: {
            enabled: preferencesStore.preferences.auth?.enabled ?? true,
            loginExpiredMode: mode,
        },
    })
    authStore.setTokens({
        accessToken: `mock-access-expired-${Date.now()}`,
        refreshToken: `mock-refresh-expired-${Date.now()}`,
        expiresIn: 0,
    })
    busy.value = true
    try {
        await demoApi.protectedResources(false)
        setResult('error', t('auth.demo.expiryNotTriggered'), false)
    } catch (error) {
        setResult(
            authStore.sessionExpired ? 'success' : 'error',
            authStore.sessionExpired
                ? t(mode === 'modal' ? 'auth.demo.expireModal' : 'auth.demo.expirePage')
                : error instanceof Error ? error.message : t('auth.demo.error'),
            false,
        )
    } finally {
        busy.value = false
    }
}

function clearDemo(): void {
    result.value = { status: 'idle', message: '' }
}
</script>

<template>
    <SectionPage class="min-h-full">
        <template #breadcrumb>
            <span class="text-xs text-muted-foreground">{{ t('auth.demo.title') }}</span>
        </template>
        <template #title>{{ t('auth.demo.title') }}</template>
        <template #description>{{ t('auth.demo.description') }}</template>

        <div class="mx-auto max-w-4xl space-y-4">
            <section class="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div class="space-y-1">
                    <p class="text-xs text-muted-foreground">{{ t('auth.demo.status') }}</p>
                    <Badge :variant="statusVariant">{{ statusLabel }}</Badge>
                </div>
                <div class="flex flex-wrap gap-2">
                    <Button size="sm" :disabled="busy" @click="signIn">{{ t('auth.demo.login') }}</Button>
                    <Button size="sm" variant="outline" :disabled="busy || !isLoggedIn" @click="signOut">{{ t('auth.demo.logout') }}</Button>
                    <Button size="sm" variant="outline" :disabled="busy || !isLoggedIn" @click="refresh">{{ t('auth.demo.refresh') }}</Button>
                </div>
            </section>

            <section class="space-y-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <div class="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" :disabled="busy" @click="requestWithRefresh(false)">{{ t('auth.demo.singleRequest') }}</Button>
                    <Button size="sm" variant="secondary" :disabled="busy" @click="requestWithRefresh(true)">{{ t('auth.demo.concurrentRequests') }}</Button>
                    <Button size="sm" variant="outline" :disabled="busy" @click="expireSession('modal')">{{ t('auth.demo.expireModal') }}</Button>
                    <Button size="sm" variant="outline" :disabled="busy" @click="expireSession('page')">{{ t('auth.demo.expirePage') }}</Button>
                    <Button size="sm" variant="ghost" :disabled="busy" @click="clearDemo">{{ t('auth.demo.clear') }}</Button>
                </div>
                <p class="text-xs text-muted-foreground">
                    {{ t('auth.demo.refreshDiagnostics', { attempts: authRefreshDiagnostics.attempts, successes: authRefreshDiagnostics.successes }) }}
                </p>
                <div class="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div class="rounded-md border border-border/70 px-3 py-2">
                        <span class="font-medium text-foreground">{{ t('auth.demo.token') }}:</span>
                        <code class="ml-1 break-all">{{ authStore.accessToken || '—' }}</code>
                    </div>
                    <div class="rounded-md border border-border/70 px-3 py-2">
                        <span class="font-medium text-foreground">{{ t('auth.demo.refreshToken') }}:</span>
                        <code class="ml-1 break-all">{{ authStore.refreshToken || '—' }}</code>
                    </div>
                </div>
            </section>

            <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <p class="mb-2 text-xs font-medium text-muted-foreground">{{ t('auth.demo.lastResult') }}</p>
                <p v-if="result.status === 'idle'" class="text-sm text-muted-foreground">{{ t('auth.demo.idle') }}</p>
                <p v-else :class="result.status === 'success' ? 'text-sm text-success' : 'text-sm text-destructive'">
                    {{ result.message }}
                </p>
            </section>
        </div>
    </SectionPage>
</template>
