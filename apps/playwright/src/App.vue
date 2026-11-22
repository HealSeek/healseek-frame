<script setup lang="ts">
import { AppShell } from '@healseek/app'
import type { SidebarView } from '@healseek/layouts'
import { handleReauthenticate, logout } from './auth/handlers'

const sidebarViews = [
    {
        id: 'navigation-workspace',
        pathPattern: /^\/dashboard\/navigation-tree(?:\/|$)/,
        parent: { title: 'Dashboard', url: '/dashboard/overview' },
        menus: [
            { title: '导航总览', url: '/dashboard/navigation-tree/overview', group: '导航工作区', order: 10 },
            { title: '布局演示', url: '/dashboard/navigation-tree/layout', group: '导航工作区', order: 20 },
            { title: '受限设置', url: '/dashboard/navigation-tree/restricted', group: '导航工作区', order: 30, disabled: true },
        ],
    },
] satisfies SidebarView[]
</script>

<template>
    <AppShell :auth="{ reauthenticate: handleReauthenticate, logout }" :sidebar-views="sidebarViews">
        <template #business>
            <span class="text-sm font-medium text-muted-foreground">框架演示</span>
        </template>
    </AppShell>
</template>
