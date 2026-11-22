<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import { Icon } from "@iconify/vue";
import { useTabStore, type TabItem } from "@healseek/stores/tabs";
import { FrameworkTooltip } from "@healseek/components/overlay";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger,
} from "@healseek/uikit-shadcnui/components/ui/context-menu";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@healseek/uikit-shadcnui/components/ui/dropdown-menu";
import TabActionItems from "./TabActionItems.vue";
import { useTabActions } from "./tab-actions";

defineOptions({ name: "BasicTabBar" });

const tabs = useTabStore();
const appGlobals = getCurrentInstance()?.appContext.config.globalProperties;
const labels: Record<string, string> = {
  navigation: "打开的页面",
  previous: "向左滚动标签",
  next: "向右滚动标签",
  opened: "打开的标签页",
  actions: "标签页操作",
  refreshCurrent: "刷新当前页",
  refresh: "刷新",
  pin: "固定标签",
  unpin: "取消固定",
  maximize: "最大化",
  restore: "退出最大化",
  newWindow: "在新窗口打开",
  closeCurrent: "关闭当前标签",
  closeLeft: "关闭左侧标签",
  closeRight: "关闭右侧标签",
  closeOthers: "关闭其他标签",
  closeAll: "关闭全部标签",
  close: "关闭",
  fixed: "固定标签",
};

function t(key: string): string {
  const translate = appGlobals?.$t as ((key: string) => string) | undefined;
  const exists = appGlobals?.$te as ((key: string) => boolean) | undefined;
  const localeKey = `tabs.${key}`;
  return translate && exists?.(localeKey)
    ? translate(localeKey)
    : labels[key] ?? key;
}

function tabTitle(tab: TabItem): string {
  const translate = appGlobals?.$t as ((key: string) => string) | undefined;
  const exists = appGlobals?.$te as ((key: string) => boolean) | undefined;
  return tab.titleKey && translate && exists?.(tab.titleKey)
    ? translate(tab.titleKey)
    : tab.title;
}

const { actions, close, maximize, navigate } = useTabActions(t);
const orderedTabs = computed(() => tabs.orderedTabs);
const activeTab = computed(() =>
  tabs.tabs.find((tab) => tab.id === tabs.activeTabId),
);
const tabScroll = ref<HTMLElement | null>(null);
const tabElements = new Map<string, HTMLElement>();
const canScrollLeft = ref(false);
const canScrollRight = ref(false);
const draggedTabId = ref<string | null>(null);
const dropTargetId = ref<string | null>(null);
const coarsePointer = ref(false);
let resizeObserver: ResizeObserver | undefined;
let pointerQuery: MediaQueryList | undefined;

function setTabElement(id: string, element: unknown): void {
  if (element instanceof HTMLElement) tabElements.set(id, element);
  else tabElements.delete(id);
}

function updateScrollState(): void {
  const element = tabScroll.value;
  canScrollLeft.value = Boolean(element && element.scrollLeft > 1);
  canScrollRight.value = Boolean(
    element &&
      element.scrollLeft + element.clientWidth < element.scrollWidth - 1,
  );
}

function scrollTo(left: number, smooth = true): void {
  const element = tabScroll.value;
  if (!element) return;
  const clamped = Math.max(
    0,
    Math.min(left, element.scrollWidth - element.clientWidth),
  );
  const reducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  element.scrollTo({
    left: clamped,
    behavior: smooth && !reducedMotion ? "smooth" : "auto",
  });
}

function revealTab(id: string): void {
  const host = tabScroll.value;
  const element = tabElements.get(id);
  if (!host || !element) return;
  const hostRect = host.getBoundingClientRect();
  const tabRect = element.getBoundingClientRect();
  if (tabRect.left < hostRect.left)
    scrollTo(host.scrollLeft + tabRect.left - hostRect.left - 8);
  else if (tabRect.right > hostRect.right)
    scrollTo(host.scrollLeft + tabRect.right - hostRect.right + 8);
  updateScrollState();
}

