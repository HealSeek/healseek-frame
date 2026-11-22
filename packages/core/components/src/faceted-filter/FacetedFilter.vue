<script setup lang="ts">
import { Button } from "../controls";
import type { Component, HTMLAttributes } from "vue";
import { Check, PlusCircle, Search } from "@lucide/vue";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ListboxFilter, useFilter } from "reka-ui";
import { cn } from "@healseek/uikit-shadcnui";
import { useOverlayOwner } from "@healseek/shared/overlay";
import { Badge } from "@healseek/uikit-shadcnui/components/ui/badge";

import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@healseek/uikit-shadcnui/components/ui/command";
import {
  InputGroup,
  InputGroupAddon,
} from "@healseek/uikit-shadcnui/components/ui/input-group";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@healseek/uikit-shadcnui/components/ui/popover";
import { Separator } from "@healseek/uikit-shadcnui/components/ui/separator";
import {
  NEW_API_COMMAND_CLASS,
  NEW_API_COMMAND_INPUT_CLASS,
  NEW_API_COMMAND_ITEM_CLASS,
  NEW_API_COMMAND_LIST_CLASS,
  NEW_API_POPOVER_CONTENT_CLASS,
} from "../data-table/new-api-compat";

export interface FacetedFilterOption {
  label: string;
  value: string;
  icon?: Component;
  /** Optional component content for consumers that already have a rendered icon component. */
  iconNode?: Component;
  /** Optional count displayed at the end of the option row. */
  count?: number;
  disabled?: boolean;
}

const props = withDefaults(
  defineProps<{
    title?: string;
    options?: FacetedFilterOption[];
    /** Select exactly one item at a time when true; otherwise the filter is multi-select. */
    singleSelect?: boolean;
    searchPlaceholder?: string;
    emptyText?: string;
    clearText?: string;
    selectedText?: string;
    disabled?: boolean;
    class?: HTMLAttributes["class"];
    contentClass?: HTMLAttributes["class"];
    align?: "start" | "center" | "end";
  }>(),
  {
    options: () => [],
    singleSelect: false,
    searchPlaceholder: undefined,
    disabled: false,
    align: "start",
  },
);

const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const resolvedTitle = computed(
  () => props.title ?? copy("common.filter", "Filter"),
);
const resolvedEmptyText = computed(
  () => props.emptyText ?? copy("common.noResults", "No results found."),
);
const resolvedClearText = computed(
  () => props.clearText ?? copy("common.clearFilters", "Clear filters"),
);
const resolvedSelectedText = computed(
  () => props.selectedText ?? copy("common.selected", "selected"),
);

/**
 * Multi-select values are represented as string[]. In single-select mode the
 * component follows the normal Vue input convention and emits a string (or
 * undefined); passing an array keeps the array model for callers that need it.
 */
const modelValue = defineModel<string | string[] | undefined>();
const owner = useOverlayOwner();
const open = ref(false);
const popupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);
const search = ref("");
const { contains } = useFilter({ sensitivity: "base" });

// A faceted filter keeps the current search while selecting several options.
// Compose the public ListboxFilter with ui-kit's InputGroup: CommandInput's
// internal search is reset by CommandItem after every selection.
const filteredOptions = computed(() =>
  props.options.filter((option) => contains(option.label, search.value)),
);
const showClear = computed(
  () =>
    selectedSet.value.size > 0 &&
    contains(resolvedClearText.value, search.value),
);
watch(open, (value) => {
  if (!value) search.value = "";
});

// The body portal belongs to its Vue host's reserved popup layer. A closing or
// covered host must dismiss it without moving focus back over the next host.
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

const selectedValues = computed<string[]>(() => {
  if (Array.isArray(modelValue.value)) return modelValue.value;
  return modelValue.value ? [modelValue.value] : [];
});

const selectedSet = computed(() => new Set(selectedValues.value));
const selectedOptions = computed(() =>
  props.options.filter((option) => selectedSet.value.has(option.value)),
);
const triggerSearchPlaceholder = computed(
  () => props.searchPlaceholder ?? resolvedTitle.value,
);

function setSelection(values: string[]): void {
  if (props.singleSelect && !Array.isArray(modelValue.value)) {
    modelValue.value = values[0];
    return;
  }
  modelValue.value = values;
}

