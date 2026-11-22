<script setup lang="ts">
import { Button } from "../controls";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Skeleton,
} from "@healseek/uikit-shadcnui";
import Checkbox from "../checkbox/Checkbox.vue";
import {
  normalizeDataTableColumnPinning,
  parseStoredDataTableColumnPinning,
  resolveDataTableColumnPinning,
  type ResolvedDataTablePinnedColumn,
} from "./column-pinning";
import { normalizeDataTableColumnSizing } from "./column-sizing";
import { normalizeDataTableColumnVisibility } from "./column-visibility";
import type {
  DataTableColumn,
  DataTableColumnPinning,
  DataTableColumnVisibility,
  DataTableRow,
  DataTableRowKey,
  DataTableSelectionScope,
  DataTableSort,
} from "./types";
import DataTableEmpty from "./DataTableEmpty.vue";
import DataTablePagination from "./DataTablePagination.vue";
import TruncatedCell from "./TruncatedCell.vue";
import {
  assertUniqueDataTableRowKeys,
  resolveDataTableRowKey,
} from "./row-key";
import {
  NEW_API_DROPDOWN_CONTENT_CLASS,
  NEW_API_DROPDOWN_ITEM_CLASS,
} from "./new-api-compat";

defineOptions({ name: "DataTable" });

const COLUMN_SIZING_PERSIST_DELAY_MS = 250;

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[];
    data: DataTableRow[];
    rowKey?: string | ((row: DataTableRow) => DataTableRowKey);
    loading?: boolean;
    error?: unknown;
    emptyText?: string;
    errorText?: string;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: string;
    caption?: string;
    selectable?: boolean;
    selectedKeys?: DataTableRowKey[];
    /** Keep selection limited to the currently rendered page by default. */
    selectionScope?: DataTableSelectionScope;
    /** Enables server-side sorting and emits sort-change without reordering rows locally. */
    manualSort?: boolean;
    sort?: DataTableSort;
    pagination?: boolean;
    page?: number;
    pageSize?: number;
    total?: number;
    pageSizeOptions?: number[];
    /** Fixed table viewport height, expressed as CSS text or pixels. */
    height?: string | number;
    /** Maximum table viewport height, expressed as CSS text or pixels. */
    maxHeight?: string | number;
    /** Controlled column visibility; omitted columns follow their hidden flag. */
    columnVisibility?: DataTableColumnVisibility;
    /** Optional localStorage key for column visibility state. */
    columnVisibilityStorageKey?: string;
    /** Controlled fixed-column state keyed by column id/key. */
    columnPinning?: DataTableColumnPinning;
    /** Optional localStorage key for fixed-column state. */
    columnPinningStorageKey?: string;
    /** Render the table on desktop and the mobile slot below the sm breakpoint. */
    mobileCards?: boolean;
    /** Controlled pixel widths keyed by column id/key. */
    columnSizing?: Record<string, number>;
    /** Optional localStorage key for column widths. */
    columnSizingStorageKey?: string;
    /** Enable resizing for every column unless a column opts out explicitly. */
    enableColumnResizing?: boolean;
  }>(),
  {
    rowKey: "id",
    loading: false,
    selectable: false,
    selectionScope: "page",
    manualSort: false,
    pagination: false,
    page: 1,
    pageSize: 20,
    pageSizeOptions: () => [10, 20, 30, 40, 50, 100],
    mobileCards: false,
    enableColumnResizing: false,
  },
);

const emit = defineEmits<{
  (event: "update:selectedKeys", value: DataTableRowKey[]): void;
  (event: "selection-change", value: DataTableRowKey[]): void;
  (event: "sort-change", value?: DataTableSort): void;
  (event: "update:sort", value?: DataTableSort): void;
  (event: "update:page", value: number): void;
  (event: "update:pageSize", value: number): void;
  (event: "update:columnVisibility", value: DataTableColumnVisibility): void;
  (event: "update:columnSizing", value: Record<string, number>): void;
  (event: "update:columnPinning", value: DataTableColumnPinning): void;
  (event: "retry"): void;
}>();

const { t, te } = useI18n({ useScope: "global" });
const errorLoadingText = computed(
  () =>
    props.errorText ??
    (te("common.errorLoading") ? t("common.errorLoading") : "加载失败"),
);
const retryText = computed(() =>
  te("common.retry") ? t("common.retry") : "重试",
);
const selectCurrentPageText = computed(() =>
  te("common.selectCurrentPage") ? t("common.selectCurrentPage") : "全选当前页",
);
const sortAscendingText = computed(() =>
  te("common.sortAscending") ? t("common.sortAscending") : "升序",
);
const sortDescendingText = computed(() =>
  te("common.sortDescending") ? t("common.sortDescending") : "降序",
);
const hideColumnText = computed(() =>
  te("common.hideColumn") ? t("common.hideColumn") : "隐藏列",
);
function selectRowText(index: number): string {
  return te("common.selectRow")
    ? t("common.selectRow", { index: index + 1 })
    : `选择第 ${index + 1} 行`;
}
const slots = useSlots();
const internalSort = ref<DataTableSort>();
const internalSelectedKeys = ref<DataTableRowKey[]>([]);
const internalColumnVisibility = ref<DataTableColumnVisibility>(
  normalizeDataTableColumnVisibility(props.columns, props.columnVisibility),
);
const internalColumnSizing = ref<Record<string, number>>(
  normalizeDataTableColumnSizing(props.columns, props.columnSizing),
);
const resizing = ref<{
  id: string;
  startX: number;
  startWidth: number;
  min: number;
  max?: number;
}>();
let columnSizingPersistTimer: number | undefined;
let pendingColumnSizingPersistence:
  | { key: string; value: Record<string, number> }
  | undefined;
