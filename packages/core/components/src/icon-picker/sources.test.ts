import { afterEach, describe, expect, it, vi } from "vitest";
import { addAPIProvider } from "@healseek/shared/icons";
import { createIconifySource } from "./sources";

function collection(
  prefix: string,
  values: Record<string, unknown> = {},
): Response {
  return new Response(
    JSON.stringify({ prefix, uncategorized: ["home"], ...values }),
    { status: 200 },
  );
}

function source(
  provider: string,
  prefix = "fixture",
  resources = ["https://icons.example.test"],
  timeout?: number,
) {
  addAPIProvider(provider, { resources, path: "/icon-api/" });
  return createIconifySource({ provider, prefix, timeout });
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Iconify collection sources", () => {
  it("uses the renderer provider path and merges visible names without application credentials", async () => {
    const fetcher = vi.fn().mockResolvedValue(
      collection("fixture", {
        uncategorized: ["home", "shared", "hidden-icon", 12, "invalid:name"],
        categories: {
          Navigation: ["settings", "shared"],
          Other: ["home", "hidden-icon"],
        },
        aliases: { house: "home", shared: "home", "hidden-alias": "home" },
        hidden: ["hidden-icon", "hidden-alias"],
      }),
    );
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source("source-private", "fixture", [
      "https://icons.example.test/team/",
    ]);
    const icons = await pickerSource.load({
      signal: new AbortController().signal,
    });

    expect(icons).toEqual([
      "@source-private:fixture:home",
      "@source-private:fixture:house",
      "@source-private:fixture:settings",
      "@source-private:fixture:shared",
    ]);
    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe(
      "https://icons.example.test/team/icon-api/collection?prefix=fixture",
    );
    expect(init).toMatchObject({
      credentials: "omit",
      referrerPolicy: "no-referrer",
    });
    expect(init.headers).toBeUndefined();
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("falls back to another configured resource after HTTP failure", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response("", { status: 503 }))
      .mockResolvedValueOnce(collection("fixture"));
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source("source-fallback", "fixture", [
      "https://primary.example.test",
      "https://secondary.example.test",
    ]);

    await expect(
      pickerSource.load({ signal: new AbortController().signal }),
    ).resolves.toEqual(["@source-fallback:fixture:home"]);
    expect(fetcher.mock.calls.map((call) => call[0])).toEqual([
      "https://primary.example.test/icon-api/collection?prefix=fixture",
      "https://secondary.example.test/icon-api/collection?prefix=fixture",
    ]);
  });

  it("retries a previously failed catalog instead of caching the rejection", async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("Network unavailable"))
      .mockResolvedValueOnce(collection("fixture"));
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source("source-retry");

    await expect(
      pickerSource.load({ signal: new AbortController().signal }),
    ).rejects.toThrow("Network unavailable");
    await expect(
      pickerSource.load({ signal: new AbortController().signal }),
    ).resolves.toEqual(["@source-retry:fixture:home"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("caches successful catalogs and isolates callers from mutations of a returned list", async () => {
    const fetcher = vi
      .fn()
      .mockImplementation(() => Promise.resolve(collection("fixture")));
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source("source-cache");
    const first = await pickerSource.load({
      signal: new AbortController().signal,
    });
    first.push("not-a-real-icon");

    const second = await pickerSource.load({
      signal: new AbortController().signal,
    });
    expect(second).toEqual(["@source-cache:fixture:home"]);
    expect(second).not.toBe(first);
    expect(fetcher).toHaveBeenCalledOnce();

    // Reconfiguring a provider changes the cache key, so private directories
    // from the old host cannot silently remain in use after a host switch.
    addAPIProvider("source-cache", {
      resources: ["https://replacement.example.test"],
      path: "/new-path/",
    });
    await pickerSource.load({ signal: new AbortController().signal });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[0]).toBe(
      "https://replacement.example.test/new-path/collection?prefix=fixture",
    );
  });

  it("does not fall back after cancellation and removes its timer and parent abort listener", async () => {
    vi.useFakeTimers();
    const owner = new AbortController();
    const add = vi.spyOn(owner.signal, "addEventListener");
    const remove = vi.spyOn(owner.signal, "removeEventListener");
    const fetcher = vi.fn(
      (_url: RequestInfo | URL, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init.signal!.addEventListener(
            "abort",
            () => reject(init.signal!.reason),
            { once: true },
          );
        }),
    );
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source("source-cancel", "fixture", [
      "https://primary.example.test",
      "https://secondary.example.test",
    ]);
    const result = pickerSource.load({ signal: owner.signal });
    const rejected = expect(result).rejects.toThrow("Picker closed");
    owner.abort(new Error("Picker closed"));
    await rejected;

    expect(fetcher).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0]?.[1]);
  });

  it("times out an unresponsive request and clears cleanup state so a new attempt can succeed", async () => {
    vi.useFakeTimers();
    const owner = new AbortController();
    const add = vi.spyOn(owner.signal, "addEventListener");
    const remove = vi.spyOn(owner.signal, "removeEventListener");
    const fetcher = vi
      .fn()
      .mockImplementationOnce(
        (_url: RequestInfo | URL, init: RequestInit) =>
          new Promise<Response>((_resolve, reject) => {
            init.signal!.addEventListener(
              "abort",
              () => reject(init.signal!.reason),
              { once: true },
            );
          }),
      )
      .mockResolvedValueOnce(collection("fixture"));
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source(
      "source-timeout",
      "fixture",
      ["https://slow.example.test"],
      50,
    );
    const result = pickerSource.load({ signal: owner.signal });
    const rejected = expect(result).rejects.toThrow("图标库加载超时");
    await vi.advanceTimersByTimeAsync(50);
    await rejected;

    expect(vi.getTimerCount()).toBe(0);
    expect(remove).toHaveBeenCalledWith("abort", add.mock.calls[0]?.[1]);
    await expect(
      pickerSource.load({ signal: new AbortController().signal }),
    ).resolves.toEqual(["@source-timeout:fixture:home"]);
    expect(vi.getTimerCount()).toBe(0);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("rejects a canceled owner before loading a catalog or creating a timer", async () => {
    vi.useFakeTimers();
    const owner = new AbortController();
    owner.abort(new Error("Already closed"));
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source("source-canceled-before-load");

    await expect(pickerSource.load({ signal: owner.signal })).rejects.toThrow(
      "Already closed",
    );
    expect(fetcher).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("rejects malformed catalog groups and tries the next resource", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ prefix: "fixture", categories: "broken" }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(collection("fixture"));
    vi.stubGlobal("fetch", fetcher);
    const pickerSource = source("source-malformed", "fixture", [
      "https://primary.example.test",
      "https://secondary.example.test",
    ]);

    await expect(
      pickerSource.load({ signal: new AbortController().signal }),
    ).resolves.toEqual(["@source-malformed:fixture:home"]);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
