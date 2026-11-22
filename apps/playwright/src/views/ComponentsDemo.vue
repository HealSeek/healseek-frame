<script lang="ts" setup>
import { computed, ref } from "vue";
import {
  DataPanel,
  CommandMenu,
  DataTable,
  TruncatedCell,
  TruncatedText,
  DataTableBulkActions,
  DataTablePage,
  DataTableRowActions,
  StaticRowActions,
  DataTableToolbar,
  ChartCard,
  useDataTable,
  DatePicker,
  DateRangePicker,
  DateTimePicker,
  DateTimeRangePicker,
  Drawer,
  DrawerLayout,
  DrawerSection,
  DrawerSectionHeader,
  DrawerSwitchItem,
  EmptyState,
  ErrorState,
  FacetedFilter,
  FilterBar,
  LiveLog,
  LoadingState,
  MetricStrip,
  PageContainer,
  PageFooterPortal,
  ResultPage,
  SectionPage,
  StatCard,
  StatusBadge,
  StatusBadgeList,
  StatusBadgeTypeProvider,
  UserCard,
  FrameworkPopover,
  FrameworkTooltip,
  FrameworkCalendar,
  PasswordInput,
  TagInput,
  type DataTableColumn,
  type DataTableColumnPinning,
  type DataTableFilterGroup,
  type DataTableFetcher,
  type DataTableQuery,
  type DataTableQueryState,
} from "@healseek/components";

