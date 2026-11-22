// @vitest-environment happy-dom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
    Empty,
    EmptyContent,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@healseek/uikit-shadcnui'

describe('Empty primitive exports', () => {
    it('renders the complete slot composition and icon variant', () => {
        const wrapper = mount(Empty, {
            slots: {
                default: () => [
                    h(EmptyHeader, null, () => [
                        h(EmptyMedia, { variant: 'icon' }, () => 'i'),
                        h(EmptyTitle, null, () => '暂无数据'),
                        h(EmptyDescription, null, () => '请先添加记录'),
                    ]),
                    h(EmptyContent, null, () => h('button', '新增')),
                ],
            },
        })

        expect(wrapper.get('[data-slot="empty"]')).toBeTruthy()
        expect(wrapper.get('[data-slot="empty-media"], [data-slot="empty-icon"]')).toBeTruthy()
        expect(wrapper.get('[data-slot="empty-icon"]').attributes('data-variant')).toBe('icon')
        expect(wrapper.get('[data-slot="empty-title"]').text()).toBe('暂无数据')
        expect(wrapper.get('[data-slot="empty-description"]').text()).toBe('请先添加记录')
        expect(wrapper.get('[data-slot="empty-content"] button').text()).toBe('新增')
    })
})
