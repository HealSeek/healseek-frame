<script setup lang="ts">
import { Button, Input } from "../controls";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useSlots,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";

import FacetedFilter from "../faceted-filter/FacetedFilter.vue";
import type {
  DataTableColumn,
  DataTableColumnVisibility,
  DataTableFilterGroup,
  DataTableFilterValue,
} from "./types";
import DataTableViewOptions from "./DataTableViewOptions.vue";
import DataTableMobileFilterPanel from "./DataTableMobileFilterPanel.vue";
import { NEW_API_INPUT_CLASS } from "./new-api-compat";

defineOptions({ name: "DataTableToolbar" });

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    searchPlaceholder?: string;
    searchDebounceMs?: number;
    /** Hide text search when a remote list supports only faceted filters. */
    showSearch?: boolean;
    filters?: DataTableFilterGroup[];
    filterValues?: Record<string, DataTableFilterValue>;
    loading?: boolean;
    columns?: DataTableColumn[];
    columnVisibility?: DataTableColumnVisibility;
    columnVisibilityStorageKey?: string;
    showReset?: boolean;
    showRefresh?: boolean;
    collapsibleOnMobile?: boolean;
    hasAdditionalFilters?: boolean;
    onSearch?: () => void | Promise<void>;
    searchLoading?: boolean;
    hideViewOptions?: boolean;
    hasExpandedActiveFilters?: boolean;
    class?: string;
  }>(),
  {
    // Match new-api's default filter-as-you-type behavior.  Query pages that
    // fetch remote data may opt into a debounce explicitly.
    modelValue: "",
    searchDebounceMs: 0,
    showSearch: true,
    filters: () => [],
    filterValues: () => ({}),
    loading: false,
    showReset: true,
    showRefresh: false,
    collapsibleOnMobile: false,
    hasAdditionalFilters: false,
    searchLoading: false,
    hideViewOptions: false,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (
    event: "update:filterValues",
    value: Record<string, DataTableFilterValue>,
  ): void;
  (event: "reset"): void;
  (event: "refresh"): void;
  (event: "update:columnVisibility", value: DataTableColumnVisibility): void;
}>();

const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const resolvedSearchPlaceholder = computed(
  () => props.searchPlaceholder ?? copy("common.search", "搜索…"),
);
const resetText = computed(() => copy("common.reset", "重置"));
const refreshText = computed(() => copy("common.refresh", "刷新"));
const searchText = computed(() => copy("common.searchAction", "搜索"));
const expandText = computed(() => copy("common.expand", "展开"));
const collapseText = computed(() => copy("common.collapse", "收起"));

const slots = useSlots();
const draft = ref(props.modelValue);
const expanded = ref(false);
const composing = ref(false);
const isMobileViewport = ref(false);
let mediaQuery: MediaQueryList | undefined;
let timer: ReturnType<typeof setTimeout> | undefined;

function updateViewport(): void {
  isMobileViewport.value = mediaQuery?.matches ?? false;
}
onMounted(() => {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return;
  mediaQuery = window.matchMedia("(max-width: 640px)");
  updateViewport();
  mediaQuery.addEventListener?.("change", updateViewport);
});
onBeforeUnmount(() =>
  mediaQuery?.removeEventListener?.("change", updateViewport),
);

watch(
  () => props.modelValue,
  (value) => {
    if (!composing.value) draft.value = value;
  },
);
watch(draft, (value) => {
  if (timer) clearTimeout(timer);
  if (composing.value || props.onSearch) return;
  if (props.searchDebounceMs <= 0) {
    emit("update:modelValue", value);
    return;
  }
  timer = setTimeout(
    () => emit("update:modelValue", value),
    Math.max(0, props.searchDebounceMs),
  );
});
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

const isFiltered = computed(() =>
  Boolean(
    draft.value ||
      props.hasAdditionalFilters ||
      Object.values(props.filterValues).some((value) =>
        Array.isArray(value) ? value.length > 0 : Boolean(value),
      ),
  ),
);
const hasExpandable = computed(() => Boolean(slots.expandable));

function updateFilter(key: string, value: DataTableFilterValue): void {
  emit("update:filterValues", { ...props.filterValues, [key]: value });
}
function reset(): void {
  draft.value = "";
  emit("update:modelValue", "");
  emit("update:filterValues", {});
  emit("reset");
}
function commitSearch(): void {
  if (!composing.value) {
    emit("update:modelValue", draft.value);
    void props.onSearch?.();
  }
}
function startComposition(): void {
  composing.value = true;
}
function endComposition(): void {
  composing.value = false;
  if (!props.onSearch) emit("update:modelValue", draft.value);
}
</script>

