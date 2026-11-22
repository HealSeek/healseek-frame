// @vitest-environment happy-dom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ButtonGroup, ButtonGroupSeparator, ButtonGroupText } from '@healseek/uikit-shadcnui'

describe('ButtonGroup public exports', () => {
    it('renders group semantics, text slot and separator', () => {
        const wrapper = mount(ButtonGroup, {
            slots: {
                default: () => [
                    h(ButtonGroupText, null, () => '筛选'),
                    h(ButtonGroupSeparator, null),
                    h('button', '应用'),
                ],
            },
        })

        expect(wrapper.attributes('role')).toBe('group')
        expect(wrapper.attributes('data-orientation')).toBe('horizontal')
        expect(wrapper.get('[data-slot="button-group-text"]').text()).toBe('筛选')
        expect(wrapper.get('[data-slot="button-group-separator"]').attributes('role')).toBe('separator')
    })

    it('supports vertical groups and custom separator orientation', () => {
        const wrapper = mount(ButtonGroup, {
            props: { orientation: 'vertical' },
            slots: { default: () => h(ButtonGroupSeparator, { orientation: 'horizontal' }) },
        })

        expect(wrapper.attributes('data-orientation')).toBe('vertical')
        expect(wrapper.get('[data-slot="button-group-separator"]').attributes('data-orientation')).toBe('horizontal')
    })
})
