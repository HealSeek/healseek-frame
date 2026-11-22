<script setup lang="ts">
import { Button } from "../controls";
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";

import { RESULT_PRESET, type ResultStatus } from "./types";

const props = withDefaults(
  defineProps<{
    status: ResultStatus;
    title?: string;
    description?: string;
    primaryText?: string;
    secondaryText?: string;
    class?: string;
  }>(),
  {},
);

const { t, te } = useI18n({ useScope: "global" });
function resultCopy(
  part: "title" | "description" | "secondaryText",
  fallback: string,
): string {
  const key = `common.result.${props.status}.${part}`;
  return te(key) ? t(key) : fallback;
}

defineEmits<{
  (e: "primary", ev: MouseEvent): void;
  (e: "secondary", ev: MouseEvent): void;
}>();

const preset = computed(() => RESULT_PRESET[props.status]);
const finalTitle = computed(
  () => props.title ?? resultCopy("title", preset.value.title),
);
const finalDescription = computed(
  () =>
    props.description ?? resultCopy("description", preset.value.description),
);
const finalSecondaryText = computed(
  () =>
    props.secondaryText ??
    (preset.value.secondaryText
      ? resultCopy("secondaryText", preset.value.secondaryText)
      : undefined),
);
const hasSecondary = computed(() => !!finalSecondaryText.value);
</script>

<template>
  <div
    :class="[
      'flex min-h-64 flex-col items-center justify-center gap-5 bg-card px-4 py-10 text-center text-card-foreground sm:min-h-80',
      props.class,
    ]"
  >
    <div
      class="flex size-16 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground ring-1 ring-foreground/10"
    >
      <Icon :icon="preset.icon" class="size-8" />
    </div>
    <div class="space-y-2">
      <h1 class="text-lg font-semibold">{{ finalTitle }}</h1>
      <p v-if="finalDescription" class="max-w-md text-sm text-muted-foreground">
        {{ finalDescription }}
      </p>
    </div>
    <slot name="extra" />
    <div class="flex flex-wrap items-center justify-center gap-3">
      <Button v-if="primaryText" @click="$emit('primary', $event)">
        {{ primaryText }}
      </Button>
      <Button
        v-if="hasSecondary"
        variant="outline"
        @click="$emit('secondary', $event)"
      >
        {{ finalSecondaryText }}
      </Button>
    </div>
  </div>
</template>
