<script setup lang="ts">
import { Button } from "../controls";
import type { DateValue } from "reka-ui";
import { CalendarDays, ChevronDown } from "@lucide/vue";
import {
  fromDate,
  getLocalTimeZone,
  toCalendarDate,
} from "@internationalized/date";
import { computed, getCurrentInstance, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useOverlayOwner } from "@healseek/shared/overlay";
import { cn } from "@healseek/uikit-shadcnui";

import { Calendar } from "@healseek/uikit-shadcnui/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@healseek/uikit-shadcnui/components/ui/popover";
import { toDate } from "reka-ui/date";

const props = defineProps<{
  modelValue?: Date;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
  maxDate?: Date;
  locale?: string;
  triggerIcon?: "calendar" | "chevron";
  id?: string;
  name?: string;
  ariaDescribedby?: string;
  ariaInvalid?: boolean | string;
  class?: string;
}>();

const { t, te } = useI18n({ useScope: "global" });
const resolvedPlaceholder = computed(
  () =>
    props.placeholder ??
    (te("common.datePickerPlaceholder")
      ? t("common.datePickerPlaceholder")
      : "选择日期"),
);

type GlobalI18n = { locale?: string | { value?: string } };
const globalI18n = getCurrentInstance()?.appContext.config.globalProperties
  .$i18n as GlobalI18n | undefined;
const activeLocale = computed(() => {
  const locale = globalI18n?.locale;
  return typeof locale === "string" ? locale : locale?.value;
});

/**
 * new-api keeps a small, predictable locale table for its day-picker. Reka's
 * formatter accepts BCP-47 strings, so we preserve valid caller locales while
 * normalising the aliases commonly emitted by app i18n modules.
 */
const localeAliases: Record<string, string> = {
  cn: "zh-CN",
  en: "en-US",
  "en-us": "en-US",
  zh: "zh-CN",
  "zh-cn": "zh-CN",
  zhcn: "zh-CN",
  "zh-tw": "zh-TW",
  zhtw: "zh-TW",
};

function resolveCalendarLocale(value: string | undefined): string {
  const normalized = value?.trim().replaceAll("_", "-");
  if (!normalized) return "en-US";

  const alias = localeAliases[normalized.toLowerCase()];
  if (alias) return alias;

  try {
    return Intl.DateTimeFormat.supportedLocalesOf(normalized).length > 0
      ? normalized
      : "en-US";
  } catch {
    return "en-US";
  }
}

const resolvedLocale = computed(() =>
  resolveCalendarLocale(props.locale ?? activeLocale.value),
);

const emit = defineEmits<{ "update:modelValue": [Date | undefined] }>();
const owner = useOverlayOwner();
const open = ref(false);
const popupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);

// Body portals inherit their Vue host's reserved layer, not its DOM stacking.
// Closing or covering that host must dismiss its calendar without refocusing it.
watch(
  () => owner?.active.value,
  (active) => {
    if (active === false) open.value = false;
  },
  { flush: "sync" },
);

function updateOpen(value: boolean): void {
  open.value = value && owner?.active.value !== false;
}

function onCloseAutoFocus(event: Event): void {
  if (owner?.active.value === false) event.preventDefault();
}

const selected = ref<DateValue | undefined>(
  props.modelValue
    ? (toCalendarDate(
        fromDate(props.modelValue, getLocalTimeZone()),
      ) as DateValue)
    : undefined,
);
const defaultMinDate = new Date(1900, 0, 1);
const defaultMaxDate = new Date();
const minValue = computed(
  () =>
    toCalendarDate(
      fromDate(props.minDate ?? defaultMinDate, getLocalTimeZone()),
    ) as DateValue,
);
const maxValue = computed(
  () =>
    toCalendarDate(
      fromDate(props.maxDate ?? defaultMaxDate, getLocalTimeZone()),
    ) as DateValue,
);

watch(
  () => props.modelValue,
  (value) => {
    selected.value = value
      ? (toCalendarDate(fromDate(value, getLocalTimeZone())) as DateValue)
      : undefined;
  },
);

const label = computed(() => {
  if (!props.modelValue) return resolvedPlaceholder.value;
  const year = props.modelValue.getFullYear();
  const month = String(props.modelValue.getMonth() + 1).padStart(2, "0");
  const day = String(props.modelValue.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
});

function selectDate(value: DateValue | undefined): void {
  selected.value = value;
  emit(
    "update:modelValue",
    value ? toDate(value, getLocalTimeZone()) : undefined,
  );
  if (value) open.value = false;
}
</script>

<template>
  <Popover :open="open" @update:open="updateOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        :disabled="props.disabled"
        :data-empty="!props.modelValue"
        :id="props.id"
        :name="props.name"
        :aria-describedby="props.ariaDescribedby"
        :aria-invalid="props.ariaInvalid"
        aria-haspopup="dialog"
        :aria-expanded="open"
        :data-state="open ? 'open' : 'closed'"
        :class="
          cn(
            'w-[240px] justify-start text-start font-normal focus-visible:ring-inset aria-invalid:ring-inset',
            !props.modelValue && 'text-muted-foreground',
            props.class,
          )
        "
        :aria-label="label"
      >
        <span class="truncate">{{ label }}</span>
        <CalendarDays
          v-if="props.triggerIcon !== 'chevron'"
          data-date-picker-trigger-icon="calendar"
          data-icon="inline-end"
          class="ml-auto size-4 opacity-50"
        />
        <ChevronDown
          v-else
          data-date-picker-trigger-icon="chevron"
          data-icon="inline-end"
          class="ml-auto size-4 opacity-60"
        />
      </Button>
    </PopoverTrigger>
    <PopoverContent
      class="w-auto p-0"
      align="start"
      :style="popupStyle"
      @close-auto-focus="onCloseAutoFocus"
    >
      <Calendar
        layout="month-and-year"
        :show-outside-days="true"
        :locale="resolvedLocale"
        :min-value="minValue"
        :max-value="maxValue"
        :model-value="selected as never"
        @update:model-value="selectDate"
      />
    </PopoverContent>
  </Popover>
</template>