import { PermissionButton } from "@healseek/permission";
import {
  Badge,
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  Slider,
  Spinner,
  Toggle,
  ButtonGroup,
  ButtonGroupSeparator,
  ButtonGroupText,
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  AspectRatio,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  Accordion,
  AccordionContent,
  AccordionHeader,
  AccordionItem,
  AccordionTrigger,
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  NativeSelect,
  NativeSelectOption,
  Progress,
  RadioGroup,
  RadioGroupItem,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@healseek/uikit-shadcnui";
import {
  Combobox,
  MultiSelect,
  SelectBox,
  SearchSelect,
} from "@healseek/components";
import {
  DataTableQueryPage,
  type QueryFormValues,
  type FormFieldSchema,
} from "@healseek/forms";
import { useDrawer, useModal } from "@healseek/composables";
import {
  useEventSourceSession,
  type EventSourceProtocolEventPayload,
} from "@healseek/request";
import { ServiceHealthCard } from "@healseek/app-ui";
import OverlaySelectExample from "./_examples/OverlaySelectExample.vue";
import OverlayDatePickerExample from "./_examples/OverlayDatePickerExample.vue";
import VideoPlayerExample from "../components/VideoPlayerExample.vue";
import HlsWorkbenchExample from "../components/HlsWorkbenchExample.vue";
import ApiSelectExample from "../components/ApiSelectExample.vue";
import IconPickerExample from "../components/IconPickerExample.vue";
import ColorPickerExample from "../components/ColorPickerExample.vue";
import ImageUploadExample from "../components/ImageUploadExample.vue";
import { getDemoEventsUrl } from "../api/core/events";

const frameworkPopoverOpen = ref(false);
const frameworkTooltipOpen = ref(false);

function onAdd() {
  globalThis.alert("新增");
}

function retryDataPanel() {
  dataPanelRetryCount.value += 1;
  dataPanelState.value = "ready";
}

defineOptions({ name: "ComponentsDemo" });

const props = withDefaults(
  defineProps<{
    category?:
      | "all"
      | "basic"
      | "forms"
      | "data"
      | "feedback"
      | "media"
      | "layout";
  }>(),
  { category: "all" },
);

function showCategory(
  category: Exclude<NonNullable<typeof props.category>, "all">,
): boolean {
  return props.category === "all" || props.category === category;
}

const categoryTitle = computed(() => {
  const titles: Record<NonNullable<typeof props.category>, string> = {
    all: "框架组件库演示",
    basic: "基础组件演示",
    forms: "表单与选择组件",
    data: "数据展示组件",
    feedback: "反馈与弹层组件",
    media: "媒体与图标组件",
    layout: "页面与布局组件",
  };
  return titles[props.category];
});

const categoryDescription = computed(() => {
  if (props.category === "all") {
    return "@healseek/components 提供的通用后台组件；页面骨架和基础交互由框架包提供。";
  }
  return "按组件职责拆分的独立演示页；可从左侧子导航切换其它组件类别。";
});

const showResult = ref(false);
const search = ref("");
const showDialog = ref(false);
const showAlertDialog = ref(false);
const showDrawer = ref(false);
const showRightDrawer = ref(false);
const dataPanelState = ref<"loading" | "empty" | "error" | "ready">("loading");
const dataPanelRetryCount = ref(0);
const commandMenuOpen = ref(false);
const selectedCommand = ref("尚未选择");
const contextMenuPinned = ref(true);
const contextMenuDensity = ref("compact");
const selectedDate = ref<Date>();
const selectedDateRange = ref<[Date, Date]>();
const selectedDateTime = ref<Date>();
const selectedDateTimeRange = ref<[Date, Date]>();
const dateRangePresets = [7, 30].map((days) => ({
  label: `最近 ${days} 天`,
  value: (): [Date, Date] => {
    const end = new Date();
    return [new Date(end.getTime() - days * 86400000), end];
  },
}));
const demoPassword = ref("demo-secret");
const demoTags = ref<string[]>(["示例标签", "支持回车添加"]);
const selectedProvider = ref<string | undefined>("openai");
const selectedCombobox = ref<string | undefined>();
const selectedMultiSelect = ref<string[]>(["openai"]);
const multiSelectSummary = (values: string[]) => `${values.length} 个已选`;
const selectedRegion = ref("us-east");
const searchedProvider = ref<string | undefined>();
const selectedChannelStatus = ref<string | undefined>();
const selectedChannelTypes = ref<string[]>([]);
const providerOptions = [
  {
    label: "OpenAI 主渠道",
    value: "openai",
    description: "默认模型供应商",
    icon: "lucide:cloud",
  },
  {
    label: "Claude 备用渠道",
    value: "claude",
    description: "备用模型供应商",
    icon: "lucide:server",
  },
  { label: "本地 Ollama（禁用）", value: "ollama", disabled: true },
];
const hierarchicalProviderOptions = [
  { label: "云服务", children: providerOptions.slice(0, 2) },
  { label: "本地服务", children: [providerOptions[2]!] },
];
const commandMenuGroups = [
  {
    id: "navigation",
    label: "导航",
    items: [
      { id: "overview", label: "运营概览", shortcut: "G O" },
      { id: "channels", label: "渠道管理", shortcut: "G C" },
    ],
  },
  {
    id: "actions",
    label: "操作",
    items: [
      { id: "refresh", label: "刷新数据" },
      { id: "disabled", label: "禁用操作", disabled: true },
    ],
  },
] as const;
const channelStatusOptions = [
  { label: "运行中", value: "enabled", count: 24 },
  { label: "已停用", value: "disabled", count: 3 },
  { label: "自动停用", value: "auto-disabled", count: 1 },
];
const channelTypeOptions = [
  { label: "OpenAI 兼容", value: "openai", count: 12 },
  { label: "Claude", value: "claude", count: 8 },
  { label: "Ollama", value: "ollama", count: 5 },
  { label: "自定义", value: "custom", count: 3 },
];
function resetChannelFilters(): void {
  selectedChannelStatus.value = undefined;
  selectedChannelTypes.value = [];
}

/** Store the selected demo command; real applications own the command action. */
function onCommandSelect(item: { label: string }): void {
  selectedCommand.value = item.label;
}
const [DemoModal, demoModalApi] = useModal({
  title: "保存设置",
  description: "这是框架内置 ModalApi 的确认流程。",
  contentHeight: "22rem",
  initialFocus: "#modal-demo-input",
  bodyClass: "bg-muted/10",
  onConfirm: async () => {
    await new Promise((resolve) => setTimeout(resolve, 350));
  },
});
interface DemoDrawerData {
  channelId: number;
  name: string;
}

interface DemoDrawerResult {
  saved: boolean;
  channelId: number;
  name: string;
}

const typedDrawerName = ref("");
const typedDrawerResult = ref("尚未提交 typed Drawer 结果");
const [DemoDrawer, demoDrawerApi] = useDrawer<DemoDrawerData, DemoDrawerResult>(
  {
    side: "right",
    title: "编辑渠道（typed Drawer）",
    description:
      "DrawerApi 和 ModalApi 共享 payload/result/close reason 契约。",
    contentHeight: "28rem",
    initialFocus: "#typed-drawer-input",
    bodyClass: "bg-muted/10",
    onConfirm: async (data, api) => {
      const name = typedDrawerName.value.trim();
      if (!name) {
        api.setState({ error: "请输入渠道名称后再确认。" });
        return false;
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
      return { saved: true, channelId: data?.channelId ?? 0, name };
    },
  },
);

function openTypedDrawer(): void {
  typedDrawerName.value = "演示渠道";
  typedDrawerResult.value = "等待确认或取消…";
  demoDrawerApi.open({ channelId: 42, name: typedDrawerName.value });
  void demoDrawerApi.waitForResult().then((outcome) => {
    typedDrawerResult.value =
      outcome.accepted && outcome.result
        ? `确认回传：${outcome.result.name} (#${outcome.result.channelId})`
        : `关闭原因：${outcome.reason}`;
  });
}
const demoMetrics = [
  {
    key: "requests",
    label: "请求数",
    value: "18,240",
    hint: "过去 24 小时",
    icon: "lucide:activity",
    tone: "info" as const,
  },
  {
    key: "success",
    label: "成功率",
    value: "99.2%",
    hint: "较昨日 +0.8%",
    icon: "lucide:check-circle-2",
    tone: "success" as const,
  },
  {
    key: "latency",
    label: "平均延迟",
    value: "284 ms",
    hint: "P95 612 ms",
    icon: "lucide:gauge",
  },
  {
    key: "tokens",
    label: "Token 消耗",
    value: "2.48M",
    hint: "本月累计",
    icon: "lucide:coins",
    tone: "warning" as const,
  },
];
const demoChartData = {
  labels: ["周一", "周二", "周三", "周四", "周五", "周六", "周日"],
  datasets: [
    {
      label: "请求量",
      data: [320, 410, 365, 520, 468, 590, 640],
      tension: 0.35,
      fill: true,
    },
    {
      label: "成功量",
      data: [300, 398, 352, 506, 455, 576, 628],
      tension: 0.35,
    },
  ],
};
const demoChartLegend = [
  { label: "请求量", color: "var(--color-chart-1)" },
  { label: "成功量", color: "var(--color-chart-2)" },
];
const tableRows = [
  { id: 1, name: "StatCard", category: "数据展示", purpose: "汇总指标" },
  { id: 2, name: "StatusBadge", category: "状态展示", purpose: "标识状态" },
  { id: 3, name: "DataTable", category: "数据展示", purpose: "展示列表" },
];
const coreTableColumns: DataTableColumn[] = [
  { key: "name", title: "组件", sortable: true },
  { key: "category", title: "类别", sortable: true },
  { key: "purpose", title: "用途" },
];
const serverTableRows = Array.from({ length: 37 }, (_, index) => ({
  id: index + 1,
  name: `演示渠道 ${String(index + 1).padStart(2, "0")}`,
  type: index % 3 === 0 ? "OpenAI" : index % 3 === 1 ? "Claude" : "自定义",
  status: index % 5 === 0 ? "已停用" : "运行中",
}));
const serverTableColumns: DataTableColumn[] = [
  {
    key: "name",
    title: "渠道名称",
    sortable: true,
    width: "280px",
    resizable: true,
    minSize: 140,
    maxSize: 320,
    mobileTitle: true,
    mobileOrder: 1,
  },
  {
    key: "type",
    title: "类型",
    sortable: true,
    width: "180px",
    resizable: true,
    minSize: 100,
    maxSize: 220,
  },
  {
    key: "status",
    title: "状态",
    sortable: true,
    width: "160px",
    resizable: true,
    minSize: 100,
    maxSize: 220,
    mobileBadge: true,
  },
  { key: "id", title: "内部 ID", hidden: true, width: "120px" },
];
const serverTableFilters: DataTableFilterGroup[] = [
  {
    key: "status",
    title: "状态",
    singleSelect: true,
    options: [
      { label: "运行中", value: "运行中", count: 30 },
      { label: "已停用", value: "已停用", count: 7 },
    ],
  },
  {
    key: "type",
    title: "类型",
    singleSelect: true,
    options: [
      { label: "OpenAI", value: "OpenAI", count: 13 },
      { label: "Claude", value: "Claude", count: 12 },
      { label: "自定义", value: "自定义", count: 12 },
    ],
  },
];
const serverTableFailNext = ref(false);
const serverTableFetcher: DataTableFetcher = async (query, { signal }) => {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 180);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      },
      { once: true },
    );
  });
  if (serverTableFailNext.value) {
    serverTableFailNext.value = false;
    throw new Error("演示请求失败，请点击表格中的重试");
  }
  const search = String(query.filters?.search ?? "")
    .trim()
    .toLowerCase();
  const status = String(query.filters?.status ?? "");
  const type = String(query.filters?.type ?? "");
  let filtered = serverTableRows.filter(
    (row) =>
      (!search || `${row.name} ${row.type}`.toLowerCase().includes(search)) &&
      (!status || row.status === status) &&
      (!type || row.type === type),
  );
  if (query.sort) {
    const direction = query.sort.direction === "asc" ? 1 : -1;
    const key = query.sort.key as keyof (typeof serverTableRows)[number];
    filtered = [...filtered].sort(
      (left, right) =>
        String(left[key]).localeCompare(String(right[key])) * direction,
    );
  }
  const start = (query.page - 1) * query.pageSize;
  return {
    data: filtered.slice(start, start + query.pageSize),
    total: filtered.length,
  };
};
function readServerTableQuery(): DataTableQueryState {
  if (typeof window === "undefined") return {};
  const params = new URLSearchParams(window.location.search);
  const page = Number(params.get("tablePage"));
  const pageSize = Number(params.get("tablePageSize"));
  const sortValue = params.get("tableSort")?.split(":");
  let filters: Record<string, unknown> = {};
  try {
    filters = JSON.parse(params.get("tableFilters") ?? "{}");
  } catch {
    filters = {};
  }
  return {
    page: Number.isFinite(page) ? page : undefined,
    pageSize: Number.isFinite(pageSize) ? pageSize : undefined,
    sort:
      sortValue?.[0] && (sortValue[1] === "asc" || sortValue[1] === "desc")
        ? { key: sortValue[0], direction: sortValue[1] }
        : undefined,
    filters,
  };
}
function writeServerTableQuery(query: DataTableQuery): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.searchParams.set("tablePage", String(query.page));
  url.searchParams.set("tablePageSize", String(query.pageSize));
  if (query.sort)
    url.searchParams.set(
      "tableSort",
      `${query.sort.key}:${query.sort.direction}`,
    );
  else url.searchParams.delete("tableSort");
  url.searchParams.set("tableFilters", JSON.stringify(query.filters ?? {}));
  window.history.replaceState(window.history.state, "", url);
}
const serverTable = useDataTable({
  fetcher: serverTableFetcher,
  filters: { search: "" },
  querySync: { read: readServerTableQuery, write: writeServerTableQuery },
});
const queryDemoRows = Array.from({ length: 24 }, (_, index) => ({
  id: index + 1,
  name: `查询示例记录 ${String(index + 1).padStart(2, "0")}`,
  owner: index % 2 === 0 ? "运营组" : "研发组",
  status: index % 4 === 0 ? "已停用" : "运行中",
  updatedAt: `2026-10-${String((index % 9) + 1).padStart(2, "0")}`,
}));
const queryDemoColumns: DataTableColumn[] = [
  { key: "name", title: "记录名称", sortable: true, mobileTitle: true },
  { key: "owner", title: "负责人", sortable: true },
  { key: "status", title: "状态", mobileBadge: true },
  { key: "updatedAt", title: "更新时间" },
];
const queryDemoFilters: DataTableFilterGroup[] = [
  {
    key: "status",
    title: "状态",
    singleSelect: true,
    options: [
      { label: "运行中", value: "运行中", count: 18 },
      { label: "已停用", value: "已停用", count: 6 },
    ],
  },
];
const queryDemoSchema: FormFieldSchema[] = [
  {
    fieldName: "owner",
    label: "负责人",
    component: "Input",
    componentProps: { placeholder: "按负责人筛选" },
  },
  {
    fieldName: "updatedAt",
    label: "更新时间",
    component: "Input",
    componentProps: { placeholder: "按日期筛选" },
  },
];
const queryDemoFetcher: DataTableFetcher = async (query, { signal }) => {
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(resolve, 120);
    signal.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Request aborted", "AbortError"));
      },
      { once: true },
    );
  });
  const search = String(query.filters?.search ?? "")
    .trim()
    .toLowerCase();
  const owner = String(query.filters?.owner ?? "")
    .trim()
    .toLowerCase();
  const updatedAt = String(query.filters?.updatedAt ?? "").trim();
  const status = String(query.filters?.status ?? "");
  const filtered = queryDemoRows.filter(
    (row) =>
      (!search || row.name.toLowerCase().includes(search)) &&
      (!owner || row.owner.toLowerCase().includes(owner)) &&
      (!updatedAt || row.updatedAt.includes(updatedAt)) &&
      (!status || row.status === status),
  );
  const start = (query.page - 1) * query.pageSize;
  return {
    data: filtered.slice(start, start + query.pageSize),
    total: filtered.length,
  };
};
const queryDemoTable = useDataTable({
  fetcher: queryDemoFetcher,
  pageSize: 8,
  filters: { search: "" },
});
const queryDemoResult = ref("等待查询");
function onQueryDemoSubmit(filters: QueryFormValues): void {
  queryDemoResult.value = `已应用 ${Object.keys(filters).length} 个查询条件`;
}
const serverTableSearch = ref("");
const serverTableFilterValues = ref<
  Record<string, string | string[] | undefined>
