<script lang="ts" setup>
import {
    DropdownMenu,
    DropdownMenuTrigger,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    Button,
    Badge,
} from '@healseek/uikit-shadcnui'
import { Icon } from '@healseek/shared/icons'
import { useNotificationStore } from '@healseek/stores'

defineOptions({ name: 'MessageDropdown' })

const store = useNotificationStore()
</script>

<template>
    <DropdownMenu>
        <DropdownMenuTrigger as-child>
            <Button data-slot="header-messages" variant="ghost" size="icon" class="relative size-9 cursor-pointer" aria-label="消息" title="消息">
                <Icon icon="lucide:bell" class="size-4" />
                <Badge
                    v-if="store.unreadCount > 0"
                    variant="destructive"
                    class="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 text-[10px] justify-center"
                >
                    {{ store.unreadCount > 99 ? '99+' : store.unreadCount }}
                </Badge>
            </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent class="w-72" align="end">
            <DropdownMenuLabel class="flex items-center justify-between">
                <span>通知</span>
                <button
                    v-if="store.unreadCount > 0"
                    class="text-xs text-muted-foreground hover:text-foreground"
                    @click="store.markAllRead()"
                >
                    全部已读
                </button>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div v-if="store.items.length === 0" class="py-6 text-center text-sm text-muted-foreground">
                暂无通知
            </div>
            <div
                v-for="item in store.items.slice(0, 5)"
                :key="item.id"
                @click="store.markRead(item.id)"
            >
                <DropdownMenuItem class="flex flex-col items-start gap-1 py-2">
                    <div class="flex w-full items-center gap-2">
                        <Icon
                            :icon="item.icon || 'lucide:info'"
                            class="size-4 shrink-0"
                        />
                        <span class="text-sm font-medium truncate">{{ item.title }}</span>
                        <span
                            v-if="!item.read"
                            class="size-1.5 rounded-full bg-primary shrink-0"
                        />
                    </div>
                    <p v-if="item.description" class="text-xs text-muted-foreground w-full truncate">
                        {{ item.description }}
                    </p>
                </DropdownMenuItem>
            </div>
        </DropdownMenuContent>
    </DropdownMenu>
</template>
