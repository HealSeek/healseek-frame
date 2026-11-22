<script setup lang="ts" generic="TData = Record<string, unknown>">
import { computed, defineComponent, h, isVNode, type PropType, type VNodeChild } from 'vue'
import { cn } from '@healseek/uikit-shadcnui'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@healseek/uikit-shadcnui'
import TruncatedCell from './TruncatedCell.vue'
import { getTruncatedText } from './truncated-text-utils'
import { staticDataTableClassNames } from './static-data-table-classnames'
import type { StaticDataTableColumn, StaticDataTableDataProps } from './static-data-table-types'

defineOptions({ name: 'StaticDataTable' })

const props = defineProps({
    columns: { type: Array as PropType<StaticDataTableColumn<TData>[]>, default: undefined },
    data: { type: Array as PropType<TData[]>, default: undefined },
    getRowKey: { type: Function as PropType<StaticDataTableDataProps<TData>['getRowKey']>, default: undefined },
    getRowClassName: { type: Function as PropType<StaticDataTableDataProps<TData>['getRowClassName']>, default: undefined },
    renderRow: { type: Function as PropType<StaticDataTableDataProps<TData>['renderRow']>, default: undefined },
    // `null` avoids Vue's optional-Boolean coercion so omitted, false and true
    // remain distinguishable at runtime.
    empty: { type: null as unknown as PropType<boolean | undefined>, default: undefined },
    emptyContent: { type: null as unknown as PropType<VNodeChild>, default: undefined },
    emptyClassName: { type: String, default: undefined },
    headerRowClassName: { type: String, default: undefined },
    className: { type: String, default: undefined },
    class: { type: String, default: undefined },
    tableClassName: { type: String, default: undefined },
    tableClass: { type: String, default: undefined },
    containerProps: { type: Object as PropType<StaticDataTableDataProps<TData>['containerProps']>, default: undefined },
    tableProps: { type: Object as PropType<Record<string, unknown>>, default: undefined },
})
defineSlots<{
    default?: () => VNodeChild
    empty?: () => VNodeChild
    row?: (props: { row: TData; index: number }) => VNodeChild
}>()

/** Render a callback's VNodeChild without forcing callers to use a slot. */
const StaticDataTableContent = defineComponent({
    name: 'StaticDataTableContent',
    props: {
        content: { type: null as unknown as PropType<VNodeChild>, default: null },
    },
    setup(contentProps) {
        return () => contentProps.content
    },
})

const StaticDataTableCellContent = defineComponent({
    name: 'StaticDataTableCellContent',
    props: {
        content: { type: null as unknown as PropType<VNodeChild>, default: null },
    },
    setup(contentProps) {
        return () => {
            const text = cellText(contentProps.content)
            if (!text) return h(StaticDataTableContent, { content: contentProps.content })
            return h(TruncatedCell, { tooltipContent: text }, {
                default: () => h(StaticDataTableContent, { content: contentProps.content }),
            })
        }
    },
})

const dataProps = computed<StaticDataTableDataProps<TData> | undefined>(() => {
    if (props.columns === undefined || props.data === undefined) return undefined
    return props as StaticDataTableDataProps<TData>
})
const isDataEmpty = computed(() => {
    const value = dataProps.value
    if (!value || value.columns === undefined) return false
    if (value.empty !== undefined) {
        // Vue keeps a bare optional Boolean attribute as an empty string when
        // the prop is intentionally declared without Boolean casting. Treat
        // that runtime form as `true`, while preserving an explicit `false`.
        return value.empty === true || (value.empty as unknown) === ''
    }
    return value.data.length === 0
})
const resolvedContainerClass = computed(() => cn(
    staticDataTableClassNames.container,
    props.className,
    props.class,
))
const resolvedTableClass = computed(() => cn(props.tableClassName, props.tableClass))

function cellClassName<TData>(column: StaticDataTableColumn<TData>, row: TData, index: number): string | undefined {
    return typeof column.cellClassName === 'function'
        ? column.cellClassName(row, index)
        : column.cellClassName
}

function cellContent<TData>(column: StaticDataTableColumn<TData>, row: TData, index: number): VNodeChild {
    return column.cell?.(row, index) ?? null
}

function cellText(content: VNodeChild): string | null {
    if (content === null || content === undefined || typeof content === 'boolean') return null
    if (typeof content === 'string' || typeof content === 'number') return String(content)
    if (!isVNode(content) && !Array.isArray(content)) return null
    const text = getTruncatedText(content)
    return text || null
}
</script>

<template>
    <div
        v-bind="props.containerProps"
        :class="resolvedContainerClass"
        data-slot="static-data-table-container"
    >
        <Table
            v-bind="props.tableProps"
            :with-container="false"
            :class="resolvedTableClass"
            data-slot="static-data-table"
        >
            <template v-if="dataProps">
                <TableHeader>
                    <TableRow :class="dataProps.headerRowClassName">
                        <TableHead v-for="column in dataProps.columns" :key="column.id" :class="column.className">
                            <StaticDataTableContent :content="column.header" />
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <TableRow
                        v-if="isDataEmpty"
                        data-slot="static-data-table-empty-row"
                    >
                        <TableCell :colspan="dataProps.columns.length" :class="cn('h-24 text-center', dataProps.emptyClassName)">
                            <slot name="empty"><StaticDataTableContent :content="dataProps.emptyContent" /></slot>
                        </TableCell>
                    </TableRow>
                    <template v-else>
                        <template v-for="(row, index) in dataProps.data" :key="dataProps.getRowKey?.(row, index) ?? index">
                            <slot v-if="$slots.row" name="row" :row="row" :index="index" />
                            <StaticDataTableContent
                                v-else-if="dataProps.renderRow"
                                :content="dataProps.renderRow(row, index)"
                            />
                            <TableRow v-else :class="dataProps.getRowClassName?.(row, index)">
                                <TableCell
                                    v-for="column in dataProps.columns"
                                    :key="column.id"
                                    :class="cn('max-w-full min-w-0 overflow-hidden', cellClassName(column, row, index))"
                                >
                                    <StaticDataTableCellContent :content="cellContent(column, row, index)" />
                                </TableCell>
                            </TableRow>
                        </template>
                    </template>
                </TableBody>
            </template>
            <slot v-else />
        </Table>
    </div>
</template>
