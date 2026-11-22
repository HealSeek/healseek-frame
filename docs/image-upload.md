# ImageUpload 图片上传

从 `@healseek/components` 或 `@healseek/components/image-upload` 导入。组件负责单图上传、拖放、预览、替换、移除、进度、取消和失败重试；应用提供上传函数与持久化地址。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ImageUpload, type ImageUploadHandler } from "@healseek/components";

const image = ref("");
const upload: ImageUploadHandler = async (file, { signal, onProgress }) => {
  const body = new FormData();
  body.append("file", file);
  const response = await fetch("/your-upload-endpoint", {
    method: "POST",
    body,
    signal,
  });
  if (!response.ok) throw new Error("图片上传失败，请重试");
  const asset = await response.json();
  onProgress(100);
  return asset.url;
};
</script>
<template>
  <ImageUpload v-model="image" :upload="upload" :max-size="5 * 1024 * 1024" />
</template>
```

`upload(file, { signal, onProgress })` 返回 URL 或 `{ url }`。`accept` 默认为 JPEG、PNG、GIF，`maxSize` 单位为字节；未传大小上限时由服务端决定。客户端检查帮助交互，服务端仍须检查真实格式、权限和大小。`disabled`、`readonly` 均禁止上传与移除。

组件采用受控值：上传完成发出 `update:modelValue` 和 `uploaded`，父组件回填后才替换预览。取消、外部值变化、禁用或卸载会中止请求并忽略旧结果。取消上传不保证服务端没有保存文件；清理待用文件和保护业务引用由应用负责。移除仅发出空字符串，不发送删除请求。

`busy-change` 可用于禁用保存按钮或表单校验，避免图片未传完就保存。`error` 接收实际异常。`actions` 插槽可放应用自己的文件库选择入口。默认组件不提供 URL 文本输入，也不绑定业务分类或存储服务。

成功上传时先发出 `busy-change(false)`，再发布图片地址与 `uploaded`，以便父表单对完成后的状态进行校验。schema 内置字段把上传回填视为已提交的选择，会重新校验并清除原有必填提示。

表单 schema 使用 `component: 'ImageUpload'`（也支持 `image-upload`），在 `componentProps` 中传入 `upload`。富文本编辑器 `RichTextEditor` 也接受同一个 `uploadImage` 函数，启用“插入图片”操作。未传入时保留原有编辑行为。

应用包装上传组件后，可给 schema 设置 `validateOnModelUpdate: true`，让自定义组件回填地址时也触发表单校验；未配置的自定义编辑器保留原有输入行为。

媒体组件演示页包含本地预览和 schema 示例。演示用的 blob URL 由应用创建并在卸载时释放；实际应用应返回可持久化的 HTTP(S) 或站内绝对路径。