>({});
const serverTableColumnVisibility = ref<Record<string, boolean>>({ id: false });
const serverTableColumnSizing = ref<Record<string, number>>({});
const serverTableColumnPinning = ref<DataTableColumnPinning>({
  name: "left",
  actions: "right",
});
const serverSelectedKeys = ref<(string | number)[]>([]);
const batchActionResult = ref("尚未执行批量操作");
async function applyServerTableSearch(): Promise<void> {
  await serverTable.setFilters({
    search: serverTableSearch.value,
    ...serverTableFilterValues.value,
  });
}
function updateServerTableFilters(
  value: Record<string, string | string[] | undefined>,
): void {
  serverTableFilterValues.value = value;
  void applyServerTableSearch();
}
function runBatchAction(): void {
  batchActionResult.value = `批量操作收到稳定 keys：${serverSelectedKeys.value.join(", ") || "无"}`;
}
function clearServerSelection(): void {
  serverSelectedKeys.value = [];
}
type DemoSsePayload = EventSourceProtocolEventPayload<{
  message?: string;
  progress?: number;
  heartbeat?: boolean;
}>;

const sseDemo = useEventSourceSession<DemoSsePayload>({
  url: getDemoEventsUrl(),
  maxItems: 40,
  maxBytes: 32_000,
  reconnectDelay: 250,
  maxReconnectAttempts: 3,
  heartbeatTimeout: 2_000,
});
const sseFailureDemo = useEventSourceSession<DemoSsePayload>({
  url: `${getDemoEventsUrl()}?fail=true`,
  autoConnect: false,
  reconnect: false,
  maxItems: 10,
});
function restartSseDemo(): void {
  sseDemo.clear();
  sseDemo.retry();
}
function simulateSseFailure(): void {
  sseFailureDemo.clear();
  sseFailureDemo.retry();
}
function simulateServerTableError(): void {
  serverTableFailNext.value = true;
  void serverTable.reload();
}
function sseItemEvent(item: unknown): string {
  return item &&
    typeof item === "object" &&
    typeof (item as { event?: unknown }).event === "string"
    ? (item as { event: string }).event
    : "message";
}
function sseItemData(item: unknown): unknown {
  return item && typeof item === "object" && "data" in item
    ? (item as { data?: unknown }).data
    : item;
}
</script>

