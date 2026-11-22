<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFrameworkApp } from '@healseek/app'
import { PermissionButton, usePermissionStore } from '@healseek/permission'
import { useAuthStore } from '@healseek/stores/auth'
import { SectionPage } from '@healseek/components'
import {
    Badge,
    Button,
    NativeSelect,
    NativeSelectOption,
} from '@healseek/uikit-shadcnui'

defineOptions({ name: 'PermissionDemo' })

type DemoPreset = {
    id: string
    label: string
    description: string
    roles: string[]
    permissions: string[]
}

type AccessMeta = {
    roles?: string[]
    permissions?: string[]
    requiresAuth?: boolean
}

type AccountIdentity = { userId: string; roles: string[]; permissions: string[] }

// All three demo routes render this component; retain the original account
// while moving between them so a simulated role is not captured as the baseline.
let sessionIdentity: AccountIdentity | null = null

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const permissionStore = usePermissionStore()
const { menus } = useFrameworkApp()

const originalIdentity = ref<AccountIdentity | null>(sessionIdentity)
const presets = computed<DemoPreset[]>(() => [
    {
        id: 'account',
        label: '当前账号',
        description: '进入页面时的账号角色和权限，可用于恢复模拟前的状态。',
        roles: originalIdentity.value?.roles ?? [],
        permissions: originalIdentity.value?.permissions ?? [],
    },
    {
        id: 'admin',
        label: '管理员',
        description: '拥有全部权限，适合观察超级权限通配符。',
        roles: ['admin'],
        permissions: ['*', 'demo.dynamic'],
    },
    {
        id: 'operator',
        label: '运营人员',
        description: '可以查看报表，但不能管理用户或访问管理员路由。',
        roles: ['operator'],
        permissions: ['demo.dynamic', 'demo.report.view'],
    },
    {
        id: 'viewer',
        label: '只读访客',
        description: '只保留动态菜单读取权限，适合观察按钮级隐藏。',
        roles: ['viewer'],
        permissions: ['demo.dynamic'],
    },
    {
        id: 'guest',
        label: '未授权用户',
        description: '没有任何业务权限，所有受限入口都会被过滤。',
        roles: [],
        permissions: [],
    },
])

const selectedPresetId = ref('account')
const feedback = ref('切换身份后，菜单过滤和组件权限会立即重新计算。')

const currentPreset = computed(() => presets.value.find((preset) => preset.id === selectedPresetId.value))
const currentRoles = computed(() => authStore.userRoles)
const currentPermissions = computed(() => authStore.userPermissions)
const isLoggedIn = computed(() => authStore.isLoggedIn)
const isSuper = computed(() => permissionStore.isSuper)

const menuChecks: Array<{ label: string; description: string; url: string; meta: AccessMeta }> = [
    {
        label: '动态 Mock API 菜单',
        description: '后端返回的菜单项，要求 demo.dynamic。',
        url: '/mock-api',
        meta: { permissions: ['demo.dynamic'] },
    },
]

const routeChecks: Array<{
    label: string
    description: string
    routeName: string
    meta: AccessMeta
}> = [
    {
        label: '管理员路由',
        description: '点击后由 router.beforeEach 校验 admin 角色。',
        routeName: 'PermissionAdminRoute',
        meta: { roles: ['admin'], requiresAuth: true },
    },
    {
        label: '报表路由',
        description: '点击后由路由元信息校验 demo.report.view。',
        routeName: 'PermissionReportsRoute',
        meta: { permissions: ['demo.report.view'], requiresAuth: true },
    },
]

const roleChecks = [
    { role: 'admin', label: 'admin 管理员' },
    { role: 'operator', label: 'operator 运营' },
    { role: 'viewer', label: 'viewer 只读' },
]

