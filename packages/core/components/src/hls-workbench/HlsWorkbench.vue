<script setup lang="ts">
import { computed, onBeforeUnmount, ref, shallowRef, useId, watch } from "vue";
import {
  ChevronLeft,
  ChevronRight,
  Copy,
  LocateFixed,
  Plus,
  Scissors,
} from "@lucide/vue";
import { useOverlayOwner } from "@healseek/shared/overlay";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@healseek/uikit-shadcnui/components/ui/popover";
import { Button } from "../controls";
import { SelectBox } from "../select";
import { VideoPlayer } from "../video-player";
import type {
  VideoPlayerApi,
  VideoPlayerError,
  VideoPlayerProgress,
} from "../video-player";
import {
  findHlsFragment,
  parseHlsManifest,
  parseHlsMasterManifest,
  snapHlsBoundary,
} from "./manifest";
import { resolveHlsManifest } from "./resolution";
import type {
  HlsFragment,
  HlsManifestSource,
  HlsManifestLoader,
  HlsMarker,
  HlsMediaManifest,
  HlsRange,
  HlsWorkbenchApi,
  HlsVariant,
} from "./types";

defineOptions({ name: "HlsWorkbench" });
const props = withDefaults(
  defineProps<{
    manifest: HlsManifestSource;
    loadManifest?: HlsManifestLoader;
    ranges?: HlsRange[];
    markers?: HlsMarker[];
    title?: string;
    active?: boolean;
    disabled?: boolean;
  }>(),
  {
    ranges: () => [],
    markers: () => [],
    title: "片段预览",
    active: true,
    disabled: false,
  },
);
const emit = defineEmits<{
  "select-range": [range: HlsRange];
  "select-insertion": [seconds: number];
  "fragment-change": [fragment: HlsFragment | undefined];
  /** A host owning expiring playback URLs can obtain a new capability. */
  retry: [];
  error: [message: string];
  /** Preserve player initialization / decoding diagnostics for the host. */
  "player-error": [error: VideoPlayerError];
}>();

const player = ref<VideoPlayerApi>();
const variantControlId = `${useId()}-hls-variant`;
const fragmentAnchor = ref<HTMLElement>();
const owner = useOverlayOwner();
const fragmentPopupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);
const parsed = shallowRef<HlsMediaManifest>();
const resolvedSource = shallowRef<HlsManifestSource>();
const variants = shallowRef<HlsVariant[]>([]);
const variantIndex = ref(0);
const loading = ref(false);
const failure = ref("");
const currentTime = ref(0);
const selectionStart = ref(0);
const selectionEnd = ref(0);
const page = ref(1);
// The fragment list is intentionally a compact hover/focus popover. Keeping
// it closed by default leaves the player and selection controls readable when
// a playlist contains hundreds of segments.
const fragmentListOpen = ref(false);
let fragmentCloseTimer: ReturnType<typeof setTimeout> | undefined;
const copied = ref(false);
const copyError = ref("");
const pageSize = 50;
const mediaReady = ref(false);
let pendingSeek: number | undefined;
let copyRevision = 0;
let copyTimer: ReturnType<typeof setTimeout> | undefined;
let loadController: AbortController | undefined;
let loadRevision = 0;
let dragging:
  | { target: "seek" | "start" | "end"; pointerId: number; track: HTMLElement }
  | undefined;