<template>
  <PageContainer class="min-h-full">
    <template #breadcrumb
      ><span class="text-xs text-muted-foreground"
        >开发者工具 / framework-ui</span
      ></template
    >
    <template #title>{{ categoryTitle }}</template>
    <template #description>{{ categoryDescription }}</template>
    <div class="space-y-8">
      <section v-if="showCategory('media')" class="space-y-4">
        <h2 class="text-lg font-semibold">ImageUpload 图片上传</h2>
        <p class="text-sm text-muted-foreground">
          上传、拖放、预览与表单集成；上传接口由应用传入。
        </p>
        <ImageUploadExample />
      </section>
      <section v-if="showCategory('media')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">IconPicker 图标选择器</h2>
          <p class="text-sm text-muted-foreground">
            本地图标、在线图标与自定义图标共用 Iconify
            标识，支持搜索、分页和表单集成。
          </p>
        </div>
        <IconPickerExample />
      </section>

      <section v-if="showCategory('media')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">VideoPlayer 视频播放器</h2>
          <p class="text-sm text-muted-foreground">
            通过公共组件管理媒体加载与销毁，无需直接维护 Artplayer 或 HLS 实例。
          </p>
        </div>
        <VideoPlayerExample />
        <div class="mt-6 space-y-2">
          <h2 class="text-lg font-semibold">HlsWorkbench 分片可视化</h2>
          <p class="text-sm text-muted-foreground">
            预览原片、拖动完整分片选区，并读取当前分片原文。业务保存由应用自行接入。
          </p>
        </div>
        <HlsWorkbenchExample />
      </section>

      <section v-if="showCategory('basic')" class="space-y-4">
        <h2 class="text-lg font-semibold">Progress primitive</h2>
        <div class="rounded-lg border bg-card p-4">
          <Progress :model-value="64" aria-label="演示进度" />
        </div>
        <h2 class="text-lg font-semibold">PasswordInput 密码输入</h2>
        <div class="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label for="password-input-demo" class="text-sm font-medium"
              >可切换显示</label
            >
            <PasswordInput
              id="password-input-demo"
              v-model="demoPassword"
              autocomplete="current-password"
            />
            <p class="text-xs text-muted-foreground">
              当前值：{{ demoPassword }}
            </p>
          </div>
          <div class="space-y-2">
            <label for="password-input-disabled" class="text-sm font-medium"
              >禁用状态</label
            >
            <PasswordInput
              id="password-input-disabled"
              model-value="不可编辑"
              disabled
            />
            <p class="text-xs text-muted-foreground">
              禁用时输入和显隐按钮都不可操作。
            </p>
          </div>
        </div>
        <h2 class="text-lg font-semibold">TagInput 标签输入</h2>
        <div class="grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2">
          <div class="space-y-2">
            <label for="tag-input-demo" class="text-sm font-medium">标签</label>
            <TagInput
              id="tag-input-demo"
              v-model="demoTags"
              placeholder="输入后按回车或逗号"
              :remove-tag-label="(tag) => `删除 ${tag}`"
            />
            <p class="text-xs text-muted-foreground">
              失焦自动添加；空输入框按退格删除末项。当前值：{{ demoTags }}
            </p>
          </div>
          <div class="space-y-2">
            <label for="tag-input-disabled" class="text-sm font-medium"
              >禁用状态</label
            >
            <TagInput
              id="tag-input-disabled"
              :model-value="['不可编辑']"
              disabled
            />
            <label for="tag-input-readonly" class="text-sm font-medium"
              >只读状态</label
            >
            <TagInput
              id="tag-input-readonly"
              :model-value="['可聚焦查看']"
              read-only
            />
          </div>
        </div>
        <h2 class="text-lg font-semibold">RadioGroup primitive</h2>
        <RadioGroup model-value="default" class="flex gap-3"
          ><label class="flex items-center gap-2"
            ><RadioGroupItem value="default" />默认</label
          ><label class="flex items-center gap-2"
            ><RadioGroupItem value="compact" />紧凑</label
          ></RadioGroup
        >
        <h2 class="text-lg font-semibold">Accordion primitive</h2>
        <Accordion
          type="single"
          default-value="overview"
          collapsible
          class="rounded-lg border bg-card px-4"
        >
          <AccordionItem value="overview">
            <AccordionHeader>
              <AccordionTrigger>概览</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent
              >Accordion 使用 Reka UI 提供单项展开、键盘导航和 ARIA
              关联。</AccordionContent
            >
          </AccordionItem>
          <AccordionItem value="disabled" disabled>
            <AccordionHeader>
              <AccordionTrigger>禁用项</AccordionTrigger>
            </AccordionHeader>
            <AccordionContent>此内容不会被打开。</AccordionContent>
          </AccordionItem>
        </Accordion>
        <h2 class="text-lg font-semibold">Alert primitive</h2>
        <div class="grid gap-3 md:grid-cols-2">
          <Alert>
            <AlertTitle>提示</AlertTitle>
            <AlertDescription
              >这是一个默认 variant 的语义提示框。</AlertDescription
            >
          </Alert>
          <Alert variant="destructive">
            <AlertTitle>服务异常</AlertTitle>
            <AlertDescription>请求失败，请稍后重试。</AlertDescription>
            <AlertAction
              ><Button size="sm" variant="outline">重试</Button></AlertAction
            >
          </Alert>
        </div>
        <h2 class="text-lg font-semibold">Card primitive</h2>
        <Card size="sm">
          <CardHeader>
            <CardTitle>渠道统计</CardTitle>
            <CardDescription>最近 24 小时调用情况</CardDescription>
            <CardAction
              ><Button size="sm" variant="ghost">查看</Button></CardAction
            >
          </CardHeader>
          <CardContent>成功率 99.2%</CardContent>
          <CardFooter>更新时间：刚刚</CardFooter>
        </Card>
        <h2 class="text-lg font-semibold">Table primitive</h2>
        <Table class="rounded-lg border bg-card">
          <TableHeader
            ><TableRow
              ><TableHead>渠道</TableHead><TableHead>状态</TableHead></TableRow
            ></TableHeader
          >
          <TableBody>
            <TableRow
              ><TableCell>OpenAI 主渠道</TableCell
              ><TableCell>运行中</TableCell></TableRow
            >
            <TableRow data-state="selected"
              ><TableCell>Claude 备用渠道</TableCell
              ><TableCell>已选中</TableCell></TableRow
            >
          </TableBody>
        </Table>
        <h2 class="text-lg font-semibold">Pagination primitive</h2>
        <Pagination>
          <PaginationContent>
            <PaginationItem
              ><PaginationPrevious href="#previous"
            /></PaginationItem>
            <PaginationItem
              ><PaginationLink href="#page-1">1</PaginationLink></PaginationItem
            >
            <PaginationItem
              ><PaginationLink href="#page-2" is-active
                >2</PaginationLink
              ></PaginationItem
            >
            <PaginationItem><PaginationEllipsis /></PaginationItem>
            <PaginationItem><PaginationNext href="#next" /></PaginationItem>
          </PaginationContent>
        </Pagination>
        <h2 class="text-lg font-semibold">Empty primitive</h2>
        <Empty class="bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">∅</EmptyMedia>
            <EmptyTitle>暂无结果</EmptyTitle>
            <EmptyDescription>调整筛选条件后重试。</EmptyDescription>
          </EmptyHeader>
          <EmptyContent><Button size="sm">清除筛选</Button></EmptyContent>
        </Empty>
        <h2 class="text-lg font-semibold">Slider primitive</h2>
        <Slider :default-value="[42]" class="max-w-md" aria-label="请求阈值" />
        <h2 class="text-lg font-semibold">Spinner primitive</h2>
        <div
          class="flex items-center gap-3 rounded-lg border bg-card p-4 text-sm"
        >
          <Spinner aria-label="正在加载渠道" />
          正在加载渠道...
        </div>
        <h2 class="text-lg font-semibold">Toggle primitive</h2>
        <div class="flex items-center gap-2">
          <Toggle :default-value="true" aria-label="收藏">★</Toggle>
          <Toggle variant="outline" size="sm" disabled aria-label="锁定"
            >锁定</Toggle
          >
        </div>
        <h2 class="text-lg font-semibold">按钮图标</h2>
        <div class="flex flex-wrap items-center gap-2">
          <Button icon="lucide:plus" size="sm">新增</Button>
          <Button variant="outline" size="sm">
            <template #icon
              ><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="M12 3v12m-4-4 4 4 4-4M5 17v4h14v-4" /></svg
            ></template>
            导出
            <template #suffix
              ><svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <path d="m6 9 6 6 6-6" /></svg
            ></template>
          </Button>
        </div>
        <h2 class="text-lg font-semibold">ButtonGroup primitive</h2>
        <div class="flex flex-wrap items-center gap-3">
          <ButtonGroup>
            <Button size="sm">筛选</Button>
            <ButtonGroupSeparator />
            <Button size="sm" variant="outline">应用</Button>
          </ButtonGroup>
          <ButtonGroup orientation="vertical">
            <ButtonGroupText>批量操作</ButtonGroupText>
            <Button size="sm" variant="outline">执行</Button>
          </ButtonGroup>
        </div>
        <h2 class="text-lg font-semibold">AspectRatio primitive</h2>
        <AspectRatio
          :ratio="16 / 9"
          class="max-w-md rounded-lg bg-muted p-4 text-center text-sm"
        >
          16:9 preview
        </AspectRatio>
      </section>

      <section v-if="showCategory('forms')" class="space-y-4">
        <h2 class="text-lg font-semibold">FrameworkCalendar</h2>
        <p class="text-sm text-muted-foreground">
          统一 new-api calendar surface、outside days、日期 cell 状态和 heading
          slot；行为由 Reka Calendar primitive 提供。
        </p>
        <FrameworkCalendar class="w-fit rounded-lg border" />
      </section>

      <section v-if="showCategory('forms')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">ColorPicker 颜色选择器</h2>
          <p class="text-sm text-muted-foreground">
            色板、HEX 输入、预设颜色与透明度，支持键盘操作和表单集成。
          </p>
        </div>
        <ColorPickerExample />
      </section>

      <section v-if="showCategory('feedback')" class="space-y-4">
        <h2 class="text-lg font-semibold">Tooltip / Popover 框架组合</h2>
        <p class="text-sm text-muted-foreground">
          复用 Reka primitive，统一 new-api surface、尺寸、箭头、focus 和
          outside 行为。
        </p>
        <div
          class="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"
        >
          <FrameworkTooltip
            v-model:open="frameworkTooltipOpen"
            content="这是统一的 tooltip surface"
            trigger-class="h-8 rounded-md border bg-background px-3 text-sm shadow-xs hover:bg-accent"
          >
            <template #trigger
              ><button type="button">
                悬停查看 Tooltip（{{
                  frameworkTooltipOpen ? "已打开" : "已关闭"
                }}）
              </button></template
            >
          </FrameworkTooltip>
          <FrameworkPopover
            v-model:open="frameworkPopoverOpen"
            trigger-class="h-8 rounded-md border bg-background px-3 text-sm shadow-xs hover:bg-accent"
          >
            <template #trigger
              ><button type="button" data-test="framework-popover-trigger">
                打开 Popover
              </button></template
            >
            <div class="space-y-1">
              <p class="text-sm font-medium">Popover 内容</p>
              <p class="text-xs text-muted-foreground">
                支持 Escape、outside 和键盘焦点恢复。
              </p>
            </div>
          </FrameworkPopover>
        </div>
      </section>

      <section v-if="showCategory('feedback')" class="space-y-4">
        <h2 class="text-lg font-semibold">CommandMenu 框架组合</h2>
        <p class="text-sm text-muted-foreground">
          业务只提供分组和命令数据；new-api 风格 Dialog
          surface、搜索、快捷键和选择逻辑由框架组合提供，路由由调用方接收 select
          事件。
        </p>
        <div
          class="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"
        >
          <Button size="sm" @click="commandMenuOpen = true"
            >打开命令面板</Button
          >
          <span class="text-sm text-muted-foreground"
            >最近选择：{{ selectedCommand }}</span
          >
        </div>
        <CommandMenu
          v-model:open="commandMenuOpen"
          :groups="commandMenuGroups"
          title="框架命令面板"
          description="搜索并选择一个演示命令"
          @select="onCommandSelect"
        />
      </section>

      <section v-if="showCategory('layout')" class="space-y-4">
        <h2 class="text-lg font-semibold">New API 风格页面骨架</h2>
        <SectionPage
          class="min-h-96 rounded-lg border"
          :stack-actions-on-mobile="true"
        >
          <template #breadcrumb>
            <div class="text-xs text-muted-foreground">控制台 / 运营概览</div>
          </template>
          <template #title>
            <h3 class="truncate text-base font-semibold tracking-tight">
              运营概览
            </h3>
          </template>
          <template #description
            >面向模型调用、渠道和额度的统一工作区。</template
          >
          <template #tabs>
            <Tabs default-value="overview" class="w-full">
              <TabsList>
                <TabsTrigger value="overview">概览</TabsTrigger>
                <TabsTrigger value="activity">活动</TabsTrigger>
              </TabsList>
            </Tabs>
          </template>
          <template #actions>
            <Button size="sm" variant="outline">导出报表</Button>
            <PermissionButton requires-auth size="sm" @click="onAdd"
              >权限操作</PermissionButton
            >
          </template>
          <div class="space-y-3">
            <MetricStrip :metrics="demoMetrics" />
            <DataPanel>
              <template #toolbar>
                <FilterBar v-model="search" placeholder="搜索渠道或模型">
                  <template #filters>
                    <Badge variant="outline">全部状态</Badge>
                    <Badge variant="outline">过去 7 天</Badge>
                  </template>
                  <template #actions>
                    <Button size="sm" variant="ghost">刷新</Button>
                  </template>
                </FilterBar>
              </template>
              <div class="grid gap-3 p-4 sm:grid-cols-2">
                <div
                  v-for="item in ['OpenAI 主渠道', 'Claude 备用渠道']"
                  :key="item"
                  class="rounded-md border p-3"
                >
                  <div class="flex items-center justify-between gap-2">
                    <span class="font-medium">{{ item }}</span>
                    <StatusBadge status="success" text="运行中" />
                  </div>
                  <p class="mt-2 text-xs text-muted-foreground">
                    最近 24 小时成功率 99.2%
                  </p>
                </div>
              </div>
            </DataPanel>
          </div>
          <PageFooterPortal>
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-sm">SectionPage footer portal</span>
              <Button size="sm">保存视图</Button>
            </div>
          </PageFooterPortal>
        </SectionPage>
      </section>

      <section v-if="showCategory('basic')" class="space-y-4">
        <h2 class="text-lg font-semibold">Tabs primitive</h2>
        <Tabs default-value="overview" class="rounded-lg border bg-card p-4">
          <TabsList>
            <TabsTrigger value="overview">概览</TabsTrigger>
            <TabsTrigger value="activity">活动</TabsTrigger>
            <TabsTrigger value="disabled" disabled>禁用项</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" class="rounded-md border p-3 text-sm">
            Tabs 内容区域支持默认值、活动状态和 focus-visible 样式。
          </TabsContent>
          <TabsContent value="activity" class="rounded-md border p-3 text-sm">
            切换标签不会改变页面标题或外层滚动容器的位置。
          </TabsContent>
        </Tabs>
      </section>

      <section v-if="showCategory('feedback')" class="space-y-4">
        <h2 class="text-lg font-semibold">
          ErrorState / LoadingState 状态组件
        </h2>
        <div class="grid gap-4 lg:grid-cols-3">
          <div data-testid="error-state-retry" class="bg-card">
            <ErrorState
              title="加载渠道失败"
              description="服务暂时不可用，请稍后重试。"
              show-retry
              @retry="onAdd"
            />
          </div>
          <div data-testid="error-state-no-retry" class="bg-card">
            <ErrorState
              title="无需重试"
              description="当前状态只需要提示用户。"
            />
          </div>
          <div data-testid="loading-state-block" class="bg-card">
            <LoadingState message="正在加载渠道…" size="lg" />
          </div>
          <div
            data-testid="loading-state-inline"
            class="flex items-center bg-card p-4"
          >
            <LoadingState inline message="保存中…" size="sm" />
          </div>
          <div
            data-testid="loading-state-inline-empty"
            class="flex items-center gap-2 bg-card p-4"
          >
            <span class="text-xs text-muted-foreground">inline 无文案</span
            ><LoadingState inline size="sm" />
          </div>
        </div>
        <h2 class="text-lg font-semibold">DataPanel 状态组合</h2>
        <div data-testid="data-panel-state-demo" class="space-y-3">
          <div
            class="flex flex-wrap gap-2"
            role="group"
            aria-label="DataPanel 状态"
          >
            <Button
              size="sm"
              :variant="dataPanelState === 'loading' ? 'default' : 'outline'"
              @click="dataPanelState = 'loading'"
              >加载中</Button
            >
            <Button
              size="sm"
              :variant="dataPanelState === 'empty' ? 'default' : 'outline'"
              @click="dataPanelState = 'empty'"
              >空数据</Button
            >
            <Button
              size="sm"
              :variant="dataPanelState === 'error' ? 'default' : 'outline'"
              @click="dataPanelState = 'error'"
              >错误</Button
            >
            <Button
              size="sm"
              :variant="dataPanelState === 'ready' ? 'default' : 'outline'"
              @click="dataPanelState = 'ready'"
              >正常内容</Button
            >
          </div>
          <DataPanel
            :loading="dataPanelState === 'loading'"
            :empty="dataPanelState === 'empty'"
            :error="dataPanelState === 'error' ? 'demo-error' : undefined"
            error-text="服务暂时不可用，请稍后重试。"
            show-retry
            @retry="retryDataPanel"
          >
            <template #toolbar
              ><span class="text-sm font-medium"
                >可切换的状态面板</span
              ></template
            >
            <div data-testid="data-panel-ready" class="p-6 text-sm">
              状态正常，已加载 {{ dataPanelRetryCount }} 次重试后的内容。
            </div>
          </DataPanel>
          <p class="text-xs text-muted-foreground" aria-live="polite">
            当前状态：{{ dataPanelState }} · 重试次数：{{ dataPanelRetryCount }}
          </p>
        </div>
        <h2 class="text-lg font-semibold">Menubar primitive</h2>
        <Menubar>
          <MenubarMenu value="file">
            <MenubarTrigger>文件</MenubarTrigger>
            <MenubarContent>
              <MenubarItem>打开</MenubarItem>
              <MenubarSeparator />
              <MenubarItem disabled>禁用项</MenubarItem>
            </MenubarContent>
          </MenubarMenu>
        </Menubar>
        <h2 class="text-lg font-semibold">ContextMenu advanced primitives</h2>
        <ContextMenu>
          <ContextMenuTrigger
            class="flex min-h-24 items-center justify-center rounded-lg border border-dashed bg-card px-4 text-sm text-muted-foreground"
          >
            在此区域点击右键
          </ContextMenuTrigger>
          <ContextMenuContent>
            <ContextMenuLabel inset>渠道操作</ContextMenuLabel>
            <ContextMenuItem inset
              >复制渠道
              <ContextMenuShortcut>⌘C</ContextMenuShortcut></ContextMenuItem
            >
            <ContextMenuItem inset disabled>禁用操作</ContextMenuItem>
            <ContextMenuItem inset variant="destructive"
              >删除渠道</ContextMenuItem
            >
            <ContextMenuSeparator />
            <ContextMenuCheckboxItem v-model="contextMenuPinned" inset
              >固定到顶部</ContextMenuCheckboxItem
            >
            <ContextMenuRadioGroup v-model="contextMenuDensity">
              <ContextMenuLabel inset>密度</ContextMenuLabel>
              <ContextMenuRadioItem value="compact" inset
                >紧凑</ContextMenuRadioItem
              >
              <ContextMenuRadioItem value="comfortable" inset
                >舒适</ContextMenuRadioItem
              >
            </ContextMenuRadioGroup>
            <ContextMenuSub>
              <ContextMenuSubTrigger inset>更多视图</ContextMenuSubTrigger>
              <ContextMenuSubContent>
                <ContextMenuItem>按状态筛选</ContextMenuItem>
                <ContextMenuItem>导出当前页</ContextMenuItem>
              </ContextMenuSubContent>
            </ContextMenuSub>
          </ContextMenuContent>
        </ContextMenu>
        <h2 class="text-lg font-semibold">Resizable primitive</h2>
        <ResizablePanelGroup
          storage-key="playwright-resizable-demo"
          class="h-24 max-w-xl rounded-lg border"
          aria-label="可调整面板"
        >
          <ResizablePanel :default-size="40" :min-size="20" class="p-3 text-sm"
            >左侧面板</ResizablePanel
          >
          <ResizableHandle with-handle />
          <ResizablePanel :default-size="60" :max-size="80" class="p-3 text-sm"
            >右侧面板</ResizablePanel
          >
        </ResizablePanelGroup>
        <h2 class="text-lg font-semibold">Carousel primitive</h2>
        <Carousel
          loop
          :autoplay-interval="2500"
          class="max-w-md rounded-lg border"
          aria-label="演示轮播"
        >
          <CarouselContent>
            <CarouselItem class="p-8 text-center">第一张</CarouselItem>
            <CarouselItem class="p-8 text-center">第二张</CarouselItem>
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">app-ui 业务扩展示例</h2>
          <p class="text-sm text-muted-foreground">
            业务语义组件通过公开的框架组件组合，不修改框架内置实现。
          </p>
        </div>
        <div class="grid gap-4 md:grid-cols-3">
          <ServiceHealthCard
            name="主 API 网关"
            description="面向应用请求的统一入口。"
            :metrics="[
              { label: '可用率', value: '99.98%' },
              { label: 'P95 延迟', value: '284 ms' },
            ]"
          />
          <ServiceHealthCard
            name="异步任务队列"
            health="degraded"
            :metrics="[
              { label: '待处理', value: 18 },
              { label: '最近错误', value: 2 },
            ]"
          >
            <template #actions>
              <Button size="sm" variant="outline">查看任务</Button>
            </template>
          </ServiceHealthCard>
          <ServiceHealthCard
            name="报表服务"
            health="offline"
            description="演示业务组件的状态和操作插槽。"
          >
            <template #actions>
              <Button size="sm" variant="outline">重试</Button>
            </template>
          </ServiceHealthCard>
        </div>
      </section>

      <section v-if="showCategory('feedback')" class="space-y-4">
        <h2 class="text-lg font-semibold">Dialog、Modal 与日期组件</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div>
              <p class="font-medium">Dialog</p>
              <p class="text-sm text-muted-foreground">
                标准模态对话框，保留标题、说明和底部操作插槽。
              </p>
            </div>
            <Button class="w-fit" @click="showDialog = true"
              >打开 Dialog</Button
            >
            <Dialog v-model:open="showDialog">
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>编辑渠道</DialogTitle>
                  <DialogDescription
                    >修改后会在下一次请求时生效。</DialogDescription
                  >
                </DialogHeader>
                <Input model-value="OpenAI 主渠道" aria-label="渠道名称" />
                <DialogFooter>
                  <Button variant="outline" @click="showDialog = false"
                    >取消</Button
                  >
                  <Button @click="showDialog = false">保存</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            <AlertDialog v-model:open="showAlertDialog">
              <AlertDialogTrigger as-child
                ><Button variant="outline"
                  >打开 AlertDialog</Button
                ></AlertDialogTrigger
              >
              <AlertDialogContent>
                <AlertDialogHeader
                  ><AlertDialogTitle>确认删除</AlertDialogTitle
                  ><AlertDialogDescription
                    >此操作不可撤销。</AlertDialogDescription
                  ></AlertDialogHeader
                >
                <AlertDialogFooter
                  ><AlertDialogCancel>取消</AlertDialogCancel
                  ><AlertDialogAction @click="showAlertDialog = false"
                    >确认</AlertDialogAction
                  ></AlertDialogFooter
                >
              </AlertDialogContent>
            </AlertDialog>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div>
              <p class="font-medium">useModal / ModalApi</p>
              <p class="text-sm text-muted-foreground">
                通过 API 控制打开、确认、取消和 loading 状态。
              </p>
            </div>
            <Button class="w-fit" @click="demoModalApi.open()"
              >打开 Modal</Button
            >
            <DemoModal>
              <template #default="{ data }">
                <Input
                  id="modal-demo-input"
                  model-value="初始焦点示例"
                  aria-label="Modal 初始焦点"
                />
                <p class="text-sm text-muted-foreground">
                  当前数据：{{ data ?? "无" }}
                </p>
              </template>
            </DemoModal>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <p class="font-medium">DatePicker</p>
            <DatePicker
              v-model="selectedDate"
              :min-date="new Date(2024, 0, 1)"
              :max-date="new Date(2030, 11, 31)"
              locale="zh-CN"
            />
            <p class="text-xs text-muted-foreground">
              {{ selectedDate?.toLocaleString("zh-CN") ?? "尚未选择" }}
            </p>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <div>
              <p class="font-medium">Drawer</p>
              <p class="text-sm text-muted-foreground">
                支持底部和右侧抽屉，固定头尾并保持独立可滚动内容区；右侧在桌面限制为
                28rem，移动端使用 3/4 宽度。
              </p>
            </div>
            <Button class="w-fit" @click="showDrawer = true"
              >打开 Drawer</Button
            >
            <Button
              class="w-fit"
              variant="outline"
              @click="showRightDrawer = true"
              >打开右侧 Drawer</Button
            >
            <Button class="w-fit" variant="outline" @click="openTypedDrawer"
              >打开 typed Drawer</Button
            >
            <Drawer v-model:open="showDrawer">
              <DrawerLayout
                title="渠道详情"
                description="这是框架组件包提供的底部 Drawer。"
              >
                <div class="space-y-3 pb-4">
                  <p
                    v-for="item in 4"
                    :key="item"
                    class="rounded-md border p-3 text-sm"
                  >
                    可滚动内容 {{ item }}：保持头部和底部操作区固定。
                  </p>
                </div>
                <template #footer
                  ><Button @click="showDrawer = false">完成</Button></template
                >
              </DrawerLayout>
            </Drawer>
            <Drawer v-model:open="showRightDrawer">
              <DrawerLayout
                data-testid="drawer-right-demo"
                side="right"
                title="渠道详情"
                description="右侧 Drawer 适合桌面端详情和编辑面板。"
              >
                <div class="space-y-3 pb-4">
                  <DrawerSection>
                    <DrawerSectionHeader
                      title="请求设置"
                      description="可复用的 new-api 抽屉分区组合"
                      icon="lucide:settings"
                      icon-tone="info"
                    />
                    <DrawerSwitchItem>
                      <span class="text-sm">启用缓存</span>
                      <template #control
                        ><Button size="sm" variant="outline"
                          >切换</Button
                        ></template
                      >
                    </DrawerSwitchItem>
                  </DrawerSection>
                  <p
                    v-for="item in 4"
                    :key="item"
                    class="rounded-md border p-3 text-sm"
                  >
                    右侧可滚动内容 {{ item }}。
                  </p>
                </div>
                <template #footer
                  ><Button @click="showRightDrawer = false"
                    >完成</Button
                  ></template
                >
              </DrawerLayout>
            </Drawer>
            <p class="text-xs text-muted-foreground">{{ typedDrawerResult }}</p>
            <DemoDrawer>
              <template #default="{ data }">
                <div class="space-y-3">
                  <p class="text-xs text-muted-foreground">
                    payload：渠道 #{{ data?.channelId ?? "—" }}
                  </p>
                  <label class="grid gap-1.5 text-sm">
                    <span class="text-xs font-medium text-muted-foreground"
                      >渠道名称</span
                    >
                    <Input id="typed-drawer-input" v-model="typedDrawerName" />
                  </label>
                </div>
              </template>
            </DemoDrawer>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <p class="font-medium">DateTimePicker（支持秒级时间与范围保护）</p>
            <DateTimePicker
              v-model="selectedDateTime"
              :min-date="new Date(2024, 0, 1)"
              :max-date="new Date(2030, 11, 31)"
              locale="zh-CN"
            />
            <p class="text-xs text-muted-foreground">
              {{ selectedDateTime?.toLocaleString("zh-CN") ?? "尚未选择" }}
            </p>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <p class="font-medium">DateRangePicker 日期范围</p>
            <DateRangePicker
              v-model="selectedDateRange"
              :presets="dateRangePresets"
              locale="zh-CN"
            />
            <p class="text-xs text-muted-foreground">
              {{
                selectedDateRange
                  ?.map((date) => date.toLocaleDateString("zh-CN"))
                  .join(" 至 ") ?? "尚未选择"
              }}
            </p>
          </div>
          <div class="flex flex-col gap-3 rounded-lg border bg-card p-4">
            <p class="font-medium">DateTimeRangePicker 日期时间范围</p>
            <DateTimeRangePicker
              v-model="selectedDateTimeRange"
              :presets="dateRangePresets"
              :min-date="new Date(2024, 0, 1)"
              :max-date="new Date(2030, 11, 31, 23, 59, 59)"
              locale="zh-CN"
            />
            <p class="text-xs text-muted-foreground">
              {{
                selectedDateTimeRange
                  ?.map((date) => date.toLocaleString("zh-CN"))
                  .join(" 至 ") ?? "尚未选择"
              }}
            </p>
          </div>
        </div>
      </section>

      <section v-if="showCategory('forms')" class="space-y-4">
        <h2 class="text-lg font-semibold">弹层选择器与日期选择</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <OverlaySelectExample />
          <OverlayDatePickerExample />
        </div>
      </section>

      <section v-if="showCategory('forms')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">Select 下拉选择</h2>
          <p class="text-sm text-muted-foreground">
            基础 Select 与搜索下拉沿用 new-api 的圆角、紧凑间距和弹层动效；
            FacetedFilter 复刻 /channels
            工具栏的虚线触发器、勾选项、数量和清除筛选。
          </p>
        </div>
        <div class="flex flex-col gap-5 rounded-lg border bg-card p-4">
          <div class="flex flex-wrap items-center gap-2 sm:gap-3">
            <Input
              class="w-full sm:w-52"
              placeholder="按名称、ID 或 Key 筛选"
            />
            <FacetedFilter
              v-model="selectedChannelStatus"
              title="状态"
              :options="channelStatusOptions"
              single-select
              search-placeholder="搜索状态"
            />
            <FacetedFilter
              v-model="selectedChannelTypes"
              title="类型"
              :options="channelTypeOptions"
              search-placeholder="搜索渠道类型"
            />
            <Button
              variant="ghost"
              size="sm"
              class="text-muted-foreground"
              @click="resetChannelFilters"
            >
              重置
            </Button>
          </div>
          <p class="text-xs text-muted-foreground">
            /channels 筛选值：状态 {{ selectedChannelStatus ?? "全部" }}；类型
            {{
              selectedChannelTypes.length
                ? selectedChannelTypes.join("、")
                : "全部"
            }}
          </p>
          <div class="grid gap-4 md:grid-cols-3">
            <label class="flex flex-col gap-1.5 text-sm">
              <span class="text-xs font-medium text-muted-foreground"
                >渠道（SelectBox 父子选项）</span
              >
              <SelectBox
                v-model="selectedProvider"
                :options="hierarchicalProviderOptions"
                allow-clear
                placeholder="选择渠道"
              />
              <span class="text-xs text-muted-foreground"
                >当前值：{{ selectedProvider ?? "未选择" }}</span
              >
            </label>
            <label class="flex flex-col gap-1.5 text-sm">
              <span class="text-xs font-medium text-muted-foreground"
                >区域（NativeSelect）</span
              >
              <NativeSelect v-model="selectedRegion" class="w-full">
                <NativeSelectOption value="us-east">US East</NativeSelectOption>
                <NativeSelectOption value="eu-west">EU West</NativeSelectOption>
                <NativeSelectOption value="ap-southeast"
                  >AP Southeast</NativeSelectOption
                >
              </NativeSelect>
              <span class="text-xs text-muted-foreground"
                >当前值：{{ selectedRegion }}</span
              >
            </label>
            <label class="flex flex-col gap-1.5 text-sm">
              <span class="text-xs font-medium text-muted-foreground"
                >可搜索渠道（SearchSelect）</span
              >
              <SearchSelect
                v-model="searchedProvider"
                :options="hierarchicalProviderOptions"
                search-placeholder="搜索渠道名称"
                placeholder="搜索并选择层级渠道"
              />
              <span class="text-xs text-muted-foreground"
                >当前值：{{ searchedProvider ?? "未选择" }}</span
              >
            </label>
            <label class="flex flex-col gap-1.5 text-sm">
              <span class="text-xs font-medium text-muted-foreground"
                >通用 Combobox</span
              >
              <Combobox
                id="demo-combobox"
                v-model="selectedCombobox"
                :options="hierarchicalProviderOptions"
                allow-custom-value
                show-selected-icon
                placeholder="搜索或输入渠道"
              />
              <span class="text-xs text-muted-foreground"
                >当前值：{{ selectedCombobox ?? "未选择" }}</span
              >
              <span class="text-xs font-medium text-muted-foreground"
                >多选渠道（MultiSelect）</span
              >
              <MultiSelect
                id="demo-multi-select"
                v-model="selectedMultiSelect"
                :options="[
                  { label: 'OpenAI', value: 'openai' },
                  { label: 'Claude', value: 'claude' },
                  { label: '自定义', value: 'custom' },
                ]"
                allow-create
                :max-visible-chips="2"
                :render-selected-summary="multiSelectSummary"
              />
              <span class="text-xs text-muted-foreground"
                >当前值：{{ selectedMultiSelect.join("、") || "未选择" }}</span
              >
            </label>
          </div>
          <ApiSelectExample />
        </div>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <h2 class="text-lg font-semibold">StatCard 数据统计</h2>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="活跃用户"
            :value="1288"
            icon="lucide:users"
            :trend="{
              value: 12.4,
              direction: 'up',
              label: '较上周',
            }"
          />
          <StatCard
            title="今日订单"
            :value="268"
            icon="lucide:shopping-cart"
            :trend="{
              value: 5.1,
              direction: 'up',
              label: '较昨日',
            }"
          />
          <StatCard
            title="退出率"
            :value="3.2"
            icon="lucide:log-out"
            :trend="{
              value: 1.8,
              direction: 'down',
              label: '较上周',
              inverse: true,
            }"
          />
          <StatCard
            title="总收入"
            value="¥ 8,820"
            icon="lucide:wallet"
            :trend="{ value: 0, direction: 'flat', label: '持平' }"
          />
        </div>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <h2 class="text-lg font-semibold">UserCard 用户卡片</h2>
        <div class="grid gap-4 sm:grid-cols-2">
          <UserCard
            :user="{
              name: '庄周',
              username: 'zhuang',
              email: 'z@example.com',
              role: ['管理员', { label: 'VIP', tone: 'default' as const }],
            }"
          >
            <template #actions>
              <Button variant="outline" size="sm">查看</Button>
            </template>
          </UserCard>
          <UserCard
            :user="{
              name: '李四',
              username: 'lisi',
              email: 'li@example.com',
              role: '开发者',
            }"
          />
          <UserCard
            :user="{
              name: '王五',
              username: 'wangwu',
              email: 'wang@example.com',
              role: '访客',
            }"
            size="sm"
          />
          <UserCard
            :user="{
              name: '赵六',
              username: 'zhaoliu',
              email: 'zhao@example.com',
              role: ['运营', '编辑'],
            }"
            size="lg"
          />
        </div>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <h2 class="text-lg font-semibold">DataTable 框架表格</h2>
        <p class="text-xs text-muted-foreground">
          点击可排序列头可打开 new-api 风格的升序、降序和隐藏列菜单。
        </p>
        <DataPanel>
          <DataTable
            :columns="coreTableColumns"
            :data="tableRows"
            caption="框架通用组件列表"
            empty-description="当前筛选条件下没有可展示的组件。"
          >
            <template #cell-name="{ value }">
              <span class="font-medium">{{ value }}</span>
            </template>
          </DataTable>
        </DataPanel>
        <DataPanel>
          <DataTable
            data-testid="datatable-empty-demo"
            :columns="coreTableColumns"
            :data="[]"
            empty-title="暂无组件"
            empty-description="调整筛选条件后重试"
            empty-icon="lucide:inbox"
          >
            <template #empty-action
              ><Button size="sm" variant="outline">清除筛选</Button></template
            >
          </DataTable>
        </DataPanel>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">ChartCard 图表组合</h2>
          <p class="text-sm text-muted-foreground">
            图表复用 ui-kit 的 Chart.js 适配，框架负责主题
            token、卡片状态和可访问标题。
          </p>
        </div>
        <div class="grid gap-4 lg:grid-cols-2">
          <ChartCard
            id="requests-overview"
            title="请求趋势"
            description="过去 7 天请求量与成功量"
            type="line"
            :data="demoChartData"
            :config="{
              requests: { label: '请求量', color: 'var(--color-chart-1)' },
              success: { label: '成功量', color: 'var(--color-chart-2)' },
            }"
            tooltip-label="周一"
            :tooltip-items="[
              { color: 'var(--color-chart-1)', name: '请求量', value: 2400 },
            ]"
          >
            <template #tooltip="{ label, items }"
              ><div
                class="mt-3 rounded-md border bg-card px-2.5 py-1.5 text-xs"
              >
                <strong>{{ label }}</strong> · {{ items.length }} 个指标
              </div></template
            >
          </ChartCard>
          <ChartCard
            title="暂无数据示例"
            description="没有数据时不渲染误导性图形"
            empty
          />
          <ChartCard
            title="默认 tooltip 样式"
            description="未提供自定义 slot 时使用框架统一 tooltip"
            type="bar"
            :data="demoChartData"
            tooltip-label="周二"
            :tooltip-items="[
              { color: 'var(--color-chart-2)', name: '成功量', value: 2280 },
            ]"
          />
        </div>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">DataTable 服务端查询演示</h2>
          <p class="text-sm text-muted-foreground">
            useDataTable 只管理查询状态，fetcher
            由应用提供；演示分页、筛选、排序、选中、取消旧请求、错误重试和
            new-api 风格列显示菜单。表格内容使用统一的 bordered
            surface，移动端自动切换到 new-api 风格的分隔列表，toolbar
            独立于表格边界。
          </p>
        </div>
        <DataPanel>
          <DataTablePage
            mobile-cards
            enable-view-mode-toggle
            view-mode-storage-key="playwright-channel-table-view-mode"
            :rows="serverTable.rows.value"
            :columns="serverTableColumns"
            row-key="id"
            :loading="serverTable.loading.value"
            :error="serverTable.error.value"
            selectable
            pagination
            manual-sort
            :selected-keys="serverSelectedKeys"
            :sort="serverTable.sort.value"
            :page="serverTable.page.value"
            :page-size="serverTable.pageSize.value"
            :total="serverTable.total.value"
            @update:selected-keys="serverSelectedKeys = $event"
            @update:page="serverTable.setPage"
            @update:page-size="serverTable.setPageSize"
            @update:sort="serverTable.setSort"
            @retry="serverTable.retry"
          >
            <template #toolbar>
              <DataTableToolbar
                v-model="serverTableSearch"
                :columns="serverTableColumns"
                :column-visibility="serverTableColumnVisibility"
                column-visibility-storage-key="playwright-channel-table-columns"
                :filters="serverTableFilters"
                :filter-values="serverTableFilterValues"
                :loading="serverTable.loading.value"
                collapsible-on-mobile
                search-placeholder="搜索渠道名称或类型"
                @update:filter-values="updateServerTableFilters"
                @refresh="serverTable.reload"
                @reset="applyServerTableSearch"
                @update:column-visibility="serverTableColumnVisibility = $event"
              >
                <template #expandable>
                  <span class="text-xs text-muted-foreground"
                    >可展开筛选区：支持在移动端折叠，动作区保持可用。</span
                  >
                </template>
                <template #actions>
                  <Button
                    size="sm"
                    variant="outline"
                    @click="simulateServerTableError"
                    >模拟错误</Button
                  >
                </template>
              </DataTableToolbar>
            </template>
            <template #table="tableState">
              <DataTable
                data-testid="datatable-surface-demo"
                :columns="tableState.columns"
                :data="tableState.data"
                :row-key="tableState.rowKey"
                :loading="tableState.loading"
                :error="tableState.error"
                :selected-keys="tableState.selectedKeys"
                :selection-scope="tableState.selectionScope"
                @update:selected-keys="tableState.updateSelectedKeys"
                v-model:column-visibility="serverTableColumnVisibility"
                v-model:column-sizing="serverTableColumnSizing"
                column-sizing-storage-key="playwright-channel-table-sizing"
                v-model:column-pinning="serverTableColumnPinning"
                column-pinning-storage-key="playwright-channel-table-pinning"
                selectable
                pagination
                manual-sort
                :sort="tableState.sort"
                :page="tableState.page"
                :page-size="tableState.pageSize"
                :total="tableState.total"
                :max-height="420"
                @sort-change="tableState.updateSort"
                @update:page="tableState.updatePage"
                @update:page-size="tableState.updatePageSize"
                @retry="tableState.retry"
              >
                <template #cell-name="{ value }">
                  <TruncatedCell class="max-w-40">
                    <span class="font-medium">{{ value }}</span>
                    <template #tooltip
                      ><span class="font-mono"
                        >{{ value }} · 完整名称</span
                      ></template
                    >
                  </TruncatedCell>
                </template>
                <template #cell-status="{ value }"
                  ><StatusBadge
                    :status="value === '运行中' ? 'success' : 'disabled'"
                    :text="String(value)"
                /></template>
                <template #actions="{ row }">
                  <DataTableRowActions
                    dropdown-aria-label="渠道行操作"
                    dropdown-content-class="w-56"
                    :row="row"
                    :actions="[
                      {
                        key: 'view',
                        label: '查看',
                        icon: 'lucide:eye',
                        iconOnly: true,
                        ariaLabel: '查看渠道',
                        onSelect: () => {
                          batchActionResult = `打开记录 ${String(row.id)}`;
                        },
                      },
                      {
                        key: 'sync',
                        label: '同步',
                        loading: () => row.id === 1,
                        onSelect: () => {
                          batchActionResult = `同步记录 ${String(row.id)}`;
                        },
                      },
                    ]"
                    :dropdown-actions="[
                      {
                        key: 'copy',
                        label: '复制 ID',
                        icon: 'lucide:copy',
                        onSelect: () => {
                          batchActionResult = `复制记录 ${String(row.id)}`;
                        },
                      },
                    ]"
                  />
                </template>
              </DataTable>
            </template>
            <template #card-cell-status="{ value }"
              ><StatusBadge
                :status="value === '运行中' ? 'success' : 'disabled'"
                :text="String(value)"
            /></template>
            <template #card-actions="{ row }"
              ><DataTableRowActions
                :row="row"
                :actions="[
                  {
                    key: 'view',
                    label: '查看',
                    onSelect: () => {
                      batchActionResult = `打开记录 ${String(row.id)}`;
                    },
                  },
                ]"
            /></template>
          </DataTablePage>
          <DataTableBulkActions
            :selected-count="serverSelectedKeys.length"
            entity-name="渠道"
            @clear-selection="clearServerSelection"
          >
            <template #actions="{ selectedCount }">
              <Button size="sm" variant="secondary" @click="runBatchAction"
                >批量处理 {{ selectedCount }} 项</Button
              >
            </template>
          </DataTableBulkActions>
          <p class="px-4 pb-1 text-xs text-muted-foreground">
            当前演示默认只保留当前页选择；批量选择公告显示 3
            秒后清理。“模拟错误”会让下一次请求失败，表格内重试后恢复。分页、排序和筛选会同步到
            URL query，刷新后可恢复。
          </p>
          <p class="px-4 pb-3 text-xs text-muted-foreground">
            {{ batchActionResult }}
          </p>
          <div class="flex items-center justify-between border-t px-4 py-3">
            <span class="text-xs text-muted-foreground"
              >StaticRowActions：编辑按钮与 destructive 删除菜单</span
            >
            <StaticRowActions
              edit-label="编辑记录"
              delete-label="删除记录"
              menu-label="更多操作"
              @edit="batchActionResult = '编辑静态行'"
              @delete="batchActionResult = '删除静态行'"
            />
          </div>
        </DataPanel>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">DataTableQueryPage 查询表单联动</h2>
          <p class="text-sm text-muted-foreground">
            查询表单保留 draft，点击搜索后才将规范化条件交给
            useDataTable；工具栏沿用 new-api 的搜索、单选
            FacetedFilter、刷新和列配置。
          </p>
        </div>
        <DataPanel>
          <DataTableQueryPage
            :table="queryDemoTable"
            :columns="queryDemoColumns"
            :query-schema="queryDemoSchema"
            :filters="queryDemoFilters"
            search-placeholder="按名称筛选…"
            :page-size-options="[8, 16, 24]"
            selectable
            enable-view-mode-toggle
            mobile-cards
            query-form-show-collapse-button
            @query-submit="onQueryDemoSubmit"
          >
            <template #toolbar-actions>
              <span class="text-xs text-muted-foreground">查询表单 + 表格</span>
            </template>
            <template #toolbar-tools>
              <Button
                size="sm"
                variant="outline"
                @click="queryDemoResult = '执行了自定义 toolbar action'"
                >自定义动作</Button
              >
            </template>
            <template #actionbar="{ table }">
              <DataTableBulkActions :selected-count="0" entity-name="记录">
                <template #actions
                  ><span class="text-xs text-muted-foreground"
                    >{{ queryDemoResult }} ·
                    {{ table.total.value }} 条结果</span
                  ></template
                >
              </DataTableBulkActions>
            </template>
            <template #table="tableState">
              <DataTable
                :columns="tableState.columns"
                :data="tableState.data"
                :row-key="tableState.rowKey"
                :loading="tableState.loading"
                :error="tableState.error"
                :selected-keys="tableState.selectedKeys"
                :selection-scope="tableState.selectionScope"
                selectable
                pagination
                manual-sort
                :sort="tableState.sort"
                :page="tableState.page"
                :page-size="tableState.pageSize"
                :total="tableState.total"
                @update:selected-keys="tableState.updateSelectedKeys"
                @sort-change="tableState.updateSort"
                @update:page="tableState.updatePage"
                @update:page-size="tableState.updatePageSize"
                @retry="tableState.retry"
              >
                <template #cell-status="{ value }"
                  ><StatusBadge
                    :status="value === '运行中' ? 'success' : 'disabled'"
                    :text="String(value)"
                /></template>
              </DataTable>
            </template>
          </DataTableQueryPage>
        </DataPanel>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <h2 class="text-lg font-semibold">StatusBadge 状态徽章</h2>
        <div class="flex flex-wrap gap-2">
          <StatusBadge status="success" />
          <StatusBadge status="error" />
          <StatusBadge status="warning" />
          <StatusBadge status="processing" pulse />
          <StatusBadge status="pending" />
          <StatusBadge status="disabled" />
          <StatusBadge status="info" />
          <StatusBadge status="neutral" />
          <StatusBadge status="warning" text="需注意" />
        </div>
        <div
          class="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"
        >
          <StatusBadge
            variant="blue"
            label="纯文字"
            type="text"
            :copyable="false"
          />
          <StatusBadge
            variant="warning"
            label="下划线"
            type="underline"
            :copyable="false"
          />
          <StatusBadge variant="green" label="可复制" show-dot />
          <StatusBadgeList :items="['OpenAI', 'Claude', 'Ollama']" :max="2">
            <template #item="{ item }"
              ><StatusBadge
                variant="neutral"
                :label="String(item)"
                :copyable="false"
            /></template>
          </StatusBadgeList>
        </div>
        <div
          class="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-4"
        >
          <span class="w-full text-xs text-muted-foreground"
            >Provider 默认类型（显式 type 仍可覆盖）</span
          >
          <StatusBadgeTypeProvider type="text">
            <StatusBadge
              variant="success"
              label="继承 text"
              :copyable="false"
            />
            <StatusBadge
              variant="warning"
              label="显式 underline"
              type="underline"
              :copyable="false"
            />
          </StatusBadgeTypeProvider>
        </div>
      </section>

      <section v-if="showCategory('data')" class="space-y-4">
        <div>
          <h2 class="text-lg font-semibold">SSE 实时日志</h2>
          <p class="text-sm text-muted-foreground">
            useEventSourceSession 演示
            Last-Event-ID、心跳、终态、重连和有界日志缓冲；传输层不依赖 DOM。
          </p>
        </div>
        <DataPanel>
          <div class="flex flex-wrap items-center gap-2 border-b p-4">
            <StatusBadge
              :status="
                sseDemo.status.value === 'running'
                  ? 'success'
                  : sseDemo.status.value === 'failed'
                    ? 'error'
                    : 'pending'
              "
              :text="sseDemo.status.value"
            />
            <span class="text-xs text-muted-foreground"
              >Last-Event-ID: {{ sseDemo.lastEventId.value ?? "—" }}</span
            >
            <Button size="sm" variant="outline" @click="sseDemo.pause"
              >暂停</Button
            >
            <Button size="sm" variant="outline" @click="sseDemo.resume"
              >继续</Button
            >
            <Button size="sm" @click="restartSseDemo">重连并清空</Button>
            <Button size="sm" variant="outline" @click="simulateSseFailure"
              >模拟失败</Button
            >
            <Button size="sm" variant="ghost" @click="sseDemo.clear"
              >清空日志</Button
            >
          </div>
          <LiveLog :items="sseDemo.items.value" empty-text="等待实时事件…">
            <template #default="{ item }">
              <p class="rounded border px-2 py-1">
                <span class="mr-2 text-muted-foreground">{{
                  sseItemEvent(item)
                }}</span
                >{{ JSON.stringify(sseItemData(item)) }}
              </p>
            </template>
          </LiveLog>
          <p
            v-if="sseFailureDemo.status.value === 'failed'"
            class="border-t px-4 py-2 text-xs text-destructive"
          >
            失败演示：{{ String(sseFailureDemo.error.value ?? "任务失败") }}
          </p>
        </DataPanel>
      </section>

      <section v-if="showCategory('feedback')" class="space-y-4">
        <h2 class="text-lg font-semibold">EmptyState 空状态</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <div data-testid="empty-state-default" class="bg-card">
            <EmptyState
              icon="lucide:inbox"
              title="暂无数据"
              description="请先添加一条记录"
              action-text="新增记录"
              @action="onAdd"
            />
          </div>
          <div
            data-testid="empty-state-bordered"
            class="rounded-lg border bg-card"
          >
            <EmptyState
              icon="lucide:search-x"
              title="未找到匹配结果"
              description="尝试使用其他关键词"
              size="lg"
              bordered
            />
          </div>
          <div class="rounded-lg border bg-card">
            <EmptyState />
          </div>
        </div>
      </section>

      <section v-if="showCategory('feedback')" class="space-y-4">
        <h2 class="text-lg font-semibold">ResultPage 结果页</h2>
        <div class="grid gap-4 lg:grid-cols-2">
          <Button variant="outline" @click="showResult = !showResult">
            {{ showResult ? "隐藏" : "显示" }} 404 页面
          </Button>
        </div>
        <div
          v-if="showResult"
          class="rounded-lg border bg-card overflow-hidden"
        >
          <ResultPage
            status="404"
            primary-text="重新搜索"
            @primary="showResult = false"
          />
        </div>
      </section>
    </div>
  </PageContainer>
</template>
