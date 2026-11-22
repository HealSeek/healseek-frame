# 日期范围

`DateRangePicker`（日期）和 `DateTimeRangePicker`（日期及时间）共用一个弹层和范围日历，不需要用两个字段拼装。

```vue
<script setup lang="ts">
import { ref } from "vue";
import {
  DateTimeRangePicker,
  type DateRangeValue,
} from "@healseek/components/date-picker";

const range = ref<DateRangeValue>();
const presets = [
  {
    label: "最近 24 小时",
    value: (): DateRangeValue => {
      const end = new Date();
      return [new Date(end.getTime() - 86_400_000), end];
    },
  },
];
</script>

<template>
  <DateTimeRangePicker v-model="range" :presets="presets" />
</template>
```

- `modelValue` 为 `[Date, Date] | undefined`；半选留在弹层内，点击确定才提交。取消、Escape、点击外部不会改值，清除提交 `undefined`。
- `showTime` 在 `DateRangePicker` 中默认关闭；`DateTimeRangePicker` 自动开启，保留秒。日期模式返回本地零点。
- `minDate` / `maxDate` 为包含边界：日期模式比较本地日期，时间模式比较精确时刻。默认不禁止未来日期；无效或倒序范围无法确认。
- `presets` 接收 `{ label, value }[]`，`value` 可为范围或每次点击求值的函数；选快捷范围后仍需确认。
- 支持 `disabled`、`clearable`（默认 true）、`placeholder`、`locale`、`numberOfMonths`（1 或 2，默认 2，小屏自动 1）、表单 `id/name/ariaDescribedby/ariaInvalid` 和 `class`。
- 组件不决定接口字段、时区序列化、结束时间是否包含，也不擅自把结束变成当天末尾；这些由调用方处理。
- 表单 schema 可直接配置 `DateRangePicker` / `DateTimeRangePicker`（别名 `daterange` / `datetimerange`）。范围是一个字段的值，顶层 `setValues` 遵循框架的 `[{ value: [start, end] }]` 结构。

实现基于 Reka RangeCalendar 和已有 ui-kit Popover/Field，在 core 层组合，未改 ui-kit 原生源码。弹层继承框架 overlay owner，支持在抽屉和弹窗中使用。
