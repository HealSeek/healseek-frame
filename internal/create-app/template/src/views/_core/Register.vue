<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { Register as FrameworkRegister } from '@healseek/views'
import { handleRegister } from '../../auth/handlers'
import type { RegisterParams } from '../../auth/contract'
import { usePreferencesStore } from '@healseek/stores/preferences'

defineOptions({ name: 'AppRegister' })

const router = useRouter()
const preferences = usePreferencesStore()
const loading = ref(false)

async function submit(values: RegisterParams): Promise<void> {
    loading.value = true
    try { await handleRegister(values) } catch { /* Handler has shown the localized error. */ }
    finally { loading.value = false }
}
</script>

<template>
    <FrameworkRegister :loading="loading" :text="{ brand: preferences.preferences.app.title }" @submit="submit" @login="router.push('/login')" />
</template>
