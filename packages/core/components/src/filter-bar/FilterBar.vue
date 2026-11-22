<script lang="ts" setup>
import { Button, Input } from '../controls'
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";

defineOptions({ name: "FilterBar" });

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    placeholder?: string;
    clearable?: boolean;
    class?: string;
  }>(),
  {
    modelValue: "",
    clearable: true,
  },
);

const { t } = useI18n({ useScope: "global" });

const emit = defineEmits<{
  "update:modelValue": [value: string];
  clear: [];
}>();

const hasSearch = computed(() => props.modelValue.length > 0);

function clear() {
  emit("update:modelValue", "");
  emit("clear");
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-2" :class="$props.class">
    <!-- Keep the search control at the same fixed responsive widths as the
             new-api data-table toolbar. A flex-growing search field makes a
             row of small filters wrap into one control per line on medium
             screens, which creates an unnecessarily tall toolbar. -->
    <div class="relative min-w-0 w-full sm:w-[200px] lg:w-[240px]">
      <Icon
        icon="lucide:search"
        class="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
      />
      <Input
        :model-value="modelValue"
        :placeholder="placeholder ?? t('common.search')"
        class="h-8 pl-8 pr-8 text-sm"
        @update:model-value="emit('update:modelValue', String($event ?? ''))"
      />
      <Button
        v-if="clearable && hasSearch"
        type="button"
        variant="ghost"
        size="icon"
        class="absolute right-0.5 top-0.5 size-7 text-muted-foreground hover:text-foreground"
        :aria-label="t('common.clearSearch')"
        @click="clear"
      >
        <Icon icon="lucide:x" class="size-3.5" />
      </Button>
    </div>
    <div v-if="$slots.filters" class="flex flex-wrap items-center gap-1.5">
      <slot name="filters" />
    </div>
    <div
      v-if="$slots.actions"
      class="ms-auto flex flex-wrap items-center gap-1.5 sm:gap-2"
    >
      <slot name="actions" />
    </div>
  </div>
</template>
