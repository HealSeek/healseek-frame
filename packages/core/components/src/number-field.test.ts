// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { h } from 'vue'
import { describe, expect, it } from 'vitest'
import { NumberField, NumberFieldInput } from '@healseek/uikit-shadcnui'

describe('NumberField public export', () => {
    it('renders the number field and input from the root entry', () => {
        const wrapper = mount(NumberField, { props: { modelValue: 2, min: 0, max: 10, step: 1 }, slots: { default: () => h(NumberFieldInput) } })
        expect(wrapper.find('[data-slot="input"]').exists()).toBe(true)
    })
})
