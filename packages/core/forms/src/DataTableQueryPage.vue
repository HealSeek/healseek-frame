<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  DataTablePage,
  DataTableToolbar,
  DataTableViewModeToggle,
  type DataTableColumn,
  normalizeDataTableColumnVisibility,
  type DataTableColumnVisibility,
  type DataTableFilterGroup,
  type DataTableFilterValue,
  type DataTableRow,
  type DataTableRowKey,
  type DataTableSelectionScope,
  type DataTableSort,
  type DataTableViewMode,
  type UseDataTableReturn,
} from "@healseek/components";
import DataTableQueryForm from "./DataTableQueryForm.vue";
import type { FormFieldSchema } from "./types";
import type { QueryFormNormalizer, QueryFormValues } from "./data-table-query";

defineOptions({ name: "DataTableQueryPage" });

const props = withDefaults(
  defineProps<{
    table: UseDataTableReturn<DataTableRow>;
    columns: DataTableColumn[];
    querySchema?: FormFieldSchema[];
    queryInitialValues?: QueryFormValues;
    queryNormalizeValues?: QueryFormNormalizer;
    submitOnChange?: boolean;
    changeDebounceMs?: number;
    showSearchForm?: boolean;
    queryFormCollapsed?: boolean;
    queryFormShowCollapseButton?: boolean;
    filters?: DataTableFilterGroup[];
    searchKey?: string;
    searchPlaceholder?: string;
    searchDebounceMs?: number;
    collapsibleOnMobile?: boolean;
    showReset?: boolean;
    showRefresh?: boolean;
    hideViewOptions?: boolean;
    rowKey?: string | ((row: DataTableRow) => DataTableRowKey);
    pagination?: boolean;
    pageSizeOptions?: number[];
    selectable?: boolean;
    selectionScope?: DataTableSelectionScope;
    selectedKeys?: DataTableRowKey[];
    enableViewModeToggle?: boolean;
    showMobileBulkActions?: boolean;
    hideMobile?: boolean;
    viewMode?: DataTableViewMode;
    defaultViewMode?: DataTableViewMode;
    viewModeStorageKey?: string;
    columnVisibility?: DataTableColumnVisibility;
    columnVisibilityStorageKey?: string;
    columnSizing?: Record<string, number>;
    columnSizingStorageKey?: string;
    /** Enable resizing for every column unless a column opts out explicitly. */
    enableColumnResizing?: boolean;
    mobileCards?: boolean;
    class?: string;
  }>(),
  {
    querySchema: () => [],
    queryInitialValues: () => ({}),
    submitOnChange: false,
    changeDebounceMs: 300,
    showSearchForm: true,
    queryFormCollapsed: false,
    queryFormShowCollapseButton: false,
    filters: () => [],
    searchKey: "search",
    searchPlaceholder: "按名称、ID 或关键字筛选…",
    searchDebounceMs: 500,
    collapsibleOnMobile: true,
    showReset: true,
    // Match new-api: pages opt in to a built-in refresh action when needed.
    // Business pages can still pass :show-refresh="true" explicitly.
    showRefresh: false,
    hideViewOptions: false,
    pagination: true,
    selectable: false,
    selectionScope: "page",
    enableViewModeToggle: false,
    showMobileBulkActions: false,
    hideMobile: false,
    mobileCards: false,
  },
);

const emit = defineEmits<{
  (event: "update:selectedKeys", value: DataTableRowKey[]): void;
  (event: "selection-change", value: DataTableRowKey[]): void;
  (event: "query-submit", value: QueryFormValues): void;
  (event: "query-reset", value: QueryFormValues): void;
  (event: "query-invalid", errors: Record<string, string>): void;
  (event: "update:columnVisibility", value: DataTableColumnVisibility): void;
  (event: "update:columnSizing", value: Record<string, number>): void;
}>();

