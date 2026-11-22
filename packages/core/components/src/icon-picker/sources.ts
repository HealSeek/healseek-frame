import { getAPIConfig } from "@healseek/shared/icons";
import type { IconifySourceOptions, IconPickerSource } from "./types";

const catalogs = new Map<string, { expires: number; icons: string[] }>();
const identifier = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Uses the same registered provider as Icon rendering, never the app's authenticated client. */
export function createIconifySource(
  options: IconifySourceOptions,
): IconPickerSource {
  const { prefix, provider = "", label = prefix, timeout = 12_000 } = options;
  if (!identifier.test(prefix) || (provider && !identifier.test(provider))) {
    throw new Error("Invalid Iconify provider or collection prefix");
  }
  if (!Number.isFinite(timeout) || timeout <= 0)
    throw new Error("Iconify timeout must be positive");

  return {
    id: `iconify:${provider}:${prefix}`,
    label,
    async load({ signal }) {
      signal.throwIfAborted();
      const config = getAPIConfig(provider);
      if (!config?.resources.length) throw new Error("请先注册此图标服务");
      const key = JSON.stringify([
        provider,
        prefix,
        config.resources,
        config.path,
      ]);
      const cached = catalogs.get(key);
      if (cached && cached.expires > Date.now()) return [...cached.icons];

      const controller = new AbortController();
      const abort = () => controller.abort(signal.reason);
      signal.addEventListener("abort", abort, { once: true });
      const timer = setTimeout(
        () => controller.abort(new Error("图标库加载超时，请重试")),
        timeout,
      );
      let failure: unknown;
      try {
        for (const resource of config.resources) {
          controller.signal.throwIfAborted();
          try {
            const base = resource.replace(/\/$/, "");
            const path = `/${config.path ?? ""}`
              .replace(/\/{2,}/g, "/")
              .replace(/\/?$/, "/");
            const response = await fetch(
              `${base}${path}collection?prefix=${encodeURIComponent(prefix)}`,
              {
                signal: controller.signal,
                credentials: "omit",
                referrerPolicy: "no-referrer",
              },
            );
            if (!response.ok)
              throw new Error(`图标库加载失败（HTTP ${response.status}）`);
            const icons = parseCollection(
              await response.json(),
              prefix,
              provider,
            );
            controller.signal.throwIfAborted();
            // Bound the cache when a host app switches between many providers.
            if (catalogs.size >= 20)
              catalogs.delete(catalogs.keys().next().value!);
            catalogs.set(key, { expires: Date.now() + 600_000, icons });
            return [...icons];
          } catch (error) {
            controller.signal.throwIfAborted();
            failure = error;
          }
        }
        throw failure ?? new Error("无法加载图标库，请重试");
      } finally {
        clearTimeout(timer);
        signal.removeEventListener("abort", abort);
      }
    },
  };
}

function parseCollection(
  value: unknown,
  prefix: string,
  provider: string,
): string[] {
  if (!value || typeof value !== "object")
    throw new Error("图标库返回格式不正确");
  const data = value as Record<string, unknown>;
  const hasCategories =
    data.categories !== null &&
    typeof data.categories === "object" &&
    !Array.isArray(data.categories);
  if (
    data.prefix !== prefix ||
    (!Array.isArray(data.uncategorized) && !hasCategories) ||
    (data.categories !== undefined && !hasCategories) ||
    (data.uncategorized !== undefined && !Array.isArray(data.uncategorized))
  ) {
    throw new Error("图标库返回格式不正确");
  }
  const groups = hasCategories ? Object.values(data.categories!) : [];
  if (groups.some((group) => !Array.isArray(group)))
    throw new Error("图标库返回格式不正确");
  const names = [
    ...(Array.isArray(data.uncategorized) ? data.uncategorized : []),
    ...groups.flat(),
  ];
  if (data.aliases && typeof data.aliases === "object")
    names.push(...Object.keys(data.aliases));
  const hidden = new Set(Array.isArray(data.hidden) ? data.hidden : []);
  const fullPrefix = `${provider ? `@${provider}:` : ""}${prefix}:`;
  return [
    ...new Set(
      names.filter(
        (name): name is string =>
          typeof name === "string" &&
          identifier.test(name) &&
          !hidden.has(name),
      ),
    ),
  ]
    .sort()
    .map((name) => `${fullPrefix}${name}`);
}
