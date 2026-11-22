<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, provide, ref, useId } from "vue";
import { Button } from "@healseek/components";
import {
  getFormContexts,
  FormContextKey,
  PublicFormContextKey,
} from "./form-context";
import FormFieldRender from "./FormFieldRender.vue";
import type { FormApi } from "./form-api";
import { FormDomKey, registerFormDom } from "./form-dom";

defineOptions({ inheritAttrs: false });

const props = defineProps<{
  api: FormApi;
}>();

const emit = defineEmits<{
  submit: [values: Record<string, unknown>];
  "submit-fail": [errors: Record<string, string>];
}>();

provide("formApi", props.api);
const formElement = ref<HTMLFormElement | null>(null);
const dom = { id: useId(), element: formElement };
provide(FormDomKey, dom);
let unregisterDom: (() => void) | undefined;
onMounted(() => {
  unregisterDom = registerFormDom(props.api, dom);
});
onBeforeUnmount(() => {
  unregisterDom?.();
});
const contexts = getFormContexts(props.api);
if (contexts) {
  provide(FormContextKey, contexts.private);
  provide(PublicFormContextKey, contexts.public);
}

const isSubmitting = computed(() => props.api.isSubmitting);
const isLoading = computed(() => props.api.loading);
const isDisabled = computed(() => props.api.disabled);
const formErrors = computed(() => props.api.errors.value);

async function onSubmit(event: Event) {
  const values = await props.api.submitForm(event);
  if (values) emit("submit", values);
  else emit("submit-fail", { ...props.api.errors.value });
}

function onReset() {
  props.api.resetForm();
}
</script>

<template>
  <form
    ref="formElement"
    v-bind="$attrs"
    :class="[
      props.api.props.compact ? 'space-y-1' : 'space-y-4',
      props.api.props.wrapperClass,
    ]"
    @submit.prevent="onSubmit"
  >
    <fieldset
      :disabled="isDisabled || isLoading"
      :class="['min-w-0', props.api.props.compact ? 'space-y-1' : 'space-y-4']"
    >
      <FormFieldRender :schema="props.api.schema" :api="props.api" />

      <slot
        name="actions"
        :errors="formErrors"
        :submitting="isSubmitting"
        :reset="onReset"
      >
        <div
          v-if="props.api.props.showDefaultActions !== false"
          class="flex justify-end gap-2"
        >
          <Button
            type="button"
            variant="outline"
            icon="lucide:rotate-ccw"
            :disabled="isLoading"
            @click="onReset"
          >
            重置
          </Button>
          <Button type="submit" icon="lucide:check" :disabled="isLoading">
            {{ isSubmitting ? "提交中..." : "提交" }}
          </Button>
        </div>
      </slot>
    </fieldset>
  </form>
</template>
