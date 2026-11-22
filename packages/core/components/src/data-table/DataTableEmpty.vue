<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@healseek/shared/icons'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle, TableCell, TableRow } from '@healseek/uikit-shadcnui'

defineOptions({ name: 'DataTableEmpty' })

const props = withDefaults(defineProps<{
    colSpan: number
    title?: string
    description?: string
    icon?: string
}>(), { icon: 'lucide:database' })

const { t, te } = useI18n({ useScope: 'global' })
const resolvedTitle = computed(() => props.title ?? (te('common.noData') ? t('common.noData') : '暂无数据'))
const resolvedDescription = computed(() => props.description ?? (te('common.noDataDescription') ? t('common.noDataDescription') : '当前筛选条件下没有可展示的数据。'))
</script>

<template>
    <TableRow>
        <TableCell :colspan="props.colSpan" class="h-[400px] p-0">
            <Empty
                role="status"
                aria-live="polite"
                class="w-full gap-4 rounded-xl border-0 border-dashed p-6 text-center text-balance"
            >
                <EmptyHeader>
                    <EmptyMedia variant="icon" class="size-8"><Icon :icon="props.icon" class="size-6" /></EmptyMedia>
                    <EmptyTitle class="text-sm">{{ resolvedTitle }}</EmptyTitle>
                    <EmptyDescription v-if="resolvedDescription">{{ resolvedDescription }}</EmptyDescription>
                </EmptyHeader>
                <EmptyContent v-if="$slots.actions || $slots.action" class="gap-2.5">
                    <slot name="actions" />
                    <slot name="action" />
                </EmptyContent>
            </Empty>
        </TableCell>
    </TableRow>
</template>
