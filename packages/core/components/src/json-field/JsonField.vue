<script setup lang="ts">
import { Button, Input } from "../controls";
import { computed, ref, useAttrs, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";

import {
  formatJson,
  jsonError,
  jsonRowsError,
  parseJsonRows,
  serializeJsonRows,
  type JsonFieldRow,
  type JsonFieldValueType,
} from "./json-field-utils";
import JsonCodeEditor from "./JsonCodeEditor.vue";
import SelectBox from "../select/SelectBox.vue";
import type { JsonFieldTemplate } from "./types";

defineOptions({ name: "JsonField", inheritAttrs: false });

const attrs = useAttrs();
// FormFieldRender attaches the field id/name and validation attributes to the
// custom component. In JSON mode those attributes belong on the actual
// textarea, so keep them out of the visual wrapper and forward them to the
// JsonCodeEditor contract instead.
const editorAttrs = computed(() => {
  const { class: _class, ...rest } = attrs;
  return rest;
});

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    disabled?: boolean;
    valueType?: JsonFieldValueType;
    nested?: boolean;
    template?: Record<string, unknown>;
    templates?: readonly JsonFieldTemplate[];
    keyLabel?: string;
    valueLabel?: string;
    keyPlaceholder?: string;
    valuePlaceholder?: string;
    emptyText?: string;
    placeholder?: string;
    class?: string;
  }>(),
  {
    modelValue: "",
    disabled: false,
    valueType: "string",
    nested: false,
  },
);

const emit = defineEmits<{
  (event: "update:modelValue", value: string): void;
  (event: "parse-error", value?: string): void;
}>();
const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const keyLabel = computed(() => props.keyLabel ?? copy("common.jsonKey", "键"));
const valueLabel = computed(
  () => props.valueLabel ?? copy("common.jsonValue", "值"),
);
const keyPlaceholder = computed(
  () => props.keyPlaceholder ?? copy("common.jsonKeyPlaceholder", "字段名"),
);
const valuePlaceholder = computed(
  () => props.valuePlaceholder ?? copy("common.jsonValuePlaceholder", "字段值"),
);
const emptyText = computed(
  () =>
    props.emptyText ??
    copy("common.jsonEmptyFields", "暂无字段，点击下方按钮添加。"),
);
const visualModeText = computed(() => copy("common.visualMode", "可视化模式"));
const jsonModeText = computed(() => copy("common.jsonMode", "JSON 模式"));
const fillTemplateText = computed(() =>
  copy("common.fillTemplate", "回填模板"),
);
const loadTemplateText = computed(() =>
  copy("common.loadTemplate", "加载模板"),
);
const chooseTemplateText = computed(() =>
  copy("common.chooseTemplate", "选择模板"),
);
const selectedTemplateIndex = ref<string | undefined>("0");
const templateOptions = computed(() =>
  (props.templates ?? []).map((template, index) => ({
    label: template.label,
    value: String(index),
  })),
);
const selectedTemplate = computed(
  () => props.templates?.[Number(selectedTemplateIndex.value)],
);
const activeTemplate = computed(
  () => selectedTemplate.value?.value ?? props.template,
);

watch(
  () => props.templates?.map((template) => template) ?? [],
  (templates, previous) => {
    // Preserve the selected item across reordering, and safely fall back when
    // a caller replaces/removes it. Template changes never write form values.
    const selected = previous?.[Number(selectedTemplateIndex.value)];
    const index = selected
      ? templates.findIndex(
          (template) =>
            template === selected ||
            (!!selected.id && template.id === selected.id),
        )
      : -1;
    selectedTemplateIndex.value = String(Math.max(0, index));
  },
);
const formatText = computed(() => copy("common.format", "格式化"));
const deleteFieldText = computed(() => copy("common.deleteField", "删除字段"));
const addFieldText = computed(() => copy("common.addField", "添加字段"));
const jsonPlaceholder = computed(
  () =>
    props.placeholder ??
    (activeTemplate.value
      ? JSON.stringify(activeTemplate.value, null, 2)
      : '{"key": "value"}'),
);

function canUseVisualMode(value: string): boolean {
  if (!value.trim()) return true;
  try {
    const parsed: unknown = JSON.parse(value);
    return (
      parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
    );
  } catch {
    return false;
  }
}

const mode = ref<"visual" | "json">(
  canUseVisualMode(props.modelValue) ? "visual" : "json",
);
const rootAttrs = computed(() => {
  const { class: _class, id, name, ...rest } = attrs;
  // The textarea owns the field identity in JSON mode. Keeping id/name off
  // the wrapper avoids duplicate IDs while preserving the old visual-mode
  // wrapper contract for labels and validation surfaces.
  return mode.value === "json" ? rest : { ...rest, id, name };
});
const draft = ref(props.modelValue);
const rows = ref<JsonFieldRow[]>(parseJsonRows(props.modelValue, props.nested));
const error = computed(() => jsonError(draft.value));
const visualModeError = computed(() =>
  canUseVisualMode(draft.value)
    ? undefined
    : error.value ??
      copy(
        "common.jsonObjectRequired",
        "可视化模式只支持 JSON 对象，请在 JSON 模式中编辑或改为对象。",
      ),
);

watch(
  () => props.modelValue,
  (value) => {
    if (value === draft.value) return;
    draft.value = value;
    rows.value = parseJsonRows(value, props.nested);
    if (!canUseVisualMode(value)) mode.value = "json";
  },
);
watch(
  () => props.nested,
  () => {
    rows.value = parseJsonRows(draft.value, props.nested);
  },
);

function publish(value: string): void {
  draft.value = value;
  emit("update:modelValue", value);
  emit("parse-error", jsonError(value));
}