const internalColumnPinning = ref<DataTableColumnPinning>({});
const collator = new Intl.Collator(undefined, {
  numeric: true,
  sensitivity: "base",
});

function columnId(column: DataTableColumn): string {
  return column.id ?? column.key;
}

function isColumnResizable(column: DataTableColumn): boolean {
  return (
    column.resizable === true ||
    (props.enableColumnResizing === true && column.resizable !== false)
  );
}

const currentColumnVisibility = computed(
  () => props.columnVisibility ?? internalColumnVisibility.value,
);
const visibleColumns = computed(() =>
  props.columns.filter((column) => {
    if (column.hideable === false) return !column.hidden;
    const visibility = currentColumnVisibility.value[columnId(column)];
    return visibility === undefined ? !column.hidden : visibility;
  }),
);
const currentColumnSizing = computed(
  () => props.columnSizing ?? internalColumnSizing.value,
);
const columnSize = (column: DataTableColumn): number | undefined => {
  const value = currentColumnSizing.value[columnId(column)];
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
};
const columnStyle = (column: DataTableColumn): Record<string, string> => {
  const size = columnSize(column);
  if (size !== undefined) {
    // Auto table layout may redistribute a preferred width. Once the user
    // chooses a size, its pixel bounds must replace the original CSS hints.
    const width = `${columnWidth(column)}px`;
    return { width, minWidth: width, maxWidth: width };
  }
  const layoutSize =
    size ?? (props.enableColumnResizing ? columnWidth(column) : undefined);
  return {
    width: layoutSize === undefined ? column.width ?? "" : `${layoutSize}px`,
    minWidth: column.minWidth ?? (column.minSize ? `${column.minSize}px` : ""),
    maxWidth: column.maxWidth ?? (column.maxSize ? `${column.maxSize}px` : ""),
  };
};
const tableStyle = computed<Record<string, string> | undefined>(() => {
  if (!props.enableColumnResizing) return undefined;

  const contentWidth = visibleColumns.value.reduce(
    (total, column) => total + columnWidth(column),
    0,
  );
  // Keep the minimum table width in sync with the pinned columns below. The
  // actions column is a real 100px column; using `1` lets a resizable table
  // shrink below its pinned action cells when horizontal scrolling is enabled.
  const fixedWidth = (props.selectable ? 40 : 0) + (hasActions.value ? 100 : 0);

  return {
    minWidth: `max(100%, ${contentWidth + fixedWidth}px)`,
    tableLayout: "auto",
    width: "100%",
  };
});
const currentColumnPinning = computed(() =>
  normalizeDataTableColumnPinning(
    pinningColumns.value,
    props.columnPinning ?? internalColumnPinning.value,
  ),
);
const currentSort = computed(() => props.sort ?? internalSort.value);
const hasToolbar = computed(() => Boolean(slots.toolbar));
const hasActions = computed(() => Boolean(slots.actions || slots.action));
const tableViewportStyle = computed(() => ({
  height: toCssSize(props.height),
  maxHeight: toCssSize(props.maxHeight),
}));
// Keep one and only one vertical scroll owner: the table surface below. If
// the outer flex wrapper also scrolls, sticky headers follow the wrong scroll
// context and can disappear behind the toolbar or page content.
const tableViewportClass = computed(() => "overflow-hidden");
const selected = computed(() => {
  const keys = props.selectedKeys ?? internalSelectedKeys.value;
  if (props.selectionScope === "persistent") return keys;
  return keys.filter((key) => visibleKeySet.value.has(key));
});
const visibleRows = computed(() => {
  if (props.manualSort || !currentSort.value) return props.data;
  const column = props.columns.find(
    (item) => item.key === currentSort.value?.key,
  );
  if (!column) return props.data;
  const direction = currentSort.value.direction === "asc" ? 1 : -1;
  return [...props.data].sort(
    (left, right) =>
      direction *
      collator.compare(
        String(cellValue(left, column) ?? ""),
        String(cellValue(right, column) ?? ""),
      ),
  );
});
const totalRows = computed(() => props.total ?? props.data.length);
const visibleRowKeys = computed(() => {
  const keys = visibleRows.value.map((row) => rowKeyOf(row));
  assertUniqueDataTableRowKeys(keys);
  return keys;
});
const visibleKeySet = computed(() => new Set(visibleRowKeys.value));
const allVisibleSelected = computed(() => {
  if (!props.selectable || visibleRows.value.length === 0) return false;
  return visibleRowKeys.value.every((key) => selected.value.includes(key));
});
const someVisibleSelected = computed(() => {
  if (!props.selectable || visibleRows.value.length === 0) return false;
  return visibleRowKeys.value.some((key) => selected.value.includes(key));
});
const pinningColumns = computed(() => [
  ...(props.selectable ? [{ id: "selection", width: 40 }] : []),
  ...visibleColumns.value.map((column) => ({
    id: columnId(column),
    width: columnWidth(column),
  })),
  ...(hasActions.value ? [{ id: "actions", width: 100 }] : []),
]);
const resolvedPinnedColumns = computed(() =>
  resolveDataTableColumnPinning(
    pinningColumns.value,
    currentColumnPinning.value,
  ),
);
const hasPinnedColumns = computed(() => resolvedPinnedColumns.value.size > 0);

