<script setup lang="ts" generic="T extends Record<string, unknown>">
import {
  computed,
  ref,
  useSlots,
  watch,
  type HTMLAttributes,
  type Slot,
} from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";
import Checkbox from "../checkbox/Checkbox.vue";
import type {
  DataTableColumn,
  DataTableRowKey,
  DataTableSelectionScope,
} from "./types";
import DataTablePagination from "./DataTablePagination.vue";
import {
  assertUniqueDataTableRowKeys,
  resolveDataTableRowKey,
} from "./row-key";

defineOptions({ name: "DataTableCardGrid" });

const props = withDefaults(
  defineProps<{
    rows?: T[];
    columns?: DataTableColumn<T>[];
    rowKey?: string | ((row: T, index: number) => string | number);
    loading?: boolean;
    error?: unknown;
    errorText?: string;
    emptyText?: string;
    emptyDescription?: string;
    emptyIcon?: string;
    selectable?: boolean;
    selectedKeys?: DataTableRowKey[];
    selectionScope?: DataTableSelectionScope;
    pagination?: boolean;
    page?: number;
    pageSize?: number;
    total?: number;
    pageSizeOptions?: number[];
    cellSlots?: Record<string, Slot>;
    class?: HTMLAttributes["class"];
    gridClass?: HTMLAttributes["class"];
  }>(),
  {
    rows: () => [],
    columns: () => [],
    rowKey: "id",
    loading: false,
    selectable: false,
    selectionScope: "page",
    pagination: false,
    page: 1,
    pageSize: 20,
    pageSizeOptions: () => [10, 20, 30, 40, 50, 100],
    emptyIcon: "lucide:database",
  },
);

const emit = defineEmits<{
  (event: "update:selectedKeys", value: DataTableRowKey[]): void;
  (event: "selection-change", value: DataTableRowKey[]): void;
  (event: "retry"): void;
  (event: "update:page", value: number): void;
  (event: "update:pageSize", value: number): void;
}>();
const slots = useSlots();

const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const resolvedEmptyText = computed(
  () => props.emptyText ?? copy("common.noData", "暂无数据"),
);
const resolvedEmptyDescription = computed(
  () =>
    props.emptyDescription ??
    copy("common.noDataDescription", "当前筛选条件下没有可展示的数据。"),
);
const loadingText = computed(() => copy("common.loading", "加载中…"));
const resolvedErrorText = computed(
  () => props.errorText ?? copy("common.errorLoading", "加载失败"),
);
const retryText = computed(() => copy("common.retry", "重试"));
function selectRowText(index: number): string {
  return te("common.selectRow")
    ? t("common.selectRow", { index: index + 1 })
    : `选择第 ${index + 1} 行`;
}

const internalSelectedKeys = ref<DataTableRowKey[]>([
  ...(props.selectedKeys ?? []),
]);
const currentSelectedKeys = computed(
  () => props.selectedKeys ?? internalSelectedKeys.value,
);
const visibleColumns = computed(() =>
  props.columns
    .filter((column) => !column.hidden && !column.mobileHidden)
    .sort(
      (left, right) =>
        (left.mobileOrder ?? Number.MAX_SAFE_INTEGER) -
        (right.mobileOrder ?? Number.MAX_SAFE_INTEGER),
    ),
);
const visibleKeys = computed(() => {
  const keys = props.rows.map((row, index) => rowKey(row, index));
  assertUniqueDataTableRowKeys(keys);
  return keys;
});
const visibleKeySet = computed(() => new Set(visibleKeys.value));
const selected = computed(() =>
  props.selectionScope === "persistent"
    ? currentSelectedKeys.value
    : currentSelectedKeys.value.filter((key) => visibleKeySet.value.has(key)),
);
const allVisibleSelected = computed(
  () =>
    props.selectable &&
    visibleKeys.value.length > 0 &&
    visibleKeys.value.every((key) => selected.value.includes(key)),
);
const compact = computed(() =>
  visibleColumns.value.some(
    (column) => column.mobileTitle || column.mobileBadge,
  ),
);
const titleColumn = computed(() =>
  visibleColumns.value.find((column) => column.mobileTitle),
);
const badgeColumn = computed(() =>
  visibleColumns.value.find((column) => column.mobileBadge),
);
const fieldColumns = computed(() =>
  visibleColumns.value.filter(
    (column) =>
      column !== titleColumn.value &&
      column !== badgeColumn.value &&
      column.key !== "actions",
  ),
);
const actionsColumn = computed(() =>
  visibleColumns.value.find((column) => column.key === "actions"),
);

function rowKey(row: T, index: number): string | number {
  const key =
    typeof props.rowKey === "function"
      ? props.rowKey(row, index)
      : row[props.rowKey];
  return resolveDataTableRowKey(key);
}