const fragment = computed(
  () => parsed.value && findHlsFragment(parsed.value, currentTime.value),
);
const duration = computed(() => parsed.value?.duration ?? 0);
const selectionStartMax = computed(() => {
  const edges = parsed.value?.boundaries ?? [];
  return edges[Math.max(0, edges.indexOf(selectionEnd.value) - 1)] ?? 0;
});
const selectionEndMin = computed(() => {
  const edges = parsed.value?.boundaries ?? [];
  return (
    edges[
      Math.min(edges.length - 1, edges.indexOf(selectionStart.value) + 1)
    ] ?? 0
  );
});
const pageCount = computed(() =>
  Math.max(1, Math.ceil((parsed.value?.fragments.length ?? 0) / pageSize)),
);
const visibleFragments = computed(
  () =>
    parsed.value?.fragments.slice(
      (page.value - 1) * pageSize,
      page.value * pageSize,
    ) ?? [],
);
const canPreview = computed(() => !!parsed.value && props.active);
const canEdit = computed(() => canPreview.value && !props.disabled);
const insertionTime = computed(() => {
  const current = fragment.value;
  if (!current) return 0;
  // Insertion happens at or after the chosen frame, never before it.
  return currentTime.value <= current.startSeconds
    ? current.startSeconds
    : current.endSeconds;
});
const selectedCount = computed(
  () =>
    parsed.value?.fragments.filter(
      (part) =>
        part.startSeconds >= selectionStart.value &&
        part.endSeconds <= selectionEnd.value,
    ).length ?? 0,
);
const playerOptions = { autoplay: false, screenshot: false };
const variantOptions = computed(() =>
  variants.value.map((item) => ({
    label: item.label,
    value: String(item.index),
  })),
);

function formatTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const remainder = (safe % 60).toFixed(3).padStart(6, "0");
  return `${hours ? `${hours}:` : ""}${String(minutes).padStart(2, "0")}:${remainder}`;
}
function percent(seconds: number) {
  return `${duration.value ? Math.max(0, Math.min(100, (seconds / duration.value) * 100)) : 0}%`;
}
function rangeStyle(range: HlsRange) {
  const start = Math.max(0, Math.min(duration.value, range.startSeconds));
  const end = Math.max(start, Math.min(duration.value, range.endSeconds));
  return { left: percent(start), width: percent(end - start) };
}

function clearCopy() {
  copyRevision++;
  if (copyTimer) clearTimeout(copyTimer);
  copyTimer = undefined;
  copied.value = false;
  copyError.value = "";
}
function endDrag() {
  dragging = undefined;
  if (typeof window === "undefined") return;
  window.removeEventListener("pointermove", moveDrag);
  window.removeEventListener("pointerup", finishDrag);
  window.removeEventListener("pointercancel", finishDrag);
  window.removeEventListener("blur", endDrag);
}

function cancelLoad() {
  loadRevision++;
  loadController?.abort();
  loadController = undefined;
  loading.value = false;
}
function useMedia(source: HlsManifestSource, media: HlsMediaManifest) {
  if (source.playbackUrl) {
    const playback = new URL(source.playbackUrl, source.url);
    if (
      !["http:", "https:"].includes(playback.protocol) ||
      playback.username ||
      playback.password
    )
      throw new Error("预览播放地址必须使用不含账号密码的 HTTP(S) 地址。");
  }
  resolvedSource.value = source;
  selectionStart.value = 0;
  selectionEnd.value = media.fragments[0]!.endSeconds;
  parsed.value = media;
}
async function loadSource() {
  cancelLoad();
  updateFragmentList(false);
  const revision = loadRevision;
  endDrag();
  clearCopy();
  pendingSeek = undefined;
  mediaReady.value = false;
  currentTime.value = 0;
  page.value = 1;
  failure.value = "";
  parsed.value = undefined;
  resolvedSource.value = undefined;
  variants.value = [];
  try {
    const master = parseHlsMasterManifest(
      props.manifest.text,
      props.manifest.url,
    );
    variants.value = master?.variants ?? [];
    if (!master) {
      // Keep an already supplied media playlist synchronous and request-free.
      useMedia(
        props.manifest,
        parseHlsManifest(props.manifest.text, props.manifest.url),
      );
      return;
    }
    if (!props.active) return;
    const controller = new AbortController();
    loadController = controller;
    loading.value = true;
    const result = await resolveHlsManifest(props.manifest, {
      loadManifest: props.loadManifest,
      signal: controller.signal,
      variantIndex: variantIndex.value,
    });
    // A changed source, variant or closed drawer must never receive stale data.
    if (revision !== loadRevision || controller.signal.aborted) return;
    useMedia(result.source, result.manifest);
  } catch (error) {
    if (revision !== loadRevision) return;
    failure.value = error instanceof Error ? error.message : "M3U8 读取失败。";
    emit("error", failure.value);
  } finally {
    if (revision === loadRevision) {
      loading.value = false;
      loadController = undefined;
    }
  }
}
function chooseVariant(value: string | undefined) {
  const index = Number(value);
  if (
    !props.active ||
    value === undefined ||
    !variants.value.some((item) => item.index === index)
  )
    return;
  if (index === variantIndex.value) return;
  variantIndex.value = index;
  void loadSource();
}
watch(
  () => [
    props.manifest.text,
    props.manifest.url,
    props.manifest.playbackUrl,
    props.loadManifest,
  ],
  (_value, _previous, onCleanup) => {
    variantIndex.value = 0;
    void loadSource();
    onCleanup(cancelLoad);
  },
  { immediate: true },
);

