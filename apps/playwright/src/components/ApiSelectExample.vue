<script setup lang="ts">
import { ref } from "vue";
import {
  ApiSelect,
  ApiMultiSelect,
  type ApiSelectContext,
  type ApiSelectPage,
  type SelectOption,
} from "@healseek/components";

const localValue = ref<string>();
const remoteValue = ref<string>();
const pagedValue = ref<string>("2105964780501078022");
const multipleValues = ref<string[]>(["custom-node"]);
const requests = ref(0);
const options: SelectOption[] = [
  {
    label: "华东节点",
    value: "2105964780501078021",
    description: "上海 · 可用",
  },
  {
    label: "华南节点",
    value: "2105964780501078022",
    description: "广州 · 可用",
  },
  { label: "维护节点", value: "2105964780501078023", disabled: true },
];

async function loadOptions({
  search,
  signal,
}: ApiSelectContext): Promise<SelectOption[]> {
  requests.value += 1;
  // The demo simulates network latency; real apps map their own API response.
  await new Promise<void>((resolve, reject) => {
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(new DOMException("Request aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", abort);
      resolve();
    }, 300);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
  });
  return options.filter(
    (option) => option.label.includes(search) || option.value?.includes(search),
  );
}

async function loadPage(context: ApiSelectContext): Promise<ApiSelectPage> {
  const rows = await loadOptions(context);
  const page = context.page ?? 1;
  return { options: rows.slice(page - 1, page), hasMore: page < rows.length };
}
async function resolveNode(
  value: string,
  { signal }: { signal: AbortSignal },
): Promise<SelectOption | undefined> {
  // A real application would use its detail or batch-lookup endpoint here.
  if (signal.aborted) return undefined;
  return options.find((option) => option.value === value);
}
</script>

<template>
  <div class="space-y-3">
    <div class="grid gap-4 md:grid-cols-2">
      <div class="space-y-1.5">
        <label
          for="api-select-local"
          class="text-xs font-medium text-muted-foreground"
          >接口加载后本地筛选</label
        >
        <ApiSelect
          id="api-select-local"
          v-model="localValue"
          :api="loadOptions"
          placeholder="打开后加载节点"
          search-placeholder="按名称或 ID 筛选"
        />
        <p class="text-xs text-muted-foreground">
          当前 ID：{{ localValue ?? "未选择" }}
        </p>
      </div>
      <div class="space-y-1.5">
        <label
          for="api-select-remote"
          class="text-xs font-medium text-muted-foreground"
          >接口远程搜索</label
        >
        <ApiSelect
          id="api-select-remote"
          v-model="remoteValue"
          :api="loadOptions"
          remote
          placeholder="打开后加载节点"
          search-placeholder="输入名称搜索接口"
        />
        <p class="text-xs text-muted-foreground">
          当前 ID：{{ remoteValue ?? "未选择" }}
        </p>
      </div>
      <div class="space-y-1.5">
        <label
          for="api-select-page"
          class="text-xs font-medium text-muted-foreground"
          >分页与编辑回填</label
        >
        <ApiSelect
          id="api-select-page"
          v-model="pagedValue"
          :api="loadPage"
          :resolve-selected="resolveNode"
          remote
          search-placeholder="搜索后可继续加载"
        />
        <p class="text-xs text-muted-foreground">
          按页加载选项，已有值通过详情查询直接显示名称。
        </p>
      </div>
      <div class="space-y-1.5">
        <label
          for="api-multi-select"
          class="text-xs font-medium text-muted-foreground"
          >接口标签多选</label
        >
        <ApiMultiSelect
          id="api-multi-select"
          v-model="multipleValues"
          :api="loadOptions"
          allow-create
          placeholder="搜索节点或输入自定义标识"
          hint="候选项由接口加载；自定义标识可回车添加。"
        />
        <p class="text-xs text-muted-foreground">
          已选择：{{ multipleValues.join("、") || "未选择" }}
        </p>
      </div>
    </div>
    <p class="text-xs text-muted-foreground">
      模拟接口已请求
      {{ requests }}
      次。空值时打开才加载；左侧搜索在本地完成，右侧搜索防抖后请求接口，ID
      始终保留为字符串。
    </p>
  </div>
</template>
