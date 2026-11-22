<script setup lang="ts">
import type { DialogContentEmits, DialogContentProps } from "reka-ui";
import type { HTMLAttributes } from "vue";
import { reactiveOmit } from "@vueuse/core";
import { DialogContent, DialogPortal, useForwardPropsEmits } from "reka-ui";
import { cn } from "@healseek/uikit-shadcnui";
import DrawerOverlay from "./DrawerOverlay.vue";

defineOptions({ inheritAttrs: false });

const props = withDefaults(
  defineProps<
    DialogContentProps & {
      class?: HTMLAttributes["class"];
      showHandle?: boolean;
      side?: "bottom" | "right";
    }
  >(),
  {
    showHandle: true,
    side: "bottom",
  },
);
const emits = defineEmits<DialogContentEmits>();
const delegatedProps = reactiveOmit(props, "class", "showHandle", "side");
const forwarded = useForwardPropsEmits(delegatedProps, emits);
</script>

<template>
  <DialogPortal>
    <DrawerOverlay />
    <!-- Keep focus-driven scrolling in DrawerBody, never in the fixed shell. -->
    <DialogContent
      data-slot="drawer-content"
      v-bind="{ ...$attrs, ...forwarded }"
      :class="
        cn(
          'bg-background text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed z-50 flex flex-col overflow-clip bg-clip-padding text-sm shadow-none outline-none duration-200 ease-in-out motion-reduce:animate-none',
          props.side === 'right'
            ? 'inset-y-0 right-0 h-dvh w-full sm:max-w-md border-l data-[state=closed]:slide-out-to-right-10 data-[state=open]:slide-in-from-right-10'
            : 'inset-x-0 bottom-0 mt-24 max-h-[80dvh] rounded-t-xl border-t data-[state=closed]:slide-out-to-bottom-10 data-[state=open]:slide-in-from-bottom-10',
          props.class,
        )
      "
    >
      <div
        v-if="showHandle && props.side === 'bottom'"
        data-slot="drawer-handle"
        class="bg-muted mx-auto mt-3 h-1 w-24 shrink-0 rounded-full"
      />
      <slot />
    </DialogContent>
  </DialogPortal>
</template>
