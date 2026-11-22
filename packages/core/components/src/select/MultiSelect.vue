<script setup lang="ts">
import {
  computed,
  defineComponent,
  h,
  nextTick,
  ref,
  useAttrs,
  useId,
  useSlots,
  watch,
  type VNodeChild,
} from "vue";
import { useI18n } from "vue-i18n";
import { toast } from "vue-sonner";
import { ArrowRightLeft, Check, ChevronDown, X } from "@lucide/vue";
import {
  Command,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@healseek/uikit-shadcnui";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@healseek/uikit-shadcnui/components/ui/popover";
import { cn } from "@healseek/uikit-shadcnui";
import { Icon } from "@healseek/shared/icons";
import { useOverlayOwner } from "@healseek/shared/overlay";

export interface MultiSelectOption {
  label: string;
  value: string;
  hint?: string;
  icon?: string;
  disabled?: boolean;
}

defineOptions({ name: "MultiSelect", inheritAttrs: false });

const props = withDefaults(
  defineProps<{
    options?: MultiSelectOption[];
    /** Label cache for selected values; these entries do not affect filtering. */
    selectedOptions?: MultiSelectOption[];
    modelValue?: string[];
    placeholder?: string;
    class?: string;
    id?: string;
    allowCreate?: boolean;
    createLabel?: string;
    emptyText?: string;
    disabled?: boolean;
    filterOptions?: boolean;
    showEmpty?: boolean;
    popupClass?: string;
    maxVisibleChips?: number;
    renderSelectedSummary?: (values: string[]) => VNodeChild;
    copyChipOnClick?: boolean;
  }>(),
  {
    options: () => [],
    selectedOptions: () => [],
    modelValue: () => [],
    allowCreate: false,
    disabled: false,
    filterOptions: true,
    showEmpty: true,
    copyChipOnClick: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
  "open-change": [open: boolean];
  search: [search: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();
const attrs = useAttrs();
const slots = useSlots();
const input = ref<HTMLInputElement>();
const anchor = ref<HTMLElement>();
const listId = `multi-select-${useId().replace(/:/g, "")}`;
const composing = ref(false);
const model = computed(() => props.modelValue ?? []);
const open = ref(false);
const owner = useOverlayOwner();
const popupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);
// Portaled options inherit their main overlay's layer, as SelectBox does.
// Closing or covering that owner must close its popup without stealing focus.
watch(
  () => owner?.active.value,
  (active) => {
    if (active === false) updateOpen(false);
  },
  { flush: "sync" },
);
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) updateOpen(false);
  },
);
const inputValue = ref("");
const expanded = ref(false);
const activeIndex = ref(-1);
const { t, te } = useI18n({ useScope: "global" });
function copy(
  key: string,
  fallback: string,
  values?: Record<string, unknown>,
): string {
  return te(key) ? t(key, values ?? {}) : fallback;
}
const resolvedPlaceholder = computed(
  () => props.placeholder ?? copy("common.multiSelectPlaceholder", "选择项目…"),
);
const resolvedEmptyText = computed(
  () => props.emptyText ?? copy("common.multiSelectEmpty", "没有匹配的项目"),
);
const selectedSet = computed(() => new Set(model.value));
const optionMap = computed(
  () =>
    new Map(
      [...props.selectedOptions, ...props.options].map((option) => [
        option.value,
        option,
      ]),
    ),
);
const labelMap = computed(
  () =>
    new Map(
      [...optionMap.value].map(([value, option]) => [value, option.label]),
    ),
);
const trimmedInput = computed(() => inputValue.value.trim());
const filteredOptions = computed(() => {
  const query = trimmedInput.value.toLowerCase();
  if (!props.filterOptions || !query) return props.options;
  return props.options.filter((option) =>
    `${option.label} ${option.value} ${option.hint ?? ""}`
      .toLowerCase()
      .includes(query),
  );
});
const visibleValues = computed(() =>
  typeof props.maxVisibleChips === "number" && !expanded.value
    ? model.value.slice(0, props.maxVisibleChips)
    : model.value,
);
const hiddenCount = computed(
  () => model.value.length - visibleValues.value.length,
);
const canCreate = computed(
  () =>
    props.allowCreate &&
    trimmedInput.value.length > 0 &&
    !selectedSet.value.has(trimmedInput.value) &&
    !props.options.some(
      (option) =>
        option.value === trimmedInput.value ||
        option.label === trimmedInput.value,
    ),
);
const menuEntries = computed(() => [
  ...(canCreate.value
    ? [{ kind: "create" as const, value: trimmedInput.value }]
    : []),
  ...filteredOptions.value.map((option) => ({
    kind: "option" as const,
    value: option.value,
    option,
  })),
]);
watch(
  menuEntries,
  () => {
    activeIndex.value = trimmedInput.value
      ? menuEntries.value.findIndex(
          (entry) => entry.kind === "create" || !entry.option.disabled,
        )
      : -1;
  },
  { immediate: true, flush: "sync" },
);
const inputAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs;
  return rest;
});

