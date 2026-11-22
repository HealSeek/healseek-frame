// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw } from 'vue'
import { ColorPicker } from '@healseek/components'
import { useForm, type FormApi, type FormFieldSchema } from './index'

let wrapper: VueWrapper | undefined
afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})
function mountForm(schema: FormFieldSchema[]): FormApi {
    let api!: FormApi
    wrapper = mount(defineComponent({ setup() {
        const [Form, formApi] = useForm({ schema, showDefaultActions: false })
        api = formApi
        return () => h(Form)
    } }), { attachTo: document.body })
    return api
}
async function chooseColor() {
    await wrapper!.get('[data-slot="color-picker-trigger"]').trigger('click')
    await flushPromises()
    document.querySelector<HTMLElement>('[data-color="#c2410c"]')!.click()
    await flushPromises()
}
describe('ColorPicker form integration', () => {
    it.each(['ColorPicker', 'color-picker', markRaw(ColorPicker)] as const)(
        'validates, submits and resets the %s field', async (component) => {
            const api = mountForm([{ fieldName: 'color', label: '颜色', component, rules: 'required' }])
            await flushPromises()
            expect(api.values.value.color).toEqual([{ value: '' }])
            expect((await api.validate()).valid).toBe(false)
            const trigger = wrapper!.get('[data-slot="color-picker-trigger"]')
            expect(wrapper!.get('label').attributes('for')).toBe(trigger.attributes('id'))
            await chooseColor()
            await vi.waitFor(() => expect(api.errors.value['color[0].value']).toBeUndefined())
            expect(await api.validateAndSubmit()).toEqual({ color: [{ value: '#c2410c' }] })
            await api.setValues({ color: [{ value: 'broken' }] })
            expect((await api.validate()).valid).toBe(false)
            api.resetForm()
            await flushPromises()
            expect(api.values.value.color).toEqual([{ value: '' }])
        },
    )
    it.each(['ColorPicker', 'color-picker'] as const)('supports %s in nested fields, defaults and disabled state', async (component) => {
        const api = mountForm([{ fieldName: 'settings', label: '设置', component: 'Input', children: [
            { fieldName: 'theme', label: '主题色', component, defaultValue: '#3b82f6' },
        ] }])
        await flushPromises()
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ theme: '#3b82f6' }] })
        await chooseColor()
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ theme: '#c2410c' }] })
        api.resetForm()
        await flushPromises()
        expect(api.values.value.settings).toEqual([{ theme: '#3b82f6' }])
        api.setProps({ disabled: true })
        await flushPromises()
        expect(wrapper!.get('[data-slot="color-picker-trigger"]').attributes('disabled')).toBeDefined()
    })
    it('accepts optional empty colors', async () => {
        const api = mountForm([{ fieldName: 'color', label: '颜色', component: 'ColorPicker' }])
        await flushPromises()
        expect(await api.validateAndSubmit()).toEqual({ color: [{ value: '' }] })
    })
})
