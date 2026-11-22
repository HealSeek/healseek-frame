// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@healseek/uikit-shadcnui'

describe('InputOTP public export', () => {
    it('renders the OTP group and slot through the public entry', () => {
        const Host = defineComponent({ setup: () => () => h(InputOTP, { maxlength: 4 }, { default: () => h(InputOTPGroup, null, { default: () => h(InputOTPSlot, { index: 0 }) }) }) })
        const wrapper = mount(Host)
        expect(wrapper.find('input').exists()).toBe(true)
    })
})