function rowKeyOf(row: DataTableRow): DataTableRowKey {
  const key =
    typeof props.rowKey === "function" ? props.rowKey(row) : row[props.rowKey];
  return resolveDataTableRowKey(key);
}

function cellValue(row: DataTableRow, column: DataTableColumn): unknown {
  return column.value ? column.value(row) : row[column.key];
}

function columnWidth(column: DataTableColumn): number {
  const requested =
    columnSize(column) ??
    parsePixelSize(column.width) ??
    parsePixelSize(column.minWidth) ??
    160;
  const min = column.minSize ?? 1;
  const max = column.maxSize;
  return max === undefined
    ? Math.max(min, requested)
    : Math.min(max, Math.max(min, requested));
}

function parsePixelSize(value: string | undefined): number | undefined {
  const match = /^\s*(\d+(?:\.\d+)?)px\s*$/i.exec(value ?? "");
  if (!match) return undefined;
  const size = Number(match[1]);
  return Number.isFinite(size) && size > 0 ? size : undefined;
}

function pinnedColumn(id: string): ResolvedDataTablePinnedColumn | undefined {
  return resolvedPinnedColumns.value.get(id);
}

function pinnedStyle(
  id: string,
  kind: "header" | "cell",
): Record<string, string | number> | undefined {
  const pinned = pinnedColumn(id);
  if (!pinned) return undefined;
  return {
    position: "sticky",
    [pinned.side]: `${pinned.offset}px`,
    zIndex: kind === "header" ? 30 : 10,
    boxShadow: pinned.edge
      ? pinned.side === "left"
        ? "8px 0 10px -10px var(--foreground)"
        : "-8px 0 10px -10px var(--foreground)"
      : "none",
  };
}

function setColumnPinning(value: DataTableColumnPinning): void {
  const next = normalizeDataTableColumnPinning(pinningColumns.value, value);
  if (props.columnPinning === undefined) internalColumnPinning.value = next;
  emit("update:columnPinning", next);
}

function readStoredColumnPinning(
  key: string | undefined,
): DataTableColumnPinning {
  if (!key || typeof window === "undefined") return {};
  try {
    return parseStoredDataTableColumnPinning(window.localStorage.getItem(key));
  } catch {
    return {};
  }
}

function persistColumnPinning(value: DataTableColumnPinning): void {
  const key = props.columnPinningStorageKey;
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(
        normalizeDataTableColumnPinning(pinningColumns.value, value),
      ),
    );
  } catch {
    // Storage is optional and can be unavailable in private/embedded contexts.
  }
}

watch(currentColumnPinning, persistColumnPinning, { deep: true });
function loadColumnPinning(): void {
  if (
    !props.columnPinningStorageKey ||
    typeof window === "undefined" ||
    props.columnPinning !== undefined
  )
    return;
  const normalized = normalizeDataTableColumnPinning(
    pinningColumns.value,
    readStoredColumnPinning(props.columnPinningStorageKey),
  );
  internalColumnPinning.value = normalized;
  persistColumnPinning(normalized);
}

watch(
  () => props.columnPinningStorageKey,
  (key, previousKey) => {
    if (props.columnPinning !== undefined || key === previousKey) return;
    loadColumnPinning();
  },
  { flush: "post" },
);

function displayValue(
  row: DataTableRow,
  column: DataTableColumn,
  index: number,
): unknown {
  const value = cellValue(row, column);
  return column.formatter ? column.formatter(value, row, index) : value;
}

function displayText(
  row: DataTableRow,
  column: DataTableColumn,
  index: number,
): string {
  const value = displayValue(row, column, index);
  return value === undefined || value === null || value === ""
    ? "—"
    : String(value);
}

function changeSelection(keys: DataTableRowKey[]): void {
  const next = [
    ...new Set(
      props.selectionScope === "persistent"
        ? keys
        : keys.filter((key) => visibleKeySet.value.has(key)),
    ),
  ];
  if (props.selectedKeys === undefined) internalSelectedKeys.value = next;
  emit("update:selectedKeys", next);
  emit("selection-change", next);
}

