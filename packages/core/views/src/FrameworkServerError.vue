<script setup lang="ts">
/**
 * FrameworkServerError — 500 page.
 */
import { useRouter } from 'vue-router'
import { Button } from '@healseek/uikit-shadcnui'
import { Icon } from '@iconify/vue'

defineOptions({ name: 'FrameworkServerError' })
const router = useRouter()
function back() { router.replace('/') }
</script>

<template>
    <div class="min-h-svh flex flex-col items-center justify-center bg-background text-foreground gap-4 p-8">
        <Icon icon="lucide:server-crash" class="size-16 text-muted-foreground/40" />
        <h1 class="text-7xl font-bold tracking-tight">500</h1>
        <p class="text-muted-foreground text-lg">服务异常,请稍后重试</p>
        <Button @click="back">返回首页</Button>
    </div>
</template>