watch(
  fragment,
  (value, previous) => {
    if (value !== previous) {
      clearCopy();
      emit("fragment-change", value);
    }
  },
  { immediate: true },
);
watch(
  () => [props.active, props.disabled],
  (_value, previous) => {
    if (!props.active || (props.disabled && dragging?.target !== "seek"))
      endDrag();
    if (!props.active) {
      updateFragmentList(false);
      cancelLoad();
      mediaReady.value = false;
      pendingSeek = currentTime.value;
    } else if (!previous[0] && !parsed.value && variants.value.length) {
      void loadSource();
    }
  },
);
watch(
  () => owner?.active.value,
  (active) => {
    if (active === false) updateFragmentList(false);
  },
  { flush: "sync" },
);

function seek(seconds: number) {
  if (!parsed.value || !props.active || !Number.isFinite(seconds)) return;
  const next = Math.max(0, Math.min(duration.value, seconds));
  currentTime.value = next;
  // Artplayer cannot apply a seek before metadata establishes the media range.
  // Keep only the most recent user intent and apply it once metadata arrives.
  pendingSeek = next;
  if (mediaReady.value && player.value) {
    player.value.seek(next);
    pendingSeek = undefined;
  }
}
function metadataReady() {
  mediaReady.value = true;
  if (pendingSeek !== undefined && player.value) {
    player.value.seek(pendingSeek);
    pendingSeek = undefined;
  }
}
function updateTime(progress: VideoPlayerProgress) {
  if (
    !props.active ||
    !Number.isFinite(progress.currentTime) ||
    pendingSeek !== undefined ||
    dragging?.target === "seek"
  )
    return;
  currentTime.value = Math.max(
    0,
    Math.min(duration.value, progress.currentTime),
  );
}
function setSelectionBoundary(target: "start" | "end", seconds: number) {
  const data = parsed.value;
  if (!data || !canEdit.value) return;
  const edges = data.boundaries;
  const next = snapHlsBoundary(data, seconds);
  if (target === "start") {
    const endIndex = edges.indexOf(selectionEnd.value);
    selectionStart.value = Math.min(next, edges[Math.max(0, endIndex - 1)]!);
  } else {
    const startIndex = edges.indexOf(selectionStart.value);
    selectionEnd.value = Math.max(
      next,
      edges[Math.min(edges.length - 1, startIndex + 1)]!,
    );
  }
}
function timeFromPointer(event: PointerEvent) {
  // The three tracks can have different geometry after a host layout change.
  // Keep the pointer mapped to the track where this drag actually began.
  const box = dragging?.track.getBoundingClientRect();
  if (!box || box.width <= 0) return undefined;
  return (
    Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)) *
    duration.value
  );
}
function moveDrag(event: PointerEvent) {
  if (!dragging || event.pointerId !== dragging.pointerId) return;
  const seconds = timeFromPointer(event);
  if (seconds === undefined) return;
  if (dragging.target === "seek") seek(seconds);
  else {
    setSelectionBoundary(dragging.target, seconds);
    seek(
      dragging.target === "start" ? selectionStart.value : selectionEnd.value,
    );
  }
  event.preventDefault();
}
function finishDrag(event: PointerEvent) {
  if (!dragging || event.pointerId !== dragging.pointerId) return;
  if (event.type !== "pointercancel") moveDrag(event);
  endDrag();
}
function beginDrag(event: PointerEvent, target: "seek" | "start" | "end") {
  if (
    !(target === "seek" ? canPreview.value : canEdit.value) ||
    event.button !== 0 ||
    event.isPrimary === false
  )
    return;
  const control = event.currentTarget as HTMLElement;
  const track = control.closest<HTMLElement>(".hls-track");
  if (!track) return;
  endDrag();
  dragging = { target, pointerId: event.pointerId, track };
  control.focus({ preventScroll: true });
  window.addEventListener("pointermove", moveDrag, { passive: false });
  window.addEventListener("pointerup", finishDrag);
  window.addEventListener("pointercancel", finishDrag);
  window.addEventListener("blur", endDrag);
  moveDrag(event);
}
function boundaryKey(event: KeyboardEvent, target: "start" | "end") {
  const data = parsed.value;
  if (!data || !canEdit.value) return;
  const value = target === "start" ? selectionStart.value : selectionEnd.value;
  const index = data.boundaries.indexOf(value);
  let next: number | undefined;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown")
    next = data.boundaries[Math.max(0, index - 1)];
  if (event.key === "ArrowRight" || event.key === "ArrowUp")
    next = data.boundaries[Math.min(data.boundaries.length - 1, index + 1)];
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = data.duration;
  if (next === undefined) return;
  event.preventDefault();
  setSelectionBoundary(target, next);
  seek(target === "start" ? selectionStart.value : selectionEnd.value);
}
function playbackKey(event: KeyboardEvent) {
  if (!canPreview.value || !duration.value) return;
  const step = Math.max(0.1, Math.min(5, duration.value / 100));
  let next: number | undefined;
  if (event.key === "ArrowLeft" || event.key === "ArrowDown")
    next = currentTime.value - step;
  if (event.key === "ArrowRight" || event.key === "ArrowUp")
    next = currentTime.value + step;
  if (event.key === "Home") next = 0;
  if (event.key === "End") next = duration.value;
  if (next === undefined) return;
  event.preventDefault();
  seek(next);
}
function chooseCurrentFragment() {
  if (!fragment.value || !canEdit.value) return;
  selectionStart.value = fragment.value.startSeconds;
  selectionEnd.value = fragment.value.endSeconds;
}
function locateCurrent() {
  if (fragment.value)
    page.value = Math.floor(fragment.value.index / pageSize) + 1;
}
function clearFragmentClose() {
  if (fragmentCloseTimer) clearTimeout(fragmentCloseTimer);
  fragmentCloseTimer = undefined;
}
function updateFragmentList(open: boolean) {
  clearFragmentClose();
  fragmentListOpen.value =
    open && props.active && !!parsed.value && owner?.active.value !== false;
}
function openFragmentList() {
  updateFragmentList(true);
}
function closeFragmentList() {
  // Allow the pointer to cross the small gap into the body-portalled panel.
  clearFragmentClose();
  fragmentCloseTimer = setTimeout(() => updateFragmentList(false), 150);
}
function fragmentFocusOut(event: FocusEvent) {
  const next = event.relatedTarget;
  const contentId = fragmentAnchor.value
    ?.querySelector('[data-slot="hls-fragments-trigger"]')
    ?.getAttribute("aria-controls");
  if (
    next instanceof Node &&
    (fragmentAnchor.value?.contains(next) ||
      (contentId && document.getElementById(contentId)?.contains(next)))
  )
    return;
  closeFragmentList();
}
async function copyFragment() {
  if (!fragment.value) return;
  const request = ++copyRevision;
  const text = fragment.value.rawText;
  copyError.value = "";
  try {
    await navigator.clipboard.writeText(text);
    if (request !== copyRevision) return;
    copied.value = true;
    copyTimer = setTimeout(() => {
      copied.value = false;
    }, 1800);
  } catch {
    if (request === copyRevision)
      copyError.value = "复制失败，请直接选择下方文本复制。";
  }
}

