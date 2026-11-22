<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Login as FrameworkLogin } from '@healseek/views'
import { handleLogin } from '../../auth/handlers'
import type { LoginParams } from '../../auth/contract'
import { usePreferencesStore } from '@healseek/stores/preferences'

defineOptions({ name: 'AppLogin' })

const router = useRouter()
const preferences = usePreferencesStore()
const loading = ref(false)

async function submit(values: LoginParams): Promise<void> {
    loading.value = true
    try { await handleLogin(values) } catch { /* Handler has shown the localized error. */ }
    finally { loading.value = false }
}
</script>

<template>
    <FrameworkLogin :loading="loading" :text="{ brand: preferences.preferences.app.title }" @submit="submit" @register="router.push('/register')" />
</template>