const visibleMenuItems = computed(() => {
    const flattened: Array<{ title: string; url: string; restricted: boolean }> = []
    function walk(items: typeof menus.value): void {
        for (const item of items) {
            flattened.push({
                title: item.title,
                url: item.url,
                restricted: Boolean(item.meta?.permissions?.length || item.meta?.roles?.length),
            })
            if (item.children?.length) walk(item.children)
        }
    }
    walk(menus.value)
    return flattened
})

const activePath = computed(() => route.fullPath)

watch([() => authStore.isLoggedIn, () => authStore.user?.id], ([loggedIn, userId]) => {
    const current = authStore.user
    if (!loggedIn || !userId || !current) sessionIdentity = null
    else if (sessionIdentity?.userId !== userId) {
        sessionIdentity = { userId, roles: [...current.roles], permissions: [...current.permissions] }
    }
    originalIdentity.value = sessionIdentity
    selectedPresetId.value = 'account'
}, { immediate: true })

function applyPreset(): void {
    const preset = currentPreset.value
    if (!preset || !authStore.user) {
        feedback.value = '当前没有登录用户，无法切换模拟身份。'
        return
    }
    authStore.setUser({ ...authStore.user,
        roles: [...preset.roles],
        permissions: [...preset.permissions],
    })
    feedback.value = `已切换为「${preset.label}」。权限 store、侧栏菜单和按钮状态已同步。`
}

function restoreIdentity(): void {
    if (!authStore.user || !originalIdentity.value || authStore.user.id !== originalIdentity.value.userId) return
    authStore.setUser({ ...authStore.user,
        roles: [...originalIdentity.value.roles],
        permissions: [...originalIdentity.value.permissions],
    })
    selectedPresetId.value = 'account'
    feedback.value = '已恢复当前账号进入页面时的角色与权限。'
}

function hasAccess(meta: AccessMeta): boolean {
    return permissionStore.hasAccess(meta)
}

function statusVariant(meta: AccessMeta): 'default' | 'secondary' | 'outline' | 'destructive' {
    return hasAccess(meta) ? 'default' : 'outline'
}

function menuStatus(item: (typeof menuChecks)[number]): '可见' | '已过滤' | '未加载' {
    if (visibleMenuItems.value.some((menu) => menu.url === item.url)) return '可见'
    return hasAccess(item.meta) ? '未加载' : '已过滤'
}

async function openGuardedRoute(item: (typeof routeChecks)[number]): Promise<void> {
    if (!router.hasRoute(item.routeName)) {
        feedback.value = `路由 ${item.routeName} 尚未注册；请在路由模块中加入受限演示路由。`
        return
    }
    feedback.value = hasAccess(item.meta)
        ? `正在打开 ${item.label}，路由守卫应当放行。`
        : `正在尝试打开 ${item.label}，路由守卫应当重定向到 403。`
    await router.push({ name: item.routeName }).catch(() => undefined)
}

function recordButtonAction(label: string): void {
    feedback.value = `按钮级权限校验通过：${label}`
}

</script>