defineExpose<HlsWorkbenchApi>({
  seek,
  getSelection: () =>
    parsed.value
      ? { startSeconds: selectionStart.value, endSeconds: selectionEnd.value }
      : undefined,
  getCurrentFragment: () => fragment.value,
});
onBeforeUnmount(() => {
  cancelLoad();
  endDrag();
  clearCopy();
  clearFragmentClose();
  pendingSeek = undefined;
});
</script>

<template>
  <section
    data-slot="hls-workbench"
    class="hls-workbench min-w-0"
    :aria-label="title"
  >
    <p v-if="loading" role="status" class="text-sm text-muted-foreground">
      正在读取媒体播放列表…
    </p>
    <div
      v-if="failure"
      role="alert"
      class="rounded-lg bg-destructive/10 p-4 text-sm leading-6 text-destructive"
    >
      {{ failure }}
      <Button
        v-if="variants.length && active"
        type="button"
        variant="outline"
        size="sm"
        class="ml-3"
        @click="loadSource"
      >
        重新读取
      </Button>
    </div>
    <p
      v-else-if="!active && !parsed"
      role="status"
      class="text-sm text-muted-foreground"
    >
      打开预览后读取媒体播放列表。
    </p>
    <template v-else-if="parsed && resolvedSource">
      <div class="hls-playback-shell overflow-hidden rounded-lg border bg-card">
        <div
          v-if="variants.length"
          class="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"
        >
          <div>
            <p class="text-sm font-medium">播放预览</p>
            <p class="text-xs text-muted-foreground">
              拖动时间轴定位分片，使用选区手柄配置过滤范围或插入点。
            </p>
          </div>
          <div class="flex items-center gap-3">
            <label class="text-sm font-medium" :for="variantControlId"
              >播放画质</label
            >
            <SelectBox
              :id="variantControlId"
              data-slot="hls-variant-select"
              class="w-64 max-w-full"
              :model-value="String(variantIndex)"
              :options="variantOptions"
              :disabled="!active"
              @update:model-value="chooseVariant"
            />
          </div>
        </div>
        <div
          class="grid min-w-0 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,0.85fr)]"
        >
          <div class="min-w-0">
            <VideoPlayer
              ref="player"
              :src="resolvedSource.playbackUrl || resolvedSource.url"
              type="hls"
              :title="title"
              :active="active"
              :options="playerOptions"
              @loadedmetadata="metadataReady"
              @timeupdate="updateTime"
              @retry="emit('retry')"
              @error="emit('player-error', $event)"
            />
            <div class="space-y-4 border-t px-4 py-4">
              <div
                class="flex flex-wrap items-baseline justify-between gap-2 text-sm"
              >
                <span class="font-medium">播放进度与片段选区</span>
                <span class="tabular-nums text-muted-foreground"
                  >{{ formatTime(currentTime) }} /
                  {{ formatTime(duration) }}</span
                >
              </div>
              <div class="hls-timeline-stack" data-slot="hls-timeline-controls">
                <div class="hls-timeline-row">
                  <div class="hls-timeline-label">
                    <span class="font-medium">选区开始</span>
                    <span class="tabular-nums text-muted-foreground">{{
                      formatTime(selectionStart)
                    }}</span>
                  </div>
                  <div
                    class="hls-track hls-boundary-track relative touch-none"
                    @pointerdown="beginDrag($event, 'start')"
                  >
                    <button
                      type="button"
                      role="slider"
                      data-slot="hls-range-start"
                      class="hls-range-handle absolute z-20 -translate-x-1/2 rounded-sm border-2 border-primary bg-background text-primary shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="选区开始"
                      :aria-valuemin="0"
                      :aria-valuemax="selectionStartMax"
                      :aria-valuenow="selectionStart"
                      :aria-valuetext="formatTime(selectionStart)"
                      :style="{ left: percent(selectionStart) }"
                      :disabled="!canEdit"
                      @pointerdown.stop="beginDrag($event, 'start')"
                      @keydown.stop="boundaryKey($event, 'start')"
                    >
                      <span aria-hidden="true">⋮</span>
                    </button>
                  </div>
                </div>
                <div class="hls-timeline-row">
                  <div class="hls-timeline-label">
                    <span class="font-medium">播放位置</span>
                    <span class="tabular-nums text-muted-foreground">{{
                      formatTime(currentTime)
                    }}</span>
                  </div>
                  <div
                    data-slot="hls-selection-rail"
                    role="slider"
                    aria-label="播放位置"
                    :aria-valuemin="0"
                    :aria-valuemax="duration"
                    :aria-valuenow="currentTime"
                    :aria-valuetext="formatTime(currentTime)"
                    :aria-disabled="!canPreview"
                    :tabindex="canPreview ? 0 : -1"
                    class="hls-selection-rail hls-track relative touch-none rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                    @pointerdown="beginDrag($event, 'seek')"
                    @keydown="playbackKey"
                  >
                    <span
                      v-for="(range, index) in ranges"
                      :key="`range-${index}`"
                      class="pointer-events-none absolute top-1/2 h-3 -translate-y-1/2 rounded-sm bg-destructive/30"
                      :style="rangeStyle(range)"
                      :title="range.label || '已配置过滤区间'"
                    />
                    <span
                      data-slot="hls-selection-highlight"
                      class="pointer-events-none absolute top-1/2 h-3 -translate-y-1/2 rounded-sm border-x border-primary/60 bg-primary/25"
                      :style="
                        rangeStyle({
                          startSeconds: selectionStart,
                          endSeconds: selectionEnd,
                        })
                      "
                    />
                    <span
                      v-for="(marker, index) in markers"
                      :key="`marker-${index}`"
                      class="pointer-events-none absolute top-0.5 h-5 w-0.5 bg-violet-500"
                      :style="{ left: percent(marker.atSeconds) }"
                      :title="marker.label || '已配置插入点'"
                    />
                    <span
                      data-slot="hls-playhead"
                      class="pointer-events-none absolute inset-y-0 z-10 w-1 -translate-x-1/2 rounded-full bg-foreground"
                      :style="{ left: percent(currentTime) }"
                    />
                  </div>
                </div>
                <div class="hls-timeline-row">
                  <div class="hls-timeline-label">
                    <span class="font-medium">选区结束</span>
                    <span class="tabular-nums text-muted-foreground">{{
                      formatTime(selectionEnd)
                    }}</span>
                  </div>
                  <div
                    class="hls-track hls-boundary-track relative touch-none"
                    @pointerdown="beginDrag($event, 'end')"
                  >
                    <button
                      type="button"
                      role="slider"
                      data-slot="hls-range-end"
                      class="hls-range-handle absolute z-20 -translate-x-1/2 rounded-sm border-2 border-primary bg-background text-primary shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="选区结束"
                      :aria-valuemin="selectionEndMin"
                      :aria-valuemax="duration"
                      :aria-valuenow="selectionEnd"
                      :aria-valuetext="formatTime(selectionEnd)"
                      :style="{ left: percent(selectionEnd) }"
                      :disabled="!canEdit"
                      @pointerdown.stop="beginDrag($event, 'end')"
                      @keydown.stop="boundaryKey($event, 'end')"
                    >
                      <span aria-hidden="true">⋮</span>
                    </button>
                  </div>
                </div>
              </div>
              <input
                class="hls-seek sr-only"
                type="range"
                aria-label="播放位置"
                min="0"
                :max="duration"
                step="0.01"
                :value="currentTime"
                :disabled="!canPreview"
                @input="seek(Number(($event.target as HTMLInputElement).value))"
              />
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div class="space-y-1 text-xs text-muted-foreground">
                  <p class="tabular-nums">
                    选区 {{ formatTime(selectionStart) }} —
                    {{ formatTime(selectionEnd) }} ·
                    {{ selectedCount }} 个完整分片
                  </p>
                  <p>
                    上方调整开始，中间拖动播放位置，下方调整结束；高亮区域为当前选区。聚焦手柄后可用方向键逐片调整。
                  </p>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="!canEdit"
                    @click="chooseCurrentFragment"
                    >选中当前分片</Button
                  >
                  <Button
                    variant="outline"
                    size="sm"
                    :disabled="!canEdit"
                    @click="emit('select-insertion', insertionTime)"
                    ><Plus class="size-3.5" /><slot name="insertion-label"
                      >在此插入</slot
                    ><span class="tabular-nums text-xs">{{
                      formatTime(insertionTime)
                    }}</span></Button
                  >
                  <Button
                    size="sm"
                    :disabled="!canEdit"
                    @click="
                      emit('select-range', {
                        startSeconds: selectionStart,
                        endSeconds: selectionEnd,
                      })
                    "
                    ><Scissors class="size-3.5" /><slot name="range-label"
                      >使用选区</slot
                    ></Button
                  >
                  <div
                    ref="fragmentAnchor"
                    class="hls-fragment-popover"
                    @mouseenter="openFragmentList"
                    @mouseleave="closeFragmentList"
                    @focusin="openFragmentList"
                    @focusout="fragmentFocusOut"
                  >
                    <Popover
                      :open="fragmentListOpen"
                      @update:open="updateFragmentList"
                    >
                      <PopoverTrigger as-child>
                        <Button
                          data-slot="hls-fragments-trigger"
                          variant="outline"
                          size="sm"
                          :disabled="!active"
                          :aria-expanded="fragmentListOpen"
                          @mouseenter="openFragmentList"
                          @focus="openFragmentList"
                        >
                          <LocateFixed class="size-3.5" />
                          分片列表
                          <span class="font-normal text-muted-foreground"
                            >{{ parsed.fragments.length }} 个</span
                          >
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent
                        align="end"
                        side="bottom"
                        :side-offset="6"
                        :collision-padding="16"
                        :style="fragmentPopupStyle"
                        class="hls-fragment-popover-panel flex max-h-[var(--reka-popover-content-available-height)] w-[min(48rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg p-0"
                        aria-label="选择要定位的分片"
                        @mouseenter="openFragmentList"
                        @mouseleave="closeFragmentList"
                        @focusin="openFragmentList"
                        @focusout="fragmentFocusOut"
                        @open-auto-focus.prevent
                        @close-auto-focus.prevent
                      >
                        <div
                          class="flex shrink-0 items-center justify-between gap-2 border-b px-4 py-3"
                        >
                          <span class="text-sm font-medium"
                            >选择要定位的分片</span
                          >
                          <Button
                            variant="ghost"
                            size="sm"
                            :disabled="!active"
                            @click="locateCurrent"
                          >
                            <LocateFixed class="size-3.5" />定位当前
                          </Button>
                        </div>
                        <ol
                          data-slot="hls-fragments"
                          class="max-h-64 min-h-0 overflow-y-auto p-1"
                        >
                          <li
                            v-for="part in visibleFragments"
                            :key="part.index"
                          >
                            <button
                              type="button"
                              class="flex w-full min-w-0 items-center gap-3 rounded-md px-3 py-2 text-left text-xs transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50"
                              :class="
                                fragment?.index === part.index
                                  ? 'bg-primary/10 text-primary'
                                  : 'text-foreground'
                              "
                              :aria-current="
                                fragment?.index === part.index
                                  ? 'true'
                                  : undefined
                              "
                              :disabled="!active"
                              @click="seek(part.startSeconds)"
                            >
                              <span class="w-10 shrink-0 tabular-nums"
                                >#{{ part.index + 1 }}</span
                              >
                              <span class="w-44 shrink-0 tabular-nums"
                                >{{ formatTime(part.startSeconds) }} —
                                {{ formatTime(part.endSeconds) }}</span
                              >
                              <span
                                class="min-w-0 flex-1 truncate"
                                :title="part.uri"
                                >{{ part.uri }}</span
                              >
                              <span
                                v-if="part.discontinuity"
                                class="shrink-0 text-muted-foreground"
                                >断点</span
                              >
                            </button>
                          </li>
                        </ol>
                        <div
                          class="flex shrink-0 items-center justify-between gap-2 border-t px-4 py-2 text-xs text-muted-foreground"
                        >
                          <span
                            >{{ (page - 1) * pageSize + 1 }}–{{
                              Math.min(page * pageSize, parsed.fragments.length)
                            }}
                            / {{ parsed.fragments.length }}</span
                          >
                          <div class="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="上一页分片"
                              :disabled="page <= 1"
                              @click="page--"
                              ><ChevronLeft class="size-4"
                            /></Button>
                            <span class="tabular-nums"
                              >{{ page }} / {{ pageCount }}</span
                            >
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-label="下一页分片"
                              :disabled="page >= pageCount"
                              @click="page++"
                              ><ChevronRight class="size-4"
                            /></Button>
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </div>
              <slot
                name="selection-help"
                :range="{
                  startSeconds: selectionStart,
                  endSeconds: selectionEnd,
                }"
                :insertion-time="insertionTime"
              />
            </div>
          </div>
          <aside
            class="flex min-w-0 flex-col gap-3 border-t p-4 xl:border-l xl:border-t-0"
            aria-label="当前分片详情"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p class="text-sm font-medium">
                  当前分片
                  <span class="tabular-nums"
                    >{{ (fragment?.index ?? 0) + 1 }} /
                    {{ parsed.fragments.length }}</span
                  >
                </p>
                <p class="mt-1 text-xs text-muted-foreground">
                  {{ formatTime(fragment?.startSeconds ?? 0) }} —
                  {{ formatTime(fragment?.endSeconds ?? 0) }} · 媒体序号
                  {{ fragment?.sequence }}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                :disabled="!fragment"
                @click="copyFragment"
                ><Copy class="size-3.5" />{{
                  copied ? "已复制" : "复制原文"
                }}</Button
              >
            </div>
            <pre
              data-slot="hls-fragment-text"
              class="hls-fragment-text min-h-28 flex-1 overflow-auto rounded-md bg-muted/50 p-3 font-mono text-xs leading-5 whitespace-pre-wrap break-all"
              tabindex="0"
              aria-label="当前分片 M3U8 原文"
              >{{ fragment?.rawText }}</pre
            >
            <p v-if="copyError" role="status" class="text-xs text-destructive">
              {{ copyError }}
            </p>
            <p class="text-xs leading-5 text-muted-foreground">
              原文会随播放位置同步，包含当前分片生效的密钥、初始化片段和断点标记。
            </p>
          </aside>
        </div>
      </div>
    </template>
  </section>
