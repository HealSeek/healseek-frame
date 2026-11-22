// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { TagsInput, TagsInputInput } from '@healseek/uikit-shadcnui'

describe('TagsInput public export', () => {
    it('renders root and input through the public ui-kit entry', () => {
        const Host = defineComponent({ setup: () => () => h(TagsInput, { modelValue: ['one'] }, { default: () => h(TagsInputInput) }) })
        const wrapper = mount(Host)
        expect(wrapper.find('input').exists()).toBe(true)
        expect(wrapper.classes()).toContain('border')
    })
})
