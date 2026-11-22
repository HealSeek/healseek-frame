<script setup lang="ts">
import { Button } from "../controls";
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { Icon } from "@healseek/shared/icons";
import { useOverlayOwner } from "@healseek/shared/overlay";
import { FrameworkPaginationEllipsis } from "../pagination";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@healseek/uikit-shadcnui";
import {
  NEW_API_SELECT_CONTENT_CLASS,
  NEW_API_SELECT_ITEM_CLASS,
  NEW_API_SELECT_TRIGGER_CLASS,
} from "./new-api-compat";

defineOptions({ name: "DataTablePagination" });

const props = withDefaults(
  defineProps<{
    page: number;
    pageSize: number;
    total: number;
    pageSizeOptions?: number[];
    compact?: boolean;
  }>(),
  {
    pageSizeOptions: () => [10, 20, 30, 40, 50, 100],
    compact: false,
  },
);

const emit = defineEmits<{
  (event: "update:page", value: number): void;
  (event: "update:pageSize", value: number): void;
}>();

const owner = useOverlayOwner();
const pageSizeOpen = ref(false);
// The Select is portalled to body; inherit the drawer/modal popup layer
// instead of relying on DOM ancestry or a globally raised z-index.
const pageSizePopupStyle = computed(() =>
  owner?.popupZIndex.value === undefined
    ? undefined
    : { zIndex: owner.popupZIndex.value },
);
watch(
  () => owner?.active.value,
  (active) => {
    if (active === false) pageSizeOpen.value = false;
  },
  { flush: "sync" },
);
function updatePageSizeOpen(value: boolean): void {
  pageSizeOpen.value = value && owner?.active.value !== false;
}
function onPageSizeCloseAutoFocus(event: Event): void {
  // Closing or covering the owner must not refocus its hidden trigger.
  if (owner?.active.value === false) event.preventDefault();
}

const { t, te } = useI18n({ useScope: "global" });
function copy(key: string, fallback: string): string {
  return te(key) ? t(key) : fallback;
}
const totalText = computed(() => copy("common.total", "共"));
const rowsPerPageText = computed(() => copy("common.rowsPerPage", "每页"));
const firstPageText = computed(() => copy("common.firstPage", "首页"));
const previousPageText = computed(() => copy("common.previousPage", "上一页"));
const nextPageText = computed(() => copy("common.nextPage", "下一页"));
const lastPageText = computed(() => copy("common.lastPage", "末页"));
const goToPageText = computed(() =>
  copy("common.goToPage", "前往第 {page} 页"),
);

function pageLabel(pageNumber: number): string {
  return goToPageText.value.replace("{page}", String(pageNumber));
}

const totalPages = computed(() =>
  Math.max(
    1,
    Math.ceil(Math.max(0, props.total) / Math.max(props.pageSize, 1)),
  ),
);
const formattedTotal = computed(() => props.total.toLocaleString());
const pageItems = computed<Array<number | "ellipsis">>(() => {
  // Keep the compact four-page window used by new-api.  Showing every page
  // up to seven makes the footer jump in width at the breakpoint where the
  // reference switches to a single ellipsis window.
  const maxVisiblePages = 4;
  if (totalPages.value <= maxVisiblePages) {
    return Array.from({ length: totalPages.value }, (_, index) => index + 1);
  }

  const items: Array<number | "ellipsis"> = [1];
  if (props.page <= 2) {
    items.push(2, "ellipsis", totalPages.value);
  } else if (props.page >= totalPages.value - 1) {
    items.push("ellipsis", totalPages.value - 1, totalPages.value);
  } else {
    items.push("ellipsis", props.page, "ellipsis", totalPages.value);
  }
  return items;
});

function setPage(value: number): void {
  const page = Math.min(Math.max(1, Math.floor(value)), totalPages.value);
  if (page !== props.page) emit("update:page", page);
}

function setPageSize(value: number): void {
  const pageSize = Math.max(1, Math.floor(value));
  if (pageSize !== props.pageSize) emit("update:pageSize", pageSize);
}
</script>

