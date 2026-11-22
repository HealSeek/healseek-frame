// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { DropdownMenu } from '@healseek/uikit-shadcnui'
import { createI18n } from 'vue-i18n'
import { createI18n } from 'vue-i18n'
import DataTableRowActions from './DataTableRowActions.vue'

const global = { plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': { common: { moreActions: '更多操作' } } } })] }

describe('DataTableRowActions', () => {
    it('uses the active locale for the default dropdown aria-label while explicit labels win', () => {
        const i18n = createI18n({ legacy: false, locale: 'en-US', messages: { 'en-US': { common: { moreActions: 'More actions' } } } })
        const wrapper = mount(DataTableRowActions, { global: { plugins: [i18n] }, props: { row: { id: 1 }, dropdownActions: [{ key: 'copy', label: 'Copy', onSelect: vi.fn() }] } })
        expect(wrapper.get('[data-slot="dropdown-menu-trigger"]').attributes('aria-label')).toBe('More actions')
        const explicit = mount(DataTableRowActions, { global: { plugins: [i18n] }, props: { row: { id: 1 }, dropdownAriaLabel: 'Row actions', dropdownActions: [{ key: 'copy', label: 'Copy' }] } })
        expect(explicit.get('[data-slot="dropdown-menu-trigger"]').attributes('aria-label')).toBe('Row actions')
    })
    it('shows a fallback spinner and blocks a loading action without an icon', async () => {
        const callback = vi.fn()
        const wrapper = mount(DataTableRowActions, {
            global,
            props: { row: { id: 1 }, actions: [{ key: 'save', label: '保存', loading: true, onSelect: callback }] },
        })
        const button = wrapper.get('[data-slot="data-table-row-action"]')
        expect(button.attributes('aria-busy')).toBe('true')
        expect((button.element as HTMLButtonElement).disabled).toBe(true)
        expect(button.find('svg').classes()).toContain('animate-spin')
        await button.trigger('click')
        expect(callback).not.toHaveBeenCalled()
    })

    it('keeps normal actions callable and exposes stable action keys', async () => {
        const callback = vi.fn()
        const wrapper = mount(DataTableRowActions, {
            global,
            props: { row: { id: 1 }, actions: [{ key: 'view', label: '查看', onSelect: callback }] },
        })
        const button = wrapper.get('[data-slot="data-table-row-action"]')
        expect(button.attributes('data-action-key')).toBe('view')
        await button.trigger('click')
        expect(callback).toHaveBeenCalledWith({ id: 1 })
    })

    it('renders new-api icon-only actions with an accessible label', () => {
        const wrapper = mount(DataTableRowActions, {
            global,
            props: { row: { id: 1 }, actions: [{ key: 'edit', label: '编辑', icon: 'lucide:pencil', iconOnly: true, ariaLabel: '编辑渠道' }] },
        })
        const button = wrapper.get('[data-slot="data-table-row-action"]')
        expect(button.attributes('aria-label')).toBe('编辑渠道')
        expect(button.attributes('data-size')).toBe('icon-sm')
        expect(button.text()).toBe('')
        expect(button.find('svg').classes()).toContain('size-4')
    })

    it('marks destructive dropdown actions for the new-api destructive menu styling', async () => {
        const wrapper = mount(DataTableRowActions, {
            global,
            props: { row: { id: 1 }, dropdownActions: [{ key: 'delete', label: '删除', variant: 'destructive', onSelect: vi.fn() }] },
            attachTo: document.body,
        })
        await wrapper.get('[data-slot="dropdown-menu-trigger"]').trigger('click')
        expect(document.body.querySelector('[data-action-key="delete"]')?.getAttribute('data-variant')).toBe('destructive')
        wrapper.unmount()
    })

    it('forwards dropdown configuration and emits open changes', async () => {
        const wrapper = mount(DataTableRowActions, {
            global,
            props: {
                row: { id: 1 },
                dropdownModal: false,
                dropdownAriaLabel: '行操作',
                dropdownContentClass: 'w-72',
                dropdownActions: [{ key: 'copy', label: '复制', onSelect: vi.fn() }],
            },
        })
        const menu = wrapper.findComponent(DropdownMenu)
        expect(menu.props('modal')).toBe(false)
        expect(wrapper.get('[data-slot="dropdown-menu-trigger"]').attributes('aria-label')).toBe('行操作')
        await menu.vm.$emit('update:open', true)
        expect(wrapper.emitted('dropdown-open-change')).toEqual([[true]])
    })

    it('keeps the new-api ellipsis trigger at the icon size token', () => {
        const wrapper = mount(DataTableRowActions, {
            global,
            props: { row: { id: 1 }, dropdownActions: [{ key: 'copy', label: '复制' }] },
        })
        const trigger = wrapper.get('[data-slot="dropdown-menu-trigger"]')
        expect(trigger.attributes('data-size')).toBe('icon')
        expect(trigger.classes()).toContain('size-8')
    })
})
