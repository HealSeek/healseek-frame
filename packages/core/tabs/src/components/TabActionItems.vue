<script setup lang="ts">
import { Icon } from "@iconify/vue";
import {
  ContextMenuItem,
  ContextMenuSeparator,
} from "@healseek/uikit-shadcnui/components/ui/context-menu";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@healseek/uikit-shadcnui/components/ui/dropdown-menu";
import type { TabAction } from "./tab-actions";

defineProps<{ actions: TabAction[]; kind: "context" | "dropdown" }>();
</script>

<template>
  <template v-for="action in actions" :key="action.id">
    <component
      :is="kind === 'context' ? ContextMenuSeparator : DropdownMenuSeparator"
      v-if="action.separator"
    />
    <component
      :is="kind === 'context' ? ContextMenuItem : DropdownMenuItem"
      :disabled="action.disabled"
      :data-tab-action="action.id"
      class="gap-2 px-2 py-1.5"
      @select="action.run()"
    >
      <Icon :icon="action.icon" class="size-4" aria-hidden="true" />
      {{ action.label }}
    </component>
  </template>
</template>
