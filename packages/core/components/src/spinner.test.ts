// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Spinner } from '@healseek/uikit-shadcnui'

describe('Spinner public export', () => {
    it('renders status semantics and the default loading animation', () => {
        const wrapper = mount(Spinner)

        expect(wrapper.attributes('role')).toBe('status')
        expect(wrapper.attributes('aria-label')).toBe('Loading')
        expect(wrapper.classes()).toContain('animate-spin')
    })

    it('forwards a custom label, class and stroke width', () => {
        const wrapper = mount(Spinner, { props: { class: 'size-6', strokeWidth: 3, 'aria-label': '加载中' } })

        expect(wrapper.attributes('aria-label')).toBe('加载中')
        expect(wrapper.classes()).toContain('size-6')
        expect(wrapper.attributes('stroke-width')).toBe('3')
    })
})