<template>
  <DataTableMobileFilterPanel
    v-if="props.collapsibleOnMobile && isMobileViewport"
    :class="props.class"
    compact
  >
    <template #default>
      <slot v-if="props.showSearch" name="custom-search">
        <div class="min-w-0 flex-1 sm:max-w-xs">
          <Input
            v-model="draft"
            :placeholder="resolvedSearchPlaceholder"
            :class="[NEW_API_INPUT_CLASS, 'w-full sm:w-[200px] lg:w-[240px]']"
            @compositionstart="startComposition"
            @compositionend="endComposition"
          />
        </div>
      </slot>
      <slot name="additional-search" />
      <FacetedFilter
        v-for="filter in props.filters"
        :key="filter.key"
        :model-value="props.filterValues[filter.key]"
        :title="filter.title"
        :options="filter.options"
        :single-select="filter.singleSelect"
        @update:model-value="(value) => updateFilter(filter.key, value)"
      />
      <template v-if="hasExpandable">
        <slot v-if="expanded" name="expandable" />
        <Button
          type="button"
          variant="ghost"
          :aria-expanded="expanded"
          :class="[
            'rounded-lg gap-1 px-2 text-muted-foreground hover:text-foreground',
            props.hasExpandedActiveFilters &&
              !expanded &&
              'text-primary hover:text-primary',
          ]"
          @click="expanded = !expanded"
          >{{ expanded ? collapseText : expandText
          }}<Icon
            icon="lucide:chevron-down"
            :class="[
              'size-3.5 transition-transform duration-200',
              expanded && 'rotate-180',
            ]"
        /></Button>
      </template>
    </template>
    <template #actions>
      <slot name="left-actions" /><slot name="pre-actions" />
      <Button
        v-if="props.showReset && (props.onSearch || isFiltered)"
        type="button"
        :variant="props.onSearch ? 'outline' : 'ghost'"
        :disabled="props.onSearch ? !isFiltered : false"
        :class="
          props.onSearch
            ? ''
            : 'gap-1 px-2 text-muted-foreground hover:text-foreground'
        "
        @click="reset"
        >{{ resetText
        }}<Icon v-if="!props.onSearch" icon="lucide:x" class="size-4"
      /></Button>
      <Button
        v-if="props.onSearch"
        type="button"
        :disabled="props.searchLoading"
        @click="commitSearch"
        ><Icon
          v-if="props.searchLoading"
          icon="lucide:loader-circle"
          class="size-4 animate-spin"
        />{{ searchText }}</Button
      >
      <slot name="view-toggle" />
      <DataTableViewOptions
        v-if="props.columns?.length && !props.hideViewOptions"
        :columns="props.columns"
        :model-value="props.columnVisibility"
        :storage-key="props.columnVisibilityStorageKey"
        @update:model-value="(value) => emit('update:columnVisibility', value)"
      />
      <Button
        v-if="props.showRefresh"
        type="button"
        variant="ghost"
        size="icon"
        :class="'size-8 text-muted-foreground'"
        :disabled="props.loading"
        :aria-label="refreshText"
        @click="emit('refresh')"
        ><Icon
          icon="lucide:refresh-cw"
          :class="['size-4', props.loading && 'animate-spin']" /></Button
      ><slot name="actions" />
    </template>
  </DataTableMobileFilterPanel>

  <div v-else :class="['flex min-w-0 flex-col gap-2', props.class]">
    <template v-if="$slots['left-actions']">
      <div class="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <slot v-if="props.showSearch" name="custom-search">
          <div class="min-w-0">
            <Input
              v-model="draft"
              :placeholder="resolvedSearchPlaceholder"
              :class="[NEW_API_INPUT_CLASS, 'w-full sm:w-[200px] lg:w-[240px]']"
              @compositionstart="startComposition"
              @compositionend="endComposition"
            />
          </div>
        </slot>
        <slot name="additional-search" />
        <FacetedFilter
          v-for="filter in props.filters"
          :key="filter.key"
          :model-value="props.filterValues[filter.key]"
          :title="filter.title"
          :options="filter.options"
          :single-select="filter.singleSelect"
          @update:model-value="(value) => updateFilter(filter.key, value)"
        />
        <div class="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button
            v-if="hasExpandable"
            type="button"
            variant="ghost"
            :aria-expanded="expanded"
            :class="[
              'rounded-lg gap-1 px-2 text-muted-foreground hover:text-foreground',
              props.hasExpandedActiveFilters &&
                !expanded &&
                'text-primary hover:text-primary',
            ]"
            @click="expanded = !expanded"
            >{{ expanded ? collapseText : expandText
            }}<Icon
              icon="lucide:chevron-down"
              :class="[
                'size-3.5 transition-transform duration-200',
                expanded && 'rotate-180',
              ]"
          /></Button>
        </div>
      </div>
      <div
        v-if="expanded && hasExpandable"
        class="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3"
      >
        <slot name="expandable" />
      </div>
      <div class="flex flex-wrap items-center gap-2 sm:gap-3">
        <slot name="left-actions" />
        <div class="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <slot name="pre-actions" />
          <Button
            v-if="props.showReset && (props.onSearch || isFiltered)"
            type="button"
            :variant="props.onSearch ? 'outline' : 'ghost'"
            :disabled="props.onSearch ? !isFiltered : false"
            :class="
              props.onSearch
                ? ''
                : 'gap-1 px-2 text-muted-foreground hover:text-foreground'
            "
            @click="reset"
            >{{ resetText
            }}<Icon v-if="!props.onSearch" icon="lucide:x" class="size-4"
          /></Button>
          <Button
            v-if="props.onSearch"
            type="button"
            :disabled="props.searchLoading"
            @click="commitSearch"
            ><Icon
              v-if="props.searchLoading"
              icon="lucide:loader-circle"
              class="size-4 animate-spin"
            />{{ searchText }}</Button
          >
          <slot name="view-toggle" />
          <DataTableViewOptions
            v-if="props.columns?.length && !props.hideViewOptions"
            :columns="props.columns"
            :model-value="props.columnVisibility"
            :storage-key="props.columnVisibilityStorageKey"
            @update:model-value="
              (value) => emit('update:columnVisibility', value)
            "
          />
          <Button
            v-if="props.showRefresh"
            type="button"
            variant="ghost"
            size="icon"
            :class="'size-8 text-muted-foreground'"
            :disabled="props.loading"
            :aria-label="refreshText"
            @click="emit('refresh')"
            ><Icon
              icon="lucide:refresh-cw"
              :class="['size-4', props.loading && 'animate-spin']" /></Button
          ><slot name="actions" />
        </div>
      </div>
    </template>
    <template v-else>
      <div class="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
        <slot v-if="props.showSearch" name="custom-search">
          <div class="min-w-0">
            <Input
              v-model="draft"
              :placeholder="resolvedSearchPlaceholder"
              :class="[NEW_API_INPUT_CLASS, 'w-full sm:w-[200px] lg:w-[240px]']"
              @compositionstart="startComposition"
              @compositionend="endComposition"
            />
          </div>
        </slot>
        <slot name="additional-search" />
        <FacetedFilter
          v-for="filter in props.filters"
          :key="filter.key"
          :model-value="props.filterValues[filter.key]"
          :title="filter.title"
          :options="filter.options"
          :single-select="filter.singleSelect"
          @update:model-value="(value) => updateFilter(filter.key, value)"
        />
        <template v-if="expanded && hasExpandable"
          ><slot name="expandable"
        /></template>
        <div class="ms-auto flex shrink-0 items-center gap-1.5 sm:gap-2">
          <slot name="pre-actions" />
          <Button
            v-if="props.showReset && (props.onSearch || isFiltered)"
            type="button"
            :variant="props.onSearch ? 'outline' : 'ghost'"
            :disabled="props.onSearch ? !isFiltered : false"
            :class="
              props.onSearch
                ? ''
                : 'gap-1 px-2 text-muted-foreground hover:text-foreground'
            "
            @click="reset"
            >{{ resetText
            }}<Icon v-if="!props.onSearch" icon="lucide:x" class="size-4"
          /></Button>
          <Button
            v-if="props.onSearch"
            type="button"
            :disabled="props.searchLoading"
            @click="commitSearch"
            ><Icon
              v-if="props.searchLoading"
              icon="lucide:loader-circle"
              class="size-4 animate-spin"
            />{{ searchText }}</Button
          >
          <slot name="view-toggle" />
          <DataTableViewOptions
            v-if="props.columns?.length && !props.hideViewOptions"
            :columns="props.columns"
            :model-value="props.columnVisibility"
            :storage-key="props.columnVisibilityStorageKey"
            @update:model-value="
              (value) => emit('update:columnVisibility', value)
            "
          />
          <Button
            v-if="hasExpandable"
            type="button"
            variant="ghost"
            :aria-expanded="expanded"
            :class="[
              'rounded-lg gap-1 px-2 text-muted-foreground hover:text-foreground',
              props.hasExpandedActiveFilters &&
                !expanded &&
                'text-primary hover:text-primary',
            ]"
            @click="expanded = !expanded"
            >{{ expanded ? collapseText : expandText
            }}<Icon
              icon="lucide:chevron-down"
              :class="[
                'size-3.5 transition-transform duration-200',
                expanded && 'rotate-180',
              ]"
          /></Button>
          <Button
            v-if="props.showRefresh"
            type="button"
            variant="ghost"
            size="icon"
            :class="'size-8 text-muted-foreground'"
            :disabled="props.loading"
            :aria-label="refreshText"
            @click="emit('refresh')"
            ><Icon
              icon="lucide:refresh-cw"
              :class="['size-4', props.loading && 'animate-spin']" /></Button
          ><slot name="actions" />
        </div>
      </div>
    </template>
  </div>
</template>