// A controlled page-scoped selection must not leave stale keys in the parent
// when pagination or a server query replaces the visible rows.
watch(
  visibleKeySet,
  () => {
    if (!props.selectable || props.selectionScope === "persistent") return;
    const current = props.selectedKeys ?? internalSelectedKeys.value;
    const next = current.filter((key) => visibleKeySet.value.has(key));
    if (next.length === current.length) return;
    if (props.selectedKeys === undefined) internalSelectedKeys.value = next;
    emit("update:selectedKeys", next);
    emit("selection-change", next);
  },
  { flush: "post" },
);

function toggleRow(row: DataTableRow): void {
  const key = rowKeyOf(row);
  const keys = selected.value.includes(key)
    ? selected.value.filter((item) => item !== key)
    : [...selected.value, key];
  changeSelection(keys);
}

function toggleAll(): void {
  const visibleKeys = visibleRowKeys.value;
  const next = allVisibleSelected.value
    ? selected.value.filter((key) => !visibleKeys.includes(key))
    : [...selected.value, ...visibleKeys];
  changeSelection(next);
}

function setRowSelection(
  row: DataTableRow,
  checked: boolean | "indeterminate",
): void {
  const key = rowKeyOf(row);
  const next =
    checked === true
      ? Array.from(new Set([...selected.value, key]))
      : selected.value.filter((item) => item !== key);
  changeSelection(next);
}

function setAllSelection(checked: boolean | "indeterminate"): void {
  const visibleKeys = visibleRowKeys.value;
  changeSelection(
    checked === true
      ? Array.from(new Set([...selected.value, ...visibleKeys]))
      : selected.value.filter((key) => !visibleKeys.includes(key)),
  );
}

function setSort(
  column: DataTableColumn,
  direction: DataTableSort["direction"],
): void {
  const sort: DataTableSort = { key: column.key, direction };
  if (!props.manualSort && props.sort === undefined) internalSort.value = sort;
  emit("update:sort", sort);
  emit("sort-change", sort);
}

function clearSort(): void {
  internalSort.value = undefined;
  emit("update:sort", undefined);
  emit("sort-change", undefined);
}

function updateColumnVisibility(next: DataTableColumnVisibility): void {
  const normalized = normalizeDataTableColumnVisibility(props.columns, next);
  if (props.columnVisibility === undefined)
    internalColumnVisibility.value = normalized;
  persistColumnVisibility(normalized);
  emit("update:columnVisibility", normalized);
}

function persistColumnVisibility(value: DataTableColumnVisibility): void {
  const key = props.columnVisibilityStorageKey;
  if (!key || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      key,
      JSON.stringify(normalizeDataTableColumnVisibility(props.columns, value)),
    );
  } catch {
    // Storage is optional and can be unavailable in private/embedded contexts.
  }
}

function loadColumnVisibility(): void {
  if (
    !props.columnVisibilityStorageKey ||
    typeof window === "undefined" ||
    props.columnVisibility !== undefined
  )
    return;
  try {
    const raw = window.localStorage.getItem(props.columnVisibilityStorageKey);
    if (!raw) return;
    const normalized = normalizeDataTableColumnVisibility(
      props.columns,
      JSON.parse(raw) as DataTableColumnVisibility,
    );
    internalColumnVisibility.value = normalized;
    persistColumnVisibility(normalized);
    emit("update:columnVisibility", normalized);
  } catch {
    // Invalid persisted state falls back to the column defaults.
  }
}

function hideColumn(column: DataTableColumn): void {
  if (column.hideable === false) return;
  updateColumnVisibility({
    ...currentColumnVisibility.value,
    [columnId(column)]: false,
  });
}

function initialColumnSize(
  column: DataTableColumn,
  handle?: HTMLElement,
): number {
  // The browser resolves rem/% and auto-layout distribution into pixels.
  // Starting from that width prevents the first drag from jumping to a hint.
  const renderedWidth = handle?.closest("th")?.getBoundingClientRect().width;
  if (
    renderedWidth !== undefined &&
    Number.isFinite(renderedWidth) &&
    renderedWidth > 0
  )
    return renderedWidth;
  return columnWidth(column);
}

function resizeColumnByKeyboard(
  column: DataTableColumn,
  delta: number,
  handle?: HTMLElement,
): void {
  const current = initialColumnSize(column, handle);
  const min = column.minSize ?? 72;
  const max = column.maxSize;
  const next = Math.max(
    min,
    max === undefined ? current + delta : Math.min(max, current + delta),
  );
  updateColumnSizing({
    ...currentColumnSizing.value,
    [columnId(column)]: next,
  });
}

