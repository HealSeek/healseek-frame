<script setup lang="ts" generic="T extends Record<string, unknown>">
import { Button } from "../controls";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@healseek/uikit-shadcnui";
import type { DataTableRowAction } from "./types";
import {
  NEW_API_DROPDOWN_CONTENT_CLASS,
  NEW_API_DROPDOWN_ITEM_CLASS,
} from "./new-api-compat";

defineOptions({ name: "DataTableRowActions" });
const props = withDefaults(
  defineProps<{
    row: T;
    actions?: DataTableRowAction<T>[];
    dropdownActions?: DataTableRowAction<T>[];
    hasPermission?: (permission?: string | string[]) => boolean;
    dropdownAriaLabel?: string;
    dropdownContentClass?: string;
    dropdownModal?: boolean;
  }>(),
  { actions: () => [], dropdownActions: () => [] },
);
const emit = defineEmits<{
  (event: "dropdown-open-change", open: boolean): void;
}>();
const { t, te } = useI18n({ useScope: "global" });
const resolvedDropdownAriaLabel = computed(
  () =>
    props.dropdownAriaLabel ??
    (te("common.moreActions") ? t("common.moreActions") : "更多操作"),
);
function allowed(action: DataTableRowAction<T>): boolean {
  if (
    action.permission &&
    props.hasPermission &&
    !props.hasPermission(action.permission)
  )
    return false;
  return typeof action.visible === "function"
    ? action.visible(props.row)
    : action.visible !== false;
}
function state(value: boolean | ((row: T) => boolean) | undefined): boolean {
  return typeof value === "function" ? value(props.row) : value === true;
}
function loading(action: DataTableRowAction<T>): boolean {
  return state(action.loading);
}
const visibleActions = computed(() => props.actions.filter(allowed));
const visibleDropdownActions = computed(() =>
  props.dropdownActions.filter(allowed),
);
function select(action: DataTableRowAction<T>): void {
  if (!state(action.disabled) && !state(action.loading))
    action.onSelect?.(props.row);
}
</script>

<template>
  <div class="flex items-center justify-end gap-1">
    <Button
      v-for="action in visibleActions"
      :key="action.key"
      type="button"
      data-slot="data-table-row-action"
      :data-action-key="action.key"
      :aria-label="
        action.iconOnly ? action.ariaLabel ?? action.label : undefined
      "
      :aria-busy="loading(action) || undefined"
      :variant="action.variant ?? 'ghost'"
      :size="action.iconOnly ? 'icon-sm' : 'sm'"
      :class="action.iconOnly ? 'shrink-0 data-popup-open:bg-muted' : 'gap-1.5'"
      :disabled="state(action.disabled) || loading(action)"
      @click="select(action)"
    >
      <Icon
        v-if="loading(action) || action.icon"
        :icon="loading(action) ? 'lucide:loader-circle' : action.icon!"
        :class="[
          action.iconOnly ? 'size-4' : 'size-3.5',
          loading(action) && 'animate-spin',
        ]"
      /><span v-if="!action.iconOnly">{{ action.label }}</span>
    </Button>
    <DropdownMenu
      v-if="visibleDropdownActions.length"
      :modal="props.dropdownModal"
      @update:open="(open) => emit('dropdown-open-change', open)"
    >
      <DropdownMenuTrigger as-child
        ><Button
          type="button"
          variant="ghost"
          size="icon"
          :class="'data-popup-open:bg-muted'"
          :aria-label="resolvedDropdownAriaLabel"
          ><Icon
            icon="lucide:ellipsis"
            class="size-4"
            aria-hidden="true" /></Button
      ></DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        :class="[
          NEW_API_DROPDOWN_CONTENT_CLASS,
          'w-48',
          props.dropdownContentClass,
        ]"
      >
        <template
          v-for="(action, index) in visibleDropdownActions"
          :key="action.key"
        >
          <DropdownMenuSeparator v-if="index > 0" />
          <DropdownMenuItem
            :class="NEW_API_DROPDOWN_ITEM_CLASS"
            :data-action-key="action.key"
            :data-variant="
              action.variant === 'destructive' ? 'destructive' : 'default'
            "
            :aria-busy="loading(action) || undefined"
            :disabled="state(action.disabled) || loading(action)"
            @select="select(action)"
            ><Icon
              v-if="loading(action) || action.icon"
              :icon="loading(action) ? 'lucide:loader-circle' : action.icon!"
              class="size-4"
              :class="loading(action) && 'animate-spin'"
            />{{ action.label }}</DropdownMenuItem
          >
        </template>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
