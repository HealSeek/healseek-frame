<script setup lang="ts">
import { Button } from "../controls";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@healseek/uikit-shadcnui";
import { Icon } from "@healseek/shared/icons";
import {
  NEW_API_DROPDOWN_CONTENT_CLASS,
  NEW_API_DROPDOWN_ITEM_CLASS,
} from "./new-api-compat";

defineOptions({ name: "StaticRowActions" });

const props = withDefaults(
  defineProps<{
    editLabel: string;
    deleteLabel: string;
    menuLabel: string;
    onEdit?: () => void;
    onDelete?: () => void;
    editDisabled?: boolean;
    deleteDisabled?: boolean;
    contentClass?: string;
    modal?: boolean;
  }>(),
  {
    editDisabled: false,
    deleteDisabled: false,
    modal: undefined,
  },
);

const emit = defineEmits<{
  (event: "edit"): void;
  (event: "delete"): void;
  (event: "menu-open-change", open: boolean): void;
}>();

function edit(): void {
  if (props.editDisabled) return;
  // `onEdit` is also Vue's listener prop for the emitted `edit` event;
  // emitting once keeps callback props and `@edit` listeners from firing twice.
  emit("edit");
}

function remove(): void {
  if (props.deleteDisabled) return;
  // See edit(): Vue invokes an `onDelete` listener from this single emit.
  emit("delete");
}
</script>

<template>
  <div data-slot="static-row-actions" class="flex justify-end gap-1">
    <Button
      data-slot="static-row-edit"
      type="button"
      variant="ghost"
      size="icon-sm"
      :disabled="props.editDisabled"
      :aria-label="props.editLabel"
      @click="edit"
    >
      <Icon icon="lucide:pencil" class="size-4" aria-hidden="true" />
    </Button>
    <DropdownMenu
      :modal="props.modal"
      @update:open="(open) => emit('menu-open-change', open)"
    >
      <DropdownMenuTrigger as-child>
        <Button
          data-slot="static-row-menu-trigger"
          type="button"
          variant="ghost"
          size="icon"
          :class="'data-popup-open:bg-muted'"
          :aria-label="props.menuLabel"
        >
          <Icon icon="lucide:ellipsis" class="size-4" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        :class="[NEW_API_DROPDOWN_CONTENT_CLASS, 'w-48', props.contentClass]"
      >
        <DropdownMenuItem
          data-slot="static-row-delete"
          variant="destructive"
          :class="NEW_API_DROPDOWN_ITEM_CLASS"
          :disabled="props.deleteDisabled"
          @select="remove"
        >
          {{ props.deleteLabel }}
          <DropdownMenuShortcut
            ><Icon icon="lucide:trash-2" class="size-4" aria-hidden="true"
          /></DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  </div>
</template>
