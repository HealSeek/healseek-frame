import { DOMWrapper, flushPromises, mount } from "@vue/test-utils";
import { defineComponent, h, ref } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { provideOverlayOwner } from "@healseek/shared/overlay";
import HlsWorkbench from "./HlsWorkbench.vue";

const seek = vi.fn();
const PlayerStub = defineComponent({
  name: "VideoPlayer",
  props: ["src", "active", "type"],
  emits: ["loadedmetadata", "timeupdate", "retry", "error"],
  setup(_props, { expose }) {
    expose({ seek });
    return () => h("div", { "data-player": true });
  },
});
const VariantSelectStub = defineComponent({
  name: "SelectBox",
  props: ["modelValue", "options", "disabled"],
  emits: ["update:modelValue"],
  setup(props, { emit }) {
    return () =>
      h(
        "select",
        {
          value: props.modelValue,
          disabled: props.disabled,
          onChange: (event: Event) =>
            emit(
              "update:modelValue",
              (event.target as HTMLSelectElement).value,
            ),
        },
        props.options.map((option: { value: string; label: string }) =>
          h("option", { value: option.value }, option.label),
        ),
      );
  },
});
const sample =
  "#EXTM3U\n#EXTINF:4,\none.ts\n#EXTINF:6,\ntwo.ts\n#EXTINF:10,\nthree.ts\n#EXT-X-ENDLIST";
const manifest = {
  text: sample,
  url: "https://media.example/index.m3u8",
  playbackUrl: "/signed/unprocessed",
};
const collectionMaster = {
  url: "https://v.lzcdn27.com/20261015/19214_fdcf15a2/index.m3u8",
  text: "#EXTM3U\n#EXT-X-STREAM-INF:PROGRAM-ID=1,BANDWIDTH=800000,RESOLUTION=1080x608\n2000k/hls/index.m3u8",
  playbackUrl: "/signed/master",
};
const collectionLeaf =
  "https://v.lzcdn27.com/20261015/19214_fdcf15a2/2000k/hls/index.m3u8";