const hasSummarySlot = computed(() => Boolean(slots["selected-summary"]));
const summaryRenderer = computed(() => {
  if (!props.renderSelectedSummary) return null;
  const render = props.renderSelectedSummary;
  return defineComponent({
    name: "MultiSelectSummary",
    setup: () => () =>
      h(
        "span",
        {
          class:
            "inline-flex h-[calc(--spacing(5.25))] w-fit items-center justify-center rounded-sm bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground whitespace-nowrap",
        },
        render(model.value) as any,
      ),
  });
});

function updateOpen(value: boolean): void {
  const next = value && !props.disabled && owner?.active.value !== false;
  if (open.value === next) return;
  open.value = next;
  emit("open-change", next);
  if (!next) {
    setSearch("");
    activeIndex.value = -1;
  }
}

function onCloseAutoFocus(event: Event): void {
  // The anchored native input keeps focus while the popup is used.
  event.preventDefault();
}
function onInteractOutside(event: Event): void {
  const original = (event as CustomEvent<{ originalEvent?: Event }>).detail
    ?.originalEvent;
  const target = original?.target ?? event.target;
  if (target instanceof Node && anchor.value?.contains(target))
    event.preventDefault();
}
function focusInput(): void {
  if (!props.disabled && owner?.active.value !== false) input.value?.focus();
}
function onAnchorClick(event: MouseEvent): void {
  if ((event.target as Element).closest("button")) return;
  updateOpen(true);
  focusInput();
}
function setSearch(value: string): void {
  if (inputValue.value === value) return;
  inputValue.value = value;
  emit("search", value);
}

