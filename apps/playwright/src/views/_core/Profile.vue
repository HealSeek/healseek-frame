<script setup lang="ts">
import { computed } from 'vue'
import { Profile as FrameworkProfile } from '@healseek/views'
import { useAuthStore } from '@healseek/stores/auth'
import { logout } from '../../auth/handlers'

defineOptions({ name: 'AppProfile' })

const auth = useAuthStore()
const profileAuth = computed(() => ({
    user: auth.user,
    isLoggedIn: auth.isLoggedIn,
    logout,
}))
</script>

<template>
    <FrameworkProfile :auth="profileAuth" />
</template>
