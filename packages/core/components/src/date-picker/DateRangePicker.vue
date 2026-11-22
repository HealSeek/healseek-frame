<script setup lang="ts">
import { computed, ref, shallowRef, useId, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMediaQuery } from "@vueuse/core";
import { CalendarDays } from "@lucide/vue";
import {
  fromDate,
  getLocalTimeZone,
  toCalendarDate,
} from "@internationalized/date";
import type { DateRange, DateValue } from "reka-ui";
import { toDate } from "reka-ui/date";
import { useOverlayOwner } from "@healseek/shared/overlay";
import { cn } from "@healseek/uikit-shadcnui";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@healseek/uikit-shadcnui/components/ui/popover";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@healseek/uikit-shadcnui/components/ui/field";
import { Button, Input } from "../controls";
import RangeCalendar from "./RangeCalendar.vue";
import {
  cloneDateRange,
  formatRangeDate,
  formatRangeTime,
  isValidDate,
  validateDateRange,
  withRangeTime,
  type DateRangePickerProps,
  type DateRangePreset,
  type DateRangeValue,
} from "./date-range";

defineOptions({ name: "DateRangePicker", inheritAttrs: false });
const props = withDefaults(defineProps<DateRangePickerProps>(), {
  showTime: false,
  clearable: true,
  numberOfMonths: 2,
});
const emit = defineEmits<{
  "update:modelValue": [DateRangeValue | undefined];
}>();
const { t, te, locale } = useI18n({ useScope: "global" });
const fallback = {
  placeholder: "选择日期范围",
  timePlaceholder: "选择日期时间范围",
  start: "开始时间",
  end: "结束时间",
  clear: "清除",
  cancel: "取消",
  confirm: "确定",
  separator: "至",
  incomplete: "请选择开始和结束日期",
  invalidTime: "请输入有效的时间",
  reversed: "结束时间不能早于开始时间",
  beforeMin: "开始时间早于允许范围",
  afterMax: "结束时间晚于允许范围",
};
type TextKey = keyof typeof fallback;
const text = (key: TextKey) =>
  te(`dateRange.${key}`) ? t(`dateRange.${key}`) : fallback[key];
const placeholderLabel = computed(
  () =>
    props.placeholder ??
    text(props.showTime ? "timePlaceholder" : "placeholder"),
);
const calendarLocale = computed(() => {
  const raw = (props.locale ?? locale.value).replaceAll("_", "-");
  const aliases: Record<string, string> = {
    cn: "zh-CN",
    zh: "zh-CN",
    zhcn: "zh-CN",
    zhtw: "zh-TW",
    en: "en-US",
  };
  try {
    return (
      Intl.getCanonicalLocales(aliases[raw.toLowerCase()] ?? raw)[0] ?? "en-US"
    );
  } catch {
    return "en-US";
  }
});
const wide = useMediaQuery("(min-width: 640px)");
const months = computed(() => (wide.value ? props.numberOfMonths : 1));
const owner = useOverlayOwner();
const open = ref(false);
const calendarKey = ref(0);
const calendar = shallowRef<DateRange>({ start: undefined, end: undefined });
const calendarPlaceholder = shallowRef<DateValue>();
const startTime = ref("00:00:00");
const endTime = ref("00:00:00");
const localId = useId();
const popupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);
const toDay = (value: Date | undefined): DateValue | undefined =>
  isValidDate(value)
    ? toCalendarDate(fromDate(value, getLocalTimeZone()))
    : undefined;
const minValue = computed(() => toDay(props.minDate));
const maxValue = computed(() => toDay(props.maxDate));
const selected = computed(() => cloneDateRange(props.modelValue));
const label = computed(() =>
  selected.value
    ? selected.value
        .map(
          (date) =>
            `${formatRangeDate(date)}${props.showTime ? ` ${formatRangeTime(date)}` : ""}`,
        )
        .join(` ${text("separator")} `)
    : placeholderLabel.value,
);

function resetDraft(value = props.modelValue): void {
  const range = cloneDateRange(value);
  calendar.value = { start: toDay(range?.[0]), end: toDay(range?.[1]) };
  calendarPlaceholder.value =
    calendar.value.start ?? minValue.value ?? maxValue.value;
  // Keep the final allowed month visible instead of opening a wholly disabled future panel.
  if (maxValue.value && months.value > 1) {
    const first = calendarPlaceholder.value ?? toDay(new Date())!;
    if (
      first
        .set({ day: 1 })
        .add({ months: months.value - 1 })
        .compare(maxValue.value.set({ day: 1 })) > 0
    ) {
      calendarPlaceholder.value = maxValue.value.subtract({
        months: months.value - 1,
      });
    }
  }
  startTime.value = range ? formatRangeTime(range[0]) : "00:00:00";
  endTime.value = range ? formatRangeTime(range[1]) : "00:00:00";
  calendarKey.value++;
}

// The public value is atomic. Half-selected dates and edited times stay in this popup.
const draft = computed<DateRangeValue | undefined>(() => {
  if (!calendar.value.start || !calendar.value.end) return undefined;
  const start = toDate(calendar.value.start, getLocalTimeZone());
  const end = toDate(calendar.value.end, getLocalTimeZone());
  if (!props.showTime) return [start, end];
  const from = withRangeTime(start, startTime.value);
  const to = withRangeTime(end, endTime.value);
  return from && to ? [from, to] : undefined;
});
const error = computed(() => {
  if (!calendar.value.start || !calendar.value.end) return "incomplete";
  if (!draft.value) return "invalidTime";
  return validateDateRange(draft.value, props);
});
const errorMessage = computed(() => (error.value ? text(error.value) : ""));

