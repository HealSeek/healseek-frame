<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import { Button } from "@healseek/components";
import type { DataTableRow, UseDataTableReturn } from "@healseek/components";
import type { FormFieldSchema } from "./types";
import {
  useDataTableQueryForm,
  type QueryFormNormalizer,
  type QueryFormValues,
} from "./data-table-query";

defineOptions({ name: "DataTableQueryForm" });

const props = withDefaults(
  defineProps<{
    schema: FormFieldSchema[];
    initialValues?: QueryFormValues;
    table?: Pick<UseDataTableReturn<DataTableRow>, "setFilters">;
    normalizeValues?: QueryFormNormalizer;
    submitOnChange?: boolean;
    changeDebounceMs?: number;
    collapsed?: boolean;
    showCollapseButton?: boolean;
    showDefaultActions?: boolean;
    loading?: boolean;
    class?: string;
  }>(),
  {
    initialValues: () => ({}),
    submitOnChange: false,
    changeDebounceMs: 300,
    collapsed: false,
    showCollapseButton: false,
    showDefaultActions: true,
    loading: false,
  },
);

const emit = defineEmits<{
  (event: "submit", filters: QueryFormValues): void;
  (event: "reset", filters: QueryFormValues): void;
  (event: "update:filters", filters: QueryFormValues): void;
  (event: "update:collapsed", value: boolean): void;
  (event: "invalid", errors: Record<string, string>): void;
}>();

const slots = useSlots();
const collapsed = ref(props.collapsed);
const query = useDataTableQueryForm({
  schema: props.schema,
  initialValues: props.initialValues,
  table: props.table,
  normalizeValues: props.normalizeValues,
  submitOnChange: props.submitOnChange,
  changeDebounceMs: props.changeDebounceMs,
  form: {
    loading: props.loading,
    showDefaultActions: false,
    compact: true,
    wrapperClass: "data-table-query-form__form",
  },
});

const hasActions = computed(
  () => props.showDefaultActions || Boolean(slots.actions),
);

defineExpose({
  api: query.api,
  submit: query.submit,
  reset: query.reset,
  appliedValues: query.appliedValues,
});

function toggle(): void {
  collapsed.value = !collapsed.value;
  emit("update:collapsed", collapsed.value);
}

async function submit(): Promise<void> {
  const result = await query.submit();
  if (!result) {
    emit("invalid", { ...query.api.errors.value });
    return;
  }
  emit("submit", result);
  emit("update:filters", result);
}

async function reset(): Promise<void> {
  const result = await query.reset();
  if (!result) return;
  emit("reset", result);
  emit("update:filters", result);
}

function handleFormSubmit(): void {
  const result = { ...query.appliedValues.value };
  emit("submit", result);
  emit("update:filters", result);
}

function handleFormSubmitFail(errors: Record<string, string>): void {
  emit("invalid", { ...errors });
}
</script>

<template>
  <section
    :class="['data-table-query-form min-w-0', props.class]"
    :data-collapsed="collapsed || undefined"
    data-slot="data-table-query-form"
  >
    <div
      v-if="props.showCollapseButton"
      class="mb-2 flex items-center justify-between"
    >
      <slot name="title" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="h-8 px-2 text-muted-foreground"
        :aria-expanded="!collapsed"
        @click="toggle"
      >
        {{ collapsed ? "展开筛选" : "收起筛选" }}
      </Button>
    </div>
    <div v-show="!collapsed" class="min-w-0">
      <component
        :is="query.Form"
        :aria-busy="
          query.submitting.value || props.loading ? 'true' : undefined
        "
        @submit="handleFormSubmit"
        @submit-fail="handleFormSubmitFail"
      >
        <template #actions="slotProps">
          <div
            v-if="hasActions"
            class="flex flex-wrap items-center justify-end gap-2 border-t border-border/60 pt-2"
          >
            <slot
              name="actions"
              v-bind="slotProps"
              :reset="reset"
              :submit="submit"
              :loading="query.submitting.value || props.loading"
            >
              <Button
                v-if="props.showDefaultActions"
                type="button"
                icon="lucide:rotate-ccw"
                variant="outline"
                size="sm"
                :disabled="query.submitting.value || props.loading"
                @click="reset"
                >重置</Button
              >
              <Button
                v-if="props.showDefaultActions"
                type="submit"
                icon="lucide:search"
                size="sm"
                :disabled="query.submitting.value || props.loading"
                >搜索</Button
              >
            </slot>
          </div>
        </template>
        <template
          v-for="field in props.schema"
          #[`form-${field.fieldName}`]="slotProps"
        >
          <slot :name="`form-${field.fieldName}`" v-bind="slotProps" />
        </template>
      </component>
    </div>
  </section>
</template>

<style scoped>
.data-table-query-form :deep([data-slot="field-group"]) {
  flex-direction: row;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.5rem;
}

.data-table-query-form :deep([data-slot="field"]) {
  min-width: 12rem;
  flex: 1 1 12rem;
  gap: 0.25rem;
}

.data-table-query-form :deep([data-slot="field-label"]) {
  font-size: 0.75rem;
  line-height: 1rem;
}

.data-table-query-form :deep(input),
.data-table-query-form :deep(button),
.data-table-query-form :deep([role="combobox"]) {
  min-height: 2rem;
}

.data-table-query-form :deep([data-slot="field-error"]) {
  font-size: 0.75rem;
}
</style>
