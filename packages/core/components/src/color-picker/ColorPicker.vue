<script setup lang="ts">
import { ChevronDown, X } from "@lucide/vue";
import {
  ColorAreaArea,
  ColorAreaRoot,
  ColorAreaThumb,
  ColorFieldInput,
  ColorFieldRoot,
  ColorSliderRoot,
  ColorSliderThumb,
  ColorSliderTrack,
  colorToString,
  convertToHsb,
  convertToHsl,
  normalizeColor,
  type Color,
} from "reka-ui";
import { computed, ref, shallowRef, useId, watch } from "vue";
import { useOverlayOwner } from "@healseek/shared/overlay";
import { cn } from "@healseek/uikit-shadcnui";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
  PopoverTrigger,
} from "@healseek/uikit-shadcnui/components/ui/popover";
import Button from "../controls/Button.vue";
import { NEW_API_INPUT_CLASS } from "../data-table/new-api-compat";
import { normalizeColorPresets, normalizeHexColor } from "./color";
import type { ColorPickerProps } from "./types";

defineOptions({ name: "ColorPicker", inheritAttrs: false });
const props = withDefaults(defineProps<ColorPickerProps>(), {
  disabled: false,
  readonly: false,
  clearable: true,
  showAlpha: false,
  placeholder: "选择颜色",
  presets: () => [
    "#ef4444",
    "#c2410c",
    "#f59e0b",
    "#22c55e",
    "#14b8a6",
    "#3b82f6",
    "#6366f1",
    "#a855f7",
    "#ec4899",
    "#64748b",
  ],
});
const model = defineModel<string | undefined>();
const emit = defineEmits<{
  change: [value: string];
  "open-change": [value: boolean];
}>();
const open = ref(false);
const owner = useOverlayOwner();
const locked = computed(() => props.disabled || props.readonly);
const popupId = `color-picker-${useId().replace(/:/g, "")}`;
const hexInputId = `${popupId}-hex`;
const value = computed(() => {
  const hex = normalizeHexColor(model.value);
  return props.showAlpha ? hex : hex?.slice(0, 7);
});
// Keep the full Color object between controls: a HEX round-trip loses hue at
// zero saturation/brightness and makes the next drag jump to a different hue.
const color = shallowRef(
  convertToHsb(normalizeColor(value.value ?? "#3b82f6")),
);
const areaRevision = ref(0);
// Reka's hue slider operates in HSL. Carry hue explicitly across the HSB/HSL
// boundary because conversion through RGB cannot retain it for black/gray.
const hueColor = computed(() => ({
  ...convertToHsl(color.value),
  h: color.value.h,
}));
watch(value, (hex) => {
  if (hex !== normalizeHexColor(colorToString(color.value, "hex"))) {
    color.value = convertToHsb(normalizeColor(hex ?? "#3b82f6"));
    areaRevision.value++;
  }
});
const presets = computed(() =>
  normalizeColorPresets(props.presets, props.showAlpha),
);
const popupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);

function updateOpen(next: boolean): void {
  next = next && !locked.value && owner?.active.value !== false;
  if (open.value === next) return;
  open.value = next;
  emit("open-change", next);
}
watch(
  [locked, () => owner?.active.value],
  () => {
    if (locked.value || owner?.active.value === false) updateOpen(false);
  },
  { flush: "sync" },
);

function updateColor(next: Color): void {
  // Closing/clearing may blur the portalled input during unmount. Ignore that
  // late commit so it cannot restore a value the user has just cleared.
  if (!open.value || locked.value || owner?.active.value === false) return;
  const hsb = convertToHsb(next);
  color.value = props.showAlpha ? hsb : { ...hsb, alpha: 1 };
  const hex = normalizeHexColor(colorToString(color.value, "hex"))!;
  if (model.value === hex) return;
  model.value = hex;
  emit("change", hex);
}
function updateHue(next: Color): void {
  const previous = color.value.h;
  updateColor({ ...color.value, h: convertToHsl(next).h });
  if (color.value.h !== previous) areaRevision.value++;
}
function replaceColor(next: Color): void {
  if (!open.value || locked.value || owner?.active.value === false) return;
  // HEX commits/presets are external to the area. Never rebuild the area for
  // its own updates: even small conversion drift would cancel pointer capture.
  if (
    normalizeHexColor(colorToString(next, "hex")) ===
    normalizeHexColor(colorToString(color.value, "hex"))
  ) {
    // An empty picker still needs to commit when choosing its fallback color.
    updateColor(color.value);
    return;
  }
  updateColor(next);
  areaRevision.value++;
}
function selectPreset(next: unknown): void {
  const hex = normalizeHexColor(next);
  if (hex) replaceColor(normalizeColor(hex));
}
function clear(): void {
  if (locked.value || owner?.active.value === false) return;
  model.value = "";
  emit("change", "");
  updateOpen(false);
}
function closeAutoFocus(event: Event): void {
  if (locked.value || owner?.active.value === false) event.preventDefault();
}
defineExpose({ open: () => updateOpen(true), close: () => updateOpen(false) });
</script>

