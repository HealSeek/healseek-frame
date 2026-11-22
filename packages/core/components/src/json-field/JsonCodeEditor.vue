<script setup lang="ts">
import { Button, Textarea } from "../controls";
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";

import { toast } from "vue-sonner";
import {
  applyJsonSmartEnter,
  formatJsonDraft,
  getCursorLocation,
  getJsonValidationState,
} from "./json-code-editor-utils";

defineOptions({ name: "JsonCodeEditor" });

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    disabled?: boolean;
    height?: string;
    placeholder?: string;
    ariaLabel?: string;
    name?: string;
    id?: string;
    ariaDescribedby?: string;
    ariaInvalid?: boolean | string;
    dataFormRoot?: string;
    /** Exposes the inner textarea for focus and form integration. */
    textareaRef?: (element: HTMLTextAreaElement | null) => void;
    /** Optional utility class for the editor viewport height. */
    heightClassName?: string;
  }>(),
  { modelValue: "", disabled: false, height: "14rem", ariaLabel: "JSON" },
);

const { t, te } = useI18n({ useScope: "global" });
function translate(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "blur"): void;
  (event: "parse-error", message?: string): void;
}>();

const textarea = ref<HTMLTextAreaElement | null>(null);
const root = ref<HTMLElement | null>(null);
const lineNumberLayer = ref<HTMLElement | null>(null);
const draft = ref(props.modelValue);
const cursor = ref({ line: 1, column: 1 });
const status = computed(() => getJsonValidationState(draft.value));
const lines = computed(() => Math.max(1, draft.value.split("\n").length));
const resolvedAriaInvalid = computed(() => {
  if (props.ariaInvalid === true || props.ariaInvalid === "true") return "true";
  if (props.ariaInvalid === false || props.ariaInvalid === "false")
    return undefined;
  return status.value.isValid ? undefined : "true";
});

watch(
  () => props.modelValue,
  (value) => {
    if (value !== draft.value) draft.value = value;
  },
);
onMounted(() => {
  textarea.value = root.value?.querySelector("textarea") ?? null;
  props.textareaRef?.(textarea.value);
  textarea.value?.addEventListener("scroll", syncScroll);
});
onBeforeUnmount(() => {
  textarea.value?.removeEventListener("scroll", syncScroll);
  textarea.value = null;
  props.textareaRef?.(null);
});

function syncScroll(): void {
  const scrollTop = textarea.value?.scrollTop ?? 0;
  if (lineNumberLayer.value)
    lineNumberLayer.value.style.transform = `translateY(-${scrollTop}px)`;
}

function updateCursor(): void {
  const el = textarea.value;
  if (el) cursor.value = getCursorLocation(draft.value, el.selectionStart);
}
function publish(value: string): void {
  draft.value = value;
  emit("update:modelValue", value);
  emit("parse-error", status.value.isValid ? undefined : status.value.message);
  nextTick(updateCursor);
}
function onKeydown(event: KeyboardEvent): void {
  if (event.key !== "Enter" || props.disabled) return;
  const el = textarea.value;
  if (!el) return;
  const edit = applyJsonSmartEnter(
    draft.value,
    el.selectionStart,
    el.selectionEnd,
  );
  if (!edit) return;
  event.preventDefault();
  publish(edit.value);
  nextTick(() => {
    if (textarea.value) {
      textarea.value.selectionStart = edit.selectionStart;
      textarea.value.selectionEnd = edit.selectionEnd;
    }
  });
}
function format(): void {
  const result = formatJsonDraft(draft.value);
  if (result.didFormat) publish(result.value);
}
async function copy(): Promise<void> {
  if (!draft.value) return;
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    toast.error(translate("common.copyFailed", "复制失败"));
    return;
  }
  try {
    await navigator.clipboard.writeText(draft.value);
    toast.success(translate("common.copiedJson", "已复制 JSON"));
  } catch {
    toast.error(translate("common.copyFailed", "复制失败"));
  }
}
</script>

<template>
  <div
    ref="root"
    :data-form-root="dataFormRoot"
    data-slot="json-code-editor"
    class="overflow-hidden rounded-lg border border-input bg-background outline-transparent transition-colors focus-within:border-ring focus-within:outline-3 focus-within:outline-solid focus-within:-outline-offset-3 focus-within:outline-ring/50 has-[textarea[aria-invalid=true]]:border-destructive has-[textarea[aria-invalid=true]]:outline-destructive/20 dark:has-[textarea[aria-invalid=true]]:outline-destructive/40"
  >
    <div
      class="flex h-8 items-center justify-between border-b bg-muted/30 px-2"
    >
      <div
        class="text-muted-foreground flex min-w-0 items-center gap-1.5 text-xs font-medium"
      >
        <Icon icon="lucide:braces" class="size-3.5" /> <span>JSON</span>
        <span class="font-mono text-muted-foreground/70"
          >{{ cursor.line }}:{{ cursor.column }}</span
        >
      </div>
      <div class="flex items-center gap-2">
        <span
          :class="[
            'flex items-center gap-1 text-xs',
            status.isValid ? 'text-emerald-600' : 'text-destructive',
          ]"
          ><Icon
            :icon="
              status.isValid ? 'lucide:circle-check' : 'lucide:circle-alert'
            "
            class="size-3.5"
          />{{ status.message }}</span
        >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-6 px-2 text-xs"
          :disabled="disabled || !draft"
          @click="copy"
          ><Icon icon="lucide:copy" class="mr-1 size-3.5" />复制</Button
        >
        <Button
          type="button"
          variant="ghost"
          size="sm"
          class="h-6 px-2 text-xs"
          :disabled="disabled || !status.isValid || !draft.trim()"
          @click="format"
          ><Icon icon="lucide:code-2" class="mr-1 size-3.5" />格式化</Button
        >
      </div>
    </div>
    <div
      :class="[
        'relative overflow-hidden bg-background has-[textarea:disabled]:bg-input/30 has-[textarea:disabled]:opacity-70',
        props.heightClassName,
      ]"
      :style="props.heightClassName ? undefined : { height: props.height }"
    >
      <div
        ref="lineNumberLayer"
        aria-hidden="true"
        class="json-code-editor-line-numbers pointer-events-none absolute inset-y-0 left-0 w-9 select-none overflow-hidden border-r bg-muted/20 py-2 text-right font-mono text-xs leading-5 text-muted-foreground/60"
      >
        <div v-for="line in lines" :key="line" class="pr-2">{{ line }}</div>
      </div>
      <Textarea
        :model-value="draft"
        :id="id"
        :name="name"
        :disabled="disabled"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        :aria-describedby="ariaDescribedby"
        :data-form-root="dataFormRoot"
        :aria-invalid="resolvedAriaInvalid"
        class="h-full min-h-0 resize-none border-0 rounded-none py-2 pl-12 pr-3 font-mono text-xs leading-5 focus-visible:ring-0 aria-invalid:ring-0"
        @update:model-value="publish(String($event))"
        @keydown="onKeydown"
        @click="updateCursor"
        @keyup="updateCursor"
        @select="updateCursor"
        @blur="emit('blur')"
      />
    </div>
    <p
      v-if="!status.isValid"
      role="alert"
      class="border-t border-destructive/20 bg-destructive/5 px-3 py-1.5 text-xs text-destructive"
    >
      {{ status.message }}
    </p>
  </div>
</template>
