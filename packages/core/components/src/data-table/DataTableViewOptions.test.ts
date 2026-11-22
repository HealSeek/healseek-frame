// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import { DropdownMenu } from '@healseek/uikit-shadcnui'
import { createI18n } from 'vue-i18n'
import DataTableViewOptions from './DataTableViewOptions.vue'

const global = { plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': { common: { view: '查看', toggleColumns: '切换列', restoreColumns: '恢复默认列' } } } })] }

afterEach(() => {
    document.body.innerHTML = ''
})

describe('DataTableViewOptions', () => {
    it('uses locale defaults while explicit labels remain authoritative', () => {
        const i18n = createI18n({ legacy: false, locale: 'en-US', messages: { 'en-US': { common: { view: 'View', toggleColumns: 'Toggle columns', restoreColumns: 'Restore columns' } } } })
        const wrapper = mount(DataTableViewOptions, { global: { plugins: [i18n] }, props: { columns: [{ key: 'name', title: 'Name' }] } })
        expect(wrapper.get('[data-slot="data-table-view-options-trigger"]').attributes('aria-label')).toBe('View')
        const explicit = mount(DataTableViewOptions, { global: { plugins: [i18n] }, props: { columns: [{ key: 'name', title: 'Name' }], label: 'Fields', resetLabel: 'Reset fields' } })
        expect(explicit.get('[data-slot="data-table-view-options-trigger"]').attributes('aria-label')).toBe('Fields')
    })
    it('uses the shared column label precedence used by new-api', async () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: {
                columns: [
                    { key: 'header', title: '旧标题', header: '表头' },
                    { key: 'meta', title: '旧标题', meta: { label: '元数据标签' } },
                    { key: 'fallback', title: '标题' },
                ],
            },
            attachTo: document.body,
        })
        await wrapper.get('[data-slot="data-table-view-options-trigger"]').trigger('click')
        await nextTick()
        const labels = [...document.body.querySelectorAll('[role="menuitemcheckbox"]')].map((item) => item.textContent?.trim())
        expect(labels).toEqual(expect.arrayContaining(['表头', '元数据标签', '标题']))
        wrapper.unmount()
    })
    it('exposes stable trigger accessibility attributes', () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: { columns: [{ key: 'name', title: '名称' }] },
        })
        const trigger = wrapper.get('[data-slot="data-table-view-options-trigger"]')
        expect(trigger.attributes('aria-label')).toBe('查看')
    })

    it('uses a non-modal menu by default and emits open changes', async () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: { columns: [{ key: 'name', title: '名称' }], dropdownContentClass: 'w-72' },
        })
        const menu = wrapper.findComponent(DropdownMenu)
        expect(menu.props('modal')).toBe(false)
        await menu.vm.$emit('update:open', true)
        expect(wrapper.emitted('dropdown-open-change')).toEqual([[true]])
    })

    it('reflects controlled visibility updates from the table header', async () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: {
                columns: [
                    { key: 'name', title: '名称' },
                    { key: 'status', title: '状态' },
                ],
                modelValue: { name: true, status: true },
            },
            attachTo: document.body,
        })

        await wrapper.setProps({ modelValue: { name: false, status: true } })
        await nextTick()

        await wrapper.get('[data-slot="data-table-view-options-trigger"]').trigger('click')
        await nextTick()
        const checkbox = document.body.querySelector('[role="menuitemcheckbox"]') as HTMLElement | null
        expect(checkbox).not.toBeNull()
        expect(checkbox?.getAttribute('data-state')).toBe('unchecked')
        wrapper.unmount()
    })

    it('matches the new-api menu density and keeps reset optional', async () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: {
                columns: [
                    { key: 'name', title: '名称' },
                    { key: 'secret', title: '内部值', hidden: true },
                    { key: 'selection', title: '选择' },
                ],
            },
            attachTo: document.body,
        })
        const trigger = wrapper.get('[data-slot="data-table-view-options-trigger"]')
        expect(trigger.classes()).toContain('shrink-0')
        await trigger.trigger('click')
        await nextTick()
        expect(document.body.querySelector('[data-slot="data-table-view-options-group"]')).not.toBeNull()
        expect(document.body.querySelector('[data-slot="data-table-view-options-reset"]')).toBeNull()
        wrapper.unmount()

        const withReset = mount(DataTableViewOptions, {
            global,
            props: { columns: [{ key: 'name', title: '名称' }], showReset: true },
            attachTo: document.body,
        })
        await withReset.get('[data-slot="data-table-view-options-trigger"]').trigger('click')
        await nextTick()
        expect(document.body.querySelector('[data-slot="data-table-view-options-reset"]')?.getAttribute('aria-label')).toBe('恢复默认列')
        withReset.unmount()
    })

    it('keeps default-hidden columns available to restore', async () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: {
                columns: [
                    { key: 'name', title: '名称' },
                    { key: 'secret', title: '内部值', hidden: true },
                ],
            },
            attachTo: document.body,
        })

        await wrapper.get('[data-slot="data-table-view-options-trigger"]').trigger('click')
        await nextTick()
        const labels = [...document.body.querySelectorAll('[role="menuitemcheckbox"]')].map((item) => item.textContent)
        expect(labels).toContain('内部值')
        wrapper.unmount()
    })

    it('keeps actions and presentation-only columns out of the View menu', async () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: {
                columns: [
                    { key: 'name', title: '名称' },
                    { key: 'actions', title: '操作' },
                    { key: 'badge', title: '状态', displayOnly: true },
                ],
            },
            attachTo: document.body,
        })

        await wrapper.get('[data-slot="data-table-view-options-trigger"]').trigger('click')
        await nextTick()
        const labels = [...document.body.querySelectorAll('[role="menuitemcheckbox"]')].map((item) => item.textContent?.trim())
        expect(labels).toEqual(['名称'])
        wrapper.unmount()
    })

    it('reflects controlled visibility changes in the open menu', async () => {
        const wrapper = mount(DataTableViewOptions, {
            global,
            props: {
                columns: [
                    { key: 'name', title: '名称' },
                    { key: 'status', title: '状态' },
                ],
                modelValue: { name: true, status: true },
            },
            attachTo: document.body,
        })

        await wrapper.get('[data-slot="data-table-view-options-trigger"]').trigger('click')
        await nextTick()
        const item = () => {
            const items = document.body.querySelectorAll('[role="menuitemcheckbox"]')
            return items.item(0) as HTMLElement
        }
        expect(item().getAttribute('aria-checked')).toBe('true')

        await wrapper.setProps({ modelValue: { name: false, status: true } })
        await nextTick()
        expect(item().getAttribute('aria-checked')).toBe('false')
        wrapper.unmount()
    })
})
