# API 标签多选

`ApiMultiSelect` 组合框架的 `MultiSelect`，点击或聚焦输入框后加载选项，选中的值显示为可移除的标签。复用 `ApiSelect` 的 loader 协议，应用自行负责接口地址、权限和返回字段转换，不需要额外安装依赖。

```vue
<script setup lang="ts">
import { ref } from "vue";
import { ApiMultiSelect, type ApiMultiSelectLoader } from "@healseek/components";

const values = ref<string[]>([]);
const loadOptions: ApiMultiSelectLoader = async ({ signal }) => {
  const response = await fetch("/api/options", { signal });
  if (!response.ok) throw new Error("选项加载失败");
  const rows: Array<{ code: string; name: string }> = await response.json();
  return {
    options: rows.map((row) => ({ label: row.name, value: row.code })),
    hasMore: false,
    hint: "可搜索名称或标识，多次选择。",
  };
};
</script>

<template>
  <label for="sources">来源</label>
  <ApiMultiSelect
    id="sources"
    v-model="values"
    :api="loadOptions"
    placeholder="选择来源"
  />
</template>
```

公共出口为 `@healseek/components` 和 `@healseek/components/select`。`ApiMultiSelectContext`、`ApiMultiSelectLoader`、`ApiMultiSelectPage` 是单选 API loader 类型的别名。

- `modelValue`：受控的 `string[]`；未知的已选值依旧显示和保留，不擅自清空。
- `api({ search, page, signal })`：返回 `SelectOption[]` 或 `{ options, hasMore, hint? }`。`description` 显示为选项提示，`icon`、`disabled` 保留，空值选项不会成为可选标签。
- `remote`：默认 `false`，下载列表后在本地搜索名称、标识和提示。设为 `true` 时按 `debounce`（默认 250ms）调用接口，直接展示接口的排序和匹配结果。
- `allowCreate`：默认 `false`。显式开启后允许回车创建自定义标签，支持中英文逗号及换行批量粘贴；适合远端只能提供部分候选项的场景，不适合必须选择真实记录 ID 的表单。
- `loadingText`、`errorText`、`retryText`、`emptyText`、`hint`：配置弹层内的状态文案。失败可重试，分页失败保留已加载列表。
- `id`、`name`、`aria-*`：传到实际输入框，支持 label 聚焦和表单辅助说明；`disabled` 同时禁止输入、选择和移除。
- `maxVisibleChips`：折叠过多标签；`copyChipOnClick`：允许点击标签复制值；`selected-summary` 插槽可替换标签展示。
- 事件：`update:modelValue`、`open-change`、`load-error`；实例方法：`reload()`、`focus()`、`blur()`。

每次打开重新加载。传入的 `api` 函数引用改变时清空候选列表和缓存名称，保留受控选择；正在打开则立即加载新来源。切换来源、关闭、禁用或卸载会中断请求，并忽略不遵循 AbortSignal 的迟到结果。请使用稳定函数或计算属性生成 loader，避免每次渲染创建新函数。

## 接入框架表单

```ts
import { useForm } from "@healseek/forms";

const [Form, formApi] = useForm({
  schema: [{
    fieldName: "sources",
    label: "来源",
    component: "ApiMultiSelect",
    rules: "required",
    componentProps: { api: loadOptions },
  }],
});
```

表单支持 `MultiSelect`、`multi-select`、`ApiMultiSelect`、`api-multi-select` 和直接传入组件对象。字段默认值为 `[]`；不配置规则时允许空数组，`required` 要求至少选择一项，也可传入显式 Zod 数组规则。选择或移除标签会立即更新校验。

一个多选字段是一份 `string[]` 值，沿用框架的行包装约定，例如 `sources: [{ value: ["one", "two"] }]`。`array: true` 表示重复的多选控件，各行分别保存数组；嵌套对象中的非重复字段直接保存数组，不额外展开为多行。

样式沿用 new-api `web/src/components/multi-select.tsx` 的标签组合结构：`bg-muted` 标签、`rounded-sm` 标签圆角、`rounded-lg` 输入和弹层、`bg-accent` 悬浮/键盘高亮及主题 token。代码位于 `packages/core/components`，没有修改 `ui-kit` 原生组件。浏览器视觉验收在业务接入时执行，未以单元测试代替 light/dark、桌面/移动端的视觉对比。
