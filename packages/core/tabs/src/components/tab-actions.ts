import type { TabItem } from "@healseek/stores/tabs";
import { useTabStore } from "@healseek/stores/tabs";
import { useRouter } from "vue-router";

export interface TabAction {
  id: string;
  label: string;
  icon: string;
  disabled: boolean;
  separator?: boolean;
  run: () => void | Promise<void>;
}

export type TabTranslate = (key: string) => string;
type CloseMode = "current" | "left" | "right" | "others" | "all";

/** Context and toolbar menus share actions, including their disabled states. */
export function useTabActions(t: TabTranslate) {
  const store = useTabStore();
  const router = useRouter();

  async function navigate(tab: TabItem): Promise<boolean> {
    if (router.currentRoute.value.fullPath === tab.fullPath) return true;
    try {
      const failure = await router.push(tab.fullPath);
      return !failure && router.currentRoute.value.fullPath === tab.fullPath;
    } catch {
      // Router error handlers own reporting; never activate a rejected tab.
      return false;
    }
  }

  function closeCandidates(mode: CloseMode, id: string): TabItem[] {
    const ordered = store.orderedTabs;
    const index = ordered.findIndex((tab) => tab.id === id);
    if (index < 0) return [];
    return ordered.filter(
      (tab, position) =>
        store.isClosable(tab) &&
        (mode === "all" ||
          (mode === "current" && tab.id === id) ||
          (mode === "left" && position < index) ||
          (mode === "right" && position > index) ||
          (mode === "others" && tab.id !== id)),
    );
  }

  async function close(mode: CloseMode, id: string): Promise<void> {
    const candidates = closeCandidates(mode, id);
    if (!candidates.length) return;
    const closing = new Set(candidates.map((tab) => tab.id));
    const ordered = store.orderedTabs;
    const remaining = ordered.filter((tab) => !closing.has(tab.id));
    const activeIndex = ordered.findIndex(
      (tab) => tab.id === store.activeTabId,
    );
    const target =
      mode === "others"
        ? remaining.find((tab) => tab.id === id)
        : remaining.find((tab) => tab.id === store.activeTabId) ??
          ordered.slice(activeIndex + 1).find((tab) => !closing.has(tab.id)) ??
          remaining.at(-1);

    // Let leave guards run before deleting a page and its cached form state.
    if (target) {
      if (!(await navigate(target))) return;
    } else {
      const fallback = store.defaultTabPath ?? "/";
      if (router.currentRoute.value.fullPath !== fallback) {
        try {
          if (await router.push(fallback)) return;
        } catch {
          return;
        }
      }
    }
    for (const tab of candidates) store.closeTab(tab.id);
    // The configured home may itself be the last closable tab. Keep the
    // visible page represented rather than leaving an empty strip.
    store.addOrActivate(router.currentRoute.value);
  }

  async function maximize(tab: TabItem): Promise<void> {
    if (await navigate(tab)) {
      store.maximizeTab(store.maximizedTabId ? null : tab.id);
    }
  }

  function actions(tab: TabItem): TabAction[] {
    return [
      {
        id: "refresh",
        label: t("refresh"),
        icon: "lucide:rotate-cw",
        disabled: false,
        run: () => store.refreshTab(tab.id),
      },
      {
        id: "pin",
        label: t(tab.pinned ? "unpin" : "pin"),
        icon: tab.pinned ? "lucide:pin-off" : "lucide:pin",
        disabled: tab.affix,
        run: () => store.pinTab(tab.id),
      },
      {
        id: "maximize",
        label: t(store.maximizedTabId ? "restore" : "maximize"),
        icon: store.maximizedTabId ? "lucide:minimize-2" : "lucide:maximize-2",
        disabled: false,
        run: () => maximize(tab),
      },
      {
        id: "newWindow",
        label: t("newWindow"),
        icon: "lucide:external-link",
        disabled: false,
        run: () => {
          window.open(
            router.resolve(tab.fullPath).href,
            "_blank",
            "noopener,noreferrer",
          );
        },
      },
      ...(["current", "left", "right", "others", "all"] as const).map(
        (mode, index) => ({
          id: `close-${mode}`,
          label: t(`close${mode[0]!.toUpperCase()}${mode.slice(1)}`),
          icon: [
            "lucide:x",
            "lucide:arrow-left-to-line",
            "lucide:arrow-right-to-line",
            "lucide:fold-horizontal",
            "lucide:list-x",
          ][index]!,
          separator: index === 0,
          disabled: !closeCandidates(mode, tab.id).length,
          run: () => close(mode, tab.id),
        }),
      ),
    ];
  }

  return { actions, close, maximize, navigate };
}
