import { describe, expect, it } from "vitest";
import { watch } from "vue";
import {
  addAPIProvider,
  addIcon,
  getAPIConfig,
  getIcon,
  iconExists,
  listIcons,
  loadIcon,
  localIconCollections,
  registerIconCollection,
  registerLocalIcons,
  type IconifyJSON,
} from "@healseek/shared/icons";

const body = '<path d="M1 1h10v10H1z"/>';

describe("shared Iconify resource registration", () => {
  it("registers builtin local icons once without requiring the public API", async () => {
    registerLocalIcons();
    registerLocalIcons();
    expect(
      localIconCollections.value.filter(
        (item) => item.provider === "" && item.prefix === "lucide",
      ),
    ).toHaveLength(1);
    expect(iconExists("lucide:search")).toBe(true);
    await expect(loadIcon("lucide:search")).resolves.toMatchObject({
      width: 24,
      height: 24,
    });
  });

  it("preserves provider-qualified local names and resolves their SVG data", () => {
    const data: IconifyJSON = {
      provider: "healseek-registry",
      prefix: "local-fixture",
      width: 16,
      height: 16,
      icons: { home: { body } },
      aliases: { house: { parent: "home" } },
    };
    expect(registerIconCollection(data, { title: "Local fixture" })).toBe(true);
    expect(localIconCollections.value).toContainEqual({
      provider: "healseek-registry",
      prefix: "local-fixture",
      title: "Local fixture",
    });
    expect(listIcons("healseek-registry", "local-fixture")).toEqual(
      expect.arrayContaining([
        "@healseek-registry:local-fixture:home",
        "@healseek-registry:local-fixture:house",
      ]),
    );
    expect(getIcon("@healseek-registry:local-fixture:house")).toMatchObject({
      body,
      width: 16,
      height: 16,
    });
    expect(iconExists("local-fixture:home")).toBe(false);
  });

  it("updates a matching collection once and notifies already mounted consumers", () => {
    const data: IconifyJSON = {
      prefix: "registry-replace",
      icons: { start: { body } },
    };
    const changed: number[] = [];
    const stop = watch(localIconCollections, () => changed.push(1), {
      flush: "sync",
    });
    expect(registerIconCollection(data, { title: "Before" })).toBe(true);
    expect(
      registerIconCollection(
        { ...data, icons: { next: { body } } },
        { title: "After" },
      ),
    ).toBe(true);
    stop();
    expect(changed).toHaveLength(2);
    expect(
      localIconCollections.value.filter((item) => item.prefix === data.prefix),
    ).toEqual([{ provider: "", prefix: data.prefix, title: "After" }]);
    expect(iconExists("registry-replace:next")).toBe(true);
  });

  it("keeps identical prefixes isolated by provider and honors an explicit override", () => {
    const data: IconifyJSON = {
      provider: "registry-original",
      prefix: "registry-isolated",
      icons: { home: { body } },
    };
    expect(registerIconCollection(data)).toBe(true);
    expect(
      registerIconCollection(data, {
        provider: "registry-override",
        title: "Override",
      }),
    ).toBe(true);
    expect(
      localIconCollections.value.filter((item) => item.prefix === data.prefix),
    ).toEqual([
      {
        provider: "registry-original",
        prefix: data.prefix,
        title: data.prefix,
      },
      { provider: "registry-override", prefix: data.prefix, title: "Override" },
    ]);
    expect(iconExists("@registry-original:registry-isolated:home")).toBe(true);
    expect(iconExists("@registry-override:registry-isolated:home")).toBe(true);
  });

  it("does not publish failed or malformed registrations or replace existing metadata", () => {
    expect(
      registerIconCollection(
        { prefix: "registry-stable", icons: { home: { body } } },
        { title: "Usable" },
      ),
    ).toBe(true);
    const previous = localIconCollections.value;
    expect(
      registerIconCollection(
        { prefix: "registry-stable", icons: null } as unknown as IconifyJSON,
        { title: "Broken" },
      ),
    ).toBe(false);
    expect(
      registerIconCollection(
        { prefix: "", icons: { home: { body } } },
        { provider: "registry-invalid" },
      ),
    ).toBe(false);
    expect(registerIconCollection(null as unknown as IconifyJSON)).toBe(false);
    expect(localIconCollections.value).toBe(previous);
    expect(getIcon("registry-stable:home")).toMatchObject({ body });
  });

  it("exports the real renderer registration and configured provider API", () => {
    expect(
      addIcon("registry-direct:star", { body, width: 16, height: 16 }),
    ).toBe(true);
    expect(getIcon("registry-direct:star")).toMatchObject({ body });
    expect(
      addAPIProvider("registry-online", {
        resources: ["https://icons.example.test"],
        path: "/api/",
      }),
    ).toBe(true);
    expect(getAPIConfig("registry-online")).toMatchObject({
      resources: ["https://icons.example.test"],
      path: "/api/",
    });
    expect(getAPIConfig("not-configured-registry")).toBeUndefined();
  });
});