</template>

<style scoped>
.hls-range-handle {
  width: 1.25rem;
  height: 1.5rem;
  cursor: ew-resize;
  touch-action: none;
}
.hls-timeline-stack {
  display: grid;
  gap: 0.75rem;
}
.hls-timeline-row {
  display: grid;
  grid-template-columns: minmax(6rem, 7.5rem) minmax(0, 1fr);
  align-items: center;
  gap: 0.75rem;
}
.hls-timeline-label {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 0.35rem;
  font-size: 0.75rem;
  line-height: 1rem;
}
.hls-track {
  min-width: 8rem;
  height: 1.5rem;
}
.hls-track::before {
  content: "";
  position: absolute;
  inset-inline: 0;
  top: calc(50% - 2px);
  height: 4px;
  border-radius: 9999px;
  background: var(--muted);
}
/* Keep both handles reachable even when one segment is only a few pixels wide. */
[data-slot="hls-range-start"] {
  top: 0;
}
[data-slot="hls-range-end"] {
  top: 0;
}
.hls-seek {
  height: 1rem;
  cursor: pointer;
}
.hls-seek:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
@media (max-width: 640px) {
  .hls-workbench [data-slot="hls-fragments"] button {
    flex-wrap: wrap;
    gap: 0.375rem;
  }
  .hls-timeline-row {
    grid-template-columns: 1fr;
    gap: 0.35rem;
  }
  .hls-timeline-label {
    justify-content: flex-start;
  }
}
</style>
