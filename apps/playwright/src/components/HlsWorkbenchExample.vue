<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  Button,
  HlsWorkbench,
  Input,
  Textarea,
  parseHlsManifest,
  parseHlsMasterManifest,
  type HlsManifestSource,
  type HlsRange,
  type HlsMarker,
} from "@healseek/components";

const url = ref("");
const text = ref(
  "#EXTM3U\n#EXT-X-TARGETDURATION:10\n#EXTINF:10,\nsegment-001.ts\n#EXTINF:10,\nsegment-002.ts\n#EXT-X-ENDLIST\n",
);
const loaded = shallowRef<HlsManifestSource>();
const ranges = ref<HlsRange[]>([]);
const markers = ref<HlsMarker[]>([]);
const error = ref("");
function load() {
  error.value = "";
  try {
    const base = url.value.trim();
    if (!parseHlsMasterManifest(text.value, base))
      parseHlsManifest(text.value, base);
    ranges.value = [];
    markers.value = [];
    loaded.value = { text: text.value, url: base };
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "播放列表读取失败。";
  }
}
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-card p-4">
    <form class="space-y-3" @submit.prevent="load">
      <div class="space-y-1.5">
        <label for="hls-example-url" class="text-sm font-medium"
          >原始 M3U8 地址</label
        ><Input
          id="hls-example-url"
          v-model="url"
          type="url"
          placeholder="https://media.example/vod/index.m3u8"
        />
      </div>
      <div class="space-y-1.5">
        <label for="hls-example-text" class="text-sm font-medium"
          >播放列表文本</label
        ><Textarea
          id="hls-example-text"
          v-model="text"
          :rows="7"
          class="font-mono text-xs"
        />
      </div>
      <p class="text-xs leading-5 text-muted-foreground">
        粘贴同一个 M3U8
        的文本和地址后加载。支持主播放列表，会自动读取所选画质的媒体清单；播放列表、媒体和分片须允许跨域访问。示例选区和插入标记仅保存在当前页面，不处理或保存媒体。
      </p>
      <p v-if="error" role="alert" class="text-sm text-destructive">
        {{ error }}
      </p>
      <div class="flex gap-2">
        <Button type="submit">加载可视化预览</Button
        ><Button
          type="button"
          variant="outline"
          :disabled="!loaded"
          @click="loaded = undefined"
          >关闭预览</Button
        >
      </div>
    </form>
    <HlsWorkbench
      v-if="loaded"
      :manifest="loaded"
      :ranges="ranges"
      :markers="markers"
      @select-range="ranges.push($event)"
      @select-insertion="markers.push({ atSeconds: $event })"
    >
      <template #range-label>添加示例过滤区间</template>
      <template #insertion-label>标记插入位置</template>
    </HlsWorkbench>
  </div>
</template>
