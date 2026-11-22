<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { FrameworkToaster } from '@healseek/components'
import { BasicLayoutHost, BasicLoadingBar } from '@healseek/layouts'
import { BasicTabBar } from '@healseek/tabs'
import { useAuthStore } from '@healseek/stores/auth'
import { usePreferencesStore } from '@healseek/stores/preferences'
import { useTabStore } from '@healseek/stores/tabs'
import {
    Button,
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    Input,
} from '@healseek/uikit-shadcnui'
import { useAppContext } from './context'
import { useTabViewCache } from './useTabViewCache'
import type { AppShellAuthHandlers } from './AppShell.types'
import type { SidebarView } from '@healseek/layouts'

defineOptions({ name: 'AppShell' })

const props = defineProps<{ auth?: AppShellAuthHandlers; sidebarViews?: SidebarView[] }>()
const context = useAppContext()
const menus = context.menus
const progress = context.progress
const route = useRoute()
const authStore = useAuthStore()
const preferences = usePreferencesStore()
const tabStore = useTabStore()
const { t } = useI18n()

const { cachedViewNames, viewFor } = useTabViewCache(tabStore, route)
/**
 * Keep route changes subtle and consistent with the shell.  The preference
 * manager adds `no-anim` to the document root when animations are disabled;
 * exposing the same setting here also lets Vue skip transition bookkeeping
 * instead of mounting an animation that CSS immediately cancels.
 */
const routeTransitionName = computed(() => preferences.preferences.theme.animationEnabled === false
    ? ''
    : 'framework-page')
const isTabsMaximized = computed(() => Boolean(tabStore.maximizedTabId))
const showLayout = computed(() => {
    if (route.matched.some(record => record.meta?.ignoreLayout)) return false
    return (route.meta.layout ?? preferences.preferences.layout.mode) !== 'full-content'
})
const showSessionExpiredModal = computed(() => Boolean(
    props.auth?.reauthenticate
    && preferences.preferences.auth?.enabled !== false
    && preferences.preferences.auth?.loginExpiredMode !== 'page'
    && authStore.sessionExpired
    && route.path !== '/login',
))
const reauthForm = ref({ username: '', password: '' })
const reauthLoading = ref(false)
const reauthError = ref('')

function viewKey(viewRoute: { fullPath: string }) {
    const tab = tabStore.tabs.find(item => item.fullPath === viewRoute.fullPath)
    return `${viewRoute.fullPath}:${tab?.refreshVersion ?? 0}`
}

function preventDialogDismiss(event: Event) {
    event.preventDefault()
}

async function reauthenticate() {
    if (!props.auth?.reauthenticate || reauthLoading.value) return
    reauthError.value = ''
    if (!reauthForm.value.username || !reauthForm.value.password) {
        reauthError.value = t('auth.sessionExpired.required', '请输入用户名和密码')
        return
    }
    reauthLoading.value = true
    try {
        await props.auth.reauthenticate({ ...reauthForm.value })
        reauthForm.value.password = ''
    } catch (cause) {
        reauthError.value = cause instanceof Error
            ? cause.message
            : t('auth.sessionExpired.invalid', '认证失败，请重试')
    } finally {
        reauthLoading.value = false
    }
}

async function logout() {
    reauthError.value = ''
    reauthForm.value.password = ''
    await props.auth?.logout?.()
}
</script>

