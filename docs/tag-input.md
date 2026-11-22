# TagInput 标签输入

`TagInput` 是 `packages/core/components` 的通用组合组件，供任意字符串标签字段使用；不包含业务标识校验。它保留原生 ui-kit，通过组合层定义标签布局与交互。

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { TagInput } from '@healseek/components/tag-input'

const tags = ref<string[]>([])
</script>

<template>
  <label for="tags">标签</label>
  <TagInput
    id="tags"
    v-model="tags"
    placeholder="输入标签后按回车"
    :remove-tag-label="(tag) => `删除 ${tag}`"
  />
</template>
```

输入后按 Enter、英文逗号或失焦提交；提交时 trim、忽略空白和已有标签。输入框为空时 Backspace 删除最后一项，点击标签的删除按钮删除指定项。中文输入法确认不会提交标签，Enter 不会触发父表单快捷提交。外部值是受控的 `string[]`，提交总是返回新数组。

| 属性/事件 | 类型 | 说明 |
| --- | --- | --- |
| `modelValue` / `update:modelValue` | `string[]` | 已提交标签，默认 `[]` |
| `placeholder` | `string` | 无标签时显示，默认 `Add tags...` |
| `disabled` | `boolean` | 禁止输入、聚焦与删除 |
| `readOnly` | `boolean` | 保留聚焦、选择文本，禁止增删 |
| `class` / `inputClass` | `HTMLAttributes['class']` | 外框 / 原生输入框样式 |
| `removeTagLabel` | `(tag: string) => string` | 本地化删除按钮名称，默认 `Remove ${tag}` |
| `focus` / `blur` | `FocusEvent` | 原生输入框焦点事件；blur 前先提交草稿 |

`id`、`name`、`aria-invalid`、`aria-describedby`、`aria-labelledby` 和其余原生属性传入真实 input。组件实例提供 `focus()` / `blur()`。表单值请从 v-model 或 FormApi 获取；原生 `FormData` 的 input 内容仅代表当前未提交草稿。

## Schema 表单

```ts
const schema = [{
  fieldName: 'tags',
  label: '标签',
  component: 'TagInput', // 也支持 'tag-input' 或实际组件对象
  componentProps: { placeholder: '输入后按回车', removeTagLabel: (tag: string) => `删除 ${tag}` },
  rules: 'required', // 可选；数组至少一项。复杂规则请传 z.array(z.string())。
}]
```

空值默认 `[]`，每次标签增删立即更新校验；不需要设置 `array: true`。`array: true` 表示多行标签编辑器，每行仍然是一个 `string[]`。

## 视觉依据与验收

实际对照 new-api 的 `web/src/components/tag-input.tsx`、`ui/badge.tsx`：外框使用 `border-input`、`ring-ring/50`，最小高度 36px、圆角 6px、水平 padding 12px、垂直 padding 8px、标签间距 8px；标签使用 `bg-secondary` / `text-secondary-foreground`，删除 hover 使用 `secondary-foreground/20`。多标签换行，过长单标签省略，保留 title。

交互单测覆盖键盘、中文输入法、受控更新、禁用/只读、焦点属性与真实 schema 表单提交/重置。light/dark、桌面/移动视觉和实际浏览器焦点验收由集成环境执行；未执行前不能视为已通过。
