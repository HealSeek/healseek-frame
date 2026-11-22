<script setup lang="ts">
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@healseek/uikit-shadcnui";

defineOptions({ name: "FrameworkTooltip" });

const props = withDefaults(
  defineProps<{
    content?: string;
    open?: boolean;
    defaultOpen?: boolean;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
    alignOffset?: number;
    delayDuration?: number;
    disabled?: boolean;
    triggerClass?: string;
    contentClass?: string;
  }>(),
  {
    side: "top",
    align: "center",
    sideOffset: 4,
    alignOffset: 0,
    delayDuration: 0,
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
}>();

function updateOpen(value: boolean): void {
  emit("update:open", value);
}
</script>

<template>
  <TooltipProvider :delay-duration="props.delayDuration">
    <Tooltip
      :open="props.open"
      :default-open="props.defaultOpen"
      :disabled="props.disabled"
      data-slot="framework-tooltip"
      @update:open="updateOpen"
    >
      <TooltipTrigger as-child :disabled="props.disabled" :class="props.triggerClass">
        <slot name="trigger" />
      </TooltipTrigger>
      <TooltipContent
        :side="props.side"
        :align="props.align"
        :side-offset="props.sideOffset"
        :align-offset="props.alignOffset"
        :class="['inline-flex items-center gap-1.5 max-w-xs break-words text-balance origin-(--reka-tooltip-content-transform-origin) motion-reduce:animate-none motion-reduce:data-[state=closed]:animate-none', props.contentClass]"
        data-slot="framework-tooltip-content"
      >
        <slot name="content">{{ props.content }}</slot>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
</template>