function handleOptionSelect(value: string): void {
  if (
    props.disabled ||
    props.options.find((option) => option.value === value)?.disabled
  )
    return;
  if (props.singleSelect) {
    setSelection(selectedSet.value.has(value) ? [] : [value]);
    return;
  }

  const next = new Set(selectedSet.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  setSelection(Array.from(next));
}

function clearSelection(): void {
  if (props.disabled) return;
  setSelection([]);
}

function optionCount(option: FacetedFilterOption): number | undefined {
  return typeof option.count === "number" ? option.count : undefined;
}
</script>

<template>
  <Popover :open="open" @update:open="updateOpen">
    <PopoverTrigger as-child>
      <Button
        variant="outline"
        size="sm"
        :disabled="props.disabled"
        :aria-expanded="open"
        :class="['h-8 border-dashed', props.class]"
      >
        <PlusCircle class="size-4" />
        <slot name="title">{{ resolvedTitle }}</slot>
        <template v-if="selectedSet.size > 0">
          <Separator orientation="vertical" class="mx-2 h-4" />
          <Badge
            variant="secondary"
            class="rounded-sm px-1 font-normal lg:hidden"
          >
            {{ selectedSet.size }}
          </Badge>
          <div class="hidden gap-1 lg:flex">
            <Badge
              v-if="selectedSet.size > 2"
              variant="secondary"
              class="rounded-sm px-1 font-normal"
            >
              {{ selectedSet.size }} {{ resolvedSelectedText }}
            </Badge>
            <template v-else>
              <Badge
                v-for="option in selectedOptions"
                :key="option.value"
                variant="secondary"
                class="rounded-sm px-1 font-normal"
              >
                <slot name="selected" :option="option">{{ option.label }}</slot>
              </Badge>
            </template>
          </div>
        </template>
      </Button>
    </PopoverTrigger>
    <PopoverContent
      :align="props.align"
      :style="popupStyle"
      @close-auto-focus="onCloseAutoFocus"
      :class="
        cn(
          NEW_API_POPOVER_CONTENT_CLASS,
          'faceted-filter-content max-w-[360px] min-w-[200px] p-0',
          props.contentClass,
        )
      "
    >
      <Command
        :class="NEW_API_COMMAND_CLASS"
        :model-value="
          props.singleSelect ? selectedValues[0] ?? '' : selectedValues
        "
        :multiple="!props.singleSelect"
        :disabled="props.disabled"
        highlight-on-hover
      >
        <div data-slot="command-input-wrapper" class="p-1 pb-0">
          <InputGroup class="faceted-filter-input">
            <ListboxFilter
              v-model="search"
              data-slot="command-input"
              :aria-label="triggerSearchPlaceholder"
              :placeholder="triggerSearchPlaceholder"
              :class="NEW_API_COMMAND_INPUT_CLASS"
              auto-focus
            />
            <InputGroupAddon class="pl-2">
              <Search class="size-4 shrink-0 opacity-50" />
            </InputGroupAddon>
          </InputGroup>
        </div>
        <CommandList :class="NEW_API_COMMAND_LIST_CLASS">
          <div
            v-if="!filteredOptions.length && !showClear"
            data-slot="command-empty"
            class="py-6 text-center text-sm"
          >
            {{ resolvedEmptyText }}
          </div>
          <CommandGroup v-if="filteredOptions.length">
            <CommandItem
              v-for="option in filteredOptions"
              :key="option.value"
              :value="option.value"
              :text-value="option.label"
              :disabled="option.disabled"
              :class="NEW_API_COMMAND_ITEM_CLASS"
              @select="handleOptionSelect(option.value)"
            >
              <div
                :class="
                  cn(
                    'border-primary flex size-4 items-center justify-center rounded-sm border',
                    selectedSet.has(option.value)
                      ? 'bg-primary text-primary-foreground'
                      : 'opacity-50 [&_svg]:invisible',
                  )
                "
              >
                <Check class="text-background h-4 w-4" />
              </div>
              <span
                v-if="option.iconNode || option.icon"
                class="text-muted-foreground flex size-4 shrink-0 items-center justify-center"
              >
                <slot name="option-icon" :option="option">
                  <component v-if="option.iconNode" :is="option.iconNode" />
                  <component v-else :is="option.icon" class="size-4" />
                </slot>
              </span>
              <slot
                name="option"
                :option="option"
                :selected="selectedSet.has(option.value)"
              >
                <span class="min-w-0 flex-1 truncate" :title="option.label">
                  {{ option.label }}
                </span>
              </slot>
              <span
                v-if="optionCount(option) !== undefined"
                class="text-muted-foreground ms-auto flex h-4 min-w-4 items-center justify-center font-mono text-xs"
              >
                {{ optionCount(option) }}
              </span>
              <Check class="ml-auto size-4 opacity-0" aria-hidden="true" />
            </CommandItem>
          </CommandGroup>
          <template v-if="showClear">
            <CommandSeparator />
            <CommandGroup>
              <CommandItem
                value="__faceted-filter-clear__"
                :class="[
                  NEW_API_COMMAND_ITEM_CLASS,
                  'justify-center text-center',
                ]"
                @select="clearSelection"
              >
                {{ resolvedClearText }}
                <Check class="ml-auto size-4 opacity-0" aria-hidden="true" />
              </CommandItem>
            </CommandGroup>
          </template>
        </CommandList>
      </Command>
    </PopoverContent>
  </Popover>
</template>

<style>
/* new-api uses an inset InputGroup around the search input. Keep primitive
 * defaults intact and apply only this composition's dimensions and tokens. */
.faceted-filter-content .faceted-filter-input {
  height: 2rem;
  border: 1px solid color-mix(in oklch, var(--input) 30%, transparent);
  border-radius: var(--radius-lg);
  background: color-mix(in oklch, var(--input) 30%, transparent);
  box-shadow: none;
}

.faceted-filter-content [data-slot="input-group-addon"] {
  padding-inline-start: 0.5rem;
}

.faceted-filter-content [data-slot="command-input"] {
  min-width: 0;
  flex: 1;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0;
  outline: none;
}

.faceted-filter-content [data-slot="command-list"] {
  scrollbar-width: none;
}

.faceted-filter-content [data-slot="command-list"]::-webkit-scrollbar {
  display: none;
}

.faceted-filter-content [data-slot="command-item"][data-highlighted] {
  background-color: var(--muted);
  color: var(--foreground);
}
</style>
