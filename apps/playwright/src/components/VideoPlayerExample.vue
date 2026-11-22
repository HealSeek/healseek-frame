<script setup lang="ts">
import { ref, shallowRef } from "vue";
import {
  Button,
  Input,
  VideoPlayer,
  type VideoPlayerOptions,
} from "@healseek/components";

const mediaUrl = ref("");
const subtitleUrl = ref("");
const error = ref("");
const preview = shallowRef<{
  key: number;
  src: string;
  options: VideoPlayerOptions;
}>();
let revision = 0;

function httpUrl(value: string, label: string): string {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol === "http:" || parsed.protocol === "https:")
      return parsed.href;
  } catch {
    // Show validation inline; an invalid input must not mount a player.
  }
  throw new Error(`${label}须为完整的 HTTP(S) 地址。`);
}

function loadPreview(): void {
  error.value = "";
  try {
    const src = httpUrl(mediaUrl.value, "播放地址");
    const subtitle = subtitleUrl.value.trim()
      ? { url: httpUrl(subtitleUrl.value, "字幕地址"), escape: true }
      : undefined;
    preview.value = {
      key: ++revision,
      src,
      options: { autoplay: false, ...(subtitle ? { subtitle } : {}) },
    };
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : "请检查输入地址。";
  }
}

function closePreview(): void {
  // Unmounting releases the player, its decoder and pending media requests.
  preview.value = undefined;
  error.value = "";
}
</script>

<template>
  <div class="space-y-4 rounded-lg border bg-card p-4">
    <form class="space-y-3" novalidate @submit.prevent="loadPreview">
      <div class="space-y-1.5">
        <label for="video-player-example-url" class="text-sm font-medium"
          >播放地址</label
        >
        <Input
          id="video-player-example-url"
          v-model="mediaUrl"
          type="url"
          autocomplete="off"
          placeholder="输入 MP4 或 HLS（m3u8）的 HTTP(S) 地址"
          aria-describedby="video-player-example-hint video-player-example-error"
        />
      </div>
      <div class="space-y-1.5">
        <label for="video-player-example-subtitle" class="text-sm font-medium"
          >字幕地址（可选）</label
        >
        <Input
          id="video-player-example-subtitle"
          v-model="subtitleUrl"
          type="url"
          autocomplete="off"
          placeholder="输入 VTT、SRT 或 ASS 字幕的 HTTP(S) 地址"
        />
      </div>
      <p id="video-player-example-hint" class="text-xs text-muted-foreground">
        默认不请求媒体，点击加载后才创建播放器。支持
        MP4、HLS、字幕、倍速、全屏和画中画，具体能力取决于浏览器；跨域资源须由源站允许访问。
      </p>
      <p
        v-show="error"
        id="video-player-example-error"
        role="alert"
        class="text-sm text-destructive"
      >
        {{ error }}
      </p>
      <div class="flex flex-wrap gap-2">
        <Button type="submit">加载预览</Button>
        <Button
          type="button"
          variant="outline"
          :disabled="!preview"
          @click="closePreview"
          >关闭预览</Button
        >
      </div>
    </form>
    <VideoPlayer
      v-if="preview"
      :key="preview.key"
      :src="preview.src"
      title="框架播放器预览"
      type="auto"
      active
      :options="preview.options"
    />
  </div>
</template>
