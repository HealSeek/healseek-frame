// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Switch } from '@healseek/uikit-shadcnui'

describe('Switch public export', () => {
    it('renders switch semantics and disabled state', () => {
        const wrapper = mount(Switch, { props: { modelValue: true, disabled: true, 'aria-label': '启用' } })
        expect(wrapper.attributes('data-slot')).toBe('switch')
        expect(wrapper.attributes('role')).toBe('switch')
        expect(wrapper.attributes('aria-checked')).toBe('true')
        expect(wrapper.attributes('disabled')).toBeDefined()
    })
})
