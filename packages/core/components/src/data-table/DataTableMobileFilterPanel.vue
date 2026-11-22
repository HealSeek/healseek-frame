<script setup lang="ts">
import { Button } from "../controls";
import { ref } from "vue";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { HTMLAttributes } from "vue";
import { ChevronDown } from "@lucide/vue";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@healseek/uikit-shadcnui";

defineOptions({ name: "DataTableMobileFilterPanel" });

const props = withDefaults(
  defineProps<{
    compact?: boolean;
    class?: HTMLAttributes["class"];
  }>(),
  {
    compact: false,
  },
);

const open = ref(true);
const { t, te } = useI18n({ useScope: "global" });
const collapseText = computed(() =>
  te("common.collapseFilters") ? t("common.collapseFilters") : "收起筛选",
);
const expandText = computed(() =>
  te("common.expandFilters") ? t("common.expandFilters") : "展开筛选",
);
const actionsText = computed(() =>
  te("common.filterActions") ? t("common.filterActions") : "筛选操作",
);
</script>

<template>
  <Collapsible
    v-model:open="open"
    :class="[
      'bg-card/50 flex min-w-0 flex-col rounded-lg border p-2.5',
      open && (props.compact ? 'gap-2.5' : 'gap-2'),
      props.class,
    ]"
  >
    <CollapsibleContent>
      <div class="flex min-w-0 flex-wrap items-center gap-2">
        <slot />
      </div>
    </CollapsibleContent>
    <div
      :class="
        props.compact
          ? 'grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-start gap-2'
          : 'flex items-center justify-end gap-1.5'
      "
    >
      <CollapsibleTrigger as-child>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          :class="
            props.compact
              ? 'size-9 text-muted-foreground hover:text-foreground'
              : 'mr-auto size-7 text-muted-foreground hover:text-foreground'
          "
          :aria-label="open ? collapseText : expandText"
        >
          <ChevronDown
            :class="[
              'transition-transform duration-200',
              props.compact ? 'size-4' : 'size-3.5',
              open && 'rotate-180',
            ]"
            aria-hidden="true"
          />
        </Button>
      </CollapsibleTrigger>
      <div
        role="group"
        :aria-label="actionsText"
        :class="[
          'flex items-center justify-end gap-1.5',
          props.compact &&
            'min-w-0 flex-wrap [&>button]:h-auto [&>button]:min-h-9 [&>button]:max-w-full [&>button]:[overflow-wrap:anywhere] [&>button]:whitespace-normal',
        ]"
      >
        <slot name="actions" />
      </div>
    </div>
  </Collapsible>
</template>
