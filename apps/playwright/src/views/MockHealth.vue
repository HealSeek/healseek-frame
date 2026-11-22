<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { SectionPage } from '@healseek/components'
import { Badge, Button } from '@healseek/uikit-shadcnui'
import { useRequest } from '@healseek/request'
import { createDemoApi, type HealthStatus } from '../api/demo'

defineOptions({ name: 'MockHealthDemo' })

const demoApi = createDemoApi(useRequest())
const loading = ref(false)
const health = ref<HealthStatus | null>(null)

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
        <template #breadcrumb><span class="text-xs text-muted-foreground">Mock API / Health</span></template>
        <template #title>Mock API 健康检查</template>
        <template #description>验证 playground 是否通过框架 request 层连接到独立 Nitro 服务。</template>
        <template #actions>
            <Button size="sm" variant="outline" :disabled="loading" @click="loadHealth">重新检查</Button>
        </template>

        <section class="rounded-xl bg-card p-5 ring-1 ring-foreground/10">
            <div v-if="health" class="flex flex-wrap items-center gap-3 text-sm">
                <Badge :variant="health.ok ? 'default' : 'destructive'">{{ health.ok ? 'online' : 'offline' }}</Badge>
                <span>{{ health.service }}</span>
                <span class="text-muted-foreground">{{ health.timestamp }}</span>
            </div>
            <p v-else class="text-sm text-muted-foreground">{{ loading ? '检查中…' : '尚未检查' }}</p>
        </section>
    </SectionPage>
</template>
