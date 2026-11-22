<script setup lang="ts">
import { Button } from "../controls";
import { computed, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@healseek/uikit-shadcnui";
import { normalizeDataTableColumnVisibility } from "./column-visibility";
import type { DataTableColumn, DataTableColumnVisibility } from "./types";
import {
  NEW_API_DROPDOWN_CHECKBOX_ITEM_CLASS,
  NEW_API_DROPDOWN_CONTENT_CLASS,
  NEW_API_DROPDOWN_ITEM_CLASS,
  NEW_API_DROPDOWN_LABEL_CLASS,
} from "./new-api-compat";

defineOptions({ name: "DataTableViewOptions" });

const props = withDefaults(
  defineProps<{
    columns: DataTableColumn[];
    modelValue?: DataTableColumnVisibility;
    storageKey?: string;
    label?: string;
    resetLabel?: string;
    showReset?: boolean;
    modal?: boolean;
    dropdownContentClass?: string;
  }>(),
  {
    modelValue: () => ({}),
    showReset: false,
    modal: false,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: DataTableColumnVisibility): void;
  (event: "dropdown-open-change", open: boolean): void;
}>();
const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const resolvedLabel = computed(
  () => props.label ?? copy("common.view", "查看"),
);
const resolvedResetLabel = computed(
  () => props.resetLabel ?? copy("common.restoreColumns", "恢复默认列"),
);
const resolvedGroupLabel = computed(() =>
  copy("common.toggleColumns", "切换列"),
);
const localVisibility = ref<DataTableColumnVisibility>(
  normalizeDataTableColumnVisibility(props.columns, props.modelValue),
);
// Keep every hideable data column in the menu, including columns that start
// hidden.  new-api derives this list from all columns and only excludes
// columns that cannot be hidden; filtering `column.hidden` here made a
// default-hidden column impossible to restore from the View menu.
const configurableColumns = computed(() =>
  props.columns.filter(
    (column) =>
      column.id !== "selection" &&
      column.id !== "actions" &&
      column.key !== "actions" &&
      column.displayOnly !== true &&
      column.meta?.displayOnly !== true &&
      column.hideable !== false,
  ),
);
const columnId = (column: DataTableColumn): string => column.id ?? column.key;
const columnLabel = (column: DataTableColumn): string =>
  column.header ?? column.meta?.label ?? column.title ?? column.key;
const isVisible = (column: DataTableColumn): boolean =>
  localVisibility.value[columnId(column)] !== false;

function persist(value: DataTableColumnVisibility): void {
  if (!props.storageKey || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(props.storageKey, JSON.stringify(value));
  } catch {
    /* optional storage */
  }
}
function setVisible(column: DataTableColumn, value: boolean): void {
  const next = normalizeDataTableColumnVisibility(props.columns, {
    ...localVisibility.value,
    [columnId(column)]: value,
  });
  localVisibility.value = next;
  persist(next);
  emit("update:modelValue", next);
}
function restoreDefaults(): void {
  const next = normalizeDataTableColumnVisibility(props.columns);
  localVisibility.value = next;
  persist(next);
  emit("update:modelValue", next);
}
watch(
  [() => props.modelValue, () => props.columns],
  ([value]) => {
    localVisibility.value = normalizeDataTableColumnVisibility(
      props.columns,
      value,
    );
  },
  { deep: true },
);
onMounted(() => {
  if (!props.storageKey || typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(props.storageKey);
    if (raw) {
      const parsed = JSON.parse(raw) as DataTableColumnVisibility;
      localVisibility.value = normalizeDataTableColumnVisibility(
        props.columns,
        parsed,
      );
      persist(localVisibility.value);
      emit("update:modelValue", localVisibility.value);
    }
  } catch {
    /* invalid persisted state falls back to defaults */
  }
});
</script>

<template>
  <DropdownMenu
    :modal="props.modal"
    @update:open="(open) => emit('dropdown-open-change', open)"
  >
    <DropdownMenuTrigger as-child>
      <Button
        type="button"
        variant="outline"
        :class="'shrink-0'"
        data-slot="data-table-view-options-trigger"
        :aria-label="resolvedLabel"
        >{{ resolvedLabel }}</Button
      >
    </DropdownMenuTrigger>
    <DropdownMenuContent
      align="end"
      :class="[
        NEW_API_DROPDOWN_CONTENT_CLASS,
        'w-[150px]',
        props.dropdownContentClass,
      ]"
      data-slot="data-table-view-options-menu"
    >
      <DropdownMenuGroup
        :aria-label="resolvedGroupLabel"
        data-slot="data-table-view-options-group"
      >
        <DropdownMenuLabel :class="NEW_API_DROPDOWN_LABEL_CLASS">{{
          resolvedGroupLabel
        }}</DropdownMenuLabel>
        <DropdownMenuCheckboxItem
          v-for="column in configurableColumns"
          :key="columnId(column)"
          :model-value="isVisible(column)"
          :class="[NEW_API_DROPDOWN_CHECKBOX_ITEM_CLASS, 'capitalize']"
          @update:model-value="(value) => setVisible(column, value === true)"
        >
          {{ columnLabel(column) }}
        </DropdownMenuCheckboxItem>
      </DropdownMenuGroup>
      <template v-if="props.showReset">
        <DropdownMenuSeparator />
        <DropdownMenuItem
          as-child
          :class="NEW_API_DROPDOWN_ITEM_CLASS"
          data-slot="data-table-view-options-reset"
          :aria-label="resolvedResetLabel"
        >
          <button
            type="button"
            class="w-full text-left text-xs text-muted-foreground"
            @click="restoreDefaults"
          >
            {{ resolvedResetLabel }}
          </button>
        </DropdownMenuItem>
      </template>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
