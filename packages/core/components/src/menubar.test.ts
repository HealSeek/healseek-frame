// @vitest-environment happy-dom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
    MenubarCheckboxItem,
    Menubar,
    MenubarContent,
    MenubarItem,
    MenubarMenu,
    MenubarSeparator,
    MenubarShortcut,
    MenubarTrigger,
} from '@healseek/uikit-shadcnui'

describe('Menubar public exports', () => {
    it('renders a menu trigger and content with menu semantics', async () => {
        const wrapper = mount(Menubar, {
            slots: {
                default: () => h(MenubarMenu, { value: 'file' }, () => [
                    h(MenubarTrigger, null, () => '文件'),
                    h(MenubarContent, null, () => [
                        h(MenubarItem, null, () => '打开'),
                        h(MenubarSeparator),
                        h(MenubarItem, { disabled: true }, () => '禁用'),
                    ]),
                ]),
            },
        })

        expect(wrapper.get('[data-slot="menubar"]')).toBeTruthy()
        expect(wrapper.get('[data-slot="menubar-trigger"]').attributes('role')).toBe('menuitem')
        expect(wrapper.get('[data-slot="menubar-trigger"]').attributes('aria-haspopup')).toBe('menu')
        await wrapper.get('[data-slot="menubar-trigger"]').trigger('pointerdown', { button: 0 })
        expect(wrapper.get('[data-slot="menubar-trigger"]').attributes('aria-expanded')).toBe('true')
        expect(document.body.querySelector('[data-slot="menubar-item"]')?.textContent).toBe('打开')
        expect(document.body.querySelector('[data-slot="menubar-separator"]')).toBeTruthy()
    })

    it('exposes advanced checkbox and shortcut slots', async () => {
        const wrapper = mount(Menubar, {
            slots: {
                default: () => h(MenubarMenu, { value: 'view' }, () => [
                    h(MenubarTrigger, null, () => '视图'),
                    h(MenubarContent, null, () => [
                        h(MenubarCheckboxItem, { modelValue: true }, () => ['侧边栏', h(MenubarShortcut, null, () => '⌘B')]),
                    ]),
                ]),
            },
        })
        await wrapper.get('[data-slot="menubar-trigger"]').trigger('pointerdown', { button: 0 })

        expect(document.body.querySelector('[data-slot="menubar-checkbox-item"]')).toBeTruthy()
        expect(document.body.querySelector('[data-slot="menubar-shortcut"]')?.textContent).toContain('⌘B')
    })
})
