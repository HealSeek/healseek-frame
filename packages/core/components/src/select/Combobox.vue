<script setup lang="ts">
import { Check, ChevronsUpDown } from '@lucide/vue'
import { computed, nextTick, ref, useId, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { cn, InputGroup, InputGroupAddon, InputGroupInput } from '@healseek/uikit-shadcnui'
import { Command, CommandGroup, CommandItem, CommandList } from '@healseek/uikit-shadcnui/components/ui/command'
import { Popover, PopoverAnchor, PopoverContent } from '@healseek/uikit-shadcnui/components/ui/popover'
import { Icon } from '@healseek/shared/icons'
import { useOverlayOwner } from '@healseek/shared/overlay'
import { flattenSelectOptions, selectableSelectOptions, type FlattenedSelectOption, type SelectOption } from './options'

defineOptions({ name: 'Combobox' })

const props = defineProps({
  options: { type: Array as PropType<SelectOption[]>, default: () => [] },
  placeholder: { type: String, default: '请选择' },
  searchPlaceholder: { type: String, default: undefined },
  emptyText: { type: String, default: undefined },
  disabled: { type: Boolean, default: false },
  allowCustomValue: { type: Boolean, default: false },
  showSelectedIcon: { type: Boolean, default: false },
  openOnFocus: { type: Boolean, default: false },
  filterOptions: { type: Boolean, default: true },
  selectedLabel: { type: String, default: undefined },
  popupClass: { type: String, default: undefined },
  id: { type: String, default: undefined },
  name: { type: String, default: undefined },
  ariaLabel: { type: String, default: undefined },
  ariaLabelledby: { type: String, default: undefined },
  ariaDescribedby: { type: String, default: undefined },
  ariaBusy: { type: [Boolean, String] as PropType<boolean | string | undefined>, default: undefined },
  ariaInvalid: {
    type: [Boolean, String] as PropType<boolean | string | undefined>,
    default: undefined,
  },
  class: { type: String, default: undefined },
})

const emit = defineEmits<{
  'open-change': [open: boolean]
  search: [search: string]
}>()

const { t, te } = useI18n({ useScope: 'global' })
const modelValue = defineModel<string | undefined>()
const open = ref(false)
const owner = useOverlayOwner()
const popupStyle = computed(() => owner?.popupZIndex.value === undefined
  ? undefined
  : { zIndex: owner.popupZIndex.value })
const search = ref('')
const activeIndex = ref(-1)
const activeDescendant = ref<string | undefined>()
const restoreFocusOnClose = ref(false)
const restoringFocus = ref(false)
const searchInput = ref<{ $el?: HTMLInputElement } | null>(null)
const inputAnchor = ref<HTMLElement | null>(null)
const popupContent = ref<{ $el?: HTMLElement } | HTMLElement | null>(null)
const listId = `combobox-list-${useId().replace(/:/g, '')}`

const selectableOptions = computed(() => selectableSelectOptions(props.options))
const hierarchicalOptions = computed(() => flattenSelectOptions(props.options))
const filteredOptions = computed<FlattenedSelectOption[]>(() => {
  if (!props.filterOptions) return hierarchicalOptions.value
  const term = search.value.trim().toLocaleLowerCase()
  if (!term) return hierarchicalOptions.value
  const matches = hierarchicalOptions.value.filter(item =>
    !item.group
      && (item.option.label.toLocaleLowerCase().includes(term)
        || item.option.value?.toLocaleLowerCase().includes(term) === true),
  )
  const matchingKeys = new Set(matches.map(item => item.key))
  return hierarchicalOptions.value.filter(item =>
    !item.group
      ? matchingKeys.has(item.key)
      : matches.some(match => match.key.startsWith(`${item.key}.`)),
  )
})
const filteredLeaves = computed(() => filteredOptions.value.filter(item => !item.group && item.option.value !== undefined))
const selectedOption = computed(() => selectableOptions.value.find(option => option.value === modelValue.value))
const selectedLabel = computed(() => selectedOption.value?.label ?? props.selectedLabel ?? modelValue.value)
const resolvedSearchPlaceholder = computed(() => props.searchPlaceholder ?? (te('common.selectSearch') ? t('common.selectSearch') : '搜索选项'))
const resolvedEmptyText = computed(() => props.emptyText ?? (te('common.selectEmpty') ? t('common.selectEmpty') : '没有匹配的选项'))
const triggerLabel = computed(() => props.ariaLabel ?? (te('common.open') ? t('common.open') : '打开'))
const displayValue = computed(() => open.value ? search.value : selectedLabel.value ?? '')
const activeOption = computed(() => filteredLeaves.value[activeIndex.value])

function firstEnabledIndex(): number {
  const index = filteredLeaves.value.findIndex(item => !item.option.disabled)
  return index
}

function resetActiveIndex(): void {
  activeIndex.value = firstEnabledIndex()
}

function syncActiveDescendant(): boolean {
  if (!open.value || !activeOption.value || typeof document === 'undefined') {
    activeDescendant.value = undefined
    return false
  }
  const key = activeOption.value.key.replace(/"/g, '\\"')
  const content = popupContent.value
  const root: HTMLElement | null | undefined = content && '$el' in content
    ? content.$el
    : content as HTMLElement | null
  const rootElement = typeof Element !== 'undefined' && root instanceof Element ? root : undefined
  const listRoot = document.getElementById(listId)
  const element = listRoot?.querySelector<HTMLElement>(`[data-combobox-option-key="${key}"]`)
    ?? rootElement?.querySelector<HTMLElement>(`[data-combobox-option-key="${key}"]`)
    ?? document.querySelector<HTMLElement>(`[data-combobox-option-key="${key}"]`)
  activeDescendant.value = element?.id || undefined
  return Boolean(element?.id)
}

function scheduleActiveDescendantSync(attempt = 0): void {
  void nextTick(() => {
    if (syncActiveDescendant() || !open.value || attempt >= 10 || typeof window === 'undefined') return
    window.setTimeout(() => scheduleActiveDescendantSync(attempt + 1), 20)
  })
}

watch(filteredLeaves, resetActiveIndex, { flush: 'sync' })
watch([open, activeOption, filteredOptions], () => {
  scheduleActiveDescendantSync()
}, { flush: 'post' })
watch(() => owner?.active.value, (active) => {
  if (active === false) updateOpen(false)
}, { flush: 'sync' })
watch(() => props.disabled, (disabled) => {
  if (disabled) updateOpen(false)
})

function updateOpen(value: boolean): void {
  const wasOpen = open.value
  const nextOpen = value && !props.disabled && owner?.active.value !== false
  open.value = nextOpen
  if (nextOpen !== wasOpen) emit('open-change', nextOpen)
  if (nextOpen && !wasOpen) resetActiveIndex()
  if (!open.value) {
    search.value = ''
    activeDescendant.value = undefined
    if (wasOpen && restoreFocusOnClose.value && owner?.active.value !== false) {
      restoringFocus.value = true
      void nextTick(() => {
        searchInput.value?.$el?.focus()
        void nextTick(() => { restoringFocus.value = false })
      })
    }
    restoreFocusOnClose.value = false
    return
  }
  void nextTick(() => {
    if (open.value && owner?.active.value !== false) searchInput.value?.$el?.focus()
  })
}

function onCloseAutoFocus(event: Event): void {
  // A covered/closed owner must not focus its hidden input over the new host.
  if (owner?.active.value === false) event.preventDefault()
}

function onOpenAutoFocus(event: Event): void {
  // Search stays in the anchored input rather than moving into the list.
  event.preventDefault()
}

function onInteractOutside(event: Event): void {
  // PopoverAnchor is not a PopoverTrigger. Reka therefore cannot recognize
  // this input as part of the control when pointer/focus leaves the portal.
  const original = (event as CustomEvent<{ originalEvent?: Event }>).detail?.originalEvent
  const target = original?.target ?? event.target
  if (target instanceof Node && inputAnchor.value?.contains(target)) event.preventDefault()
}

function select(value: string): void {
  modelValue.value = value
  restoreFocusOnClose.value = true
  updateOpen(false)
}

function onSearchInput(value: string): void {
  search.value = value
  emit('search', value)
  resetActiveIndex()
}

function moveActive(delta: number): void {
  if (!filteredLeaves.value.length) return
  let next = activeIndex.value
  for (let index = 0; index < filteredLeaves.value.length; index += 1) {
    next = (next + delta + filteredLeaves.value.length) % filteredLeaves.value.length
    if (!filteredLeaves.value[next]?.option.disabled) {
      activeIndex.value = next
      scheduleActiveDescendantSync()
      return
    }
  }
}

function selectCustom(event: KeyboardEvent): void {
  if (event.key === 'Escape') {
    event.preventDefault()
    restoreFocusOnClose.value = true
    updateOpen(false)
    return
  }
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    updateOpen(true)
    moveActive(1)
    return
  }
  if (event.key === 'ArrowUp') {
    event.preventDefault()
    updateOpen(true)
    moveActive(-1)
    return
  }
  if (event.key !== 'Enter') return
  const active = filteredLeaves.value[activeIndex.value]
  if (active?.option.value !== undefined && !active.option.disabled) {
    event.preventDefault()
    select(active.option.value)
    return
  }
  if (props.allowCustomValue && search.value.trim()) {
    event.preventDefault()
    select(search.value.trim())
  }
}

function handleGroupClick(event: MouseEvent): void {
  const target = event.target as HTMLElement
  if (target.tagName === 'INPUT' && !open.value) updateOpen(true)
}

function handleGroupInput(event: Event): void {
  if ((event.target as HTMLInputElement).tagName !== 'INPUT') return
  if (!open.value && (event.target as HTMLInputElement).value) updateOpen(true)
  onSearchInput((event.target as HTMLInputElement).value)
}

function handleGroupFocus(event: FocusEvent): void {
  if (!restoringFocus.value && props.openOnFocus && (event.target as HTMLElement).tagName === 'INPUT') updateOpen(true)
}

function handleInputFocus(): void {
  if (!restoringFocus.value && props.openOnFocus) updateOpen(true)
}
</script>

<template>
  <Popover :open="open" @update:open="updateOpen">
    <PopoverAnchor class="block min-w-0">
      <div ref="inputAnchor" class="min-w-0" :class="props.class" @mousedown="handleGroupClick" @click="handleGroupClick" @input="handleGroupInput" @keydown="selectCustom" @focusin="handleGroupFocus">
        <InputGroup :class="cn('w-full has-[[data-slot=input-group-control]:focus-visible]:ring-inset has-[[data-slot][aria-invalid=true]]:ring-inset', props.disabled && 'opacity-50')">
          <InputGroupAddon v-if="props.showSelectedIcon && !open && selectedOption?.icon" data-slot="combobox-selected-icon" align="inline-start" aria-hidden="true">
            <Icon :icon="selectedOption.icon" class="size-4" />
          </InputGroupAddon>
          <InputGroupInput
            ref="searchInput"
            :id="props.id"
            :name="props.name"
            :model-value="displayValue"
            :placeholder="open ? resolvedSearchPlaceholder : (!selectedLabel ? props.placeholder : undefined)"
            :readonly="!open && Boolean(selectedLabel)"
            :disabled="props.disabled"
            autocomplete="off"
            role="combobox"
            :aria-expanded="open"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            :aria-controls="open ? listId : undefined"
            :aria-activedescendant="activeDescendant"
            :aria-label="props.ariaLabel"
            :aria-labelledby="props.ariaLabelledby"
            :aria-describedby="props.ariaDescribedby"
            :aria-busy="props.ariaBusy"
            :aria-invalid="props.ariaInvalid"
            class="h-full min-h-8"
            @focus="handleInputFocus"
          />
          <InputGroupAddon align="inline-end">
            <button
              type="button"
              data-slot="input-group-button"
              :aria-label="triggerLabel"
              :disabled="props.disabled"
              class="text-muted-foreground hover:bg-accent hover:text-accent-foreground inline-flex size-6 items-center justify-center rounded-md text-xs transition-colors disabled:pointer-events-none disabled:opacity-50"
              @click.prevent.stop="updateOpen(!open)"
            >
              <ChevronsUpDown class="text-muted-foreground size-4" />
            </button>
          </InputGroupAddon>
        </InputGroup>
      </div>
    </PopoverAnchor>
    <PopoverContent ref="popupContent" :style="popupStyle" @open-auto-focus="onOpenAutoFocus" @close-auto-focus="onCloseAutoFocus" @interact-outside="onInteractOutside" :class="cn('w-[var(--reka-popover-trigger-width)] min-w-[var(--reka-popover-trigger-width)] max-h-[min(calc(--spacing(72)),calc(var(--reka-popover-content-available-height)))] overflow-hidden rounded-lg border-0 p-0 shadow-md ring-1 ring-foreground/10', props.popupClass)" align="start">
      <Command>
        <CommandList :id="listId">
          <div v-if="!filteredLeaves.length" class="py-6 text-center text-sm text-muted-foreground"><slot name="empty">{{ resolvedEmptyText }}</slot></div>
          <CommandGroup>
            <template v-for="option in filteredOptions" :key="option.key">
              <div
                v-if="option.group"
                data-slot="combobox-option-group"
                class="text-muted-foreground px-2 py-1.5 text-xs font-medium"
                :style="{ paddingLeft: `${0.5 + option.depth * 0.75}rem` }"
              >
                {{ option.option.label }}
              </div>
              <CommandItem
                v-else-if="option.option.value !== undefined"
                :value="`${option.option.label} ${option.option.value}`"
                :disabled="option.option.disabled"
                :aria-selected="modelValue === option.option.value"
                :data-combobox-option-key="option.key"
                :data-depth="option.depth"
                :class="cn('relative rounded-md py-1 pr-8 pl-1.5', filteredLeaves[activeIndex]?.key === option.key && 'bg-accent text-accent-foreground')"
                :style="{ paddingLeft: `${0.375 + option.depth * 0.75}rem` }"
                @mouseenter="!option.option.disabled && (activeIndex = filteredLeaves.findIndex(item => item.key === option.key))"
                @select="select(option.option.value)"
              >
                <Check v-if="props.showSelectedIcon" :class="cn('size-4 shrink-0', modelValue === option.option.value ? 'opacity-100' : 'opacity-0')" />
                <Icon v-if="option.option.icon" :icon="option.option.icon" class="size-4 shrink-0" aria-hidden="true" />
                <span class="min-w-0 break-words">
                  <span>{{ option.option.label }}</span>
                  <span v-if="option.option.description" class="text-muted-foreground block text-xs break-all">{{ option.option.description }}</span>
                </span>
                <span aria-hidden="true" class="sr-only">{{ option.option.value }}</span>
              </CommandItem>
            </template>
          </CommandGroup>
        </CommandList>
        <slot name="footer" />
      </Command>
    </PopoverContent>
  </Popover>
</template>
