<script setup lang="ts">
import { Icon } from '@healseek/shared/icons'
defineProps<{ title: string; showReset?: boolean }>()
const emit = defineEmits<{ reset: [] }>()
</script>
<template>
    <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span>{{ title }}</span>
        <button v-if="showReset" type="button" class="inline-flex size-5 items-center justify-center rounded text-muted-foreground transition hover:bg-accent hover:text-foreground" aria-label="恢复此项默认" @click="emit('reset')"><Icon icon="lucide:rotate-ccw" class="size-3" /></button>
    </div>
</template>
