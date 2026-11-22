<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import { cn } from "@healseek/uikit-shadcnui";
import DrawerBody from "./DrawerBody.vue";
import DrawerContent from "./DrawerContent.vue";
import DrawerDescription from "./DrawerDescription.vue";
import DrawerFooter from "./DrawerFooter.vue";
import DrawerHeader from "./DrawerHeader.vue";
import DrawerTitle from "./DrawerTitle.vue";

defineOptions({ name: "DrawerLayout" });

const props = withDefaults(
  defineProps<{
    title?: string;
    description?: string;
    side?: "bottom" | "right";
    showHandle?: boolean;
    class?: HTMLAttributes["class"];
    bodyClass?: HTMLAttributes["class"];
    headerClass?: HTMLAttributes["class"];
    footerClass?: HTMLAttributes["class"];
  }>(),
  {
    side: "bottom",
    showHandle: true,
  },
);
</script>

<template>
  <DrawerContent
    :side="props.side"
    :show-handle="props.showHandle"
    :class="[
      props.side === 'right' &&
        'h-dvh w-full sm:max-w-md gap-0 overflow-clip p-0 shadow-none',
      props.class,
    ]"
  >
    <DrawerHeader
      v-if="$slots.header || props.title || props.description"
      :class="[
        'border-border/70 bg-background/95 border-b px-4 py-3 text-start backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4',
        props.headerClass,
      ]"
    >
      <slot name="header">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <DrawerTitle v-if="props.title">{{ props.title }}</DrawerTitle>
            <DrawerDescription v-if="props.description">{{
              props.description
            }}</DrawerDescription>
          </div>
          <div v-if="$slots.actions" class="shrink-0">
            <slot name="actions" />
          </div>
        </div>
      </slot>
    </DrawerHeader>
    <DrawerBody
      :class="
        cn(
          'flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5',
          props.bodyClass,
        )
      "
      ><slot
    /></DrawerBody>
    <DrawerFooter
      v-if="$slots.footer"
      :class="[
        'border-border/70 bg-background/95 grid grid-cols-2 gap-2 border-t px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:flex sm:flex-row sm:justify-end sm:px-6 sm:py-4',
        props.footerClass,
      ]"
      ><slot name="footer"
    /></DrawerFooter>
  </DrawerContent>
</template>