function measureColumnContentWidth(
  handle: HTMLElement,
  column: DataTableColumn,
): number | undefined {
  const table = handle.closest("table");
  if (!table) return undefined;
  const cells = [
    ...table.querySelectorAll<HTMLElement>("[data-column-id]"),
  ].filter((cell) => cell.dataset.columnId === columnId(column));
  if (cells.length === 0) return undefined;

  const measuredWidth = cells.reduce((maxWidth, cell) => {
    const clone = cell.cloneNode(true) as HTMLElement;
    clone
      .querySelectorAll("[data-column-resizer]")
      .forEach((resizer) => resizer.remove());
    clone.style.position = "absolute";
    clone.style.visibility = "hidden";
    clone.style.pointerEvents = "none";
    clone.style.left = "-10000px";
    clone.style.top = "0";
    clone.style.width = "max-content";
    clone.style.minWidth = "0";
    clone.style.maxWidth = "none";
    clone.style.height = "auto";
    clone.style.whiteSpace = "nowrap";
    document.body.append(clone);
    const width = clone.scrollWidth;
    clone.remove();
    return Math.max(maxWidth, width);
  }, 0);

  return measuredWidth > 0 ? Math.ceil(measuredWidth) : undefined;
}

function autoSizeColumn(handle: HTMLElement, column: DataTableColumn): void {
  const measuredWidth = measureColumnContentWidth(handle, column);
  if (measuredWidth === undefined) return;
  const min = column.minSize ?? 72;
  const max = column.maxSize;
  const next = Math.max(
    min,
    max === undefined ? measuredWidth : Math.min(max, measuredWidth),
  );
  updateColumnSizing({
    ...currentColumnSizing.value,
    [columnId(column)]: next,
  });
}

function handleResizeKeydown(
  event: KeyboardEvent,
  column: DataTableColumn,
): void {
  if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
    event.preventDefault();
    resizeColumnByKeyboard(
      column,
      event.key === "ArrowLeft"
        ? -(event.shiftKey ? 50 : 10)
        : event.shiftKey
          ? 50
          : 10,
      event.currentTarget as HTMLElement,
    );
    return;
  }
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    autoSizeColumn(event.currentTarget as HTMLElement, column);
  }
}

function handleResizeDoubleClick(
  event: MouseEvent,
  column: DataTableColumn,
): void {
  event.preventDefault();
  autoSizeColumn(event.currentTarget as HTMLElement, column);
}

function writeColumnSizingPersistence(
  pending: { key: string; value: Record<string, number> } | undefined,
): void {
  if (!pending || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(pending.key, JSON.stringify(pending.value));
  } catch {
    // Storage is optional and can be unavailable in private/embedded contexts.
  }
}

function flushColumnSizingPersistence(): void {
  if (columnSizingPersistTimer !== undefined && typeof window !== "undefined") {
    window.clearTimeout(columnSizingPersistTimer);
  }
  columnSizingPersistTimer = undefined;
  const pending = pendingColumnSizingPersistence;
  pendingColumnSizingPersistence = undefined;
  writeColumnSizingPersistence(pending);
}

function scheduleColumnSizingPersistence(
  key: string | undefined,
  value: Record<string, number>,
): void {
  if (!key || typeof window === "undefined") return;
  if (columnSizingPersistTimer !== undefined) {
    window.clearTimeout(columnSizingPersistTimer);
  }
  pendingColumnSizingPersistence = { key, value: { ...value } };
  columnSizingPersistTimer = window.setTimeout(() => {
    columnSizingPersistTimer = undefined;
    const pending = pendingColumnSizingPersistence;
    pendingColumnSizingPersistence = undefined;
    writeColumnSizingPersistence(pending);
  }, COLUMN_SIZING_PERSIST_DELAY_MS);
}

function updateColumnSizing(next: Record<string, number>): void {
  const normalized = normalizeDataTableColumnSizing(props.columns, next);
  if (props.columnSizing === undefined) internalColumnSizing.value = normalized;
  scheduleColumnSizingPersistence(props.columnSizingStorageKey, normalized);
  emit("update:columnSizing", normalized);
}

function startResize(event: PointerEvent, column: DataTableColumn): void {
  if (!isColumnResizable(column)) return;
  event.preventDefault();
  event.stopPropagation();
  resizing.value = {
    id: columnId(column),
    startX: event.clientX,
    startWidth: initialColumnSize(column, event.currentTarget as HTMLElement),
    min: column.minSize ?? 72,
    max: column.maxSize,
  };
  window.addEventListener("pointermove", resizeColumn);
  window.addEventListener("pointerup", stopResize, { once: true });
}

function resizeColumn(event: PointerEvent): void {
  const active = resizing.value;
  if (!active) return;
  const proposed = active.startWidth + event.clientX - active.startX;
  const nextWidth = Math.max(
    active.min,
    active.max === undefined ? proposed : Math.min(active.max, proposed),
  );
  updateColumnSizing({ ...currentColumnSizing.value, [active.id]: nextWidth });
}

function stopResize(): void {
  resizing.value = undefined;
  window.removeEventListener("pointermove", resizeColumn);
}

function loadColumnSizing(): void {
  if (
    !props.columnSizingStorageKey ||
    typeof window === "undefined" ||
    props.columnSizing !== undefined
  )
    return;
  try {
    const raw = window.localStorage.getItem(props.columnSizingStorageKey);
    if (raw) {
      internalColumnSizing.value = normalizeDataTableColumnSizing(
        props.columns,
        JSON.parse(raw) as Record<string, number>,
      );
      window.localStorage.setItem(
        props.columnSizingStorageKey,
        JSON.stringify(internalColumnSizing.value),
      );
    }
  } catch {
    /* invalid persisted state falls back to defaults */
  }
}

