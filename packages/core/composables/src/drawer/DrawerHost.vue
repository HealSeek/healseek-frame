<script setup lang="ts">
import { computed, onBeforeUnmount, shallowRef, watch } from "vue";
import { Button } from "@healseek/components/controls";
import { cn } from "@healseek/uikit-shadcnui";
import { Icon } from "@healseek/shared/icons";
import { provideOverlayOwner } from "@healseek/shared/overlay";
import {
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@healseek/uikit-shadcnui";
import {
  DialogContent,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
} from "reka-ui";
import { overlayStack, type OverlayHandle } from "../overlay/overlay-stack";
import type { DrawerApi } from "./drawer-api";
import type { DrawerCloseReason } from "./types";

const props = defineProps<{ api: DrawerApi<any, any> }>();

let transitionTimer: ReturnType<typeof setTimeout> | undefined;
let pendingPhase: "opened" | "closed" | undefined;
let observedInitialState = false;
const stackHandle = shallowRef<OverlayHandle>();

provideOverlayOwner({
  active: computed(
    () => props.api.state.open && stackHandle.value?.isActive.value === true,
  ),
  popupZIndex: computed(() => stackHandle.value?.popupZIndex.value),
});

function syncStack(open: boolean) {
  // Reka owns the DOM lock for this host and its Select popups; keep the
  // framework stack responsible for ordering and opener restoration.
  if (open && !stackHandle.value)
    stackHandle.value = overlayStack.acquire({ lockBodyScroll: false });
  if (!open && stackHandle.value) {
    stackHandle.value.release();
    stackHandle.value = undefined;
  }
}

function finishTransition(event?: AnimationEvent) {
  if (event && event.target !== event.currentTarget) return;
  if (transitionTimer) clearTimeout(transitionTimer);
  transitionTimer = undefined;
  const phase = pendingPhase;
  pendingPhase = undefined;
  if (phase === "opened") props.api.notifyOpened();
  else if (phase === "closed") props.api.notifyClosed();
}

watch(
  () => props.api.state.open,
  (open) => {
    syncStack(open);
    if (!observedInitialState) {
      observedInitialState = true;
      if (!open) return;
    }
    if (transitionTimer) clearTimeout(transitionTimer);
    pendingPhase = open ? "opened" : "closed";
    const reducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    transitionTimer = setTimeout(
      () => finishTransition(),
      reducedMotion ? 0 : 220,
    );
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  if (transitionTimer) clearTimeout(transitionTimer);
  stackHandle.value?.release();
  stackHandle.value = undefined;
});

function requestClose(reason: DrawerCloseReason) {
  void props.api.close(reason);
}

function onUpdateOpen(open: boolean) {
  if (open) props.api.open();
  else if (!props.api.state.loading && stackHandle.value?.isTop())
    requestClose("api");
}

function onEscape(event: Event) {
  // Keep native dismissal from bypassing disabled/loading controller state.
  const prevented = event.defaultPrevented;
  event.preventDefault();
  if (
    !prevented &&
    stackHandle.value?.isTop() &&
    props.api.state.closeOnEscape &&
    !props.api.state.loading
  ) {
    requestClose("escape");
  }
}

function onOutside(event: Event) {
  const original = (event as CustomEvent<{ originalEvent: PointerEvent }>)
    .detail?.originalEvent;
  const contextMenu =
    original?.button === 2 || (original?.button === 0 && original.ctrlKey);
  const prevented = event.defaultPrevented;
  event.preventDefault();
  if (
    !prevented &&
    !contextMenu &&
    stackHandle.value?.isTop() &&
    props.api.state.closeOnOutside &&
    !props.api.state.loading
  ) {
    requestClose("outside");
  }
}

function onOpenAutoFocus(event: Event): void {
  const selector = props.api.state.initialFocus;
  if (!selector) return;
  let target: HTMLElement | null = null;
  try {
    const root =
      event.currentTarget instanceof HTMLElement
        ? event.currentTarget
        : undefined;
    target =
      root?.querySelector<HTMLElement>(selector) ??
      document.querySelector<HTMLElement>(selector);
  } catch {
    return;
  }
  if (!target) return;
  event.preventDefault();
  requestAnimationFrame(() => target?.focus());
}

async function confirm() {
  try {
    await props.api.confirm();
  } catch {
    // The controller keeps the error visible in the drawer body.
  }
}

async function cancel() {
  try {
    await props.api.cancel();
  } catch {
    // The controller keeps the error visible in the drawer body.
  }
}
</script>

<template>
  <DialogRoot :open="api.state.open" @update:open="onUpdateOpen">
    <DialogPortal>
      <DialogOverlay
        class="data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-150 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none fixed inset-0 z-50 bg-black/10 supports-[backdrop-filter]:backdrop-blur-xs"
        :style="
          stackHandle ? { zIndex: stackHandle.overlayZIndex.value } : undefined
        "
      />
      <!-- Only the body scrolls. Unlike hidden, clip also prevents focus
           restoration from programmatically scrolling the fixed shell. -->
      <DialogContent
        :class="
          cn(
            'bg-background text-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 fixed z-50 flex flex-col overflow-clip bg-clip-padding text-sm shadow-none outline-none duration-200 ease-in-out motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none',
            api.side === 'right'
              ? 'inset-y-0 right-0 h-dvh w-full sm:max-w-md rounded-none border-l data-[state=closed]:slide-out-to-right-[2.5rem] data-[state=open]:slide-in-from-right-[2.5rem]'
              : 'inset-x-0 bottom-0 max-h-[80dvh] rounded-none border-t data-[state=closed]:slide-out-to-bottom-[2.5rem] data-[state=open]:slide-in-from-bottom-[2.5rem]',
            api.state.contentClass,
          )
        "
        :style="{
          ...(stackHandle ? { zIndex: stackHandle.zIndex.value } : {}),
          ...(api.state.contentHeight !== undefined
            ? {
                height:
                  typeof api.state.contentHeight === 'number'
                    ? `${api.state.contentHeight}px`
                    : api.state.contentHeight,
              }
            : {}),
        }"
        @escape-key-down="onEscape"
        @pointer-down-outside="onOutside"
        @open-auto-focus="onOpenAutoFocus"
        @animation-end="finishTransition"
      >
        <div
          v-if="api.side === 'bottom'"
          class="bg-muted mx-auto mt-3 h-1 w-24 shrink-0 rounded-full"
        />
        <div
          class="border-border/70 bg-background/95 flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4"
        >
          <DialogHeader
            :class="
              cn('min-w-0 flex-1 gap-0.5 text-left', api.state.headerClass)
            "
          >
            <DialogTitle
              v-if="api.state.title"
              :class="
                cn('text-base font-medium tracking-tight', api.state.titleClass)
              "
              >{{ api.state.title }}</DialogTitle
            >
            <DialogTitle v-else :class="cn('sr-only', api.state.titleClass)"
              >抽屉</DialogTitle
            >
            <DialogDescription
              v-if="api.state.description"
              :class="cn('text-sm', api.state.descriptionClass)"
              >{{ api.state.description }}</DialogDescription
            >
          </DialogHeader>
          <Button
            v-if="api.state.showCloseButton"
            type="button"
            size="icon-sm"
            variant="ghost"
            class="shrink-0 text-muted-foreground"
            title="关闭抽屉"
            aria-label="关闭抽屉"
            :disabled="api.state.loading"
            @click="requestClose('close-button')"
          >
            <Icon icon="lucide:x" class="size-4" />
          </Button>
        </div>

        <div
          :class="
            cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5',
              api.state.bodyClass,
            )
          "
          :aria-busy="api.state.loading"
        >
          <slot :api="api" :data="api.getData()" />
          <p
            v-if="api.state.error"
            role="alert"
            class="mt-3 text-sm text-destructive"
          >
            {{ api.state.error }}
          </p>
        </div>

        <DialogFooter
          v-if="
            api.state.footer &&
            ($slots.footer || api.state.showCancel || api.state.showConfirm)
          "
          :class="
            cn(
              'border-border/70 bg-background/95 mt-auto grid grid-cols-2 gap-2 sm:flex sm:flex-row sm:justify-end shrink-0 border-t px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4',
              api.state.footerClass,
            )
          "
        >
          <slot name="footer" :api="api" :data="api.getData()">
            <Button
              v-if="api.state.showCancel"
              type="button"
              variant="outline"
              :disabled="api.state.loading"
              @click="cancel"
            >
              {{ api.state.cancelText }}
            </Button>
            <Button
              v-if="api.state.showConfirm"
              type="button"
              :icon="api.state.confirmIcon"
              :disabled="api.state.loading || api.state.confirmDisabled"
              @click="confirm"
            >
              <template v-if="api.state.loading" #icon
                ><Icon icon="lucide:loader-circle" class="size-4 animate-spin"
              /></template>
              {{ api.state.confirmText }}
            </Button>
          </slot>
        </DialogFooter>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<style scoped>
.overflow-y-auto {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklch, var(--color-foreground) 18%, transparent)
    transparent;
}

.overflow-y-auto::-webkit-scrollbar {
  width: 8px;
}
.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}
.overflow-y-auto::-webkit-scrollbar-thumb {
  background: color-mix(in oklch, var(--color-foreground) 18%, transparent);
  border: 2px solid transparent;
  border-radius: 999px;
  background-clip: padding-box;
}
</style>
