// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { EditorContent, type Editor } from "@tiptap/vue-3";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";
import RichTextEditor from "./RichTextEditor.vue";
import { inspectRichTextHTML, isSafeRichTextURL } from "./rich-text-html";
vi.mock('@healseek/shared/icons', () => ({ Icon: { render: () => null } }));

const wrappers: VueWrapper[] = [];
function attach(props: Record<string, unknown> = {}) {
  const wrapper = mount(RichTextEditor, { props, attachTo: document.body });
  wrappers.push(wrapper);
  return wrapper;
}
async function settle() {
  await nextTick();
  await flushPromises();
}
function currentEditor(wrapper: VueWrapper): Editor {
  return wrapper.getComponent(EditorContent).props("editor") as Editor;
}
function modeButton(wrapper: VueWrapper, text: string) {
  return wrapper.findAll("button").find((button) => button.text() === text)!;
}
function updates(wrapper: VueWrapper): string[] {
  return (wrapper.emitted("update:modelValue") ?? []).map(([value]) =>
    String(value),
  );
}
afterEach(async () => {
  for (const wrapper of wrappers.splice(0)) wrapper.unmount();
  await settle();
  document.body.innerHTML = "";
});

describe("RichTextEditor with real Tiptap transactions", () => {
  it("inserts an uploaded image through a real editor transaction", async () => {
    const wrapper = attach({
      modelValue: "<p>正文</p>",
      uploadImage: vi.fn().mockResolvedValue("/uploads/body.png"),
    });
    await settle();
    await modeButton(wrapper, "插入图片").trigger("click");
    const input = wrapper.get("input[type=file]");
    Object.defineProperty(input.element, "files", {
      value: [new File(["image"], "body.png", { type: "image/png" })],
    });
    await input.trigger("change");
    await settle();
    expect(updates(wrapper).at(-1)).toContain('src="/uploads/body.png"');
    expect(wrapper.find("input[type=file]").exists()).toBe(false);
  });

  it("cancels a pending image insertion when switching documents", async () => {
    let finish!: (url: string) => void;
    let signal!: AbortSignal;
    const wrapper = attach({
      modelValue: "<p>旧文档</p>",
      resetKey: "old",
      uploadImage: (_file: File, context: { signal: AbortSignal }) => {
        signal = context.signal;
        return new Promise<string>((resolve) => {
          finish = resolve;
        });
      },
    });
    await settle();
    await modeButton(wrapper, "插入图片").trigger("click");
    const input = wrapper.get("input[type=file]");
    Object.defineProperty(input.element, "files", {
      value: [new File(["image"], "body.png", { type: "image/png" })],
    });
    await input.trigger("change");
    await wrapper.setProps({ modelValue: "<p>新文档</p>", resetKey: "new" });
    expect(signal.aborted).toBe(true);
    finish("/uploads/old-document.png");
    await settle();
    expect(updates(wrapper)).toEqual([]);
    expect(currentEditor(wrapper).getHTML()).toBe("<p>新文档</p>");
  });

  it("keeps the exact original HTML through mount, focus and mode changes", async () => {
    const original = "<p><b>Original&nbsp;HTML</b>  spacing</p>";
    const wrapper = attach({ modelValue: original });
    await settle();
    const editor = currentEditor(wrapper);
    editor.view.dom.focus();
    await modeButton(wrapper, "HTML 源码").trigger("click");
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).value).toBe(
      original,
    );
    await modeButton(wrapper, "可视化").trigger("click");
    expect(currentEditor(wrapper)).toBe(editor);
    expect(updates(wrapper)).toEqual([]);
  });

  it("formats the actual selected text and preserves selection/history on a parent echo", async () => {
    const wrapper = attach({ modelValue: "<p>hello world</p>" });
    await settle();
    const editor = currentEditor(wrapper);
    editor.commands.setTextSelection({ from: 1, to: 6 });
    await wrapper.get('button[aria-label="加粗"]').trigger("click");
    expect(updates(wrapper)).toEqual(["<p><strong>hello</strong> world</p>"]);
    const selection = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    };
    await wrapper.setProps({ modelValue: updates(wrapper).at(-1) });
    expect(currentEditor(wrapper)).toBe(editor);
    expect(editor.state.selection.from).toBe(selection.from);
    expect(editor.state.selection.to).toBe(selection.to);
    expect(editor.can().undo()).toBe(true);
  });

  it("validates links and applies a safe URL to the original real selection", async () => {
    const wrapper = attach({ modelValue: "<p>hello world</p>", id: "body" });
    await settle();
    const editor = currentEditor(wrapper);
    editor.commands.setTextSelection({ from: 1, to: 6 });
    await wrapper.get('button[aria-label="编辑链接"]').trigger("click");
    const input = wrapper.get("input#body-link");
    expect(document.activeElement).toBe(input.element);
    await input.setValue("javascript:alert(1)");
    await modeButton(wrapper, "应用").trigger("click");
    expect(wrapper.get('[role="alert"]').text()).toContain("安全");
    expect(updates(wrapper)).toEqual([]);
    await input.setValue("https://example.com/title");
    await input.trigger("keydown", { key: "Enter" });
    const link = wrapper.get(".ProseMirror a");
    expect(link.text()).toBe("hello");
    expect(link.attributes("href")).toBe("https://example.com/title");
    expect(link.attributes("rel")).toContain("noopener");
    expect(editor.getText()).toBe("hello world");
    expect(updates(wrapper)).toHaveLength(1);
    const click = new MouseEvent("click", { bubbles: true, cancelable: true });
    link.element.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(true);
  });

  it("clears undo and destroys the old instance on external fill or a new entity/session", async () => {
    const wrapper = attach({ modelValue: "<p>First</p>", resetKey: "first:1" });
    await settle();
    const first = currentEditor(wrapper);
    first.commands.insertContent("changed");
    expect(first.can().undo()).toBe(true);
    const emittedCount = updates(wrapper).length;
    await wrapper.setProps({
      modelValue: "<p>Second</p>",
      resetKey: "second:1",
    });
    const second = currentEditor(wrapper);
    expect(first.isDestroyed).toBe(true);
    expect(second.getText()).toBe("Second");
    expect(second.can().undo()).toBe(false);
    expect(updates(wrapper)).toHaveLength(emittedCount);
    await wrapper.setProps({ resetKey: "second:2" });
    const reopened = currentEditor(wrapper);
    expect(second.isDestroyed).toBe(true);
    expect(reopened).not.toBe(second);
    expect(reopened.can().undo()).toBe(false);
    expect(updates(wrapper)).toHaveLength(emittedCount);
  });

  it("keeps unsupported HTML only in source and emits source edits without normalization", async () => {
    const original =
      '<table style="width:90%"><tr><td>Legacy</td></tr></table><script>alert(1)</script>';
    const wrapper = attach({ modelValue: original });
    await settle();
    expect(wrapper.get('[role="status"]').text()).toContain("源码");
    expect(modeButton(wrapper, "可视化").attributes("disabled")).toBeDefined();
    expect((wrapper.get("textarea").element as HTMLTextAreaElement).value).toBe(
      original,
    );
    expect(wrapper.find("table,script").exists()).toBe(false);
    expect(updates(wrapper)).toEqual([]);
    const edited = "<p>  Source &amp; spacing  </p>";
    await wrapper.get("textarea").setValue(edited);
    expect(updates(wrapper)).toEqual([edited]);
    await wrapper.setProps({ modelValue: edited });
    expect(wrapper.find("textarea").exists()).toBe(true);
    await modeButton(wrapper, "可视化").trigger("click");
    expect(wrapper.find("textarea").exists()).toBe(false);
    expect(currentEditor(wrapper).getText()).toContain("Source & spacing");
    expect(updates(wrapper)).toEqual([edited]);
  });

  it("blocks unsafe pasted images/links and disables the stock Markdown image input rule", async () => {
    const wrapper = attach({ modelValue: "<p>Text</p>" });
    await settle();
    const editor = currentEditor(wrapper);
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.view.pasteHTML(
      '<p><a href="javascript:alert(1)">bad</a></p><img src="DATA:text/html,boom"><img src="file:///secret"><img src="javascript:alert(1)"><img src="https://example.com/existing.jpg" alt="existing">',
    );
    await settle();
    expect(wrapper.findAll(".ProseMirror img")).toHaveLength(1);
    expect(wrapper.get(".ProseMirror img").attributes("src")).toBe(
      "https://example.com/existing.jpg",
    );
    expect(wrapper.find('.ProseMirror a[href^="javascript:"]').exists()).toBe(
      false,
    );
    expect(editor.getHTML()).not.toMatch(/DATA:|file:|javascript:/);
    // Exercise a real text-input rule path instead of asserting its config.
    editor.commands.setContent("<p>![x](javascript:alert(1)</p>", {
      emitUpdate: false,
    });
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    const position = editor.state.selection.from;
    const handled = editor.view.someProp("handleTextInput", (handler) =>
      handler(editor.view, position, position, ")", () =>
        editor.state.tr.insertText(")"),
      ),
    );
    if (!handled) editor.view.dispatch(editor.state.tr.insertText(")"));
    await settle();
    expect(wrapper.find(".ProseMirror img").exists()).toBe(false);
    expect(editor.getText()).toBe("![x](javascript:alert(1))");
  });

  it("keeps read-only and disabled changes silent in both editing modes", async () => {
    const wrapper = attach({ modelValue: "<p>Protected</p>" });
    await settle();
    const editor = currentEditor(wrapper);
    await wrapper.setProps({ readonly: true });
    expect(editor.isEditable).toBe(false);
    expect(wrapper.get(".ProseMirror").attributes("contenteditable")).toBe(
      "false",
    );
    expect(
      wrapper.get('button[aria-label="加粗"]').attributes("disabled"),
    ).toBeDefined();
    expect(updates(wrapper)).toEqual([]);
    await modeButton(wrapper, "HTML 源码").trigger("click");
    expect(wrapper.get("textarea").attributes("readonly")).toBeDefined();
    await wrapper.get("textarea").setValue("synthetic event on locked control");
    expect(updates(wrapper)).toEqual([]);
    await wrapper.setProps({ readonly: false, disabled: true });
    expect(wrapper.get("textarea").attributes("disabled")).toBeDefined();
    expect(modeButton(wrapper, "可视化").attributes("disabled")).toBeDefined();
    expect(updates(wrapper)).toEqual([]);
  });

  it("forwards validation semantics to the real control and inherits its editable height", async () => {
    const wrapper = attach({
      id: "rich-body",
      minHeight: 280,
      maxHeight: "30rem",
      placeholder: "Body placeholder",
      "aria-invalid": true,
      "aria-required": true,
      "aria-describedby": "body-error",
    });
    await settle();
    const surface = wrapper.get(".ProseMirror");
    expect(surface.attributes("id")).toBe("rich-body");
    expect(surface.attributes("aria-invalid")).toBe("true");
    expect(surface.attributes("aria-required")).toBe("true");
    expect(surface.attributes("aria-describedby")).toBe("body-error");
    expect(surface.attributes("data-placeholder")).toBe("Body placeholder");
    expect(
      (wrapper.element as HTMLElement).style.getPropertyValue(
        "--rich-text-min-height",
      ),
    ).toBe("280px");
    await wrapper.setProps({ "aria-invalid": false });
    expect(surface.attributes("aria-invalid")).toBe("false");
    await modeButton(wrapper, "HTML 源码").trigger("click");
    expect(wrapper.get("textarea").attributes("aria-describedby")).toBe(
      "body-error",
    );
    expect(wrapper.get("textarea").attributes("aria-invalid")).toBe("false");
    expect(updates(wrapper)).toEqual([]);
  });

  it("isolates simultaneous instances and destroys the live editor on unmount", async () => {
    const showFirst = ref(true);
    const host = mount(
      defineComponent({
        setup: () => () =>
          h("main", [
            showFirst.value
              ? h(RichTextEditor, { key: "one", modelValue: "<p>One</p>" })
              : null,
            h(RichTextEditor, { key: "two", modelValue: "<p>Two</p>" }),
          ]),
      }),
      { attachTo: document.body },
    );
    wrappers.push(host);
    await settle();
    const [one, two] = host.findAllComponents(RichTextEditor);
    const first = currentEditor(one);
    const second = currentEditor(two);
    expect(first).not.toBe(second);
    expect(one.get(".ProseMirror").attributes("id")).not.toBe(
      two.get(".ProseMirror").attributes("id"),
    );
    first.commands.insertContent("changed");
    expect(updates(one)).toHaveLength(1);
    expect(updates(two)).toEqual([]);
    expect(second.getText()).toBe("Two");
    const destroy = vi.spyOn(first, "destroy");
    showFirst.value = false;
    await settle();
    expect(destroy).toHaveBeenCalledOnce();
    expect(first.isDestroyed).toBe(true);
    expect(second.isDestroyed).toBe(false);
  });

  it("focuses the actual visual control from its framework form label without changing HTML", async () => {
    const label = document.createElement("label");
    label.htmlFor = "labelled-rich-body";
    label.textContent = "Article body";
    document.body.append(label);
    const wrapper = attach({
      modelValue: "<p>Original</p>",
      id: "labelled-rich-body",
    });
    await settle();
    label.click();
    await vi.waitFor(() =>
      expect(document.activeElement).toBe(currentEditor(wrapper).view.dom),
    );
    expect(updates(wrapper)).toEqual([]);
  });
});