function scrollTabs(direction: -1 | 1): void {
  const element = tabScroll.value;
  if (element)
    scrollTo(
      element.scrollLeft + direction * Math.max(180, element.clientWidth * 0.7),
    );
}

function onWheel(event: WheelEvent): void {
  const element = tabScroll.value;
  if (!element || event.ctrlKey || element.scrollWidth <= element.clientWidth)
    return;
  const delta =
    Math.abs(event.deltaX) > Math.abs(event.deltaY)
      ? event.deltaX
      : event.deltaY;
  if (!delta) return;
  event.preventDefault();
  const pixels =
    delta *
    (event.deltaMode === 1
      ? 16
      : event.deltaMode === 2
        ? element.clientWidth
        : 1);
  scrollTo(element.scrollLeft + pixels, false);
  updateScrollState();
}

async function clickTab(tab: TabItem, focus = false): Promise<void> {
  if (!(await navigate(tab))) return;
  await nextTick();
  revealTab(tab.id);
  if (focus)
    tabElements
      .get(tab.id)
      ?.querySelector<HTMLButtonElement>('[role="tab"]')
      ?.focus({ preventScroll: true });
}

async function closeTab(tab: TabItem, returnFocus = false): Promise<void> {
  await close("current", tab.id);
  if (returnFocus) {
    await nextTick();
    if (tabs.activeTabId)
      tabElements
        .get(tabs.activeTabId)
        ?.querySelector<HTMLButtonElement>('[role="tab"]')
        ?.focus({ preventScroll: true });
  }
}

function onTabKeydown(event: KeyboardEvent, tab: TabItem): void {
  const index = orderedTabs.value.findIndex((item) => item.id === tab.id);
  let target: TabItem | undefined;
  if (event.key === "ArrowLeft")
    target =
      orderedTabs.value[
        (index - 1 + orderedTabs.value.length) % orderedTabs.value.length
      ];
  if (event.key === "ArrowRight")
    target = orderedTabs.value[(index + 1) % orderedTabs.value.length];
  if (event.key === "Home") target = orderedTabs.value[0];
  if (event.key === "End") target = orderedTabs.value.at(-1);
  if (target) {
    event.preventDefault();
    void clickTab(target, true);
  } else if (event.key === "Delete" && tabs.isClosable(tab)) {
    event.preventDefault();
    void closeTab(tab, true);
  }
}

function middleClick(event: MouseEvent, tab: TabItem): void {
  if (event.button !== 1) return;
  event.preventDefault();
  void closeTab(tab);
}

function canDrop(tab: TabItem): boolean {
  const dragged = tabs.tabs.find((item) => item.id === draggedTabId.value);
  return Boolean(
    dragged &&
      !dragged.affix &&
      !tab.affix &&
      dragged.pinned === tab.pinned &&
      dragged.id !== tab.id,
  );
}

function startDrag(event: DragEvent, tab: TabItem): void {
  if (tab.affix || coarsePointer.value) {
    event.preventDefault();
    return;
  }
  draggedTabId.value = tab.id;
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tab.id);
  }
}

function dragOver(event: DragEvent, tab: TabItem): void {
  if (!canDrop(tab)) return;
  event.preventDefault();
  if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
  dropTargetId.value = tab.id;
}

function endDrag(): void {
  draggedTabId.value = null;
  dropTargetId.value = null;
}

function drop(event: DragEvent, tab: TabItem): void {
  if (canDrop(tab) && draggedTabId.value) {
    event.preventDefault();
    tabs.moveTab(draggedTabId.value, tab.id);
  }
  endDrag();
}

function updatePointer(): void {
  coarsePointer.value = pointerQuery?.matches ?? false;
}

onMounted(() => {
  pointerQuery = window.matchMedia?.("(pointer: coarse)");
  updatePointer();
  pointerQuery?.addEventListener("change", updatePointer);
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      updateScrollState();
      if (tabs.activeTabId) revealTab(tabs.activeTabId);
    });
    if (tabScroll.value) resizeObserver.observe(tabScroll.value);
  }
  window.addEventListener("resize", updateScrollState);
  updateScrollState();
  if (tabs.activeTabId) revealTab(tabs.activeTabId);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  pointerQuery?.removeEventListener("change", updatePointer);
  window.removeEventListener("resize", updateScrollState);
});

