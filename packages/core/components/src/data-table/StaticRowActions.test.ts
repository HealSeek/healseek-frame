// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { DropdownMenu } from '@healseek/uikit-shadcnui'
import StaticRowActions from './StaticRowActions.vue'

describe('StaticRowActions', () => {
    it('matches the new-api edit and menu trigger contract', () => {
        const wrapper = mount(StaticRowActions, {
            props: { editLabel: '编辑记录', deleteLabel: '删除记录', menuLabel: '更多操作' },
        })
        const edit = wrapper.get('[data-slot="static-row-edit"]')
        const trigger = wrapper.get('[data-slot="static-row-menu-trigger"]')

        expect(wrapper.get('[data-slot="static-row-actions"]').classes()).toEqual(expect.arrayContaining(['flex', 'justify-end', 'gap-1']))
        expect(edit.attributes('aria-label')).toBe('编辑记录')
        expect(edit.attributes('data-size')).toBe('icon-sm')
        expect(edit.classes()).toContain('focus-visible:ring-3')
        expect(trigger.attributes('aria-label')).toBe('更多操作')
        expect(trigger.classes()).toContain('data-popup-open:bg-muted')
    })

    it('emits and calls independent edit/delete handlers with disabled guards', async () => {
        const onEdit = vi.fn()
        const onDelete = vi.fn()
        const wrapper = mount(StaticRowActions, {
            props: { editLabel: '编辑', deleteLabel: '删除', menuLabel: '更多', onEdit, onDelete, deleteDisabled: true },
            attachTo: document.body,
        })

        await wrapper.get('[data-slot="static-row-edit"]').trigger('click')
        expect(onEdit).toHaveBeenCalledOnce()
        expect(wrapper.emitted('edit')).toHaveLength(1)

        await wrapper.get('[data-slot="static-row-menu-trigger"]').trigger('click')
        const deleteItem = document.body.querySelector('[data-slot="static-row-delete"]') as HTMLButtonElement | null
        expect(deleteItem?.getAttribute('data-variant')).toBe('destructive')
        expect(deleteItem?.hasAttribute('data-disabled')).toBe(true)
        deleteItem?.click()
        expect(onDelete).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('forwards menu options and emits open changes', async () => {
        const wrapper = mount(StaticRowActions, {
            props: { editLabel: '编辑', deleteLabel: '删除', menuLabel: '更多', contentClass: 'w-72', modal: false },
        })
        const menu = wrapper.findComponent(DropdownMenu)
        expect(menu.props('modal')).toBe(false)
        await menu.vm.$emit('update:open', true)
        expect(wrapper.emitted('menu-open-change')).toEqual([[true]])
    })
})