<template>
    <BasicLoadingBar :progress="progress" />
    <BasicLayoutHost
        v-if="showLayout"
        :menus="menus"
        :sidebar-views="props.sidebarViews"
        :site-title="preferences.preferences.app.title || preferences.preferences.app.name"
        :site-logo="preferences.preferences.app.logo"
        :show-search="preferences.preferences.header.showSearch"
        :show-messages="preferences.preferences.header.showMessages"
        :show-theme="preferences.preferences.header.showTheme"
        :show-language="preferences.preferences.header.showLanguage"
        :show-settings="preferences.preferences.header.showSettings"
        :show-tabs="preferences.preferences.header.showTabs"
        :maximized="isTabsMaximized"
        :on-logout="props.auth?.logout"
    >
        <template v-if="$slots.header" #header="slotProps"><slot name="header" v-bind="slotProps" /></template>
        <template v-if="$slots['header-left']" #header-left><slot name="header-left" /></template>
        <template v-if="$slots['header-tools']" #header-tools><slot name="header-tools" /></template>
        <template v-if="$slots['header-right']" #header-right><slot name="header-right" /></template>
        <template v-if="$slots.business" #business><slot name="business" /></template>
        <template v-if="$slots.sidebar" #sidebar="slotProps"><slot name="sidebar" v-bind="slotProps" /></template>
        <template #tabs>
            <slot name="tabs"><BasicTabBar /></slot>
        </template>
        <template #content>
            <slot name="content">
                <RouterView v-slot="{ Component, route: viewRoute }">
                    <Transition :name="routeTransitionName" mode="out-in">
                        <KeepAlive :include="cachedViewNames">
                            <component :is="viewFor(viewRoute).component" :key="viewFor(viewRoute).name">
                                <component :is="Component" />
                            </component>
                        </KeepAlive>
                    </Transition>
                </RouterView>
            </slot>
        </template>
        <template v-if="$slots.footer" #footer><slot name="footer" /></template>
    </BasicLayoutHost>
    <RouterView v-else v-slot="{ Component, route: viewRoute }">
        <Transition :name="routeTransitionName" mode="out-in">
            <component :is="Component" :key="viewKey(viewRoute)" />
        </Transition>
    </RouterView>

    <Dialog :open="showSessionExpiredModal">
        <DialogContent :show-close-button="false" @pointer-down-outside="preventDialogDismiss" @escape-key-down="preventDialogDismiss">
            <DialogHeader>
                <DialogTitle>{{ t('auth.sessionExpired.title', '登录已过期') }}</DialogTitle>
                <DialogDescription>{{ t('auth.sessionExpired.description', '请重新登录以继续操作') }}</DialogDescription>
            </DialogHeader>
            <form class="space-y-3" @submit.prevent="reauthenticate">
                <Input v-model="reauthForm.username" autocomplete="username" :placeholder="t('auth.sessionExpired.usernamePlaceholder', '用户名')" :disabled="reauthLoading" />
                <Input v-model="reauthForm.password" autocomplete="current-password" type="password" :placeholder="t('auth.sessionExpired.passwordPlaceholder', '密码')" :disabled="reauthLoading" />
                <p v-if="reauthError" class="text-sm text-destructive" role="alert">{{ reauthError }}</p>
                <DialogFooter>
                    <Button v-if="props.auth?.logout" type="button" variant="outline" :disabled="reauthLoading" @click="logout">
                        {{ t('user.logout', '退出登录') }}
                    </Button>
                    <Button type="submit" :disabled="reauthLoading">
                        {{ reauthLoading ? t('auth.sessionExpired.submitting', '登录中…') : t('auth.sessionExpired.submit', '重新登录') }}
                    </Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
    <FrameworkToaster :theme="preferences.isDark ? 'dark' : 'light'" />
</template>

<style>
/*
 * Route content transition
 *
 * Keep the movement deliberately small: the layout, tabs and scroll viewport
 * remain fixed while only the active page fades and lifts into place.  The
 * `mode="out-in"` transition also prevents two cached tab pages from painting
 * on top of each other during a tab switch.
 */
.framework-page-enter-active,
.framework-page-leave-active {
    transition:
        opacity 160ms ease,
        transform 160ms ease;
}

.framework-page-enter-from {
    opacity: 0;
    transform: translate3d(0, 6px, 0);
}

.framework-page-leave-to {
    opacity: 0;
    transform: translate3d(0, -4px, 0);
}

@media (prefers-reduced-motion: reduce) {
    .framework-page-enter-active,
    .framework-page-leave-active {
        transition-duration: 1ms;
    }
}
</style>