function updateRows(next: JsonFieldRow[]): void {
  rows.value = next;
  const rowError = jsonRowsError(next, props.valueType);
  if (rowError) {
    emit("parse-error", rowError);
    return;
  }
  publish(serializeJsonRows(next, props.valueType, props.nested));
}

function addRow(): void {
  updateRows([
    ...rows.value,
    { id: `${Date.now()}-${rows.value.length}`, key: "", value: "" },
  ]);
}

function updateRow(id: string, field: "key" | "value", value: string): void {
  updateRows(
    rows.value.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
  );
}

function removeRow(id: string): void {
  updateRows(rows.value.filter((row) => row.id !== id));
}

function toggleMode(): void {
  if (mode.value === "visual") {
    const rowError = jsonRowsError(rows.value, props.valueType);
    if (rowError) {
      emit("parse-error", rowError);
      return;
    }
    // A mode switch is only a presentation change. Serializing untouched rows
    // here would change formatting and coerce values to the selected valueType.
    mode.value = "json";
  } else {
    if (visualModeError.value) {
      // Arrays and scalars are valid JSON; only the visual representation is
      // unsupported. Do not turn that presentation limit into a form error.
      if (error.value) emit("parse-error", error.value);
      return;
    }
    rows.value = parseJsonRows(draft.value, props.nested);
    mode.value = "visual";
  }
}

function fillTemplate(): void {
  if (props.disabled || activeTemplate.value === undefined) return;
  publish(JSON.stringify(activeTemplate.value, null, 2));
  rows.value = parseJsonRows(draft.value, props.nested);
}

function formatDraft(): void {
  if (error.value || !draft.value.trim()) return;
  publish(formatJson(draft.value));
  rows.value = parseJsonRows(draft.value, props.nested);
}
</script>

<template>
  <div
    v-bind="rootAttrs"
    :class="['space-y-2', props.class]"
    :aria-disabled="disabled"
  >
    <div class="flex flex-wrap items-center justify-between gap-2">
      <div class="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="disabled"
          @click="toggleMode"
        >
          <Icon
            :icon="mode === 'visual' ? 'lucide:code-2' : 'lucide:table-2'"
            class="mr-2 size-4"
          />
          {{ mode === "visual" ? jsonModeText : visualModeText }}
        </Button>
        <Button
          v-if="template && !templateOptions.length"
          type="button"
          size="sm"
          variant="link"
          class="h-auto p-0"
          :disabled="disabled"
          @click="fillTemplate"
          >{{ fillTemplateText }}</Button
        >
      </div>
      <Button
        v-if="mode === 'json'"
        type="button"
        size="sm"
        variant="ghost"
        :disabled="disabled || !!error || !draft.trim()"
        @click="formatDraft"
        >{{ formatText }}</Button
      >
    </div>

    <div v-if="templateOptions.length" class="space-y-1.5">
      <div class="flex items-center gap-2">
        <div class="min-w-0 flex-1">
          <SelectBox
            v-model="selectedTemplateIndex"
            :options="templateOptions"
            :aria-label="chooseTemplateText"
            :placeholder="chooseTemplateText"
            :disabled="disabled"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          :disabled="disabled || !selectedTemplate"
          @click="fillTemplate"
        >
          <Icon icon="lucide:file-input" class="mr-2 size-4" />
          {{ loadTemplateText }}
        </Button>
      </div>
      <p
        v-if="selectedTemplate?.description"
        class="text-xs text-muted-foreground"
      >
        {{ selectedTemplate.description }}
      </p>
    </div>

    <div v-if="mode === 'visual'" class="space-y-2">
      <div
        v-if="rows.length"
        class="grid grid-cols-[1fr_1fr_auto] gap-2 text-sm font-medium"
      >
        <span>{{ keyLabel }}</span
        ><span>{{ valueLabel }}</span
        ><span />
      </div>
      <div
        v-for="(row, index) in rows"
        :key="row.id"
        class="grid grid-cols-[1fr_1fr_auto] gap-2"
      >
        <Input
          :model-value="row.key"
          :aria-label="`${keyLabel} ${index + 1}`"
          :placeholder="keyPlaceholder"
          :disabled="disabled"
          @update:model-value="updateRow(row.id, 'key', String($event))"
        />
        <slot
          name="value"
          :row="row"
          :index="index"
          :disabled="disabled"
          :label="`${valueLabel} ${index + 1}`"
          :update-value="(value: string) => updateRow(row.id, 'value', value)"
        >
          <Input
            :model-value="row.value"
            :aria-label="`${valueLabel} ${index + 1}`"
            :placeholder="valuePlaceholder"
            :disabled="disabled"
            @update:model-value="updateRow(row.id, 'value', String($event))"
          />
        </slot>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          class="h-10 w-10"
          :disabled="disabled"
          :aria-label="deleteFieldText"
          @click="removeRow(row.id)"
          ><Icon icon="lucide:trash-2" class="size-4"
        /></Button>
      </div>
      <div
        v-if="!rows.length"
        class="flex h-24 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground"
      >
        {{ emptyText }}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        class="w-full"
        :disabled="disabled"
        @click="addRow"
        ><Icon icon="lucide:plus" class="mr-2 size-4" />{{
          addFieldText
        }}</Button
      >
    </div>
    <div v-else class="space-y-1.5">
      <JsonCodeEditor
        v-bind="editorAttrs"
        :model-value="draft"
        :placeholder="jsonPlaceholder"
        :disabled="disabled"
        @update:model-value="publish"
        @parse-error="(message) => emit('parse-error', message)"
      />
      <p
        v-if="visualModeError && !error"
        role="alert"
        class="text-xs text-muted-foreground"
      >
        {{ visualModeError }}
      </p>
    </div>
  </div>
</template>
