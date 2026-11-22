<script setup lang="ts">
import type { HTMLAttributes } from "vue";
import type { PrimitiveProps } from "reka-ui";
import { Button as UiButton, cn } from "@healseek/uikit-shadcnui";
import { Icon } from "@healseek/shared/icons";
import {
  newApiButtonClass,
  type NewApiButtonSize,
  type NewApiButtonVariant,
} from "../data-table/new-api-compat";

defineOptions({ name: "Button", inheritAttrs: false });
const props = withDefaults(
  defineProps<
    PrimitiveProps & {
      variant?: NewApiButtonVariant;
      size?: NewApiButtonSize;
      type?: "button" | "submit" | "reset";
      /** Decorative leading icon. The `icon` slot takes precedence. */
      icon?: string;
      class?: HTMLAttributes["class"];
    }
  >(),
  { variant: "default", size: "default", as: "button" },
);
// CVA treats null as an explicit opt-out. Core owns variant/size styling so
// primitive has-svg padding cannot overrule a caller's p-0 or natural height.
</script>

<template>
  <UiButton
    v-bind="$attrs"
    :as="props.as"
    :as-child="props.asChild"
    :type="
      props.type ??
      (!props.asChild && props.as === 'button' ? 'button' : undefined)
    "
    :variant="null"
    :size="null"
    :data-variant="props.variant"
    :data-size="props.size"
    :class="cn(newApiButtonClass(props.variant, props.size), props.class)"
  >
    <template v-if="props.asChild" #default><slot /></template>
    <template v-else #default>
      <span
        v-if="$slots.icon || props.icon"
        data-slot="button-icon"
        data-icon="inline-start"
        class="inline-flex shrink-0"
        aria-hidden="true"
      >
        <slot name="icon"><Icon :icon="props.icon!" /></slot>
      </span>
      <slot />
      <span
        v-if="$slots.suffix"
        data-slot="button-suffix"
        data-icon="inline-end"
        class="inline-flex shrink-0"
        aria-hidden="true"
      >
        <slot name="suffix" />
      </span>
    </template>
  </UiButton>
</template>
