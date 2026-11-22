<script setup lang="ts">
import { ref } from "vue";
import { Button, ColorPicker } from "@healseek/components";
import { useModal } from "@healseek/composables";
import { useForm } from "@healseek/forms";

const theme = ref("#c2410c");
const translucent = ref("#3b82f680");
const saved = ref("");
const [ColorForm, form] = useForm({
  showDefaultActions: false,
  schema: [
    {
      fieldName: "theme",
      label: "主题颜色",
      component: "ColorPicker",
      defaultValue: "#c2410c",
      rules: "required",
      componentProps: { clearable: false },
    },
  ],
});
const [ColorModal, modal] = useModal({
  title: "颜色表单",
  description: "选色面板跟随当前弹窗的层级，表单支持校验和重置。",
  contentHeight: "20rem",
  confirmText: "保存选择",
  form: () => form,
  onConfirm: async () => {
    const values = await form.validateAndSubmit();
    if (!values) return false;
    saved.value = (values.theme as Array<{ value: string }>)[0]!.value;
  },
});
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-card p-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-1.5">
        <label for="color-example-theme" class="text-sm font-medium"
          >主题颜色</label
        >
        <ColorPicker
          id="color-example-theme"
          v-model="theme"
          :clearable="false"
        />
        <p class="text-xs text-muted-foreground">
          {{ theme }} · 色板、色相和 HEX 输入保持同步。
        </p>
      </div>
      <div class="space-y-1.5">
        <label for="color-example-alpha" class="text-sm font-medium"
          >透明度与自定义预设</label
        >
        <ColorPicker
          id="color-example-alpha"
          v-model="translucent"
          show-alpha
          :presets="['#3b82f680', '#22c55e80', '#a855f780', '#00000000']"
        />
        <p class="text-xs text-muted-foreground">
          {{ translucent || "未选择" }} · 棋盘格表示透明区域。
        </p>
      </div>
      <div class="space-y-1.5">
        <label for="color-example-disabled" class="text-sm font-medium"
          >禁用</label
        >
        <ColorPicker
          id="color-example-disabled"
          :model-value="theme"
          disabled
        />
      </div>
      <div class="space-y-1.5">
        <label for="color-example-readonly" class="text-sm font-medium"
          >只读</label
        >
        <ColorPicker
          id="color-example-readonly"
          :model-value="theme"
          readonly
        />
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-3 border-t pt-4">
      <Button icon="lucide:palette" @click="modal.open()"
        >弹窗与表单示例</Button
      >
      <span class="text-xs text-muted-foreground"
        >最近保存：{{ saved || "尚未保存" }}</span
      >
    </div>
    <ColorModal>
      <ColorForm />
      <Button
        class="mt-4"
        variant="outline"
        icon="lucide:rotate-ccw"
        @click="form.resetForm()"
        >重置颜色</Button
      >
    </ColorModal>
  </div>
</template>
