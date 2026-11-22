<script setup lang="ts">
import { X } from '@lucide/vue'
import Button from '../controls/Button.vue'
import { NEW_API_SELECT_ITEM_CLASS } from '../data-table/new-api-compat'
import { useOverlayOwner } from '@healseek/shared/overlay'
import { Icon } from '@healseek/shared/icons'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@healseek/uikit-shadcnui/components/ui/select'
import { computed, ref, useAttrs, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { groupSelectOptions, type SelectOption } from './options'

export type { SelectOption } from './options'

const props = withDefaults(defineProps<{
  options?: SelectOption[]
  placeholder?: string
  allowClear?: boolean
  disabled?: boolean
  class?: string
}>(), {
  options: () => [],
  allowClear: false,
  disabled: false,
})

const { t, te } = useI18n({ useScope: 'global' })
const resolvedPlaceholder = computed(() => props.placeholder ?? (te('common.selectPlaceholder') ? t('common.selectPlaceholder') : '请选择'))
const clearText = computed(() => te('common.clearSelection') ? t('common.clearSelection') : '清除选择')

defineOptions({ inheritAttrs: false })

const attrs = useAttrs()
const owner = useOverlayOwner()
const open = ref(false)
const popupStyle = computed(() => owner?.popupZIndex.value === undefined
  ? undefined
  : { zIndex: owner.popupZIndex.value })
const optionSections = computed(() => groupSelectOptions(props.options))

// Watch the owning main layer rather than raising a popup above every overlay.
// Reka remains responsible for focus scopes, Escape, outside and body locking.
watch(() => owner?.active.value, (active) => {
  if (active === false) open.value = false
}, { flush: 'sync' })

function updateOpen(value: boolean): void {
  open.value = value && owner?.active.value !== false
}

function onCloseAutoFocus(event: Event): void {
  // Owner closure/coverage must not refocus a hidden trigger over the new host.
  if (owner?.active.value === false) event.preventDefault()
}

const modelValue = defineModel<string | undefined>()

function clear(event: MouseEvent): void {
  event.preventDefault()
  event.stopPropagation()
  if (props.disabled) return
  modelValue.value = undefined
}
</script>

<template>
  <Select v-model="modelValue" :open="open" :disabled="props.disabled" @update:open="updateOpen">
    <div class="relative w-full">
      <SelectTrigger
        v-bind="attrs"
        :class="['w-full h-8 rounded-lg px-2.5 py-2 transition-colors motion-reduce:transition-none focus-visible:ring-inset aria-invalid:ring-3 aria-invalid:ring-inset dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40', props.class, props.allowClear && modelValue ? 'pr-14' : undefined]"
      >
        <SelectValue :placeholder="resolvedPlaceholder" />
      </SelectTrigger>
      <Button
        v-if="props.allowClear && modelValue"
        type="button"
        variant="ghost"
        size="icon-xs"
        class="absolute right-7 top-1/2 size-5 -translate-y-1/2 opacity-50 hover:opacity-100 focus-visible:ring-inset"
        :aria-label="clearText"
        :disabled="props.disabled"
        @click="clear"
      >
        <X class="size-3.5" />
      </Button>
    </div>
    <SelectContent class="w-(--reka-select-trigger-width) min-w-36 rounded-lg border-0 shadow-md ring-1 ring-foreground/10 origin-(--reka-select-content-transform-origin) duration-100 motion-reduce:data-[state=open]:animate-none motion-reduce:data-[state=closed]:animate-none" :style="popupStyle" @close-auto-focus="onCloseAutoFocus">
      <SelectGroup v-for="section in optionSections" :key="section.group?.key ?? section.items[0]?.key ?? 'root'">
        <SelectLabel v-if="section.group" class="px-1.5 py-1 text-xs" :style="{ paddingLeft: `${0.5 + section.group.depth * 0.75}rem` }">
          {{ section.group.option.label }}
        </SelectLabel>
        <template v-for="item in section.items" :key="item.key">
          <SelectLabel v-if="item.group" class="px-1.5 py-1 text-xs" :style="{ paddingLeft: `${0.5 + item.depth * 0.75}rem` }">
            {{ item.option.label }}
          </SelectLabel>
          <SelectItem v-else-if="item.option.value !== undefined" :class="NEW_API_SELECT_ITEM_CLASS" :value="item.option.value" :disabled="item.option.disabled" :style="{ paddingLeft: `${0.5 + item.depth * 0.75}rem` }">
            <Icon v-if="item.option.icon" :icon="item.option.icon" class="size-4 shrink-0" aria-hidden="true" />
            <span class="min-w-0 flex-1">
              <span class="block truncate">{{ item.option.label }}</span>
              <span v-if="item.option.description" class="text-muted-foreground block truncate text-xs font-normal">{{ item.option.description }}</span>
            </span>
          </SelectItem>
        </template>
      </SelectGroup>
    </SelectContent>
  </Select>
</template>