<template>
  <nav
    v-if="props.compact"
    aria-label="pagination"
    class="flex w-full min-w-0 flex-wrap items-center justify-between gap-2 text-sm"
  >
    <span class="min-w-0 text-muted-foreground [overflow-wrap:anywhere]"
      >{{ totalText }} {{ formattedTotal }}</span
    >
    <div class="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="icon"
        :class="'size-11'"
        :aria-label="previousPageText"
        :disabled="page <= 1"
        @click="setPage(page - 1)"
      >
        <Icon icon="lucide:chevron-left" aria-hidden="true" />
      </Button>
      <span class="tabular-nums" aria-live="polite"
        >{{ page }} / {{ totalPages }}</span
      >
      <Button
        type="button"
        variant="outline"
        size="icon"
        :class="'size-11'"
        :aria-label="nextPageText"
        :disabled="page >= totalPages"
        @click="setPage(page + 1)"
      >
        <Icon icon="lucide:chevron-right" aria-hidden="true" />
      </Button>
    </div>
  </nav>
  <div
    v-else
    class="@container/pagination flex min-w-0 items-center justify-end overflow-clip"
    style="overflow-clip-margin: 1px"
  >
    <div class="flex min-w-0 shrink-0 items-center gap-2 @xl/pagination:gap-3">
      <div
        class="flex shrink-0 items-baseline gap-1.5 text-xs font-medium whitespace-nowrap sm:text-sm"
      >
        <span class="text-muted-foreground/80">{{ totalText }}</span>
        <span class="text-foreground tabular-nums">{{ formattedTotal }}</span>
      </div>

      <div class="flex shrink-0 items-center gap-1.5 @lg/pagination:gap-2">
        <span
          class="hidden text-sm font-medium whitespace-nowrap text-muted-foreground/80 @2xl/pagination:block"
          >{{ rowsPerPageText }}</span
        >
        <Select
          :model-value="String(pageSize)"
          :open="pageSizeOpen"
          @update:open="updatePageSizeOpen"
          @update:model-value="(value) => value && setPageSize(Number(value))"
        >
          <SelectTrigger
            :class="[
              NEW_API_SELECT_TRIGGER_CLASS,
              'text-foreground h-8 w-[64px] font-medium tabular-nums sm:w-[70px]',
            ]"
          >
            <SelectValue :placeholder="String(pageSize)" />
          </SelectTrigger>
          <SelectContent
            side="top"
            :align-item-with-trigger="false"
            :class="NEW_API_SELECT_CONTENT_CLASS"
            :style="pageSizePopupStyle"
            @close-auto-focus="onPageSizeCloseAutoFocus"
          >
            <SelectGroup>
              <SelectItem
                v-for="size in pageSizeOptions"
                :key="size"
                :value="String(size)"
                :class="NEW_API_SELECT_ITEM_CLASS"
                >{{ size }}</SelectItem
              >
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <Pagination class="mx-0 w-auto">
        <PaginationContent
          class="gap-0.5 @lg/pagination:gap-1.5 @xl/pagination:gap-2"
        >
          <PaginationItem class="@max-lg/pagination:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              :class="'text-muted-foreground hover:bg-muted hover:text-foreground disabled:text-muted-foreground/50 size-8 p-0'"
              :aria-label="firstPageText"
              :disabled="page <= 1"
              @click="setPage(1)"
            >
              <Icon
                icon="lucide:chevrons-left"
                class="size-4"
                aria-hidden="true"
              />
            </Button>
          </PaginationItem>
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="icon"
              :class="'text-muted-foreground hover:bg-muted hover:text-foreground disabled:text-muted-foreground/50 size-8 p-0'"
              :aria-label="previousPageText"
              :disabled="page <= 1"
              @click="setPage(page - 1)"
            >
              <Icon
                icon="lucide:chevron-left"
                class="size-4"
                aria-hidden="true"
              />
            </Button>
          </PaginationItem>
          <PaginationItem
            v-for="(item, index) in pageItems"
            :key="`${item}-${index}`"
          >
            <FrameworkPaginationEllipsis v-if="item === 'ellipsis'" />
            <Button
              v-else
              type="button"
              :variant="item === page ? 'default' : 'outline'"
              :class="
                item === page
                  ? 'h-8 min-w-8 px-2 tabular-nums font-semibold'
                  : 'h-8 min-w-8 px-2 tabular-nums text-muted-foreground hover:bg-muted hover:text-foreground'
              "
              :aria-label="pageLabel(item)"
              @click="setPage(item)"
              >{{ item }}</Button
            >
          </PaginationItem>
          <PaginationItem>
            <Button
              type="button"
              variant="outline"
              size="icon"
              :class="'text-muted-foreground hover:bg-muted hover:text-foreground disabled:text-muted-foreground/50 size-8 p-0'"
              :aria-label="nextPageText"
              :disabled="page >= totalPages"
              @click="setPage(page + 1)"
            >
              <Icon
                icon="lucide:chevron-right"
                class="size-4"
                aria-hidden="true"
              />
            </Button>
          </PaginationItem>
          <PaginationItem class="@max-lg/pagination:hidden">
            <Button
              type="button"
              variant="outline"
              size="icon"
              :class="'text-muted-foreground hover:bg-muted hover:text-foreground disabled:text-muted-foreground/50 size-8 p-0'"
              :aria-label="lastPageText"
              :disabled="page >= totalPages"
              @click="setPage(totalPages)"
            >
              <Icon
                icon="lucide:chevrons-right"
                class="size-4"
                aria-hidden="true"
              />
            </Button>
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  </div>
</template>
