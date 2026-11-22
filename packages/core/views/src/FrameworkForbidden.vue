<script setup lang="ts">
/**
 * FrameworkForbidden — 403 page. Shown when the route meta requires
 * roles/permissions the current user doesn't have. Apps register a
 * /403 route in their coreRoutes to point at this view.
 */
import { useRouter } from 'vue-router'
import { Button } from '@healseek/uikit-shadcnui'
import { Icon } from '@iconify/vue'

defineOptions({ name: 'FrameworkForbidden' })
const router = useRouter()
function back() { router.replace('/') }
</script>

<template>
    <div class="min-h-svh flex flex-col items-center justify-center bg-background text-foreground gap-4 p-8">
        <Icon icon="lucide:shield-x" class="size-16 text-muted-foreground/40" />
        <h1 class="text-7xl font-bold tracking-tight">403</h1>
        <p class="text-muted-foreground text-lg">您没有访问该页面的权限</p>
        <Button @click="back">返回首页</Button>
    </div>
</template>
