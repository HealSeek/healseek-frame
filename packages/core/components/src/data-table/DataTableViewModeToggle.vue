<script setup lang="ts">
import { Button } from "../controls";
import { computed, type HTMLAttributes } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@healseek/uikit-shadcnui";
import { DATA_TABLE_VIEW_MODES, type DataTableViewMode } from "./view-mode";

defineOptions({ name: "DataTableViewModeToggle" });

const props = withDefaults(
  defineProps<{
    modelValue?: DataTableViewMode;
    disabled?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  {
    modelValue: DATA_TABLE_VIEW_MODES.TABLE,
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: DataTableViewMode): void;
  (event: "change", value: DataTableViewMode): void;
}>();

const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const groupLabel = computed(() => copy("common.viewMode", "视图模式"));
const cardLabel = computed(() => copy("common.cardView", "卡片视图"));
const tableLabel = computed(() => copy("common.tableView", "表格视图"));

function selectMode(mode: DataTableViewMode): void {
  if (props.disabled || props.modelValue === mode) return;
  emit("update:modelValue", mode);
  emit("change", mode);
}
</script>

<template>
  <TooltipProvider :delay-duration="0">
    <div
      role="group"
      :aria-label="groupLabel"
      data-slot="data-table-view-mode-toggle"
      :class="[
        'inline-flex h-8 items-center rounded-lg border bg-muted/60 p-0.5',
        props.class,
      ]"
    >
      <Tooltip>
        <TooltipTrigger as-child :disabled="props.disabled">
          <Button
            type="button"
            size="icon-sm"
            :variant="
              props.modelValue === DATA_TABLE_VIEW_MODES.CARD
                ? 'default'
                : 'ghost'
            "
            :disabled="props.disabled"
            :aria-label="cardLabel"
            :aria-pressed="props.modelValue === DATA_TABLE_VIEW_MODES.CARD"
            :class="'h-full w-7 rounded-md p-0'"
            @click="selectMode(DATA_TABLE_VIEW_MODES.CARD)"
          >
            <Icon icon="lucide:grid-2x2" class="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="text-xs">
          {{ cardLabel }}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger as-child :disabled="props.disabled">
          <Button
            type="button"
            size="icon-sm"
            :variant="
              props.modelValue === DATA_TABLE_VIEW_MODES.TABLE
                ? 'default'
                : 'ghost'
            "
            :disabled="props.disabled"
            :aria-label="tableLabel"
            :aria-pressed="props.modelValue === DATA_TABLE_VIEW_MODES.TABLE"
            :class="'h-full w-7 rounded-md p-0'"
            @click="selectMode(DATA_TABLE_VIEW_MODES.TABLE)"
          >
            <Icon icon="lucide:table-2" class="size-3.5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" class="text-xs">
          {{ tableLabel }}
        </TooltipContent>
      </Tooltip>
    </div>
  </TooltipProvider>
</template>
