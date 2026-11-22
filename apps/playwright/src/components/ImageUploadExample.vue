<script setup lang="ts">
import { onBeforeUnmount, ref } from "vue";
import { ImageUpload, type ImageUploadHandler } from "@healseek/components";
import { useForm } from "@healseek/forms";

const image = ref("");
const previews = new Set<string>();
const upload: ImageUploadHandler = async (file, { signal }) => {
  signal.throwIfAborted();
  // This demo previews locally. Real applications return the persisted URL.
  const url = URL.createObjectURL(file);
  previews.add(url);
  return url;
};
const [DemoForm] = useForm({
  showDefaultActions: false,
  schema: [
    {
      fieldName: "image",
      label: "表单图片",
      component: "ImageUpload",
      componentProps: { upload, maxSize: 5 * 1024 * 1024 },
    },
  ],
});
onBeforeUnmount(() => {
  previews.forEach((url) => URL.revokeObjectURL(url));
});
</script>
<template>
  <div class="grid gap-5 lg:grid-cols-2">
    <div class="space-y-3">
      <ImageUpload
        v-model="image"
        :upload="upload"
        :max-size="5 * 1024 * 1024"
        hint="本地预览演示，不上传到服务端；支持 JPG、PNG、GIF，最大 5 MB"
      /><ImageUpload
        :model-value="image"
        :upload="upload"
        disabled
        label="只读图片"
      />
    </div>
    <DemoForm />
  </div>
</template>
