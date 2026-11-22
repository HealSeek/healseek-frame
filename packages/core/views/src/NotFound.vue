<script setup lang="ts">
import { Button } from '@healseek/uikit-shadcnui'
import { useRouter } from 'vue-router'

const router = useRouter()

function goHome() {
    router.push('/')
}
</script>

<template>
    <div class="min-h-screen flex items-center justify-center bg-background">
        <div class="text-center space-y-4">
            <h1 class="text-9xl font-bold text-muted-foreground">404</h1>
            <p class="text-xl text-muted-foreground">页面不存在</p>
            <Button @click="goHome">返回首页</Button>
        </div>
    </div>
</template>
