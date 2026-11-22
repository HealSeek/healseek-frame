<script lang="ts" setup>
import { Button } from '../controls'
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@healseek/uikit-shadcnui";
import { STATE_CONTENT_CLASS, STATE_SURFACE_CLASS } from "./state-surface";

const props = withDefaults(
  defineProps<{
    icon?: string;
    title?: string;
    description?: string;
    actionText?: string;
    bordered?: boolean;
    size?: "sm" | "md" | "lg";
    class?: string;
  }>(),
  { icon: "lucide:database", size: "sm", bordered: false },
);

const { t, te } = useI18n({ useScope: "global" });
const resolvedTitle = computed(
  () => props.title ?? (te("common.noData") ? t("common.noData") : "暂无数据"),
);

const emit = defineEmits<{ (event: "action", ev: MouseEvent): void }>();
const mediaSize = computed(
  () => ({ sm: "size-8", md: "size-12", lg: "size-16" })[props.size],
);
const iconSize = computed(
  () => ({ sm: "size-4", md: "size-5", lg: "size-6" })[props.size],
);
</script>

<template>
  <Empty
    :class="[
      STATE_SURFACE_CLASS,
      props.bordered ? 'border' : 'border-0',
      props.class,
    ]"
  >
    <EmptyHeader>
      <EmptyMedia v-if="props.icon" variant="icon" :class="mediaSize"
        ><Icon :icon="props.icon" :class="iconSize"
      /></EmptyMedia>
      <EmptyTitle
        v-if="resolvedTitle"
        class="text-sm font-medium tracking-tight"
        >{{ resolvedTitle }}</EmptyTitle
      >
      <EmptyDescription v-if="props.description">{{
        props.description
      }}</EmptyDescription>
    </EmptyHeader>
    <EmptyContent
      v-if="$slots.actions || $slots.action || props.actionText"
      :class="STATE_CONTENT_CLASS"
    >
      <slot name="actions" />
      <slot name="action" />
      <Button
        v-if="props.actionText"
        type="button"
        @click="emit('action', $event)"
        >{{ props.actionText }}</Button
      >
    </EmptyContent>
  </Empty>
</template>
