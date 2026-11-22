// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { Progress } from '@healseek/uikit-shadcnui'

describe('Progress primitive export', () => {
    it('renders value and accessibility attributes through the public ui-kit export', () => {
        const wrapper = mount(Progress, { props: { modelValue: 64, max: 100, 'aria-label': '进度' } })
        expect(wrapper.attributes('data-slot')).toBe('progress')
        expect(wrapper.attributes('aria-valuenow')).toBe('64')
        expect(wrapper.attributes('aria-label')).toBe('进度')
    })
})