const searchValue = ref(
  String(props.table.filters.value[props.searchKey] ?? ""),
);
const queryForm = ref<InstanceType<typeof DataTableQueryForm>>();
const internalColumnVisibility = ref<DataTableColumnVisibility>(
  normalizeDataTableColumnVisibility(props.columns, props.columnVisibility),
);
const resolvedColumnVisibility = computed(
  () => props.columnVisibility ?? internalColumnVisibility.value,
);

watch(
  () => props.table.filters.value[props.searchKey],
  (value) => {
    const next = value == null ? "" : String(value);
    if (next !== searchValue.value) searchValue.value = next;
  },
);

const filterValues = computed<Record<string, DataTableFilterValue>>(() =>
  Object.fromEntries(
    props.filters.map((filter) => [
      filter.key,
      props.table.filters.value[filter.key] as DataTableFilterValue,
    ]),
  ),
);

function hasValue(value: unknown): boolean {
  return (
    value !== undefined &&
    value !== null &&
    value !== "" &&
    (!Array.isArray(value) || value.length > 0)
  );
}

function mergeToolbarFilters(
  values: Record<string, DataTableFilterValue>,
): Record<string, unknown> {
  const next = { ...props.table.filters.value };
  for (const filter of props.filters) {
    delete next[filter.key];
    const value = values[filter.key];
    if (hasValue(value)) next[filter.key] = value;
  }
  return next;
}

function updateSearch(value: string): void {
  searchValue.value = value;
  const next = { ...props.table.filters.value };
  if (hasValue(value)) next[props.searchKey] = value;
  else delete next[props.searchKey];
  void props.table.setFilters(next);
}

function updateFilterValues(
  values: Record<string, DataTableFilterValue>,
): void {
  void props.table.setFilters(mergeToolbarFilters(values));
}

function refresh(): void {
  void props.table.reload();
}

function updatePage(value: number): void {
  void props.table.setPage(value);
}

function updatePageSize(value: number): void {
  void props.table.setPageSize(value);
}

function updateSort(value?: DataTableSort): void {
  void props.table.setSort(value);
}

function updateSelectedKeys(value: DataTableRowKey[]): void {
  emit("update:selectedKeys", value);
  emit("selection-change", value);
}

function updateColumnVisibility(value: DataTableColumnVisibility): void {
  const normalized = normalizeDataTableColumnVisibility(props.columns, value);
  if (props.columnVisibility === undefined)
    internalColumnVisibility.value = normalized;
  emit("update:columnVisibility", normalized);
}

function onQuerySubmit(filters: QueryFormValues): void {
  emit("query-submit", filters);
}

function onQueryReset(filters: QueryFormValues): void {
  emit("query-reset", filters);
}

watch(
  () => props.columnVisibility,
  (value) => {
    if (value !== undefined)
      internalColumnVisibility.value = normalizeDataTableColumnVisibility(
        props.columns,
        value,
      );
  },
  { deep: true },
);
watch(
  () => props.columns,
  (columns) => {
    if (props.columnVisibility === undefined)
      internalColumnVisibility.value = normalizeDataTableColumnVisibility(
        columns,
        internalColumnVisibility.value,
      );
  },
  { deep: true },
);
</script>