function setValues(values: string[]): void {
  if (!props.disabled)
    emit("update:modelValue", [...new Set(values.filter(Boolean))]);
}
function toggle(value: string): void {
  if (props.disabled || optionMap.value.get(value)?.disabled) return;
  if (selectedSet.value.has(value))
    setValues(model.value.filter((item) => item !== value));
  else setValues([...model.value, value]);
  setSearch("");
  void nextTick(focusInput);
}
function addValues(values: string[]): void {
  if (props.disabled || !props.allowCreate) return;
  const additions = values
    .flatMap((value) =>
      value.replaceAll("，", ",").replaceAll("\n", ",").split(","),
    )
    .map((value) => value.trim())
    .filter((value) => value && !selectedSet.value.has(value));
  if (additions.length) setValues([...model.value, ...additions]);
  setSearch("");
  void nextTick(focusInput);
}
function remove(value: string): void {
  if (!props.disabled) setValues(model.value.filter((item) => item !== value));
}
function handleInput(value: string): void {
  if (props.disabled) return;
  updateOpen(true);
  setSearch(value);
  if (!props.allowCreate || composing.value) return;
  const normalized = value.replaceAll("，", ",").replaceAll("\n", ",");
  if (!normalized.includes(",")) return;
  const parts = normalized.split(",");
  const draft = parts.pop() ?? "";
  addValues(parts);
  setSearch(draft);
}
function moveActive(delta: number): void {
  if (!menuEntries.value.length) return;
  let next = activeIndex.value < 0 && delta < 0 ? 0 : activeIndex.value;
  for (let index = 0; index < menuEntries.value.length; index += 1) {
    next = (next + delta + menuEntries.value.length) % menuEntries.value.length;
    const entry = menuEntries.value[next];
    if (entry.kind === "create" || !entry.option?.disabled) {
      activeIndex.value = next;
      return;
    }
  }
}
function handleKeydown(event: KeyboardEvent): void {
  if (props.disabled) return;
  // Composition Enter confirms an IME candidate, never a selection or submit.
  if (composing.value || event.isComposing || event.keyCode === 229) {
    if (event.key === "Enter") event.stopPropagation();
    return;
  }
  if (event.key === "Backspace" && !inputValue.value && model.value.length) {
    event.preventDefault();
    remove(model.value.at(-1)!);
  }
  if (event.key === "ArrowDown") {
    event.preventDefault();
    const wasOpen = open.value;
    updateOpen(true);
    if (wasOpen || activeIndex.value < 0) moveActive(1);
  }
  if (event.key === "ArrowUp") {
    event.preventDefault();
    const wasOpen = open.value;
    updateOpen(true);
    if (wasOpen || activeIndex.value < 0) moveActive(-1);
  }
  if (event.key === "Escape") {
    event.preventDefault();
    updateOpen(false);
  }
  if (event.key === "Enter") {
    // This is an input in a form, including when there are no matching options.
    event.preventDefault();
    event.stopPropagation();
    updateOpen(true);
    const entry =
      menuEntries.value[
        activeIndex.value < 0
          ? menuEntries.value.findIndex(
              (item) => item.kind === "create" || !item.option.disabled,
            )
          : activeIndex.value
      ];
    if (entry?.kind === "create") {
      event.preventDefault();
      addValues([entry.value]);
    } else if (entry?.kind === "option" && !entry.option.disabled) {
      event.preventDefault();
      toggle(entry.value);
    }
  }
}
function handlePaste(event: ClipboardEvent): void {
  if (!props.allowCreate || props.disabled || composing.value) return;
  const value = event.clipboardData?.getData("text") ?? "";
  if (!/[，,\n]/.test(value)) return;
  event.preventDefault();
  const element = event.currentTarget as HTMLInputElement;
  // Inserting a pasted batch must preserve the draft outside its selection.
  const merged =
    element.value.slice(0, element.selectionStart ?? element.value.length) +
    value +
    element.value.slice(element.selectionEnd ?? element.value.length);
  addValues([merged]);
}
async function copyChip(value: string): Promise<void> {
  if (!navigator.clipboard) return;
  try {
    await navigator.clipboard.writeText(value);
    toast.success(copy("common.copiedValue", `已复制：${value}`, { value }));
  } catch {
    toast.error(copy("common.copyFailed", "复制失败"));
  }
}
function createLabel(): string {
  return (
    props.createLabel?.replace("{{value}}", trimmedInput.value) ??
    copy("common.multiSelectCreate", `添加“${trimmedInput.value}”`, {
      value: trimmedInput.value,
    })
  );
}
defineExpose({
  focus: focusInput,
  blur: () => input.value?.blur(),
  close: () => updateOpen(false),
});
</script>

