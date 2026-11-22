// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Slider } from '@healseek/uikit-shadcnui'

describe('Slider public export', () => {
    it('renders track, range and one thumb by default', () => {
        const wrapper = mount(Slider, { props: { defaultValue: [25] } })

        expect(wrapper.get('[data-slot="slider"]')).toBeTruthy()
        expect(wrapper.get('[data-slot="slider-track"]')).toBeTruthy()
        expect(wrapper.get('[data-slot="slider-range"]')).toBeTruthy()
        expect(wrapper.findAll('[data-slot="slider-thumb"]')).toHaveLength(1)
    })

    it('renders multiple thumbs and forwards disabled state', () => {
        const wrapper = mount(Slider, { props: { modelValue: [20, 80], disabled: true, orientation: 'vertical' } })

        expect(wrapper.findAll('[data-slot="slider-thumb"]')).toHaveLength(2)
        expect(wrapper.get('[data-slot="slider"]').attributes('data-disabled')).toBeDefined()
        expect(wrapper.get('[data-slot="slider"]').attributes('data-orientation')).toBe('vertical')
    })
})
