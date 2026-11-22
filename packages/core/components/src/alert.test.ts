// @vitest-environment happy-dom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@healseek/uikit-shadcnui'

describe('Alert public exports', () => {
    it('renders semantic alert content and an action slot', () => {
        const wrapper = mount(Alert, {
            props: { variant: 'destructive' },
            slots: {
                default: () => [
                    h(AlertTitle, null, () => '服务异常'),
                    h(AlertDescription, null, () => '请稍后重试。'),
                    h(AlertAction, null, () => h('button', '重试')),
                ],
            },
        })

        expect(wrapper.attributes('role')).toBe('alert')
        expect(wrapper.attributes('data-slot')).toBe('alert')
        expect(wrapper.classes()).toContain('text-destructive')
        expect(wrapper.find('[data-slot="alert-title"]').text()).toContain('服务异常')
        expect(wrapper.find('[data-slot="alert-description"]').text()).toContain('请稍后重试')
        expect(wrapper.find('[data-slot="alert-action"] button').text()).toBe('重试')
    })

    it('keeps the default variant neutral', () => {
        const wrapper = mount(Alert, { slots: { default: '提示' } })

        expect(wrapper.classes()).toContain('text-card-foreground')
        expect(wrapper.classes()).not.toContain('text-destructive')
    })
})
