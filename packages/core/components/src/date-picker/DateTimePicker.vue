<script setup lang="ts">
import { Input, Button } from "../controls";
import { X } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { cn } from "@healseek/uikit-shadcnui";

import DatePicker from "./DatePicker.vue";

const props = defineProps<{
  modelValue?: Date;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  id?: string;
  name?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean | string;
  class?: string;
}>();
const emit = defineEmits<{ "update:modelValue": [Date | undefined] }>();
const { t, te } = useI18n({ useScope: "global" });
const resolvedPlaceholder = computed(
  () =>
    props.placeholder ??
    (te("common.dateTimePickerPlaceholder")
      ? t("common.dateTimePickerPlaceholder")
      : "选择日期和时间"),
);
const time = ref(props.modelValue ? formatTime(props.modelValue) : "00:00:00");
const timeInvalid = ref(false);

function dayTimestamp(value: Date): number {
  return new Date(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ).getTime();
}

const dateRangeInvalid = computed(() => {
  if (!props.modelValue || !Number.isFinite(props.modelValue.getTime()))
    return false;
  const current = dayTimestamp(props.modelValue);
  const min =
    props.minDate && Number.isFinite(props.minDate.getTime())
      ? dayTimestamp(props.minDate)
      : undefined;
  const max =
    props.maxDate && Number.isFinite(props.maxDate.getTime())
      ? dayTimestamp(props.maxDate)
      : undefined;
  return (
    (min !== undefined && current < min) || (max !== undefined && current > max)
  );
});

watch(
  () => props.modelValue,
  (value) => {
    time.value = value ? formatTime(value) : "00:00:00";
    timeInvalid.value = false;
  },
);
const dateOnly = computed(() =>
  props.modelValue ? new Date(props.modelValue) : undefined,
);
function formatTime(value: Date): string {
  return `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}:${String(value.getSeconds()).padStart(2, "0")}`;
}
function parseTime(value: string): [number, number, number] | undefined {
  const match = /^(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim());
  if (!match) return undefined;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3] ?? 0);
  if (hours > 23 || minutes > 59 || seconds > 59) return undefined;
  return [hours, minutes, seconds];
}
function updateDate(value: Date | undefined): void {
  if (!value) {
    emit("update:modelValue", undefined);
    return;
  }
  const selectedDay = dayTimestamp(value);
  const min =
    props.minDate && Number.isFinite(props.minDate.getTime())
      ? dayTimestamp(props.minDate)
      : undefined;
  const max =
    props.maxDate && Number.isFinite(props.maxDate.getTime())
      ? dayTimestamp(props.maxDate)
      : undefined;
  if (
    (min !== undefined && selectedDay < min) ||
    (max !== undefined && selectedDay > max)
  )
    return;
  const next = new Date(value);
  const [hours, minutes, seconds] = parseTime(time.value) ?? [0, 0, 0];
  next.setHours(hours, minutes, seconds, 0);
  emit("update:modelValue", next);
}
function updateTime(valueOrEvent: string | number | Event): void {
  const value =
    typeof valueOrEvent === "string" || typeof valueOrEvent === "number"
      ? String(valueOrEvent)
      : (valueOrEvent.target as HTMLInputElement).value;
  if (!value) {
    timeInvalid.value = false;
    return;
  }
  const parsed = parseTime(value);
  if (!parsed) {
    timeInvalid.value = true;
    return;
  }
  timeInvalid.value = false;
  const [hours, minutes, seconds] = parsed;
  time.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  if (props.modelValue && !dateRangeInvalid.value)
    updateDate(new Date(props.modelValue));
}
function clear(): void {
  if (props.disabled) return;
  time.value = "00:00:00";
  timeInvalid.value = false;
  emit("update:modelValue", undefined);
}
</script>

<template>
  <div :class="cn('flex items-center gap-2', props.class)">
    <!-- Override DatePicker's standalone width so this row can shrink in forms. -->
    <DatePicker
      :model-value="dateOnly"
      :disabled="props.disabled"
      :placeholder="resolvedPlaceholder"
      :min-date="props.minDate"
      :max-date="props.maxDate"
      :locale="props.locale"
      trigger-icon="chevron"
      :id="props.id"
      :name="props.name"
      :aria-describedby="props.ariaDescribedby"
      :aria-invalid="props.ariaInvalid || dateRangeInvalid || undefined"
      class="w-0 min-w-0 flex-1"
      @update:model-value="updateDate"
    />
    <Input
      type="time"
      step="1"
      :model-value="time"
      aria-label="时间"
      :aria-describedby="props.ariaDescribedby"
      :aria-invalid="
        timeInvalid || dateRangeInvalid || props.ariaInvalid || undefined
      "
      :disabled="props.disabled || !props.modelValue || dateRangeInvalid"
      :class="
        cn(
          'w-32 shrink-0 appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none',
          (timeInvalid || dateRangeInvalid) &&
            'border-destructive focus-visible:ring-destructive/20',
        )
      "
      @update:model-value="updateTime"
    />
    <Button
      v-if="props.modelValue"
      type="button"
      variant="outline"
      size="icon"
      class="shrink-0 focus-visible:ring-inset"
      aria-label="清除日期时间"
      :disabled="props.disabled"
      @click="clear"
    >
      <X />
    </Button>
  </div>
</template>
