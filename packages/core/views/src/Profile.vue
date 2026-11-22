<script lang="ts" setup>
import { ref } from 'vue'
import { useToast } from '@healseek/composables'
import {
    Button,
    Input,
    Field,
    FieldLabel,
    FieldDescription,
} from '@healseek/uikit-shadcnui'
import { Icon } from '@iconify/vue'

defineOptions({ name: 'FrameworkProfile' })

/**
 * User data injected from app side via the auth store.
 * Views don't directly import stores to avoid circular deps.
 */
interface FrameworkUser {
    id?: string
    username?: string
    email?: string
    nickname?: string
    avatar?: string
    roles?: string[]
}

interface FrameworkAuth {
    user: FrameworkUser | null
    isLoggedIn: boolean
    changePassword?: (params: { currentPassword: string; newPassword: string }) => Promise<boolean>
    logout: () => void | Promise<void>
}

const props = withDefaults(defineProps<{
    auth?: FrameworkAuth
}>(), { auth: undefined })

// Reactive bridge: re-read props when they change.
import { computed } from 'vue'
const auth = computed(() => props.auth)
const toast = useToast()
const user = computed(() => auth.value?.user ?? null)
const userInitial = computed(() => user.value?.username?.[0]?.toUpperCase() || 'U')
const userName = computed(() => user.value?.nickname || user.value?.username || '未登录')
const userEmail = computed(() => user.value?.email || '')
const userRoles = computed(() => user.value?.roles || [])

const passwordForm = ref({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
})
const isPasswordLoading = ref(false)

async function handleChangePassword() {
    if (!passwordForm.value.currentPassword) {
        toast.error('请输入当前密码')
        return
    }
    if (passwordForm.value.newPassword.length < 6) {
        toast.error('新密码至少 6 位')
        return
    }
    if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
        toast.error('两次新密码输入不一致')
        return
    }

    isPasswordLoading.value = true
    try {
        const success = (await auth.value?.changePassword?.({
            currentPassword: passwordForm.value.currentPassword,
            newPassword: passwordForm.value.newPassword,
        })) ?? false
        if (success) {
            toast.success('密码修改成功')
            passwordForm.value = {
                currentPassword: '',
                newPassword: '',
                confirmPassword: '',
            }
        } else {
            toast.error('当前密码错误')
        }
    } catch (cause) {
        toast.error(cause instanceof Error ? cause.message : '密码修改失败')
    } finally {
        isPasswordLoading.value = false
    }
}

async function handleLogout() {
    await auth.value?.logout()
}
</script>

<template>
    <div class="mx-auto w-full max-w-4xl space-y-6 p-4 sm:p-6 lg:p-8">
        <!-- 用户信息卡片 -->
        <div class="rounded-lg border bg-card p-6 text-card-foreground">
            <div class="mb-4">
                <h2 class="text-lg font-semibold">个人资料</h2>
                <p class="text-sm text-muted-foreground">查看和更新您的账户信息</p>
            </div>
            <div class="space-y-6">
                <div class="flex items-center gap-6">
                    <div class="flex size-20 items-center justify-center rounded-full bg-muted text-2xl font-semibold">
                        {{ userInitial }}
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold">{{ userName }}</h3>
                        <p class="text-sm text-muted-foreground">{{ userEmail }}</p>
                        <div class="mt-2 flex gap-2">
                            <span
                                v-for="role in userRoles"
                                :key="role"
                                class="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold"
                            >
                                {{ role }}
                            </span>
                        </div>
                    </div>
                </div>
                <div class="grid gap-4 md:grid-cols-2">
                    <div class="space-y-1">
                        <span class="text-sm text-muted-foreground">用户名</span>
                        <p class="font-medium">{{ user?.username }}</p>
                    </div>
                    <div class="space-y-1">
                        <span class="text-sm text-muted-foreground">邮箱</span>
                        <p class="font-medium">{{ userEmail }}</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- 修改密码卡片 -->
        <div v-if="auth?.changePassword" class="rounded-lg border bg-card p-6 text-card-foreground">
            <div class="mb-4">
                <h2 class="text-lg font-semibold">修改密码</h2>
                <p class="text-sm text-muted-foreground">更新您的账户密码</p>
            </div>
            <form class="space-y-4" @submit.prevent="handleChangePassword">
                <Field>
                    <FieldLabel for="currentPassword">当前密码</FieldLabel>
                    <Input
                        id="currentPassword"
                        v-model="passwordForm.currentPassword"
                        type="password"
                        placeholder="请输入当前密码"
                        autocomplete="current-password"
                    />
                </Field>
                <Field>
                    <FieldLabel for="newPassword">新密码</FieldLabel>
                    <Input
                        id="newPassword"
                        v-model="passwordForm.newPassword"
                        type="password"
                        placeholder="请输入新密码（至少 6 位）"
                        autocomplete="new-password"
                    />
                </Field>
                <Field>
                    <FieldLabel for="confirmPassword">确认新密码</FieldLabel>
                    <Input
                        id="confirmPassword"
                        v-model="passwordForm.confirmPassword"
                        type="password"
                        placeholder="请再次输入新密码"
                        autocomplete="new-password"
                    />
                    <FieldDescription>两次密码必须一致</FieldDescription>
                </Field>
                <Button
                    type="submit"
                    :class="{ 'opacity-50': isPasswordLoading }"
                >
                    <Icon
                        v-if="isPasswordLoading"
                        icon="lucide:loader-2"
                        class="mr-2 size-4 animate-spin"
                    />
                    {{ isPasswordLoading ? '修改中...' : '修改密码' }}
                </Button>
            </form>
        </div>

        <!-- 账号操作 -->
        <div class="rounded-lg border bg-card p-6 text-card-foreground">
            <div class="mb-4">
                <h2 class="text-lg font-semibold">账号操作</h2>
            </div>
            <Button variant="destructive" @click="handleLogout">
                <Icon icon="lucide:log-out" class="mr-2 size-4" />
                退出登录
            </Button>
        </div>
    </div>
</template>