<template>
    <SectionPage class="min-h-full">
        <template #breadcrumb>
            <span class="text-xs text-muted-foreground">框架能力 / 权限</span>
        </template>
        <template #title>权限与角色演示</template>
        <template #description>
            同一套 RBAC 同时驱动侧栏菜单过滤、路由守卫、指令和按钮组件；这里的身份切换只修改当前浏览器内的 mock 用户。
        </template>
        <template #actions>
            <Badge variant="outline">当前路径：{{ activePath }}</Badge>
            <Badge :variant="isLoggedIn ? 'default' : 'destructive'">
                {{ isLoggedIn ? '已登录' : '未登录' }}
            </Badge>
        </template>

        <div class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)]">
            <div class="min-w-0 space-y-4">
                <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
                    <div class="flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 class="text-sm font-semibold">模拟身份</h2>
                            <p class="mt-1 text-xs text-muted-foreground">
                                选择预设后点击应用，观察导航和所有权限依赖的组件实时变化。
                            </p>
                        </div>
                        <div class="flex flex-wrap gap-2">
                            <Button size="sm" @click="applyPreset">应用身份</Button>
                            <Button size="sm" variant="outline" @click="restoreIdentity">恢复账号</Button>
                        </div>
                    </div>

                    <div class="mt-4 grid gap-3 sm:grid-cols-[minmax(12rem,0.65fr)_minmax(0,1.35fr)]">
                        <label class="space-y-1.5 text-sm">
                            <span class="text-xs font-medium text-muted-foreground">角色预设</span>
                            <NativeSelect v-model="selectedPresetId" class="w-full">
                                <NativeSelectOption v-for="preset in presets" :key="preset.id" :value="preset.id">
                                    {{ preset.label }}
                                </NativeSelectOption>
                            </NativeSelect>
                        </label>
                        <div class="rounded-lg border bg-muted/25 p-3 text-sm">
                            <p class="font-medium">{{ currentPreset?.label }}</p>
                            <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ currentPreset?.description }}</p>
                        </div>
                    </div>

                    <div class="mt-4 grid gap-3 sm:grid-cols-2">
                        <div>
                            <p class="mb-2 text-xs font-medium text-muted-foreground">当前角色</p>
                            <div class="flex min-h-8 flex-wrap gap-1.5">
                                <Badge v-for="role in currentRoles" :key="role" variant="secondary">{{ role }}</Badge>
                                <span v-if="!currentRoles.length" class="text-xs text-muted-foreground">无角色</span>
                            </div>
                        </div>
                        <div>
                            <p class="mb-2 text-xs font-medium text-muted-foreground">当前权限</p>
                            <div class="flex min-h-8 flex-wrap gap-1.5">
                                <Badge v-for="permission in currentPermissions" :key="permission" variant="secondary">
                                    {{ permission }}
                                </Badge>
                                <span v-if="!currentPermissions.length" class="text-xs text-muted-foreground">无权限</span>
                            </div>
                        </div>
                    </div>
                    <p class="mt-4 rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">{{ feedback }}</p>
                </section>

                <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
                    <div class="mb-4">
                        <h2 class="text-sm font-semibold">菜单过滤</h2>
                        <p class="mt-1 text-xs text-muted-foreground">后端 Mock API 菜单使用 permissionFilter；切换到未授权用户后，侧栏中的该菜单会消失。</p>
                    </div>
                    <div class="space-y-2">
                        <div v-for="item in menuChecks" :key="item.label" class="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
                            <div class="min-w-0">
                                <p class="truncate text-sm font-medium">{{ item.label }}</p>
                                <p class="mt-0.5 text-xs text-muted-foreground">{{ item.description }}</p>
                            </div>
                            <Badge class="shrink-0" :variant="menuStatus(item) === '可见' ? 'default' : 'outline'">
                                {{ menuStatus(item) }}
                            </Badge>
                        </div>
                    </div>
                </section>

                <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
                    <div class="mb-4">
                        <h2 class="text-sm font-semibold">路由守卫</h2>
                        <p class="mt-1 text-xs text-muted-foreground">按钮保持可点击，方便观察 beforeEach 放行或重定向到 403 的差异。</p>
                    </div>
                    <div class="grid gap-3 sm:grid-cols-2">
                        <div v-for="item in routeChecks" :key="item.routeName" class="rounded-lg border p-3">
                            <div class="flex items-start justify-between gap-2">
                                <div>
                                    <p class="text-sm font-medium">{{ item.label }}</p>
                                    <p class="mt-1 text-xs leading-5 text-muted-foreground">{{ item.description }}</p>
                                </div>
                                <Badge class="shrink-0" :variant="statusVariant(item.meta)">
                                    {{ hasAccess(item.meta) ? '允许' : '拒绝' }}
                                </Badge>
                            </div>
                            <Button class="mt-3 w-full" size="sm" variant="outline" @click="openGuardedRoute(item)">
                                尝试访问
                            </Button>
                        </div>
                    </div>
                </section>
            </div>

            <div class="min-w-0 space-y-4">
                <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
                    <div class="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h2 class="text-sm font-semibold">按钮与指令</h2>
                            <p class="mt-1 text-xs text-muted-foreground">同一权限可用于 v-permission 和 PermissionButton。</p>
                        </div>
                        <Badge v-if="isSuper" variant="secondary">super admin</Badge>
                    </div>
                    <div class="mb-3 rounded-lg border p-3">
                        <p class="text-xs font-medium text-muted-foreground">usePermissionStore.hasRole</p>
                        <div class="mt-2 flex flex-wrap gap-1.5">
                            <Badge v-for="item in roleChecks" :key="item.role" :variant="permissionStore.hasRole(item.role) ? 'default' : 'outline'">
                                {{ item.label }}：{{ permissionStore.hasRole(item.role) ? '通过' : '未命中' }}
                            </Badge>
                        </div>
                    </div>
                    <div class="space-y-3">
                        <div class="rounded-lg border p-3">
                            <p class="text-xs font-medium text-muted-foreground">PermissionButton · denied="disable"</p>
                            <PermissionButton
                                class="mt-3 w-full"
                                permission="demo.report.view"
                                denied="disable"
                                variant="outline"
                                size="sm"
                                @click="recordButtonAction('查看报表')"
                            >
                                查看报表
                            </PermissionButton>
                        </div>
                        <div class="rounded-lg border p-3">
                            <p class="text-xs font-medium text-muted-foreground">v-permission · 无权限时隐藏节点</p>
                            <Button v-permission="'demo.user.write'" class="mt-3 w-full" size="sm" @click="recordButtonAction('管理用户')">
                                管理用户
                            </Button>
                            <p v-if="!permissionStore.hasPermission('demo.user.write')" class="mt-2 text-xs text-muted-foreground">
                                当前节点已被 v-permission 隐藏（切换到管理员即可显示）。
                            </p>
                        </div>
                    </div>
                </section>

                <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
                    <div class="mb-4 flex items-center justify-between gap-2">
                        <div>
                            <h2 class="text-sm font-semibold">实时侧栏菜单</h2>
                            <p class="mt-1 text-xs text-muted-foreground">这是框架实际计算后的菜单树快照。</p>
                        </div>
                        <Badge variant="outline">{{ visibleMenuItems.length }} 项</Badge>
                    </div>
                    <div v-if="visibleMenuItems.length" class="max-h-72 space-y-1.5 overflow-auto pr-1">
                        <div v-for="item in visibleMenuItems" :key="`${item.url}-${item.title}`" class="flex items-center gap-2 rounded-md bg-muted/30 px-2.5 py-2 text-xs">
                            <span class="size-1.5 shrink-0 rounded-full" :class="item.restricted ? 'bg-primary' : 'bg-muted-foreground/40'" />
                            <span class="min-w-0 flex-1 truncate">{{ item.title }}</span>
                            <code class="max-w-40 truncate text-[10px] text-muted-foreground">{{ item.url }}</code>
                        </div>
                    </div>
                    <p v-else class="rounded-md bg-muted/30 px-3 py-4 text-center text-xs text-muted-foreground">当前没有可见菜单。</p>
                </section>

                <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5">
                    <h2 class="text-sm font-semibold">接入要点</h2>
                    <ul class="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                        <li><code class="text-foreground">meta.roles</code> / <code class="text-foreground">meta.permissions</code>：路由和菜单的声明式约束。</li>
                        <li><code class="text-foreground">usePermissionStore</code>：在业务逻辑中复用角色、权限和路由检查。</li>
                        <li><code class="text-foreground">v-permission</code>：隐藏无权限节点；<code class="text-foreground">PermissionButton</code>：选择隐藏或禁用。</li>
                    </ul>
                </section>
            </div>
        </div>
    </SectionPage>
</template>