<template>
  <section
    :class="[
      'data-table-query-page flex h-full min-h-0 min-w-0 flex-col',
      props.class,
    ]"
    data-slot="data-table-query-page"
  >
    <DataTablePage
      :rows="props.table.rows.value"
      :columns="props.columns"
      :row-key="props.rowKey"
      :loading="props.table.loading.value"
      :error="props.table.error.value"
      :pagination="props.pagination"
      :page="props.table.page.value"
      :page-size="props.table.pageSize.value"
      :total="props.table.total.value"
      :page-size-options="props.pageSizeOptions"
      manual-sort
      :sort="props.table.sort.value"
      :selectable="props.selectable"
      :selection-scope="props.selectionScope"
      :selected-keys="props.selectedKeys"
      :column-visibility="resolvedColumnVisibility"
      :column-visibility-storage-key="props.columnVisibilityStorageKey"
      :enable-view-mode-toggle="false"
      :show-mobile-bulk-actions="props.showMobileBulkActions"
      :hide-mobile="props.hideMobile"
      :view-mode="props.viewMode"
      :default-view-mode="props.defaultViewMode"
      :view-mode-storage-key="props.viewModeStorageKey"
      :column-sizing="props.columnSizing"
      :column-sizing-storage-key="props.columnSizingStorageKey"
      :enable-column-resizing="props.enableColumnResizing"
      :mobile-cards="props.mobileCards"
      @update:page="updatePage"
      @update:page-size="updatePageSize"
      @update:sort="updateSort"
      @update:selected-keys="updateSelectedKeys"
      @update:column-visibility="updateColumnVisibility"
      @update:column-sizing="(value) => emit('update:columnSizing', value)"
      @retry="refresh"
    >
      <template #toolbar="toolbarProps">
        <DataTableToolbar
          :model-value="searchValue"
          :search-placeholder="props.searchPlaceholder"
          :search-debounce-ms="props.searchDebounceMs"
          :filters="props.filters"
          :filter-values="filterValues"
          :loading="props.table.loading.value"
          :columns="props.columns"
          :column-visibility="resolvedColumnVisibility"
          :column-visibility-storage-key="props.columnVisibilityStorageKey"
          :show-reset="props.showReset"
          :show-refresh="props.showRefresh"
          :collapsible-on-mobile="props.collapsibleOnMobile"
          :hide-view-options="props.hideViewOptions"
          :on-search="undefined"
          @update:model-value="updateSearch"
          @update:filter-values="updateFilterValues"
          @update:column-visibility="updateColumnVisibility"
          @refresh="refresh"
        >
          <template v-if="props.enableViewModeToggle" #view-toggle>
            <DataTableViewModeToggle
              :model-value="toolbarProps.viewMode"
              @update:model-value="toolbarProps.setViewMode"
            />
          </template>
          <template v-if="$slots['toolbar-actions']" #left-actions
            ><slot name="toolbar-actions"
          /></template>
          <template #pre-actions><slot name="toolbar-pre-actions" /></template>
          <template #actions><slot name="toolbar-tools" /></template>
        </DataTableToolbar>
      </template>
      <template v-if="$slots['bulk-actions']" #bulk-actions="slotProps">
        <slot name="bulk-actions" v-bind="slotProps" />
      </template>
      <template #toolbar-bottom>
        <DataTableQueryForm
          v-if="props.showSearchForm && props.querySchema.length"
          ref="queryForm"
          :schema="props.querySchema"
          :initial-values="props.queryInitialValues"
          :table="props.table"
          :normalize-values="props.queryNormalizeValues"
          :submit-on-change="props.submitOnChange"
          :change-debounce-ms="props.changeDebounceMs"
          :collapsed="props.queryFormCollapsed"
          :show-collapse-button="props.queryFormShowCollapseButton"
          class="mt-2"
          @submit="onQuerySubmit"
          @reset="onQueryReset"
          @invalid="(errors) => emit('query-invalid', errors)"
        >
          <template #title><slot name="query-title" /></template>
          <template #actions="slotProps"
            ><slot name="query-actions" v-bind="slotProps"
          /></template>
        </DataTableQueryForm>
        <div v-if="$slots.actionbar" class="mt-2 flex min-w-0 items-center">
          <slot name="actionbar" :table="props.table" :query-form="queryForm" />
        </div>
      </template>
      <template v-if="$slots.table" #table="slotProps"
        ><slot name="table" v-bind="slotProps"
      /></template>
      <template v-if="$slots.mobile" #mobile="slotProps"
        ><slot name="mobile" v-bind="slotProps"
      /></template>
      <template v-if="$slots.card" #card="slotProps"
        ><slot name="card" v-bind="slotProps"
      /></template>
      <template v-if="$slots['card-actions']" #card-actions="slotProps"
        ><slot name="card-actions" v-bind="slotProps"
      /></template>
    </DataTablePage>
  </section>
</template>
