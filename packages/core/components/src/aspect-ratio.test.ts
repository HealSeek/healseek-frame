// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { AspectRatio } from '@healseek/uikit-shadcnui'

describe('AspectRatio public export', () => {
    it('renders a ratio wrapper with a slot and data-slot hook', () => {
        const wrapper = mount(AspectRatio, { props: { ratio: 16 / 9 }, slots: { default: '<img alt="preview" />' } })
        const inner = wrapper.get('[data-slot="aspect-ratio"]')

        expect(inner.attributes('data-slot')).toBe('aspect-ratio')
        expect(inner.element.parentElement?.style.paddingBottom).toBe('56.25%')
        expect(wrapper.find('img[alt="preview"]').exists()).toBe(true)
    })

    it('forwards class and defaults to a square ratio', () => {
        const wrapper = mount(AspectRatio, { props: { class: 'rounded-lg' }, slots: { default: 'content' } })
        const inner = wrapper.get('[data-slot="aspect-ratio"]')

        expect(inner.classes()).toContain('rounded-lg')
        expect(inner.element.parentElement?.style.paddingBottom).toBe('100%')
    })
})