const wrappers: ReturnType<typeof mount>[] = [];
function render(props: Record<string, unknown> = {}) {
  const wrapper = mount(HlsWorkbench, {
    attachTo: document.body,
    props: { manifest, ...props },
    global: {
      stubs: { VideoPlayer: PlayerStub, SelectBox: VariantSelectStub },
    },
  });
  wrappers.push(wrapper);
  return wrapper;
}
async function openFragments(wrapper: ReturnType<typeof render>) {
  await flushPromises();
  await wrapper
    .get('[data-slot="hls-fragments-trigger"]')
    .trigger("mouseenter");
  await flushPromises();
  return new DOMWrapper(
    document.querySelector<HTMLElement>(".hls-fragment-popover-panel")!,
  );
}
function pointer(type: string, clientX: number, pointerId = 1) {
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(event, { clientX, pointerId, button: 0 });
  return event;
}
function sizeRail(wrapper: ReturnType<typeof render>) {
  const rail = wrapper.get('[data-slot="hls-selection-rail"]').element;
  wrapper.findAll(".hls-track").forEach((track) => {
    vi.spyOn(track.element, "getBoundingClientRect").mockReturnValue({
      left: 0,
      width: 200,
    } as DOMRect);
  });
  return rail;
}
beforeEach(() => {
  seek.mockReset();
});
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
  document.body.innerHTML = "";
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("HlsWorkbench", () => {
  it("forwards the player's complete failure separately from playlist parse errors", async () => {
    const wrapper = render();
    const error = {
      code: "load",
      stage: "player-init",
      message: "播放器初始化失败，请重新加载。",
      cause: new Error("constructor failed"),
    };
    wrapper.getComponent(PlayerStub).vm.$emit("error", error);
    expect(wrapper.emitted("player-error")).toEqual([[error]]);
    expect(wrapper.emitted("error")).toBeUndefined();
  });
  it("lets a host renew expired playback URLs when the player is retried", async () => {
    const wrapper = render();
    await flushPromises();
    wrapper.getComponent(PlayerStub).vm.$emit("retry");
    expect(wrapper.emitted("retry")).toEqual([[]]);
  });
  it("loads the relative media variant before inspecting or playing a collection master", async () => {
    const loadManifest = vi.fn(async (url: string) => ({
      text: sample,
      url,
      playbackUrl: "/signed/selected-media",
    }));
    const wrapper = render({ manifest: collectionMaster, loadManifest });
    expect(wrapper.text()).toContain("正在读取媒体播放列表");
    expect(wrapper.findComponent(PlayerStub).exists()).toBe(false);
    await flushPromises();
    expect(loadManifest).toHaveBeenCalledWith(collectionLeaf, {
      signal: expect.any(AbortSignal),
    });
    expect(wrapper.findComponent(PlayerStub).props("src")).toBe(
      "/signed/selected-media",
    );
    expect(wrapper.emitted("fragment-change")?.at(-1)?.[0]).toMatchObject({
      resolvedUrl: collectionLeaf.replace("index.m3u8", "one.ts"),
      rawText: "#EXTINF:4,\none.ts",
    });
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
    expect(
      wrapper.findComponent(VariantSelectStub).props("options")[0].label,
    ).toContain("1080x608");
  });

  it("switches the preview to the selected media variant and resets its timeline", async () => {
    const loadManifest = vi.fn(async (url: string) => ({ text: sample, url }));
    const wrapper = render({
      manifest: {
        ...collectionMaster,
        text: `${collectionMaster.text}\n#EXT-X-STREAM-INF:BANDWIDTH=1600000\n../high/index.m3u8`,
      },
      loadManifest,
    });
    await flushPromises();
    await wrapper.get('input[aria-label="播放位置"]').setValue("9");
    await wrapper.findComponent(VariantSelectStub).get("select").setValue("1");
    await flushPromises();
    const highUrl = "https://v.lzcdn27.com/20261015/high/index.m3u8";
    expect(loadManifest).toHaveBeenLastCalledWith(highUrl, {
      signal: expect.any(AbortSignal),
    });
    expect(wrapper.findComponent(PlayerStub).props("src")).toBe(highUrl);
    expect(
      (wrapper.get('input[aria-label="播放位置"]').element as HTMLInputElement)
        .value,
    ).toBe("0");
    expect(wrapper.emitted("fragment-change")?.at(-1)?.[0]).toMatchObject({
      index: 0,
      resolvedUrl: highUrl.replace("index.m3u8", "one.ts"),
    });
  });

  it("aborts a master load on source change and ignores a loader's late response", async () => {
    let finish!: (value: { text: string; url: string }) => void;
    let signal!: AbortSignal;
    const loadManifest = vi.fn(
      (_url: string, options: { signal: AbortSignal }) => {
        signal = options.signal;
        return new Promise<{ text: string; url: string }>((resolve) => {
          finish = resolve;
        });
      },
    );
    const wrapper = render({ manifest: collectionMaster, loadManifest });
    await wrapper.setProps({ manifest });
    expect(signal.aborted).toBe(true);
    finish({ text: sample, url: collectionLeaf });
    await flushPromises();
    expect(wrapper.findComponent(PlayerStub).props("src")).toBe(
      manifest.playbackUrl,
    );
    expect(wrapper.emitted("fragment-change")?.at(-1)?.[0]).toMatchObject({
      resolvedUrl: "https://media.example/one.ts",
    });
    expect(wrapper.emitted("error")).toBeUndefined();
  });

  it("waits for activation and cancels pending child requests when closed", async () => {
    let signal!: AbortSignal;
    const loadManifest = vi.fn(
      (_url: string, options: { signal: AbortSignal }) => {
        signal = options.signal;
        return new Promise<{ text: string; url: string }>(() => {});
      },
    );
    const wrapper = render({
      manifest: collectionMaster,
      loadManifest,
      active: false,
    });
    expect(loadManifest).not.toHaveBeenCalled();
    await wrapper.setProps({ active: true });
    expect(loadManifest).toHaveBeenCalledTimes(1);
    await wrapper.setProps({ active: false });
    expect(signal.aborted).toBe(true);
    expect(wrapper.findComponent(PlayerStub).exists()).toBe(false);
    expect(wrapper.text()).not.toContain("正在读取媒体播放列表");
    expect(wrapper.emitted("error")).toBeUndefined();
  });

  it("shows a failed child load and retries without leaving a stale player", async () => {
    const loadManifest = vi
      .fn()
      .mockRejectedValueOnce(new Error("媒体清单读取失败"))
      .mockResolvedValueOnce({ text: sample, url: collectionLeaf });
    const wrapper = render({ manifest: collectionMaster, loadManifest });
    await flushPromises();
    expect(wrapper.get('[role="alert"]').text()).toContain("媒体清单读取失败");
    expect(wrapper.findComponent(PlayerStub).exists()).toBe(false);
    await wrapper.get('[role="alert"] button').trigger("click");
    await flushPromises();
    expect(loadManifest).toHaveBeenCalledTimes(2);
    expect(wrapper.findComponent(PlayerStub).props("src")).toBe(collectionLeaf);
    expect(wrapper.find('[role="alert"]').exists()).toBe(false);
  });

  it("plays the authorized original URL and exposes current fragment text", () => {
    const wrapper = render();
    expect(wrapper.findComponent(PlayerStub).props()).toMatchObject({
      src: "/signed/unprocessed",
      type: "hls",
      active: true,
    });
    expect(wrapper.get('[data-slot="hls-fragment-text"]').text()).toBe(
      "#EXTINF:4,\none.ts",
    );
    expect(wrapper.emitted("fragment-change")?.at(-1)?.[0]).toMatchObject({
      index: 0,
      sequence: "0",
    });
  });

  it("keeps playback, the draggable timeline, and fragment text in one workbench", () => {
    const wrapper = render();
    const shell = wrapper.get(
      '[data-slot="hls-workbench"] .hls-playback-shell',
    );
    expect(shell.findComponent(PlayerStub).exists()).toBe(true);
    expect(
      shell.get('[data-slot="hls-selection-rail"]').attributes("role"),
    ).toBe("slider");
    expect(shell.get('[data-slot="hls-fragment-text"]').text()).toContain(
      "one.ts",
    );
    expect(shell.get('input[aria-label="播放位置"]').classes()).toContain(
      "sr-only",
    );
  });

  it("shows start and end controls as separate rows and keeps the fragment list in a hover popover", async () => {
    const wrapper = render();
    const rows = wrapper.findAll(
      '[data-slot="hls-timeline-controls"] .hls-timeline-row',
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]?.text()).toContain("选区开始");
    expect(rows[1]?.text()).toContain("播放位置");
    expect(rows[2]?.text()).toContain("选区结束");

    expect(document.querySelector(".hls-fragment-popover-panel")).toBeNull();
    const panel = await openFragments(wrapper);
    // The real portal must escape the workbench's clipping/scroll ancestors.
    expect(wrapper.element.contains(panel.element)).toBe(false);
    expect(document.body.contains(panel.element)).toBe(true);
    expect(panel.attributes("role")).toBe("dialog");
    await wrapper.get(".hls-fragment-popover").trigger("mouseleave");
    await panel.trigger("mouseenter");
    await new Promise((resolve) => setTimeout(resolve, 180));
    expect(document.body.contains(panel.element)).toBe(true);
    await panel.trigger("mouseleave");
    await vi.waitFor(() =>
      expect(document.querySelector(".hls-fragment-popover-panel")).toBeNull(),
    );
  });

  it("keeps focus through the portalled list and closes it when preview stops", async () => {
    const wrapper = render();
    await flushPromises();
    const trigger = wrapper.get('[data-slot="hls-fragments-trigger"]');
    (trigger.element as HTMLButtonElement).focus();
    const panel = await openFragments(wrapper);
    expect(document.activeElement).toBe(trigger.element);
    expect(trigger.attributes("aria-controls")).toBe(panel.attributes("id"));
    const part = panel.get(
      '[data-slot="hls-fragments"] li:nth-child(2) button',
    );
    (part.element as HTMLButtonElement).focus();
    await part.trigger("click");
    await new Promise((resolve) => setTimeout(resolve, 180));
    expect(document.body.contains(panel.element)).toBe(true);
    expect(wrapper.get('[data-slot="hls-fragment-text"]').text()).toContain(
      "two.ts",
    );
    await wrapper.setProps({ active: false });
    await flushPromises();
    expect(document.querySelector(".hls-fragment-popover-panel")).toBeNull();
    expect(trigger.attributes("aria-expanded")).toBe("false");
  });

  it("inherits its overlay owner's popup layer and dismisses when the host is covered", async () => {
    const active = ref(true);
    const wrapper = mount(
      defineComponent({
        setup() {
          provideOverlayOwner({ active, popupZIndex: ref(72) });
          return () => h(HlsWorkbench, { manifest });
        },
      }),
      {
        attachTo: document.body,
        global: {
          stubs: { VideoPlayer: PlayerStub, SelectBox: VariantSelectStub },
        },
      },
    );
    wrappers.push(wrapper);
    const panel = await openFragments(wrapper);
    expect(panel.element.style.zIndex).toBe("72");
    active.value = false;
    await flushPromises();
    expect(document.querySelector(".hls-fragment-popover-panel")).toBeNull();
    await wrapper
      .get('[data-slot="hls-fragments-trigger"]')
      .trigger("mouseenter");
    expect(document.querySelector(".hls-fragment-popover-panel")).toBeNull();
  });

  it("queues only the latest seek until media metadata is ready", async () => {
    const wrapper = render();
    const fragments = await openFragments(wrapper);
    await fragments
      .get('[data-slot="hls-fragments"] li:nth-child(2) button')
      .trigger("click");
    await fragments
      .get('[data-slot="hls-fragments"] li:nth-child(3) button')
      .trigger("click");
    expect(seek).not.toHaveBeenCalled();
    wrapper
      .findComponent(PlayerStub)
      .vm.$emit("timeupdate", { currentTime: 0, duration: 20 });
    wrapper
      .findComponent(PlayerStub)
      .vm.$emit("loadedmetadata", { duration: 20 });
    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledWith(10);
    await flushPromises();
    expect(wrapper.get('[data-slot="hls-fragment-text"]').text()).toContain(
      "three.ts",
    );
  });

  it("tracks real playback and emits exact-edge next-fragment changes", async () => {
    const wrapper = render();
    const player = wrapper.findComponent(PlayerStub);
    player.vm.$emit("loadedmetadata", { duration: 20 });
    player.vm.$emit("timeupdate", { currentTime: 4, duration: 20 });
    await flushPromises();
    expect(wrapper.emitted("fragment-change")?.at(-1)?.[0]).toMatchObject({
      index: 1,
    });
    expect(seek).not.toHaveBeenCalled();
  });

  it("scrubs continuously and snaps draggable range handles to full fragments", async () => {
    const wrapper = render();
    wrapper
      .findComponent(PlayerStub)
      .vm.$emit("loadedmetadata", { duration: 20 });
    sizeRail(wrapper);
    wrapper
      .get('[data-slot="hls-range-end"]')
      .element.dispatchEvent(pointer("pointerdown", 40));
    window.dispatchEvent(pointer("pointermove", 130));
    window.dispatchEvent(pointer("pointerup", 130));
    await flushPromises();
    expect(
      wrapper.get('[data-slot="hls-range-end"]').attributes("aria-valuenow"),
    ).toBe("10");
    expect(seek).toHaveBeenLastCalledWith(10);
    await wrapper.get('input[aria-label="播放位置"]').setValue("7.25");
    expect(seek).toHaveBeenLastCalledWith(7.25);
    const useRange = wrapper
      .findAll("button")
      .find((button) => button.text() === "使用选区")!;
    await useRange.trigger("click");
    expect(wrapper.emitted("select-range")).toEqual([
      [{ startSeconds: 0, endSeconds: 10 }],
    ]);
    expect(wrapper.emitted("select-insertion")).toBeUndefined();
  });

  it("maps each drag to its own track and stops when the window loses focus", async () => {
    const wrapper = render();
    const player = wrapper.findComponent(PlayerStub);
    player.vm.$emit("loadedmetadata", { duration: 20 });
    await wrapper
      .get('[data-slot="hls-range-end"]')
      .trigger("keydown", { key: "End" });
    sizeRail(wrapper);
    const start = wrapper.get('[data-slot="hls-range-start"]');
    const startTrack = start.element.closest(".hls-track")!;
    vi.mocked(startTrack.getBoundingClientRect).mockReturnValue({
      left: 100,
      width: 400,
    } as DOMRect);
    start.element.dispatchEvent(pointer("pointerdown", 180));
    await flushPromises();
    expect(start.attributes("aria-valuenow")).toBe("4");
    expect(seek).toHaveBeenLastCalledWith(4);
    window.dispatchEvent(new Event("blur"));
    window.dispatchEvent(pointer("pointermove", 300));
    await flushPromises();
    expect(start.attributes("aria-valuenow")).toBe("4");
    expect(seek).toHaveBeenLastCalledWith(4);
  });

  it("supports keyboard segment steps, keeps one fragment minimum and inserts at an edge", async () => {
    const wrapper = render();
    const end = wrapper.get('[data-slot="hls-range-end"]');
    await end.trigger("keydown", { key: "ArrowRight" });
    expect(end.attributes("aria-valuenow")).toBe("10");
    const start = wrapper.get('[data-slot="hls-range-start"]');
    await start.trigger("keydown", { key: "End" });
    expect(start.attributes("aria-valuenow")).toBe("4");
    await end.trigger("keydown", { key: "Home" });
    expect(end.attributes("aria-valuenow")).toBe("10");
    const insert = wrapper
      .findAll("button")
      .find((button) => button.text().startsWith("在此插入"))!;
    await insert.trigger("click");
    expect(wrapper.emitted("select-insertion")?.[0]).toEqual([10]);
  });

  it("selects the current full fragment without adding a rule until confirmation", async () => {
    const wrapper = render();
    const fragments = await openFragments(wrapper);
    await fragments
      .get('[data-slot="hls-fragments"] li:nth-child(2) button')
      .trigger("click");
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "选中当前分片")!
      .trigger("click");
    expect(
      wrapper.get('[data-slot="hls-range-start"]').attributes("aria-valuenow"),
    ).toBe("4");
    expect(
      wrapper.get('[data-slot="hls-range-end"]').attributes("aria-valuenow"),
    ).toBe("10");
    expect(wrapper.emitted("select-range")).toBeUndefined();
  });

  it("paginates large lists and locates the current fragment without rendering every row", async () => {
    const text = `#EXTM3U\n${"#EXTINF:1,\na.ts\n".repeat(123)}#EXT-X-ENDLIST`;
    const wrapper = render({ manifest: { ...manifest, text } });
    const fragments = await openFragments(wrapper);
    expect(fragments.findAll('[data-slot="hls-fragments"] li')).toHaveLength(
      50,
    );
    await fragments.get('button[aria-label="下一页分片"]').trigger("click");
    expect(fragments.get('[data-slot="hls-fragments"] li').text()).toContain(
      "#51",
    );
    wrapper
      .findComponent(PlayerStub)
      .vm.$emit("timeupdate", { currentTime: 122, duration: 123 });
    await flushPromises();
    await fragments
      .findAll("button")
      .find((button) => button.text() === "定位当前")!
      .trigger("click");
    expect(fragments.findAll('[data-slot="hls-fragments"] li')).toHaveLength(
      23,
    );
    expect(fragments.find('button[aria-current="true"]').text()).toContain(
      "#123",
    );
  });

  it("cancels dragging and stale pending seeks when changing source or unmounting", async () => {
    const wrapper = render();
    sizeRail(wrapper);
    wrapper
      .get('[data-slot="hls-selection-rail"]')
      .element.dispatchEvent(pointer("pointerdown", 150));
    await wrapper.setProps({
      manifest: { ...manifest, url: "https://media.example/new.m3u8" },
    });
    window.dispatchEvent(pointer("pointermove", 190));
    wrapper
      .findComponent(PlayerStub)
      .vm.$emit("loadedmetadata", { duration: 20 });
    expect(seek).not.toHaveBeenCalled();
    const remove = vi.spyOn(window, "removeEventListener");
    wrapper.unmount();
    expect(remove).toHaveBeenCalledWith("pointermove", expect.any(Function));
  });

  it("disables editing, tears down active drag, and stops playback when inactive", async () => {
    const wrapper = render();
    sizeRail(wrapper);
    wrapper
      .get('[data-slot="hls-range-end"]')
      .element.dispatchEvent(pointer("pointerdown", 40));
    await wrapper.setProps({ disabled: true });
    window.dispatchEvent(pointer("pointermove", 190));
    await flushPromises();
    expect(
      wrapper.get('[data-slot="hls-range-end"]').attributes("aria-valuenow"),
    ).toBe("4");
    expect(
      wrapper.get('[data-slot="hls-range-end"]').attributes("disabled"),
    ).toBeDefined();
    await wrapper.setProps({ active: false });
    expect(wrapper.findComponent(PlayerStub).props("active")).toBe(false);
  });

  it("keeps playback scrubbing available when rule editing becomes read-only", async () => {
    const wrapper = render();
    wrapper
      .findComponent(PlayerStub)
      .vm.$emit("loadedmetadata", { duration: 20 });
    sizeRail(wrapper);
    wrapper
      .get('[data-slot="hls-selection-rail"]')
      .element.dispatchEvent(pointer("pointerdown", 30));
    await wrapper.setProps({ disabled: true });
    window.dispatchEvent(pointer("pointermove", 70));
    expect(seek).toHaveBeenLastCalledWith(7);
    window.dispatchEvent(pointer("pointerup", 70));
    const scrubber = wrapper.get('input[aria-label="播放位置"]');
    expect(scrubber.attributes("disabled")).toBeUndefined();
    await scrubber.setValue("9");
    expect(seek).toHaveBeenLastCalledWith(9);
    expect(
      wrapper.get('[data-slot="hls-range-start"]').attributes("disabled"),
    ).toBeDefined();
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "使用选区")!
      .trigger("click");
    expect(wrapper.emitted("select-range")).toBeUndefined();
    expect(wrapper.emitted("select-insertion")).toBeUndefined();
  });

  it("copies plain text and handles a rejected clipboard without unhandled errors", async () => {
    const writeText = vi
      .fn()
      .mockRejectedValueOnce(new Error("denied"))
      .mockResolvedValueOnce(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const wrapper = render();
    const copy = wrapper
      .findAll("button")
      .find((button) => button.text() === "复制原文")!;
    await copy.trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("复制失败");
    await copy.trigger("click");
    await flushPromises();
    expect(writeText).toHaveBeenLastCalledWith("#EXTINF:4,\none.ts");
    expect(wrapper.text()).toContain("已复制");
  });

  it("inserts at the next edge without moving an ad before the current frame", async () => {
    const wrapper = render();
    const insert = () =>
      wrapper
        .findAll("button")
        .find((button) => button.text().startsWith("在此插入"))!;
    await insert().trigger("click");
    expect(wrapper.emitted("select-insertion")?.at(-1)).toEqual([0]);
    await wrapper.get('input[aria-label="播放位置"]').setValue("1");
    await insert().trigger("click");
    expect(wrapper.emitted("select-insertion")?.at(-1)).toEqual([4]);
    await wrapper.get('input[aria-label="播放位置"]').setValue("4");
    await insert().trigger("click");
    expect(wrapper.emitted("select-insertion")?.at(-1)).toEqual([4]);
    await wrapper.get('input[aria-label="播放位置"]').setValue("20");
    await insert().trigger("click");
    expect(wrapper.emitted("select-insertion")?.at(-1)).toEqual([20]);
  });

  it.each([
    "javascript:alert(1)",
    "data:video/mp4,invalid",
    "https://user:secret@media.example/index.m3u8",
  ])("rejects an unsafe playback address: %s", (playbackUrl) => {
    const wrapper = render({ manifest: { ...manifest, playbackUrl } });
    expect(wrapper.get('[role="alert"]').text()).toContain("HTTP(S)");
    expect(wrapper.findComponent(PlayerStub).exists()).toBe(false);
  });

  it("rejects unsupported manifests without mounting the player", () => {
    const wrapper = render({
      manifest: { ...manifest, text: sample.replace("#EXT-X-ENDLIST", "") },
    });
    expect(wrapper.get('[role="alert"]').text()).toContain("点播");
    expect(wrapper.findComponent(PlayerStub).exists()).toBe(false);
    expect(wrapper.emitted("error")?.[0]?.[0]).toContain("点播");
  });
});
