// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineComponent, h } from "vue";
import { useForm, type FormApi, type FormFieldSchema } from "./index";

vi.mock("@healseek/shared/icons", () => ({ Icon: { render: () => null } }));
let wrapper: VueWrapper | undefined;
afterEach(() => {
  wrapper?.unmount();
  wrapper = undefined;
});
function render(schema: FormFieldSchema[]) {
  let api!: FormApi;
  wrapper = mount(
    defineComponent({
      setup() {
        const [Form, form] = useForm({ schema, showDefaultActions: false });
        api = form;
        return () => h(Form);
      },
    }),
  );
  return api;
}
async function pick() {
  const input = wrapper!.get("input[type=file]");
  Object.defineProperty(input.element, "files", {
    value: [new File(["png"], "picture.png", { type: "image/png" })],
  });
  await input.trigger("change");
  await flushPromises();
}
describe("ImageUpload schema fields", () => {
  it.each(["ImageUpload", "image-upload"] as const)(
    "binds %s as one URL and supports validation and reset",
    async (component) => {
      const upload = vi.fn().mockResolvedValue("/uploads/image.png");
      const api = render([
        {
          fieldName: "picture",
          label: "封面",
          component,
          rules: "required",
          componentProps: { upload },
        },
      ]);
      await flushPromises();
      expect((await api.validate()).valid).toBe(false);
      await pick();
      await expect
        .poll(() => wrapper!.find('[data-slot="field-error"]').exists())
        .toBe(false);
      expect(await api.validateAndSubmit()).toEqual({
        picture: [{ value: "/uploads/image.png" }],
      });
      const button = wrapper!.get("[data-slot=image-upload] button");
      expect(wrapper!.get("label").attributes("for")).toBe(
        button.attributes("id"),
      );
      api.resetForm();
      await flushPromises();
      expect(wrapper!.find("img").exists()).toBe(false);
    },
  );

  it("supports nested schema rendering and respects form-level disabled state", async () => {
    const api = render([
      {
        fieldName: "settings",
        label: "设置",
        component: "Input",
        children: [
          {
            fieldName: "picture",
            label: "图片",
            component: "ImageUpload",
            componentProps: {
              upload: vi.fn().mockResolvedValue("/uploads/nested.png"),
            },
          },
        ],
      },
    ]);
    await flushPromises();
    await pick();
    expect(await api.validateAndSubmit()).toEqual({
      settings: [{ picture: "/uploads/nested.png" }],
    });
    api.setProps({ disabled: true });
    await flushPromises();
    expect(
      wrapper!.get("input[type=file]").attributes("disabled"),
    ).toBeDefined();
    expect(
      wrapper!.findAll("button").some((button) => button.text() === "移除"),
    ).toBe(false);
  });
});