<template>
  <Popover :open="open" @update:open="updateOpen">
    <PopoverAnchor
      :class="cn('flex w-full min-w-0 items-center gap-1', props.class)"
      data-slot="color-picker"
    >
      <PopoverTrigger as-child>
        <Button
          v-bind="$attrs"
          variant="outline"
          :disabled="props.disabled"
          :aria-disabled="props.readonly || undefined"
          :aria-label="
            ($attrs['aria-label'] as string | undefined) ??
            (value ? `选择颜色：${value}` : props.placeholder)
          "
          :aria-controls="open ? popupId : undefined"
          class="min-w-0 flex-1 justify-start gap-2 px-2.5 font-normal focus-visible:ring-inset"
          data-slot="color-picker-trigger"
        >
          <span
            class="color-picker-checkerboard relative size-5 shrink-0 overflow-hidden rounded border"
            aria-hidden="true"
          >
            <span
              class="absolute inset-0"
              :style="{ backgroundColor: value }"
            />
          </span>
          <span
            :class="
              cn(
                'min-w-0 flex-1 truncate text-left font-mono',
                !value && 'font-sans text-muted-foreground',
              )
            "
            >{{ value || props.placeholder }}</span
          >
          <ChevronDown
            class="size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        </Button>
      </PopoverTrigger>
      <Button
        v-if="props.clearable && model && !locked"
        variant="ghost"
        size="icon"
        aria-label="清空颜色"
        @click="clear"
      >
        <X class="size-4" aria-hidden="true" />
      </Button>
      <input
        v-if="props.name"
        type="hidden"
        :name="props.name"
        :value="model ?? ''"
        :disabled="props.disabled"
      />
    </PopoverAnchor>
    <PopoverContent
      :id="popupId"
      :style="popupStyle"
      align="start"
      :collision-padding="12"
      class="flex max-h-(--reka-popover-content-available-height) w-72 max-w-[calc(100vw-24px)] flex-col gap-3 overflow-y-auto rounded-lg border-0 p-3 shadow-md ring-1 ring-foreground/10 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none"
      aria-label="颜色选择"
      @close-auto-focus="closeAutoFocus"
    >
      <!-- Reka caches area hue; rebuild only the area when hue changes. -->
      <ColorAreaRoot
        :key="areaRevision"
        v-slot="{ style }"
        :model-value="color"
        color-space="hsb"
        x-channel="saturation"
        y-channel="brightness"
        :disabled="locked"
        @update:color="updateColor"
      >
        <ColorAreaArea
          :style="style"
          class="relative h-36 w-full touch-none rounded-md"
          aria-label="饱和度与亮度"
        >
          <ColorAreaThumb
            class="size-4 rounded-full border-2 border-white shadow-sm outline-none ring-black/40 focus-visible:ring-2"
            :style="{ backgroundColor: colorToString(color, 'hex') }"
            aria-label="饱和度与亮度"
          />
        </ColorAreaArea>
      </ColorAreaRoot>
      <div class="space-y-2">
        <ColorSliderRoot
          :model-value="hueColor"
          channel="hue"
          color-space="hsb"
          :disabled="locked"
          class="relative flex h-5 w-full touch-none items-center select-none"
          @update:color="updateHue"
        >
          <ColorSliderTrack class="h-2.5 w-full grow rounded-full" />
          <ColorSliderThumb
            aria-label="色相"
            class="block size-4 rounded-full border-2 border-white bg-transparent shadow-sm outline-none ring-black/40 focus-visible:ring-2"
          />
        </ColorSliderRoot>
        <ColorSliderRoot
          v-if="props.showAlpha"
          :model-value="color"
          channel="alpha"
          :disabled="locked"
          class="relative flex h-5 w-full touch-none items-center select-none"
          @update:color="updateColor"
        >
          <div
            class="color-picker-checkerboard absolute inset-x-0 h-2.5 rounded-full"
            aria-hidden="true"
          />
          <ColorSliderTrack class="relative h-2.5 w-full grow rounded-full" />
          <ColorSliderThumb
            aria-label="不透明度"
            class="block size-4 rounded-full border-2 border-white bg-transparent shadow-sm outline-none ring-black/40 focus-visible:ring-2"
          />
        </ColorSliderRoot>
      </div>
      <ColorFieldRoot
        :model-value="color"
        :disabled="locked"
        :readonly="props.readonly"
        disable-wheel-change
        @update:color="replaceColor"
      >
        <label
          :for="hexInputId"
          class="mb-1.5 block text-xs text-muted-foreground"
          >HEX 色值</label
        >
        <ColorFieldInput
          :id="hexInputId"
          :class="cn(NEW_API_INPUT_CLASS, 'font-mono')"
          autocomplete="off"
          spellcheck="false"
        />
      </ColorFieldRoot>
      <div
        v-if="presets.length"
        role="group"
        aria-label="预设颜色"
        class="flex flex-wrap gap-1.5"
      >
        <Button
          v-for="preset in presets"
          :key="preset"
          variant="ghost"
          size="icon-sm"
          :disabled="locked"
          :data-color="preset"
          :aria-label="preset"
          :aria-pressed="value === preset"
          class="color-picker-checkerboard relative size-5 rounded border p-0 ring-offset-2 ring-offset-popover transition-shadow hover:ring-2 hover:ring-ring/50 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:ring-2 aria-pressed:ring-ring motion-reduce:transition-none"
          @click="selectPreset(preset)"
        >
          <span
            class="absolute inset-0 rounded-[inherit]"
            :style="{ backgroundColor: preset }"
            aria-hidden="true"
          />
        </Button>
      </div>
      <p class="text-xs text-muted-foreground">
        拖动选色，或输入色值后按回车确认。
      </p>
    </PopoverContent>
  </Popover>
</template>

<style scoped>
.color-picker-checkerboard {
  background-color: var(--background);
  background-image: conic-gradient(
    var(--muted) 25%,
    transparent 0 50%,
    var(--muted) 0 75%,
    transparent 0
  );
  background-size: 8px 8px;
}
</style>