function cellValue(
  row: T,
  column: DataTableColumn<T> | undefined,
  index: number,
): unknown {
  if (!column) return undefined;
  const value = column.value ? column.value(row) : row[column.key];
  return column.formatter ? column.formatter(value, row, index) : value;
}

function displayValue(
  row: T,
  column: DataTableColumn<T> | undefined,
  index: number,
): string {
  const value = cellValue(row, column, index);
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}

function propSlotFor(column: DataTableColumn<T> | undefined): Slot | undefined {
  return column ? props.cellSlots?.[column.key] : undefined;
}

function directSlotFor(
  column: DataTableColumn<T> | undefined,
): Slot | undefined {
  return column ? slots[`cell-${column.key}`] : undefined;
}

function changeSelection(next: DataTableRowKey[]): void {
  const normalized = [
    ...new Set(
      props.selectionScope === "persistent"
        ? next
        : next.filter((key) => visibleKeySet.value.has(key)),
    ),
  ];
  if (props.selectedKeys === undefined) internalSelectedKeys.value = normalized;
  emit("update:selectedKeys", normalized);
  emit("selection-change", normalized);
}

function toggleRow(row: T, index: number): void {
  const key = rowKey(row, index);
  changeSelection(
    selected.value.includes(key)
      ? selected.value.filter((item) => item !== key)
      : [...selected.value, key],
  );
}

function setRowSelection(
  row: T,
  index: number,
  checked: boolean | "indeterminate",
): void {
  const key = rowKey(row, index);
  changeSelection(
    checked === true
      ? [...selected.value, key]
      : selected.value.filter((item) => item !== key),
  );
}

watch(
  visibleKeySet,
  () => {
    if (!props.selectable || props.selectionScope === "persistent") return;
    const current = props.selectedKeys ?? internalSelectedKeys.value;
    const next = current.filter((key) => visibleKeySet.value.has(key));
    if (next.length !== current.length) changeSelection(next);
  },
  { flush: "post" },
);
</script>