describe("rich-text HTML boundaries", () => {
  it.each([
    "javascript:alert(1)",
    "DATA:image/png;base64,AAA",
    "file:///secret",
    "//example.com/a",
    "https://example.com/\\evil",
    "java\nscript:alert(1)",
    "",
    null,
  ])("rejects unsafe URL %s", (value) => {
    expect(isSafeRichTextURL(value)).toBe(false);
  });
  it.each([
    "https://example.com/a",
    "http://localhost:8080/a",
    "/images/poster.jpg",
    "../a",
    "#heading",
    "mailto:a@example.com",
    "tel:+123",
  ])("accepts safe URL %s", (value) => {
    expect(isSafeRichTextURL(value)).toBe(true);
  });
  it("removes executable visual markup while flagging unsupported source for preservation", () => {
    const result = inspectRichTextHTML(
      '<p onclick="bad()">Safe</p><iframe src="https://example.com"></iframe><img src="javascript:alert(1)" onerror="bad()"><a href="https://example.com" title="title">link</a>',
    );
    expect(result.sourceOnly).toBe(true);
    expect(result.html).not.toMatch(/onclick|onerror|iframe|javascript:/);
    expect(result.html).toContain('title="title"');
    expect(
      inspectRichTextHTML("<p><strong>Supported</strong></p>").sourceOnly,
    ).toBe(false);
  });
});
