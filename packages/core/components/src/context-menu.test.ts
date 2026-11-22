// @vitest-environment happy-dom
import { mount, shallowMount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
    ContextMenuCheckboxItem,
    ContextMenuItem,
    ContextMenuItemIndicator,
    ContextMenuRadioGroup,
    ContextMenuRadioItem,
    ContextMenuShortcut,
    ContextMenuSubContent,
    ContextMenuSubTrigger,
} from '@healseek/uikit-shadcnui'

describe('ContextMenu advanced primitives', () => {
    it('forwards checkbox state, inset styling and indicator slots', () => {
        const wrapper = shallowMount(ContextMenuCheckboxItem, {
            props: { modelValue: true, inset: true },
            slots: { default: '固定', 'indicator-icon': '✓' },
        })

        expect(wrapper.attributes('data-slot')).toBe('context-menu-checkbox-item')
        expect(wrapper.attributes('data-inset')).toBe('')
        expect((wrapper.vm as { $props: { modelValue?: boolean } }).$props.modelValue).toBe(true)
        expect(wrapper.vm.$slots.default).toBeTruthy()
        expect(wrapper.vm.$slots['indicator-icon']).toBeTruthy()
    })

    it('exposes radio group/items and preserves disabled semantics', () => {
        const group = shallowMount(ContextMenuRadioGroup, {
            props: { modelValue: 'compact' },
            slots: {
                default: '<span data-radio="compact">紧凑</span><span data-radio="wide">宽屏</span>',
            },
        })
        const disabled = shallowMount(ContextMenuRadioItem, { props: { value: 'wide', disabled: true }, slots: { default: '宽屏' } })

        expect(group.attributes('data-slot')).toBe('context-menu-radio-group')
        expect(group.vm.$slots.default).toBeTruthy()
        expect(disabled.attributes('data-slot')).toBe('context-menu-radio-item')
        expect((disabled.vm as { $props: { disabled?: boolean } }).$props.disabled).toBe(true)
    })

    it('supports submenu, shortcut and reusable indicator composition', () => {
        const item = shallowMount(ContextMenuItem, {
            props: { inset: true, variant: 'destructive' },
            slots: { default: '删除' },
        })
        const trigger = shallowMount(ContextMenuSubTrigger, { props: { inset: true }, slots: { default: '更多' } })
        const content = shallowMount(ContextMenuSubContent, { slots: { default: '子菜单' } })
        const shortcut = mount(ContextMenuShortcut, { slots: { default: '⌘⌫' } })
        const indicator = shallowMount(ContextMenuItemIndicator, { slots: { default: '•' } })

        expect(item.attributes('data-inset')).toBe('')
        expect(item.attributes('data-variant')).toBe('destructive')
        expect(trigger.attributes('data-slot')).toBe('context-menu-sub-trigger')
        expect(content.attributes('data-slot')).toBe('context-menu-sub-content')
        expect(shortcut.attributes('data-slot')).toBe('context-menu-shortcut')
        expect(shortcut.text()).toBe('⌘⌫')
        expect(indicator.attributes('data-slot')).toBe('context-menu-item-indicator')
    })
})
