<script setup lang="ts">
import { Button } from "../controls";
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";
import {
  ChartContainer,
  ChartLegend,
  ChartTooltip,
  Skeleton,
} from "@healseek/uikit-shadcnui";
import type { ChartConfig } from "@healseek/uikit-shadcnui";
import type {
  ChartLegendItem,
  ChartTooltipItem,
  FrameworkChartConfig,
  FrameworkChartData,
  FrameworkChartOptions,
  FrameworkChartType,
} from "./types";

defineOptions({ name: "ChartCard" });

const props = withDefaults(
  defineProps<{
    title: string;
    id?: string;
    description?: string;
    type?: FrameworkChartType;
    data?: FrameworkChartData;
    options?: FrameworkChartOptions;
    height?: number | string;
    loading?: boolean;
    error?: unknown;
    empty?: boolean;
    errorText?: string;
    emptyText?: string;
    legend?: ChartLegendItem[];
    config?: FrameworkChartConfig;
    tooltipLabel?: string;
    tooltipItems?: ChartTooltipItem[];
    class?: string;
  }>(),
  {
    type: "line",
    height: 280,
    loading: false,
    empty: false,
  },
);

const emit = defineEmits<{ (event: "retry"): void }>();
const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const resolvedErrorText = computed(
  () => props.errorText ?? copy("common.chartError", "图表加载失败"),
);
const resolvedEmptyText = computed(
  () => props.emptyText ?? copy("common.chartEmpty", "暂无图表数据"),
);
const resolvedLoadingLabel = computed(() =>
  copy("common.chartLoading", "正在加载图表"),
);
const resolvedRetryText = computed(() => copy("common.retry", "重试"));
const hoveredLabel = ref<string>();
const hoveredItems = ref<ChartTooltipItem[]>([]);
function clearHoveredTooltip(): void {
  hoveredLabel.value = undefined;
  hoveredItems.value = [];
}
function externalTooltip(context: { tooltip?: any }): void {
  const tooltip = context.tooltip;
  if (!tooltip || tooltip.opacity === 0) {
    clearHoveredTooltip();
    return;
  }
  hoveredLabel.value =
    tooltip.title?.[0] ?? tooltip.dataPoints?.[0]?.label?.toString();
  hoveredItems.value = (tooltip.dataPoints ?? []).map((point: any) => ({
    color:
      typeof point.dataset?.borderColor === "string"
        ? point.dataset.borderColor
        : typeof point.dataset?.backgroundColor === "string"
          ? point.dataset.backgroundColor
          : "#888",
    name:
      point.dataset?.label ?? point.dataset?.data?.label ?? point.label ?? "",
    value: point.formattedValue ?? point.raw ?? "",
  }));
}
const chartOptions = computed(() => {
  const options = props.options ?? {};
  const plugins = (options as any).plugins ?? {};
  return {
    ...options,
    plugins: {
      ...plugins,
      tooltip: {
        ...(plugins.tooltip ?? {}),
        enabled: false,
        external: externalTooltip,
      },
    },
  } as FrameworkChartOptions;
});
const tooltipLabel = computed(() => hoveredLabel.value ?? props.tooltipLabel);
const tooltipItems = computed(() =>
  hoveredItems.value.length ? hoveredItems.value : props.tooltipItems ?? [],
);
const hasChartData = computed(() =>
  Boolean(
    props.data?.datasets?.some(
      (dataset) =>
        Array.isArray(dataset.data) &&
        dataset.data.some(
          (value) => typeof value === "number" && Number.isFinite(value),
        ),
    ),
  ),
);
const isEmpty = computed(() => props.empty || !hasChartData.value);
// ui-kit retains its upstream number[] declaration. Its Chart.js renderer passes null through.
const chartData = computed(
  () => (props.data ?? { datasets: [] }) as ChartConfig["data"],
);
const resolvedLegend = computed<ChartLegendItem[]>(
  () =>
    props.legend ??
    (props.data?.datasets ?? []).map((dataset, index) => {
      const key = String((dataset as any).key ?? dataset.label ?? index);
      const item =
        props.config?.[key] ?? props.config?.[String(dataset.label ?? "")];
      return {
        label: item?.label ?? dataset.label ?? key,
        color: item?.color ?? `var(--color-chart-${(index % 5) + 1})`,
      };
    }),
);
</script>

<template>
  <section
    :class="[
      'min-w-0 overflow-hidden rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5',
      props.class,
    ]"
    :aria-busy="loading"
  >
    <header class="flex min-w-0 items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate text-sm font-semibold text-card-foreground">
          {{ title }}
        </h3>
        <p v-if="description" class="mt-1 text-xs text-muted-foreground">
          {{ description }}
        </p>
      </div>
      <slot name="actions" />
    </header>

    <div
      v-if="loading"
      role="status"
      aria-live="polite"
      :aria-label="resolvedLoadingLabel"
      class="mt-4 space-y-3"
    >
      <Skeleton class="h-56 w-full" />
    </div>
    <div
      v-else-if="error"
      role="alert"
      class="mt-4 flex min-h-56 flex-col items-center justify-center gap-3 rounded-lg border border-dashed text-center"
    >
      <Icon icon="lucide:triangle-alert" class="size-7 text-destructive" />
      <p class="text-sm text-destructive">{{ resolvedErrorText }}</p>
      <Button
        type="button"
        size="sm"
        variant="outline"
        @click="emit('retry')"
        >{{ resolvedRetryText }}</Button
      >
    </div>
    <div
      v-else-if="isEmpty"
      role="status"
      aria-live="polite"
      class="mt-4 flex min-h-56 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center"
    >
      <Icon
        icon="lucide:chart-no-axes-combined"
        class="size-7 text-muted-foreground"
      />
      <p class="text-sm text-muted-foreground">{{ resolvedEmptyText }}</p>
    </div>
    <template v-else>
      <ChartContainer
        class="mt-4"
        :id="props.id"
        :type="type"
        :data="chartData"
        :config="config"
        :options="chartOptions"
        :height="height"
        :aria-label="title"
        role="img"
      />
      <ChartLegend
        v-if="resolvedLegend.length"
        class="mt-3"
        :items="resolvedLegend"
      />
      <slot
        v-if="$slots.tooltip"
        name="tooltip"
        :label="tooltipLabel"
        :items="tooltipItems"
      />
      <ChartTooltip
        v-else-if="tooltipLabel || tooltipItems.length"
        class="mt-3 border-border/50 bg-background shadow-xl"
        :label="tooltipLabel"
        :payload="tooltipItems"
      />
    </template>
    <slot name="footer" />
  </section>
</template>