watch(tabScroll, (element) => {
  resizeObserver?.disconnect();
  if (element) resizeObserver?.observe(element);
});

watch(
  () => [
    tabs.activeTabId,
    ...orderedTabs.value.map((tab) => `${tab.id}:${tabTitle(tab)}`),
  ],
  async () => {
    await nextTick();
    if (tabs.activeTabId) revealTab(tabs.activeTabId);
    updateScrollState();
  },
);
</script>

<template>
  <div
    v-if="orderedTabs.length"
    data-slot="tab-bar"
    class="flex min-w-0 shrink-0 items-center border-b border-border bg-card"
  >
    <FrameworkTooltip :content="t('previous')" side="bottom">
      <template #trigger>
        <button
          v-show="canScrollLeft"
          type="button"
          data-slot="tabs-scroll-prev"
          :aria-label="t('previous')"
          class="tab-bar-tool"
          @click="scrollTabs(-1)"
        >
          <Icon icon="lucide:chevron-left" class="size-4" aria-hidden="true" />
        </button>
      </template>
    </FrameworkTooltip>
    <div
      ref="tabScroll"
      data-slot="tabs-scroll"
      class="tab-bar-scroll min-w-0 flex-1 overflow-x-auto overflow-y-hidden overscroll-x-contain"
      @scroll="updateScrollState"
      @wheel="onWheel"
    >
      <div
        role="tablist"
        :aria-label="t('navigation')"
        aria-orientation="horizontal"
        class="flex w-max min-w-full items-center gap-1 whitespace-nowrap px-2 py-1"
      >
        <ContextMenu v-for="tab in orderedTabs" :key="tab.id">
          <ContextMenuTrigger as-child>
            <div
              :ref="(element) => setTabElement(tab.id, element)"
              :data-tab-id="tab.id"
              :draggable="!tab.affix && !coarsePointer"
              :class="[
                'group relative flex h-8 shrink-0 select-none items-center rounded-md border border-transparent text-sm transition-colors motion-reduce:transition-none',
                tab.id === tabs.activeTabId
                  ? 'bg-secondary font-medium text-secondary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                dropTargetId === tab.id && 'border-primary',
                draggedTabId === tab.id && 'opacity-50',
              ]"
              @mousedown.middle.prevent
              @auxclick="middleClick($event, tab)"
              @dragstart="startDrag($event, tab)"
              @dragover="dragOver($event, tab)"
              @dragleave="dropTargetId === tab.id && (dropTargetId = null)"
              @drop="drop($event, tab)"
              @dragend="endDrag"
            >
              <button
                type="button"
                role="tab"
                :aria-selected="tab.id === tabs.activeTabId"
                :tabindex="tab.id === tabs.activeTabId ? 0 : -1"
                :title="tabTitle(tab)"
                class="inline-flex h-full min-w-0 items-center gap-1.5 rounded-md pl-3 pr-2 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                @click="clickTab(tab)"
                @dblclick="maximize(tab)"
                @keydown="onTabKeydown($event, tab)"
              >
                <Icon
                  v-if="tab.icon"
                  :icon="tab.icon"
                  class="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span class="max-w-40 truncate">{{ tabTitle(tab) }}</span>
                <Icon
                  v-if="tab.pinned || tab.affix"
                  icon="lucide:pin"
                  class="size-3 shrink-0 text-muted-foreground"
                  :aria-label="t('fixed')"
                />
              </button>
              <button
                v-if="tabs.isClosable(tab)"
                type="button"
                :aria-label="`${t('close')} ${tabTitle(tab)}`"
                class="mr-1.5 inline-flex size-5 shrink-0 items-center justify-center rounded-sm opacity-60 outline-none hover:bg-background hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring"
                @click.stop="closeTab(tab, true)"
                @mousedown.stop
              >
                <Icon icon="lucide:x" class="size-3" aria-hidden="true" />
              </button>
            </div>
          </ContextMenuTrigger>
          <ContextMenuContent class="min-w-48" :collision-padding="8">
            <TabActionItems kind="context" :actions="actions(tab)" />
          </ContextMenuContent>
        </ContextMenu>
      </div>
    </div>
    <FrameworkTooltip :content="t('next')" side="bottom">
      <template #trigger>
        <button
          v-show="canScrollRight"
          type="button"
          data-slot="tabs-scroll-next"
          :aria-label="t('next')"
          class="tab-bar-tool"
          @click="scrollTabs(1)"
        >
          <Icon icon="lucide:chevron-right" class="size-4" aria-hidden="true" />
        </button>
      </template>
    </FrameworkTooltip>
    <div class="flex shrink-0 items-center gap-0.5 border-l border-border px-1">
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            :aria-label="t('opened')"
            :title="t('opened')"
            class="tab-bar-tool"
          >
            <Icon
              icon="lucide:chevrons-up-down"
              class="size-4"
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          class="min-w-48 max-w-80"
          :collision-padding="8"
        >
          <DropdownMenuItem
            v-for="tab in orderedTabs"
            :key="tab.id"
            class="gap-2 py-1.5"
            @select="clickTab(tab)"
          >
            <Icon
              :icon="
                tab.id === tabs.activeTabId
                  ? 'lucide:check'
                  : tab.pinned || tab.affix
                    ? 'lucide:pin'
                    : 'lucide:file'
              "
              class="size-4 shrink-0"
              aria-hidden="true"
            />
            <span class="truncate">{{ tabTitle(tab) }}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <FrameworkTooltip :content="t('refreshCurrent')" side="bottom">
        <template #trigger>
          <button
            type="button"
            :aria-label="t('refreshCurrent')"
            :disabled="!activeTab"
            class="tab-bar-tool"
            @click="activeTab && tabs.refreshTab(activeTab.id)"
          >
            <Icon icon="lucide:rotate-cw" class="size-3.5" aria-hidden="true" />
          </button>
        </template>
      </FrameworkTooltip>
      <DropdownMenu>
        <DropdownMenuTrigger as-child>
          <button
            type="button"
            :aria-label="t('actions')"
            :title="t('actions')"
            :disabled="!activeTab"
            class="tab-bar-tool"
          >
            <Icon
              icon="lucide:chevron-down"
              class="size-4"
              aria-hidden="true"
            />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          class="min-w-48"
          :collision-padding="8"
        >
          <TabActionItems
            v-if="activeTab"
            kind="dropdown"
            :actions="actions(activeTab)"
          />
        </DropdownMenuContent>
      </DropdownMenu>
      <FrameworkTooltip
        :content="t(tabs.maximizedTabId ? 'restore' : 'maximize')"
        side="bottom"
      >
        <template #trigger>
          <button
            type="button"
            :aria-label="t(tabs.maximizedTabId ? 'restore' : 'maximize')"
            :disabled="!activeTab"
            class="tab-bar-tool"
            @click="activeTab && maximize(activeTab)"
          >
            <Icon
              :icon="
                tabs.maximizedTabId ? 'lucide:minimize-2' : 'lucide:maximize-2'
              "
              class="size-3.5"
              aria-hidden="true"
            />
          </button>
        </template>
      </FrameworkTooltip>
    </div>
  </div>
</template>

<style scoped>
.tab-bar-scroll {
  scrollbar-width: none;
}
.tab-bar-scroll::-webkit-scrollbar {
  display: none;
}
.tab-bar-tool {
  display: inline-flex;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-md);
  color: var(--muted-foreground);
  outline: none;
}
.tab-bar-tool:hover:not(:disabled) {
  background: var(--accent);
  color: var(--foreground);
}
.tab-bar-tool:focus-visible {
  box-shadow: inset 0 0 0 2px var(--ring);
}
.tab-bar-tool:disabled {
  pointer-events: none;
  opacity: 0.5;
}
</style>
