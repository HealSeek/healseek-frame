<script lang="ts" setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@healseek/uikit-shadcnui'
import { Icon } from '@healseek/shared/icons'
import { useAuthStore } from '@healseek/stores/auth'

defineOptions({ name: 'UserDropDown' })

const props = defineProps<{ onLogout?: () => void | Promise<void> }>()

const router = useRouter()
const { t } = useI18n({ useScope: 'global' })
const authStore = useAuthStore()

const user = computed(() => authStore.user)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const userAvatar = computed(() => user.value?.avatar || '')
const userInitial = computed(() => user.value?.username?.[0]?.toUpperCase() || 'U')
const userName = computed(() => user.value?.nickname || user.value?.username || t('user.account'))
const userEmail = computed(() => user.value?.email || t('user.notSignedIn'))

function goToProfile() {
    router.push('/profile')
}

function goToSettings() {
    router.push({ name: 'Preferences' })
}

async function handleLogout() {
    await props.onLogout?.()
}

function goToLogin() {
    router.push('/login')
}
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <button
                type="button"
                :aria-label="t('user.accountMenu')"
                class="cursor-pointer inline-flex items-center gap-2 rounded-md px-2 py-1 transition-colors hover:bg-accent focus-visible:ring-ring/40 focus-visible:ring-2 outline-none"
            >
                <Avatar class="size-7">
                    <AvatarImage :src="userAvatar" />
                    <AvatarFallback>{{ userInitial }}</AvatarFallback>
                </Avatar>
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-56" align="end">
            <DropdownMenuLabel class="flex flex-col gap-0.5">
                <span class="text-sm font-medium">{{ userName }}</span>
                <span class="text-xs text-muted-foreground">{{ userEmail }}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <template v-if="isLoggedIn">
                <DropdownMenuItem @select="goToProfile">
                    <Icon icon="lucide:user" class="mr-2 size-4" />
                    <span>{{ t('user.profile') }}</span>
                </DropdownMenuItem>
                <DropdownMenuItem v-if="router.hasRoute('Preferences')" @select="goToSettings">
                    <Icon icon="lucide:settings" class="mr-2 size-4" />
                    <span>{{ t('user.settings') }}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem v-if="props.onLogout" @select="handleLogout">
                    <Icon icon="lucide:log-out" class="mr-2 size-4" />
                    <span>{{ t('user.logout') }}</span>
                </DropdownMenuItem>
            </template>
            <template v-else>
                <DropdownMenuItem @select="goToLogin">
                    <Icon icon="lucide:log-in" class="mr-2 size-4" />
                    <span>{{ t('user.login') }}</span>
                </DropdownMenuItem>
            </template>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
