<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRequest } from '@healseek/request'
import { SectionPage } from '@healseek/components'
import { Badge, Button } from '@healseek/uikit-shadcnui'
import { createDemoApi, type HealthStatus } from '../api/demo'

defineOptions({ name: 'MockHealthDemo' })

const loading = ref(false)
const health = ref<HealthStatus | null>(null)
const demoApi = createDemoApi(useRequest())

async function loadHealth(): Promise<void> {
    loading.value = true
    try {
        health.value = await demoApi.health()
    } catch {
        health.value = { ok: false, service: 'mock-api' }
    } finally {
        loading.value = false
    }
}

onMounted(() => { void loadHealth() })
</script>

<template>
    <SectionPage class="min-h-full">
        <template #title>Mock API 健康检查</template>
        <template #actions>
            <Button size="sm" variant="outline" :disabled="loading" @click="loadHealth">重新检查</Button>
        </template>
        <div class="flex items-center gap-3 text-sm">
            <Badge v-if="health" :variant="health.ok ? 'default' : 'destructive'">{{ health.ok ? 'online' : 'offline' }}</Badge>
            <span>{{ health?.service ?? (loading ? '检查中…' : '尚未检查') }}</span>
            <span class="text-muted-foreground">{{ health?.timestamp }}</span>
        </div>
    </SectionPage>
</template>