<template>
  <Popover :open="open" @update:open="updateOpen">
    <PopoverAnchor as-child>
      <div
        ref="anchor"
        data-slot="combobox-chips"
        :style="attrs.style"
        :aria-disabled="props.disabled || undefined"
        :class="
          cn(
            'border-input focus-within:border-ring focus-within:ring-ring/50 flex min-h-8 w-full flex-wrap items-center gap-1 rounded-lg border bg-transparent bg-clip-padding px-2.5 py-1 text-sm transition-colors focus-within:ring-3 focus-within:ring-inset aria-invalid:ring-inset dark:bg-input/30',
            props.disabled && 'cursor-not-allowed opacity-50',
            props.class,
          )
        "
        @click="onAnchorClick"
      >
        <span
          class="flex min-w-0 flex-1 flex-wrap items-center gap-1 text-left"
        >
          <template v-if="hasSummarySlot">
            <span
              class="inline-flex h-[calc(--spacing(5.25))] w-fit items-center justify-center rounded-sm bg-muted px-1.5 font-mono text-xs font-medium text-muted-foreground whitespace-nowrap"
              ><slot name="selected-summary" :values="model"
            /></span>
          </template>
          <component v-else-if="summaryRenderer" :is="summaryRenderer" />
          <template v-else>
            <template v-for="value in visibleValues" :key="value">
              <span
                data-slot="combobox-chip"
                class="inline-flex h-[calc(--spacing(5.25))] w-fit max-w-full items-center justify-center gap-1 rounded-sm bg-muted px-1.5 text-xs font-medium text-foreground whitespace-nowrap"
              >
                <Icon
                  v-if="optionMap.get(value)?.icon"
                  :icon="optionMap.get(value)?.icon ?? ''"
                  class="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <button
                  v-if="props.copyChipOnClick"
                  type="button"
                  :disabled="props.disabled"
                  class="max-w-40 cursor-pointer truncate rounded-sm hover:underline disabled:cursor-not-allowed"
                  @click.stop="copyChip(value)"
                >
                  {{ labelMap.get(value) ?? value }}
                </button>
                <span v-else class="max-w-40 truncate">{{
                  labelMap.get(value) ?? value
                }}</span>
                <span
                  v-if="optionMap.get(value)?.hint"
                  class="inline-flex shrink-0 text-muted-foreground"
                  :title="optionMap.get(value)?.hint"
                  aria-hidden="true"
                  ><ArrowRightLeft class="size-3"
                /></span>
                <button
                  type="button"
                  :disabled="props.disabled"
                  data-slot="combobox-chip-remove"
                  class="-ml-1 rounded-sm opacity-50 hover:opacity-100 disabled:cursor-not-allowed"
                  :aria-label="`${copy('common.remove', '移除')} ${labelMap.get(value) ?? value}`"
                  @click.stop="remove(value)"
                >
                  <X class="size-3" />
                </button>
              </span>
            </template>
            <button
              v-if="hiddenCount > 0"
              type="button"
              :disabled="props.disabled"
              class="inline-flex h-[calc(--spacing(5.25))] items-center rounded-sm bg-muted px-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
              :title="copy('common.showAll', '显示全部')"
              @click.stop="expanded = true"
            >
              +{{ hiddenCount }}
            </button>
          </template>
          <input
            ref="input"
            v-bind="inputAttrs"
            autocomplete="off"
            role="combobox"
            :aria-expanded="open"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            :aria-controls="open ? listId : undefined"
            data-slot="combobox-chip-input"
            :id="props.id"
            :value="inputValue"
            :placeholder="
              !model.length && !hasSummarySlot && !props.renderSelectedSummary
                ? resolvedPlaceholder
                : undefined
            "
            :disabled="props.disabled"
            :aria-label="(attrs['aria-label'] as string) ?? resolvedPlaceholder"
            class="min-w-16 flex-1 bg-transparent p-0 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
            @input="handleInput(($event.target as HTMLInputElement).value)"
            @keydown="handleKeydown"
            @paste="handlePaste"
            @compositionstart="composing = true"
            @compositionend="composing = false"
            @focus="
              emit('focus', $event);
              updateOpen(true);
            "
            @blur="emit('blur', $event)"
          />
        </span>
        <button
          type="button"
          :disabled="props.disabled"
          :aria-label="copy('common.open', '打开')"
          class="inline-flex size-5 shrink-0 items-center justify-center rounded-sm opacity-50 hover:opacity-100 disabled:cursor-not-allowed"
          @click.stop="
            updateOpen(!open);
            if (open) focusInput();
          "
        >
          <ChevronDown class="size-4" />
        </button>
      </div>
    </PopoverAnchor>
    <PopoverContent
      align="start"
      :style="popupStyle"
      @open-auto-focus.prevent
      @close-auto-focus="onCloseAutoFocus"
      @interact-outside="onInteractOutside"
      :class="
        cn(
          'w-(--reka-popover-trigger-width) min-w-56 rounded-lg border-0 p-0 shadow-md ring-1 ring-foreground/10',
          props.popupClass,
        )
      "
    >
      <!-- Share selection with Listbox so its ARIA state matches the chips. -->
      <Command :model-value="model" multiple>
        <slot name="header" />
        <CommandList
          :id="listId"
          aria-multiselectable="true"
          @mouseleave="activeIndex = -1"
        >
          <div
            v-if="!menuEntries.length && props.showEmpty"
            class="py-6 text-center text-sm text-muted-foreground"
          >
            <slot name="empty">{{ resolvedEmptyText }}</slot>
          </div>
          <CommandGroup>
            <!-- Keep external-input highlighting outside ListboxItem's memoized
                 root, and suppress its separate native highlight surface. -->
            <div
              v-if="canCreate"
              data-slot="multi-select-option"
              class="rounded-sm"
              :class="
                activeIndex === 0
                  ? 'bg-accent text-accent-foreground'
                  : undefined
              "
              @mouseenter="activeIndex = 0"
              @mouseleave="activeIndex = -1"
            >
              <CommandItem
                :value="trimmedInput"
                class="data-[highlighted]:bg-transparent data-[highlighted]:text-inherit"
                @mousedown.prevent
                @select="addValues([trimmedInput])"
                ><span class="mr-2">＋</span>{{ createLabel() }}</CommandItem
              >
            </div>
            <div
              v-for="(option, index) in filteredOptions"
              :key="option.value"
              data-slot="multi-select-option"
              class="rounded-sm"
              :class="
                !option.disabled && activeIndex === index + (canCreate ? 1 : 0)
                  ? 'bg-accent text-accent-foreground'
                  : undefined
              "
              @mouseenter="
                activeIndex = option.disabled ? -1 : index + (canCreate ? 1 : 0)
              "
              @mouseleave="activeIndex = -1"
            >
              <CommandItem
                :value="option.value"
                :disabled="option.disabled"
                class="data-[highlighted]:bg-transparent data-[highlighted]:text-inherit"
                @mousedown.prevent
                @select="toggle(option.value)"
              >
                <Icon
                  v-if="option.icon"
                  :icon="option.icon"
                  class="mr-2 size-4 shrink-0"
                  aria-hidden="true"
                />
                <Check
                  :class="[
                    'mr-2 size-4',
                    selectedSet.has(option.value) ? 'opacity-100' : 'opacity-0',
                  ]"
                />
                <span class="min-w-0 flex-1 truncate">{{ option.label }}</span>
                <span
                  v-if="option.hint"
                  class="ml-auto max-w-40 truncate text-xs text-muted-foreground"
                  >{{ option.hint }}</span
                >
              </CommandItem>
            </div>
          </CommandGroup>
        </CommandList>
        <slot name="footer" />
      </Command>
      <button
        v-if="
          expanded &&
          typeof props.maxVisibleChips === 'number' &&
          model.length > props.maxVisibleChips
        "
        type="button"
        class="w-full border-t px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        @click="expanded = false"
      >
        {{ copy("common.collapse", "收起") }}
      </button>
    </PopoverContent>
  </Popover>
</template>
