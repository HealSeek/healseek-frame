<script setup lang="ts">
/**
 * FrameworkNetworkError — shown when the network is down.
 */
import { Button } from '@healseek/uikit-shadcnui'
import { Icon } from '@iconify/vue'

defineOptions({ name: 'FrameworkNetworkError' })
function retry() { window.location.reload() }
</script>

<template>
    <div class="min-h-svh flex flex-col items-center justify-center bg-background text-foreground gap-4 p-8">
        <Icon icon="lucide:wifi-off" class="size-16 text-muted-foreground/40" />
        <h1 class="text-7xl font-bold tracking-tight">离线</h1>
        <p class="text-muted-foreground text-lg">网络连接失败</p>
        <Button @click="retry">重试</Button>
    </div>
</template>
