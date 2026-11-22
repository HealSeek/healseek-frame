import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import ImageUpload from "./ImageUpload.vue";
vi.mock("@healseek/shared/icons", () => ({ Icon: { render: () => null } }));

const wrappers: VueWrapper[] = [];
function render(props: InstanceType<typeof ImageUpload>["$props"]) {
  const wrapper = mount(ImageUpload, { props });
  wrappers.push(wrapper);
  return wrapper;
}
async function pick(
  wrapper: VueWrapper,
  name = "avatar.png",
  type = "image/png",
  bytes = 12,
) {
  const input = wrapper.get("input[type=file]");
  Object.defineProperty(input.element, "files", {
    configurable: true,
    value: [new File([new Uint8Array(bytes)], name, { type })],
  });
  await input.trigger("change");
  await flushPromises();
}
function action(wrapper: VueWrapper, text: string) {
  return wrapper.findAll("button").find((button) => button.text() === text)!;
}
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount());
});

describe("ImageUpload", () => {
  it("uploads through the supplied transport, reports progress and emits a controlled URL", async () => {
    let complete!: (url: string) => void;
    const upload = vi.fn((_file, context) => {
      context.onProgress(45);
      return new Promise<string>((resolve) => {
        complete = resolve;
      });
    });
    const wrapper = render({ upload, modelValue: "/old.png" });
    await pick(wrapper);
    expect(wrapper.text()).toContain("45%");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    expect(upload.mock.calls[0]![0]).toBeInstanceOf(File);
    expect(wrapper.get("button").attributes("type")).toBe("button");
    complete("/new.png");
    await flushPromises();
    expect(wrapper.emitted("update:modelValue")).toEqual([["/new.png"]]);
    expect(wrapper.emitted("uploaded")).toEqual([["/new.png"]]);
    // The previous image stays visible until the parent accepts the new URL.
    expect(wrapper.get("img").attributes("src")).toBe("/old.png");
    await wrapper.setProps({ modelValue: "/new.png" });
    expect(wrapper.get("img").attributes("src")).toBe("/new.png");
  });

  it("rejects unsupported formats and oversized images without losing the old value", async () => {
    const upload = vi.fn();
    const wrapper = render({ upload, modelValue: "/old.png", maxSize: 10 });
    await pick(wrapper, "script.svg", "image/svg+xml");
    expect(wrapper.get("[role=alert]").text()).toContain("格式不支持");
    await pick(wrapper);
    expect(wrapper.get("[role=alert]").text()).toContain("不能超过");
    expect(upload).not.toHaveBeenCalled();
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
  });

  it("clears pending state before notifying a form and retries a failed preview of the same URL", async () => {
    let pending = false;
    const observed: boolean[] = [];
    const wrapper = render({
      modelValue: "/same.png",
      upload: vi.fn().mockResolvedValue("/same.png"),
      "onBusy-change": (value: boolean) => {
        pending = value;
      },
      "onUpdate:modelValue": () => {
        observed.push(pending);
      },
      onUploaded: () => {
        observed.push(pending);
      },
    });
    await wrapper.get("img").trigger("error");
    expect(wrapper.text()).toContain("暂时无法预览");
    await pick(wrapper);
    expect(observed).toEqual([false, false]);
    expect(wrapper.get("img").attributes("src")).toBe("/same.png");
    expect(wrapper.attributes("aria-busy")).toBe("false");
  });

  it("keeps an unsuccessful upload retryable and rejects unsafe transport URLs", async () => {
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error("连接断开"))
      .mockResolvedValueOnce("javascript:alert(1)")
      .mockResolvedValue("/retry.png");
    const wrapper = render({ upload });
    await pick(wrapper);
    expect(wrapper.text()).toContain("连接断开");
    await action(wrapper, "重试上传").trigger("click");
    await flushPromises();
    expect(wrapper.text()).toContain("未返回有效的图片地址");
    expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    await action(wrapper, "重试上传").trigger("click");
    await flushPromises();
    expect(wrapper.emitted("update:modelValue")).toEqual([["/retry.png"]]);
  });

  it.each(["cancel", "replace", "disable", "unmount"])(
    "ignores a late response after %s",
    async (reason) => {
      let complete!: (url: string) => void;
      let signal!: AbortSignal;
      const wrapper = render({
        modelValue: "/old.png",
        upload: (_file: File, context: { signal: AbortSignal }) => {
          signal = context.signal;
          return new Promise<string>((resolve) => {
            complete = resolve;
          });
        },
      });
      await pick(wrapper);
      if (reason === "cancel")
        await action(wrapper, "取消上传").trigger("click");
      if (reason === "replace")
        await wrapper.setProps({ modelValue: "/another-record.png" });
      if (reason === "disable") await wrapper.setProps({ disabled: true });
      if (reason === "unmount") wrapper.unmount();
      expect(signal.aborted).toBe(true);
      complete("/late.png");
      await flushPromises();
      expect(wrapper.emitted("update:modelValue")).toBeUndefined();
    },
  );

  it("emits an empty URL on removal and never deletes the stored file", async () => {
    const upload = vi.fn();
    const wrapper = render({ upload, modelValue: "/old.png" });
    await action(wrapper, "移除").trigger("click");
    expect(wrapper.emitted("update:modelValue")).toEqual([[""]]);
    expect(upload).not.toHaveBeenCalled();
  });
});
