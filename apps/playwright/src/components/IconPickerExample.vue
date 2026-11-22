<script setup lang="ts">
import { ref } from "vue";
import { Button, IconPicker, createIconifySource } from "@healseek/components";
import { useModal } from "@healseek/composables";
import { useForm } from "@healseek/forms";
import { registerIconCollection } from "@healseek/shared/icons";

// These SVG bodies are trusted build-time assets. User-uploaded SVG needs its
// own validation before registration; the picker does not sanitize SVG files.
registerIconCollection(
  {
    prefix: "healseek-demo",
    width: 24,
    height: 24,
    icons: {
      planet: {
        body: '<circle cx="12" cy="12" r="7" fill="none" stroke="currentColor" stroke-width="1.5"/><ellipse cx="12" cy="12" rx="11" ry="3" transform="rotate(-30 12 12)" fill="none" stroke="currentColor" stroke-width="1.5"/>',
      },
      flag: {
        body: '<path d="M5 21V4m0 0c5-5 9 5 14 0v10c-5 5-9-5-14 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
      },
    },
  },
  { title: "示例本地图标" },
);

const localIcon = ref("lucide:home");
const onlineIcon = ref("");
const customIcon = ref("healseek-demo:planet");
const compactIcon = ref("lucide:settings");
const onlineSources = [
  createIconifySource({ prefix: "mdi", label: "Material Design（在线）" }),
  createIconifySource({ prefix: "tabler", label: "Tabler（在线）" }),
];
const customIcons = ["healseek-demo:planet", "healseek-demo:flag"];
const submittedIcon = ref("尚未保存");

// Using the string component name keeps schema-driven forms independent of
// Vue component imports, while the modal owns its own focus/overlay context.
const [IconForm, formApi] = useForm({
  layout: "vertical",
  showDefaultActions: false,
  schema: [
    {
      component: "IconPicker",
      fieldName: "icon",
      label: "导航图标",
      defaultValue: "lucide:home",
      rules: "required",
      description: "选择后保留图标标识，由应用负责保存。",
      componentProps: {
        placeholder: "选择导航图标",
        "aria-label": "导航图标",
      },
    },
  ],
});
const [IconModal, iconModalApi] = useModal({
  title: "在弹窗中选择图标",
  description: "图标面板应显示在当前弹窗上方，选择后仍可继续填写。",
  contentHeight: "20rem",
  confirmText: "保存选择",
  form: () => formApi,
  onConfirm: async () => {
    const result = await formApi.validate();
    if (!result.valid) return false;
    const values = await formApi.getValues();
    submittedIcon.value = String(
      Array.isArray(values.icon) ? values.icon[0]?.value ?? "" : "",
    );
  },
});
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-card p-4">
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-1.5">
        <label for="icon-picker-local" class="text-sm font-medium"
          >本地图标库</label
        >
        <IconPicker id="icon-picker-local" v-model="localIcon" />
        <p class="text-xs text-muted-foreground">
          {{ localIcon || "未选择" }} · 默认使用已打包的本地图标，无需联网。
        </p>
      </div>
      <div class="space-y-1.5">
        <label for="icon-picker-online" class="text-sm font-medium"
          >在线图标库</label
        >
        <IconPicker
          id="icon-picker-online"
          v-model="onlineIcon"
          :sources="onlineSources"
          placeholder="选择图标库后搜索图标"
        />
        <p class="text-xs text-muted-foreground">
          {{ onlineIcon || "未选择" }} · 切换到在线库后请求
          Iconify，需网络及跨域访问支持。
        </p>
      </div>
      <div class="space-y-1.5">
        <label for="icon-picker-custom" class="text-sm font-medium"
          >应用自带图标</label
        >
        <IconPicker
          id="icon-picker-custom"
          v-model="customIcon"
          :icons="customIcons"
        />
        <p class="text-xs text-muted-foreground">
          {{ customIcon || "未选择" }} · 可信 SVG 通过 IconifyJSON
          注册后直接复用。
        </p>
      </div>
      <div class="space-y-1.5">
        <p class="text-sm font-medium">紧凑触发器与只读状态</p>
        <div class="flex items-center gap-3">
          <IconPicker
            v-model="compactIcon"
            type="icon"
            aria-label="选择紧凑图标"
          />
          <IconPicker
            :model-value="compactIcon"
            readonly
            aria-label="只读图标"
          />
        </div>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-3 border-t pt-4">
      <Button icon="lucide:panels-top-left" @click="iconModalApi.open()">
        弹窗与表单示例
      </Button>
      <span class="text-xs text-muted-foreground"
        >最近保存：{{ submittedIcon }}</span
      >
    </div>
    <IconModal>
      <IconForm />
    </IconModal>
  </div>
</template>