function updateOpen(value: boolean): void {
  if (value && (props.disabled || owner?.active.value === false)) return;
  if (value) resetDraft();
  open.value = value;
}
watch(
  () => [props.modelValue, props.showTime],
  () => resetDraft(),
  { deep: true },
);
watch(
  () => [props.disabled, owner?.active.value],
  () => {
    if (props.disabled || owner?.active.value === false) open.value = false;
  },
  { flush: "sync" },
);
function confirm(): void {
  if (props.disabled || error.value || !draft.value) return;
  emit("update:modelValue", cloneDateRange(draft.value));
  open.value = false;
}
function clear(): void {
  if (props.disabled || !props.clearable) return;
  emit("update:modelValue", undefined);
  open.value = false;
}
function selectPreset(preset: DateRangePreset): void {
  if (props.disabled) return;
  const value =
    typeof preset.value === "function" ? preset.value() : preset.value;
  resetDraft(value);
}
function onCloseAutoFocus(event: Event): void {
  if (owner?.active.value === false) event.preventDefault();
}
</script>

<template>
  <Popover :open="open" @update:open="updateOpen">
    <PopoverTrigger as-child>
      <Button
        v-bind="$attrs"
        :id="props.id"
        :name="props.name"
        type="button"
        variant="outline"
        :disabled="props.disabled"
        :aria-describedby="props.ariaDescribedby"
        :aria-invalid="props.ariaInvalid"
        :aria-label="label"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :data-empty="!selected"
        data-date-range-trigger
        :class="
          cn(
            'min-w-0 justify-start gap-2 text-start font-normal focus-visible:ring-inset aria-invalid:ring-inset',
            !selected && 'text-muted-foreground',
            props.class,
          )
        "
      >
        <CalendarDays class="size-4 shrink-0 opacity-60" />
        <span class="truncate">{{ label }}</span>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      class="max-h-[var(--reka-popover-content-available-height)] w-auto max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden p-0"
      :collision-padding="12"
      :style="popupStyle"
      :aria-label="placeholderLabel"
      @close-auto-focus="onCloseAutoFocus"
    >
      <div
        v-if="props.presets?.length"
        class="flex max-w-[552px] shrink-0 flex-wrap gap-1 border-b p-2"
        data-date-range-presets
      >
        <Button
          v-for="preset in props.presets"
          :key="preset.label"
          type="button"
          variant="ghost"
          size="sm"
          :disabled="props.disabled"
          @click="selectPreset(preset)"
          >{{ preset.label }}</Button
        >
      </div>
      <RangeCalendar
        :key="calendarKey"
        v-model="calendar"
        :placeholder="calendarPlaceholder"
        :min-value="minValue"
        :max-value="maxValue"
        :number-of-months="months"
        :locale="calendarLocale"
        :disabled="props.disabled"
      />
      <FieldGroup
        v-if="props.showTime"
        class="grid shrink-0 grid-cols-2 gap-3 border-t p-3"
      >
        <Field class="gap-1.5">
          <FieldLabel
            :for="`${localId}-start`"
            class="text-xs font-normal text-muted-foreground"
            >{{ text("start") }}</FieldLabel
          >
          <span class="text-xs tabular-nums">{{
            calendar.start ? calendar.start.toString() : "—"
          }}</span>
          <Input
            :id="`${localId}-start`"
            :model-value="startTime"
            type="time"
            step="1"
            :disabled="props.disabled || !calendar.start"
            :aria-invalid="error && error !== 'incomplete' ? true : undefined"
            :aria-describedby="`${localId}-error`"
            @update:model-value="startTime = String($event)"
          />
        </Field>
        <Field class="gap-1.5">
          <FieldLabel
            :for="`${localId}-end`"
            class="text-xs font-normal text-muted-foreground"
            >{{ text("end") }}</FieldLabel
          >
          <span class="text-xs tabular-nums">{{
            calendar.end ? calendar.end.toString() : "—"
          }}</span>
          <Input
            :id="`${localId}-end`"
            :model-value="endTime"
            type="time"
            step="1"
            :disabled="props.disabled || !calendar.end"
            :aria-invalid="error && error !== 'incomplete' ? true : undefined"
            :aria-describedby="`${localId}-error`"
            @update:model-value="endTime = String($event)"
          />
        </Field>
      </FieldGroup>
      <div
        :id="`${localId}-error`"
        aria-live="polite"
        class="shrink-0 px-3 pb-2 text-xs"
        :class="
          error && error !== 'incomplete'
            ? 'text-destructive'
            : 'text-muted-foreground'
        "
      >
        {{ errorMessage }}
      </div>
      <div class="flex shrink-0 items-center justify-end gap-2 border-t p-3">
        <Button
          v-if="props.clearable"
          type="button"
          variant="ghost"
          size="sm"
          class="mr-auto"
          :disabled="props.disabled || !selected"
          @click="clear"
          >{{ text("clear") }}</Button
        >
        <Button
          type="button"
          variant="outline"
          size="sm"
          @click="open = false"
          >{{ text("cancel") }}</Button
        >
        <Button
          type="button"
          size="sm"
          :disabled="props.disabled || !!error"
          @click="confirm"
          >{{ text("confirm") }}</Button
        >
      </div>
    </PopoverContent>
  </Popover>
</template>
