<script setup lang="ts">
import {
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Image,
  LoaderCircle,
  Search,
  X,
} from "@lucide/vue";
import { computed, onBeforeUnmount, ref, useId, watch } from "vue";
import { Icon, listIcons, localIconCollections } from "@healseek/shared/icons";
import { useOverlayOwner } from "@healseek/shared/overlay";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@healseek/uikit-shadcnui/components/ui/popover";
import { cn } from "@healseek/uikit-shadcnui";
import Button from "../controls/Button.vue";
import Input from "../controls/Input.vue";
import SelectBox from "../select/SelectBox.vue";
import { createIconifySource } from "./sources";
import type { IconPickerProps, IconPickerSource } from "./types";

defineOptions({ name: "IconPicker", inheritAttrs: false });
const props = withDefaults(defineProps<IconPickerProps>(), {
  pageSize: 36,
  disabled: false,
  readonly: false,
  clearable: true,
  type: "input",
  placeholder: "选择图标",
});
const model = defineModel<string | undefined>();
const emit = defineEmits<{
  change: [value: string];
  "open-change": [value: boolean];
}>();
const defaultSources = [
  createIconifySource({ prefix: "mdi", label: "Material Design（在线）" }),
  createIconifySource({ prefix: "tabler", label: "Tabler（在线）" }),
  createIconifySource({ prefix: "ant-design", label: "Ant Design（在线）" }),
];
const availableSources = computed<IconPickerSource[]>(() => {
  const local =
    props.icons !== undefined
      ? [
          {
            id: "provided",
            label: "指定图标（本地）",
            load: async () => [...props.icons!],
          },
        ]
      : localIconCollections.value.map((collection) => ({
          id: `local:${collection.provider}:${collection.prefix}`,
          label: `${collection.title}（本地）`,
          load: async () => listIcons(collection.provider, collection.prefix),
        }));
  const remote =
    props.sources ?? (props.icons === undefined ? defaultSources : []);
  // Local and online variants can coexist, while duplicate source IDs cannot.
  return [
    ...new Map(
      [...local, ...remote].map((source) => [source.id, source]),
    ).values(),
  ];
});
const selectedSourceId = ref("");
const activeSource = computed(
  () =>
    availableSources.value.find(
      (source) => source.id === selectedSourceId.value,
    ) ?? availableSources.value[0],
);
const sourceOptions = computed(() =>
  availableSources.value.map((source) => ({
    label: source.label,
    value: source.id,
  })),
);
const open = ref(false);
const search = ref("");
const query = ref("");
const page = ref(1);
const icons = ref<string[]>([]);
const loading = ref(false);
const error = ref("");
const owner = useOverlayOwner();
const popupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);
const locked = computed(() => props.disabled || props.readonly);
const popupId = `icon-picker-${useId().replace(/:/g, "")}`;
const pageSize = computed(() =>
  Number.isFinite(props.pageSize)
    ? Math.max(1, Math.min(120, Math.floor(props.pageSize)))
    : 36,
);
const filteredIcons = computed(() => {
  const term = query.value.trim().toLowerCase();
  return term
    ? icons.value.filter((icon) => icon.toLowerCase().includes(term))
    : icons.value;
});
const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredIcons.value.length / pageSize.value)),
);
const visibleIcons = computed(() =>
  filteredIcons.value.slice(
    (page.value - 1) * pageSize.value,
    page.value * pageSize.value,
  ),
);
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let controller: AbortController | undefined;
let generation = 0;

watch(search, (value) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    query.value = value;
    page.value = 1;
  }, 200);
});
watch(totalPages, (count) => {
  page.value = Math.min(page.value, count);
});
watch([open, activeSource], () => {
  search.value = "";
  query.value = "";
  page.value = 1;
  void loadSource();
});
watch(
  [locked, () => owner?.active.value],
  () => {
    if (locked.value || owner?.active.value === false) updateOpen(false);
  },
  { flush: "sync" },
);

function updateOpen(value: boolean): void {
  const next = value && !locked.value && owner?.active.value !== false;
  if (open.value === next) return;
  open.value = next;
  emit("open-change", next);
}

async function loadSource(): Promise<void> {
  controller?.abort();
  const request = ++generation;
  loading.value = false;
  icons.value = [];
  error.value = "";
  if (!open.value || !activeSource.value) return;
  controller = new AbortController();
  const signal = controller.signal;
  loading.value = true;
  try {
    const result = await activeSource.value.load({ signal });
    if (request !== generation || signal.aborted) return;
    icons.value = [
      ...new Set(
        result.filter((name) => typeof name === "string" && name.trim()),
      ),
    ];
  } catch (cause) {
    if (request !== generation || signal.aborted) return;
    error.value =
      cause instanceof Error ? cause.message : "无法加载图标库，请重试";
  } finally {
    if (request === generation) loading.value = false;
  }
}

function select(value: string): void {
  if (locked.value) return;
  model.value = value;
  emit("change", value);
  updateOpen(false);
}

function closeAutoFocus(event: Event): void {
  // Covered modal/drawer owners must not steal focus from the next overlay.
  if (owner?.active.value === false || locked.value) event.preventDefault();
}

function moveIconFocus(event: KeyboardEvent): void {
  const movements: Record<string, number> = {
    ArrowLeft: -1,
    ArrowRight: 1,
    ArrowUp: -6,
    ArrowDown: 6,
  };
  if (!(event.key in movements) && event.key !== "Home" && event.key !== "End")
    return;
  const buttons = [
    ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLButtonElement>(
      "[data-icon-option]",
    ),
  ];
  const current = buttons.indexOf(event.target as HTMLButtonElement);
  if (current < 0) return;
  event.preventDefault();
  const next =
    event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : Math.min(
            buttons.length - 1,
            Math.max(0, current + movements[event.key]!),
          );
  buttons[next]?.focus();
}