<template>
  <div
    :class="['min-w-0', props.class]"
    :aria-busy="props.loading ? 'true' : undefined"
  >
    <template v-if="props.loading">
      <div role="status" aria-live="polite" class="sr-only">
        {{ loadingText }}
      </div>
      <slot name="loading">
        <div
          :class="[
            'grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3',
            props.gridClass,
          ]"
        >
          <div
            v-for="index in 6"
            :key="index"
            class="space-y-3 rounded-lg border bg-muted/40 p-3 animate-pulse"
          >
            <div class="flex items-center justify-between gap-2">
              <div class="h-4 w-32 rounded bg-muted" />
              <div class="h-5 w-16 rounded-md bg-muted" />
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-1.5">
              <div v-for="field in 4" :key="field">
                <div class="mb-1 h-2 w-8 rounded bg-muted" />
                <div class="h-4 w-full rounded bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </slot>
    </template>
    <template v-else-if="props.error">
      <div
        role="alert"
        aria-live="assertive"
        class="rounded-lg border border-destructive/40 p-6 text-center text-sm text-destructive"
      >
        <slot name="error" :error="props.error" :retry="() => emit('retry')">
          <p>{{ resolvedErrorText }}</p>
          <button
            type="button"
            class="mt-3 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
            @click="emit('retry')"
          >
            {{ retryText }}
          </button>
        </slot>
      </div>
    </template>
    <template v-else-if="props.rows.length">
      <div
        :class="[
          'grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3',
          props.gridClass,
        ]"
      >
        <!-- Mix in Cartesian OKLab so neutral surfaces do not shift the theme hue. -->
        <article
          v-for="(row, index) in props.rows"
          :key="String(rowKey(row, index))"
          data-slot="data-table-card"
          :data-state="
            selected.includes(rowKey(row, index)) ? 'selected' : undefined
          "
          :class="[
            'rounded-lg border [background-color:var(--data-table-card-bg,var(--table-row))] px-3 py-2.5 transition-[background-color,border-color] duration-150 data-[state=selected]:[--data-table-card-bg:color-mix(in_oklab,var(--primary)_7%,var(--table-row))] data-[state=selected]:border-primary/40',
            $attrs.class,
          ]"
        >
          <div class="flex min-w-0 items-start gap-2">
            <span
              v-if="props.selectable"
              class="mt-0.5 inline-flex"
            >
              <Checkbox
                :model-value="selected.includes(rowKey(row, index))"
                :aria-label="selectRowText(index)"
                @update:model-value="toggleRow(row, index)"
                @click.stop
              />
            </span>
            <div class="min-w-0 flex-1">
              <slot
                v-if="$slots.card"
                name="card"
                :row="row"
                :index="index"
                :row-key="rowKey(row, index)"
                :selected="selected.includes(rowKey(row, index))"
                :toggle-row="() => toggleRow(row, index)"
                :compact="compact"
              />
              <template v-else>
            <div v-if="compact" class="flex items-center justify-between gap-2">
              <div
                class="flex min-w-0 flex-1 items-center gap-2 text-sm font-medium"
              >
                <slot
                  v-if="directSlotFor(titleColumn)"
                  :name="`cell-${titleColumn?.key}`"
                  :row="row"
                  :value="cellValue(row, titleColumn, index)"
                  :index="index"
                />
                <component
                  v-else-if="propSlotFor(titleColumn)"
                  :is="propSlotFor(titleColumn)"
                  :row="row"
                  :value="cellValue(row, titleColumn, index)"
                  :index="index"
                />
                <template v-else>{{
                  titleColumn ? displayValue(row, titleColumn, index) : ""
                }}</template>
              </div>
              <div v-if="badgeColumn" class="flex-none text-xs">
                <slot
                  v-if="directSlotFor(badgeColumn)"
                  :name="`cell-${badgeColumn?.key}`"
                  :row="row"
                  :value="cellValue(row, badgeColumn, index)"
                  :index="index"
                />
                <component
                  v-else-if="propSlotFor(badgeColumn)"
                  :is="propSlotFor(badgeColumn)"
                  :row="row"
                  :value="cellValue(row, badgeColumn, index)"
                  :index="index"
                />
                <template v-else>{{
                  displayValue(row, badgeColumn, index)
                }}</template>
              </div>
            </div>
            <div
              v-if="compact && fieldColumns.length"
              class="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-1.5"
            >
              <div
                v-for="column in fieldColumns"
                :key="column.key"
                class="min-w-0 overflow-hidden"
              >
                <div
                  class="mb-0.5 select-none text-[10px] leading-none text-muted-foreground"
                >
                  {{ column.title }}
                </div>
                <div class="min-w-0 truncate text-xs">
                  <slot
                    v-if="directSlotFor(column)"
                    :name="`cell-${column.key}`"
                    :row="row"
                    :value="cellValue(row, column, index)"
                    :index="index"
                  /><component
                    v-else-if="propSlotFor(column)"
                    :is="propSlotFor(column)"
                    :row="row"
                    :value="cellValue(row, column, index)"
                    :index="index"
                  /><template v-else>{{
                    displayValue(row, column, index)
                  }}</template>
                </div>
              </div>
            </div>
            <template v-else>
              <div
                v-for="column in fieldColumns"
                :key="column.key"
                class="flex items-start justify-between gap-2 overflow-hidden py-0.5 text-xs"
              >
                <span class="shrink-0 font-medium text-muted-foreground">{{
                  column.title
                }}</span>
                <div class="min-w-0 flex-1 truncate text-right">
                  <slot
                    v-if="directSlotFor(column)"
                    :name="`cell-${column.key}`"
                    :row="row"
                    :value="cellValue(row, column, index)"
                    :index="index"
                  /><component
                    v-else-if="propSlotFor(column)"
                    :is="propSlotFor(column)"
                    :row="row"
                    :value="cellValue(row, column, index)"
                    :index="index"
                  /><template v-else>{{
                    displayValue(row, column, index)
                  }}</template>
                </div>
              </div>
            </template>
            <div v-if="actionsColumn" class="mt-1 flex justify-end">
              <slot
                v-if="directSlotFor(actionsColumn)"
                :name="`cell-${actionsColumn?.key}`"
                :row="row"
                :value="cellValue(row, actionsColumn, index)"
                :index="index"
              /><component
                v-else-if="propSlotFor(actionsColumn)"
                :is="propSlotFor(actionsColumn)"
                :row="row"
                :value="cellValue(row, actionsColumn, index)"
                :index="index"
              /><template v-else>{{
                displayValue(row, actionsColumn, index)
              }}</template>
            </div>
            <div v-if="$slots['card-actions']" class="mt-1 flex justify-end">
              <slot
                name="card-actions"
                :row="row"
                :index="index"
                :row-key="rowKey(row, index)"
                :selected="selected.includes(rowKey(row, index))"
                :toggle-row="() => toggleRow(row, index)"
              />
            </div>
              </template>
            </div>
          </div>
        </article>
      </div>
    </template>
    <slot v-else name="empty">
      <div
        role="status"
        aria-live="polite"
        class="rounded-lg border p-6 text-center"
      >
        <Icon
          :icon="props.emptyIcon"
          class="mx-auto size-6 text-muted-foreground"
        />
        <p class="mt-2 text-sm font-medium">{{ resolvedEmptyText }}</p>
        <p class="mt-1 text-xs text-muted-foreground">
          {{ resolvedEmptyDescription }}
        </p>
      </div>
    </slot>
    <DataTablePagination
      v-if="props.pagination"
      :page="props.page"
      :page-size="props.pageSize"
      :total="props.total ?? props.rows.length"
      :page-size-options="props.pageSizeOptions"
      @update:page="emit('update:page', $event)"
      @update:page-size="emit('update:pageSize', $event)"
    />
  </div>
</template>
