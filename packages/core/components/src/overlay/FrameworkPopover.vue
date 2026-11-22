<script setup lang="ts">
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@healseek/uikit-shadcnui/components/ui/popover";

defineOptions({ name: "FrameworkPopover" });

const props = withDefaults(
  defineProps<{
    open?: boolean;
    defaultOpen?: boolean;
    modal?: boolean;
    side?: "top" | "right" | "bottom" | "left";
    align?: "start" | "center" | "end";
    sideOffset?: number;
    alignOffset?: number;
    disabled?: boolean;
    triggerClass?: string;
    contentClass?: string;
  }>(),
  {
    modal: false,
    side: "bottom",
    align: "center",
    sideOffset: 4,
    alignOffset: 0,
    disabled: false,
  },
);

const emit = defineEmits<{
  (event: "update:open", value: boolean): void;
}>();

const popoverContentClass =
  "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 flex w-72 origin-(--reka-popover-content-transform-origin) flex-col gap-2.5 rounded-lg p-2.5 text-sm shadow-md ring-1 ring-foreground/10 outline-hidden duration-100 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none";

function updateOpen(value: boolean): void {
  emit("update:open", value);
}
</script>

<template>
  <div data-slot="framework-popover" class="contents">
    <Popover
      v-if="props.open !== undefined"
      :open="props.open"
      :modal="props.modal"
      @update:open="updateOpen"
    >
      <PopoverTrigger data-slot="framework-popover-trigger" as-child :disabled="props.disabled" :class="['inline-flex', props.triggerClass]"><slot name="trigger" /></PopoverTrigger>
      <PopoverContent
        :side="props.side"
        :align="props.align"
        :side-offset="props.sideOffset"
        :align-offset="props.alignOffset"
        :class="[popoverContentClass, props.contentClass]"
        data-slot="framework-popover-content"
        ><slot
      /></PopoverContent>
    </Popover>
    <Popover
      v-else
      :default-open="props.defaultOpen"
      :modal="props.modal"
      @update:open="updateOpen"
    >
      <PopoverTrigger data-slot="framework-popover-trigger" as-child :disabled="props.disabled" :class="['inline-flex', props.triggerClass]"><slot name="trigger" /></PopoverTrigger>
      <PopoverContent
        :side="props.side"
        :align="props.align"
        :side-offset="props.sideOffset"
        :align-offset="props.alignOffset"
        :class="[popoverContentClass, props.contentClass]"
        data-slot="framework-popover-content"
        ><slot
      /></PopoverContent>
    </Popover>
  </div>
</template>
