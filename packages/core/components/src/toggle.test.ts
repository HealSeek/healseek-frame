// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Toggle } from '@healseek/uikit-shadcnui'

describe('Toggle public export', () => {
    it('renders controlled pressed state and variant classes', () => {
        const wrapper = mount(Toggle, { props: { modelValue: true, variant: 'outline', size: 'sm' }, slots: { default: '收藏' } })

        expect(wrapper.attributes('data-slot')).toBe('toggle')
        expect(wrapper.attributes('aria-pressed')).toBe('true')
        expect(wrapper.attributes('data-state')).toBe('on')
        expect(wrapper.classes()).toContain('border')
        expect(wrapper.classes()).toContain('h-7')
    })

    it('forwards disabled semantics', () => {
        const wrapper = mount(Toggle, { props: { disabled: true }, slots: { default: '锁定' } })

        expect(wrapper.attributes('disabled')).toBeDefined()
        expect(wrapper.attributes('data-state')).toBe('off')
    })
})