onMounted(() => {
  loadColumnSizing();
  loadColumnPinning();
  loadColumnVisibility();
});
onBeforeUnmount(() => {
  stopResize();
  flushColumnSizingPersistence();
});
watch(
  () => props.columnSizing,
  (value) => {
    internalColumnSizing.value = normalizeDataTableColumnSizing(
      props.columns,
      value,
    );
  },
  { deep: true },
);
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
    const normalized = normalizeDataTableColumnSizing(
      columns,
      currentColumnSizing.value,
    );
    if (props.columnSizing === undefined)
      internalColumnSizing.value = normalized;
    scheduleColumnSizingPersistence(props.columnSizingStorageKey, normalized);
  },
  { deep: true },
);
watch(
  () => props.columnSizingStorageKey,
  (key, previousKey) => {
    if (key === previousKey) return;
    // Never let a pending write for one table overwrite the newly selected
    // table's storage key. Flush the old key before hydrating the new one.
    flushColumnSizingPersistence();
    if (props.columnSizing === undefined) loadColumnSizing();
  },
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

function retry(): void {
  emit("retry");
}

function toCssSize(value: string | number | undefined): string | undefined {
  if (value === undefined) return undefined;
  return typeof value === "number" ? `${value}px` : value;
}
</script>

<template>
  <div
    :class="[
      'relative flex min-h-0 w-full flex-col',
      props.height === undefined && props.maxHeight === undefined
        ? 'h-full'
        : undefined,
      tableViewportClass,
    ]"
    :style="tableViewportStyle"
  >
    <div
      v-if="hasToolbar"
      class="mb-3 flex shrink-0 flex-wrap items-center gap-2.5 sm:gap-3"
    >
      <slot
        name="toolbar"
        :selected-keys="selected"
        :loading="loading"
        :error="error"
        :retry="retry"
        :sort="currentSort"
        :column-pinning="currentColumnPinning"
        :set-column-pinning="setColumnPinning"
        :page="page"
        :page-size="pageSize"
      />
    </div>
    <div
      data-slot="data-table-surface"
      class="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border"
      :aria-busy="loading ? 'true' : undefined"
    >
      <div v-if="loading" role="status" aria-live="polite" class="sr-only">
        {{ te("common.loading") ? t("common.loading") : "加载中…" }}
      </div>
      <div
        data-slot="table-container"
        class="relative min-h-0 w-full flex-1 overflow-auto"
      >
        <div :class="mobileCards ? 'hidden sm:block' : undefined">
          <table
            data-slot="table"
            class="w-full caption-bottom text-sm tabular-nums [font-family:var(--font-body)] [&_td]:text-sm [&_td]:font-medium [&_th]:text-sm [&_:is(th,td)_*]:font-inherit [&_:is(th,td)_*]:[font-size:inherit] [&_:is(th,td)_*]:[font-weight:inherit]"
            :class="hasPinnedColumns ? 'min-w-max' : undefined"
            :style="tableStyle"
          >
            <caption v-if="caption" class="sr-only">
              {{
                caption
              }}
            </caption>
            <colgroup v-if="props.enableColumnResizing">
              <col v-if="selectable" style="width: 40px" />
              <col
                v-for="column in visibleColumns"
                :key="columnId(column)"
                :data-column-id="columnId(column)"
                :style="columnStyle(column)"
              />
              <col v-if="hasActions" style="width: 100px" />
            </colgroup>
            <!--
              Keep the header in the table's own scroll viewport.  Applying
              sticky positioning to each header cell as well as the table
              section is intentional: Chromium can otherwise paint later
              body cells over a sticky <thead> when pinned columns are in use.
            -->
            <thead data-slot="table-header" class="sticky top-0 z-20">
              <tr data-slot="table-row" class="border-b">
                <th
                  v-if="selectable"
                  data-slot="table-head"
                  data-column-id="selection"
                  scope="col"
                  class="data-table-pinned-header h-10 w-10 px-2 align-middle [&:has([role=checkbox])]:pr-0"
                  :style="pinnedStyle('selection', 'header')"
                  @click.stop="toggleAll"
                  @keydown.space.prevent.stop="toggleAll"
                >
                  <Checkbox
                    :model-value="
                      allVisibleSelected
                        ? true
                        : someVisibleSelected
                          ? 'indeterminate'
                          : false
                    "
                    :aria-label="selectCurrentPageText"
                    @update:model-value="setAllSelection"
                    @click.stop
                    @keydown.space.stop
                  />
                </th>
                <th
                  v-for="column in visibleColumns"
                  :key="column.key"
                  :data-column-id="columnId(column)"
                  data-slot="table-head"
                  scope="col"
                  :style="{
                    ...columnStyle(column),
                    ...pinnedStyle(columnId(column), 'header'),
                  }"
                  :aria-sort="
                    currentSort?.key === column.key
                      ? currentSort.direction === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : undefined
                  "
                  class="data-table-pinned-header relative h-10 whitespace-nowrap px-2 text-left align-middle font-medium text-foreground [&:has([role=checkbox])]:pr-0"
                  :class="{
                    'text-center': column.align === 'center',
                    'text-right': column.align === 'right',
                  }"
                >
                  <div
                    v-if="column.sortable"
                    class="flex items-center space-x-2"
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger as-child>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          :class="'data-popup-open:bg-accent -ms-3 h-8'"
                          data-slot="data-table-column-header-trigger"
                          :aria-label="column.title"
                        >
                          <span>{{ column.title }}</span>
                          <Icon
                            :icon="
                              currentSort?.key === column.key
                                ? currentSort.direction === 'asc'
                                  ? 'lucide:arrow-up'
                                  : 'lucide:arrow-down'
                                : 'lucide:chevrons-up-down'
                            "
                            class="ms-2 size-4"
                            aria-hidden="true"
                          />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="start"
                        :class="NEW_API_DROPDOWN_CONTENT_CLASS"
                        data-slot="data-table-column-header-menu"
                      >
                        <DropdownMenuItem
                          :class="NEW_API_DROPDOWN_ITEM_CLASS"
                          data-slot="data-table-column-header-sort-asc"
                          @select="setSort(column, 'asc')"
                          ><Icon
                            icon="lucide:arrow-up"
                            class="size-3.5 text-muted-foreground/70"
                            aria-hidden="true"
                          />{{ sortAscendingText }}</DropdownMenuItem
                        >
                        <DropdownMenuItem
                          :class="NEW_API_DROPDOWN_ITEM_CLASS"
                          data-slot="data-table-column-header-sort-desc"
                          @select="setSort(column, 'desc')"
                          ><Icon
                            icon="lucide:arrow-down"
                            class="size-3.5 text-muted-foreground/70"
                            aria-hidden="true"
                          />{{ sortDescendingText }}</DropdownMenuItem
                        >
                        <template v-if="column.hideable !== false">
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            :class="NEW_API_DROPDOWN_ITEM_CLASS"
                            data-slot="data-table-column-header-hide"
                            @select="hideColumn(column)"
                            ><Icon
                              icon="lucide:eye-off"
                              class="size-3.5 text-muted-foreground/70"
                              aria-hidden="true"
                            />{{ hideColumnText }}</DropdownMenuItem
                          >
                        </template>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <template v-else>{{ column.title }}</template>
                  <span
                    v-if="isColumnResizable(column)"
                    class="absolute inset-y-0 right-0 z-10 flex w-2 cursor-col-resize touch-none select-none items-center justify-end outline-none after:h-[calc(100%-1rem)] after:w-px after:bg-border after:transition-colors hover:after:bg-primary focus-visible:after:bg-primary"
                    role="separator"
                    aria-orientation="vertical"
                    :aria-label="
                      te('common.resizeColumn')
                        ? t('common.resizeColumn', { column: column.title })
                        : `调整列宽：${column.title}`
                    "
                    tabindex="0"
                    data-column-resizer
                    @pointerdown="startResize($event, column)"
                    @keydown="handleResizeKeydown($event, column)"
                    @dblclick="handleResizeDoubleClick($event, column)"
                  />
                </th>
                <th
                  v-if="hasActions"
                  data-column-id="actions"
                  scope="col"
                  class="data-table-pinned-header h-10 whitespace-nowrap px-2 text-right align-middle font-medium text-foreground"
                  :style="pinnedStyle('actions', 'header')"
                >
                  操作
                </th>
              </tr>
            </thead>
            <tbody data-slot="table-body">
              <template v-if="loading">
                <tr
                  v-for="index in 3"
                  :key="index"
                  class="h-15 border-b last:border-0"
                >
                  <td
                    v-if="selectable"
                    class="data-table-pinned-cell p-2"
                    :style="pinnedStyle('selection', 'cell')"
                  >
                    <Skeleton class="h-4 w-4" />
                  </td>
                  <td
                    v-for="column in visibleColumns"
                    :key="column.key"
                    :data-column-id="columnId(column)"
                    class="data-table-pinned-cell p-2"
                    :style="{
                      ...columnStyle(column),
                      ...pinnedStyle(columnId(column), 'cell'),
                    }"
                  >
                    <Skeleton class="h-5 w-full" />
                  </td>
                  <td
                    v-if="hasActions"
                    data-column-id="actions"
                    class="data-table-pinned-cell p-2"
                    :style="pinnedStyle('actions', 'cell')"
                  >
                    <Skeleton class="ml-auto h-5 w-16" />
                  </td>
                </tr>
              </template>
              <tr v-else-if="error">
                <td
                  :colspan="
                    Math.max(
                      visibleColumns.length +
                        (selectable ? 1 : 0) +
                        (hasActions ? 1 : 0),
                      1,
                    )
                  "
                  class="p-8 text-center text-sm text-destructive"
                >
                  <div role="alert" aria-live="assertive">
                    <slot name="error" :error="error" :retry="retry">
                      <p>{{ errorLoadingText }}</p>
                      <button
                        type="button"
                        class="mt-3 rounded-md border px-3 py-1.5 text-xs hover:bg-accent"
                        @click="retry"
                      >
                        {{ retryText }}
                      </button>
                    </slot>
                  </div>
                </td>
              </tr>
              <template v-else-if="visibleRows.length === 0">
                <tr v-if="$slots.empty">
                  <td
                    :colspan="
                      Math.max(
                        visibleColumns.length +
                          (selectable ? 1 : 0) +
                          (hasActions ? 1 : 0),
                        1,
                      )
                    "
                    class="p-8 text-center text-sm text-muted-foreground"
                  >
                    <div role="status" aria-live="polite">
                      <slot name="empty" />
                    </div>
                  </td>
                </tr>
                <DataTableEmpty
                  v-else
                  :col-span="
                    Math.max(
                      visibleColumns.length +
                        (selectable ? 1 : 0) +
                        (hasActions ? 1 : 0),
                      1,
                    )
                  "
                  :title="emptyTitle ?? emptyText"
                  :description="emptyDescription"
                  :icon="emptyIcon"
                >
                  <template #actions><slot name="empty-action" /></template>
                </DataTableEmpty>
              </template>
              <template v-else>
                <tr
                  v-for="(row, index) in visibleRows"
                  :key="String(visibleRowKeys[index])"
                  class="data-table-row group h-15 border-b transition-colors last:border-0 data-[state=selected]:bg-muted hover:[background-color:color-mix(in_oklch,var(--muted)_50%,var(--background))]"
                  :data-state="
                    selected.includes(visibleRowKeys[index])
                      ? 'selected'
                      : undefined
                  "
                  data-slot="table-row"
                >
                  <td
                    v-if="selectable"
                    data-slot="table-cell"
                    data-column-id="selection"
                    class="data-table-pinned-cell w-10 p-2 align-middle [&:has([role=checkbox])]:pr-0"
                    :style="pinnedStyle('selection', 'cell')"
                    @click.stop="toggleRow(row)"
                    @keydown.space.prevent.stop="toggleRow(row)"
                  >
                    <Checkbox
                      :model-value="selected.includes(visibleRowKeys[index])"
                      :aria-label="selectRowText(index)"
                      @update:model-value="setRowSelection(row, $event)"
                      @click.stop
                      @keydown.space.stop
                    />
                  </td>
                  <td
                    v-for="column in visibleColumns"
                    :key="column.key"
                    :data-column-id="columnId(column)"
                    data-slot="table-cell"
                    class="data-table-pinned-cell max-w-full min-w-0 whitespace-nowrap p-2 align-middle [&:has([role=checkbox])]:pr-0"
                    :style="{
                      ...columnStyle(column),
                      ...pinnedStyle(columnId(column), 'cell'),
                    }"
                    :class="{
                      'text-center': column.align === 'center',
                      'text-right': column.align === 'right',
                    }"
                  >
                    <slot
                      :name="`cell-${column.key}`"
                      :row="row"
                      :value="cellValue(row, column)"
                      :index="index"
                    >
                      <TruncatedCell :text="displayText(row, column, index)" />
                    </slot>
                  </td>
                  <td
                    v-if="hasActions"
                    data-slot="table-cell"
                    data-column-id="actions"
                    class="data-table-pinned-cell whitespace-nowrap p-2 text-right align-middle"
                    :style="pinnedStyle('actions', 'cell')"
                  >
                    <slot
                      name="actions"
                      :row="row"
                      :value="row"
                      :index="index"
                      :row-key="visibleRowKeys[index]"
                    >
                      <slot
                        name="action"
                        :row="row"
                        :value="row"
                        :index="index"
                        :row-key="visibleRowKeys[index]"
                      />
                    </slot>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>
        <div v-if="mobileCards" class="space-y-3 sm:hidden">
          <slot
            name="mobile"
            :rows="visibleRows"
            :selected-keys="selected"
            :toggle-row="toggleRow"
          />
        </div>
      </div>
    </div>
    <DataTablePagination
      v-if="pagination"
      class="shrink-0 pt-2"
      :page="page"
      :page-size="pageSize"
      :total="totalRows"
      :page-size-options="pageSizeOptions"
      @update:page="(value) => emit('update:page', value)"
      @update:page-size="(value) => emit('update:pageSize', value)"
    />
    <button v-if="currentSort" type="button" class="sr-only" @click="clearSort">
      清除排序
    </button>
  </div>
</template>

<style>
.data-table-pinned-header {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: var(
    --table-header-bg,
    var(--table-header, var(--background))
  );
}

.data-table-pinned-header:hover,
thead tr:hover > .data-table-pinned-header {
  background-color: var(
    --table-header-hover,
    var(--table-header-bg, var(--table-header, var(--background)))
  );
}

.data-table-pinned-cell {
  background-color: var(--background);
}

.data-table-row:hover > .data-table-pinned-cell {
  background-color: color-mix(in oklch, var(--muted) 50%, var(--background));
}

.data-table-row[data-state="selected"] > .data-table-pinned-cell {
  background-color: var(--muted);
}
</style>