onBeforeUnmount(() => {
  generation++;
  controller?.abort();
  clearTimeout(searchTimer);
});
defineExpose({
  open: () => updateOpen(true),
  close: () => updateOpen(false),
  toggle: () => updateOpen(!open.value),
});
</script>

<template>
  <Popover :open="open" @update:open="updateOpen">
    <PopoverAnchor
      :class="
        cn(
          'flex min-w-0 items-center gap-1',
          props.type === 'input' ? 'w-full' : 'w-fit',
          props.class,
        )
      "
      data-slot="icon-picker"
    >
      <PopoverTrigger as-child>
        <Button
          v-bind="$attrs"
          variant="outline"
          :disabled="props.disabled"
          :aria-disabled="props.readonly || undefined"
          :aria-label="
            ($attrs['aria-label'] as string | undefined) ??
            (model ? `选择图标：${model}` : props.placeholder)
          "
          :aria-controls="open ? popupId : undefined"
          :class="
            props.type === 'icon'
              ? 'size-9 shrink-0 p-0'
              : 'min-w-0 flex-1 justify-start gap-2 px-3 font-normal'
          "
        >
          <Icon
            v-if="model"
            :icon="model"
            class="size-5 shrink-0"
            aria-hidden="true"
          />
          <Image
            v-else
            class="text-muted-foreground size-5 shrink-0"
            aria-hidden="true"
          />
          <template v-if="props.type === 'input'">
            <span
              :class="
                cn(
                  'min-w-0 flex-1 truncate text-left',
                  !model && 'text-muted-foreground',
                )
              "
              >{{ model || props.placeholder }}</span
            >
            <ChevronsUpDown
              class="text-muted-foreground size-4 shrink-0"
              aria-hidden="true"
            />
          </template>
        </Button>
      </PopoverTrigger>
      <Button
        v-if="props.clearable && model && !locked"
        variant="ghost"
        size="icon"
        aria-label="清空图标"
        @click="select('')"
      >
        <X class="size-4" aria-hidden="true" />
      </Button>
    </PopoverAnchor>
    <PopoverContent
      :id="popupId"
      :style="popupStyle"
      align="start"
      :collision-padding="12"
      class="flex max-h-(--reka-popover-content-available-height) w-[344px] max-w-[calc(100vw-24px)] flex-col overflow-hidden rounded-lg border-0 p-3 shadow-md ring-1 ring-foreground/10 motion-reduce:animate-none"
      aria-label="图标选择"
      @close-auto-focus="closeAutoFocus"
    >
      <div class="flex min-h-0 flex-col gap-3">
        <SelectBox
          :model-value="activeSource?.id"
          :options="sourceOptions"
          aria-label="图标库"
          placeholder="选择图标库"
          class="shrink-0"
          @update:model-value="selectedSourceId = $event ?? ''"
        />
        <div class="relative shrink-0">
          <Search
            class="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            v-model="search"
            aria-label="搜索图标"
            placeholder="搜索图标名称，如 home"
            class="pl-9"
            :disabled="loading"
          />
        </div>
        <div
          v-if="loading"
          class="text-muted-foreground flex h-60 min-h-0 items-center justify-center gap-2 overflow-auto text-sm"
          role="status"
        >
          <LoaderCircle
            class="size-4 animate-spin motion-reduce:animate-none"
            aria-hidden="true"
          />正在加载图标…
        </div>
        <div
          v-else-if="error"
          class="flex h-60 min-h-0 flex-col items-center justify-center gap-3 overflow-auto text-center text-sm"
          role="alert"
        >
          <p class="text-muted-foreground break-words">{{ error }}</p>
          <Button variant="outline" size="sm" @click="loadSource"
            >重新加载</Button
          >
        </div>
        <div
          v-else-if="!visibleIcons.length"
          class="text-muted-foreground flex h-60 min-h-0 items-center justify-center overflow-auto text-sm"
          role="status"
        >
          没有匹配的图标
        </div>
        <div
          v-else
          class="grid h-60 min-h-0 grid-cols-6 content-start gap-1 overflow-y-auto"
          role="group"
          aria-label="可选图标"
          @keydown="moveIconFocus"
        >
          <Button
            v-for="icon in visibleIcons"
            :key="icon"
            variant="ghost"
            :aria-label="icon"
            :aria-pressed="model === icon"
            :title="icon"
            data-icon-option
            :class="
              cn(
                'h-9 w-full min-w-0 p-0',
                model === icon &&
                  'bg-primary/10 text-primary ring-1 ring-primary/30',
              )
            "
            @click="select(icon)"
          >
            <Icon :icon="icon" class="size-5" aria-hidden="true" />
          </Button>
        </div>
        <div
          class="flex shrink-0 items-center justify-between border-t pt-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          <span>{{ filteredIcons.length }} 个图标</span>
          <div class="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="上一页图标"
              :disabled="loading || page <= 1"
              @click="page--"
              ><ChevronLeft class="size-4"
            /></Button>
            <span class="min-w-12 text-center"
              >{{ page }} / {{ totalPages }}</span
            >
            <Button
              variant="ghost"
              size="icon"
              aria-label="下一页图标"
              :disabled="loading || page >= totalPages"
              @click="page++"
              ><ChevronRight class="size-4"
            /></Button>
          </div>
        </div>
      </div>
    </PopoverContent>
  </Popover>
</template>
