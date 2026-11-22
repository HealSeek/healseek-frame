// @vitest-environment happy-dom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
    Card,
    CardAction,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@healseek/uikit-shadcnui'

describe('Card public exports', () => {
    it('renders the complete card slot structure and small size', () => {
        const wrapper = mount(Card, {
            props: { size: 'sm' },
            slots: {
                default: () => [
                    h(CardHeader, null, () => [
                        h(CardTitle, null, () => '渠道'),
                        h(CardDescription, null, () => '运行状态'),
                        h(CardAction, null, () => h('button', '查看')),
                    ]),
                    h(CardContent, null, () => '内容'),
                    h(CardFooter, null, () => '页脚'),
                ],
            },
        })

        expect(wrapper.attributes('data-slot')).toBe('card')
        expect(wrapper.attributes('data-size')).toBe('sm')
        expect(wrapper.find('[data-slot="card-title"]').text()).toBe('渠道')
        expect(wrapper.find('[data-slot="card-description"]').text()).toBe('运行状态')
        expect(wrapper.find('[data-slot="card-action"] button').text()).toBe('查看')
        expect(wrapper.find('[data-slot="card-content"]').text()).toBe('内容')
        expect(wrapper.find('[data-slot="card-footer"]').text()).toBe('页脚')
    })

    it('uses the default size when omitted', () => {
        const wrapper = mount(Card, { slots: { default: '内容' } })

        expect(wrapper.attributes('data-size')).toBe('default')
    })
})
