// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { RadioGroup, RadioGroupItem } from '@healseek/uikit-shadcnui'

describe('RadioGroup public export', () => {
    it('renders the group through the public ui-kit entry', () => {
        const Host = defineComponent({ setup: () => () => h(RadioGroup, { modelValue: 'a' }, { default: () => h(RadioGroupItem, { value: 'a' }) }) })
        const wrapper = mount(Host)
        expect(wrapper.attributes('data-slot')).toBe('radio-group')
    })
})
