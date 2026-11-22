<script lang="ts" setup>
import {
    Avatar,
    AvatarImage,
    AvatarFallback,
    Badge,
} from '@healseek/uikit-shadcnui'
import { computed } from 'vue'

export type UserRole =
    | string
    | {
          label: string
          tone?: 'default' | 'secondary' | 'destructive' | 'outline'
      }

export interface UserCardUser {
    name: string
    avatar?: string
    username?: string
    email?: string
    role?: UserRole | UserRole[]
    description?: string
}

const props = withDefaults(
    defineProps<{
        user: UserCardUser
        size?: 'sm' | 'md' | 'lg'
        class?: string
    }>(),
    {
        size: 'md',
    },
)

const avatarSize = computed(
    () =>
        ({
            sm: 'size-10',
            md: 'size-14',
            lg: 'size-20',
        })[props.size],
)

const normalizedRoles = computed(() => {
    const r = props.user.role
    if (!r) return []
    return (Array.isArray(r) ? r : [r]).map((item) =>
        typeof item === 'string'
            ? { label: item, tone: 'secondary' as const }
            : item,
    )
})
</script>

<template>
    <div
        class="group/user-card flex min-w-0 items-center gap-3 overflow-hidden rounded-xl bg-card px-4 py-4 text-card-foreground ring-1 ring-foreground/10 transition-colors hover:bg-accent"
        :class="props.class"
    >
        <Avatar :class="avatarSize">
            <AvatarImage v-if="user.avatar" :src="user.avatar" />
            <AvatarFallback>{{
                user.name?.[0]?.toUpperCase() ?? '?'
            }}</AvatarFallback>
        </Avatar>
        <div class="min-w-0 flex-1 space-y-0.5">
            <div class="flex min-w-0 flex-wrap items-center gap-1.5">
                <h3 class="truncate text-sm font-semibold">{{ user.name }}</h3>
                <Badge
                    v-for="role in normalizedRoles"
                    :key="role.label"
                    :variant="role.tone ?? 'secondary'"
                    class="text-[11px]"
                >
                    {{ role.label }}
                </Badge>
            </div>
            <p
                v-if="user.username || user.email"
                class="truncate text-xs text-muted-foreground"
            >
                {{ user.email || user.username }}
            </p>
            <p
                v-if="user.description"
                class="line-clamp-2 text-xs text-muted-foreground"
            >
                {{ user.description }}
            </p>
        </div>
        <div class="flex shrink-0 items-center gap-2">
            <slot name="actions" />
        </div>
    </div>
</template>
