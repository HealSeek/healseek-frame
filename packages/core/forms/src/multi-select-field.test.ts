// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw, reactive } from 'vue'
import { createI18n } from 'vue-i18n'
import { ApiMultiSelect, MultiSelect } from '@healseek/components'
import { useForm, type FormApi, type FormFieldSchema } from './index'
import { isMultiSelectFieldComponent } from './form-defaults'

let wrapper: VueWrapper | undefined
const options = [
    { label: '主线路', value: 'primary' },
    { label: '备用线路', value: 'backup' },
]

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

function mountForm(schema: FormFieldSchema[]): FormApi {
    let api!: FormApi
    wrapper = mount(defineComponent({
        setup() {
            const [Form, formApi] = useForm({ schema, showDefaultActions: false })
            api = formApi
            return () => h(Form)
        },
    }), {
        attachTo: document.body,
        global: { plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: {} })] },
    })
    return api
}

function selectField(component: FormFieldSchema['component'], overrides: Partial<FormFieldSchema> = {}): FormFieldSchema {
    return {
        fieldName: 'sources', label: '播放线路', component,
        componentProps: { options, api: vi.fn(async () => options) },
        ...overrides,
    }
}

async function selectPrimary(input = wrapper!.get('input[role="combobox"]')): Promise<void> {
    await input.trigger('focus')
    await flushPromises()
    await input.setValue('主线路')
    await flushPromises()
    await input.trigger('keydown', { key: 'Enter' })
    await flushPromises()
}

describe('MultiSelect form integration', () => {
    it.each([
        'MultiSelect', 'multi-select', 'ApiMultiSelect', 'api-multi-select',
        markRaw(MultiSelect), markRaw(ApiMultiSelect),
    ] as const)('validates and resets %s as one array inside the public form row', async (component) => {
        const api = mountForm([selectField(component, { rules: 'required' })])
        await flushPromises()
        expect(api.values.value.sources).toEqual([{ value: [] }])
        const input = wrapper!.get('input[role="combobox"]')
        expect(input.attributes('placeholder')).toBe('请选择播放线路')
        expect(input.attributes('name')).toBe('sources[0].value')
        expect(wrapper!.get('label').attributes('for')).toBe(input.attributes('id'))
        await input.trigger('blur')
        await vi.waitFor(() => expect(api.errors.value['sources[0].value']).toBe('必填'))
        await selectPrimary(input)
        await vi.waitFor(() => expect(api.errors.value['sources[0].value']).toBeUndefined())
        expect(await api.validateAndSubmit()).toEqual({ sources: [{ value: ['primary'] }] })
        expect(input.attributes('aria-invalid')).toBe('false')
        await api.setValues({ sources: [{ value: ['primary', 'backup'] }] })
        await flushPromises()
        expect(wrapper!.findAll('[data-slot="combobox-chip"]')).toHaveLength(2)
        api.resetForm()
        await flushPromises()
        expect(api.values.value.sources).toEqual([{ value: [] }])
        expect(wrapper!.findAll('[data-slot="combobox-chip"]')).toHaveLength(0)
    })

    it.each(['MultiSelect', 'ApiMultiSelect'] as const)('submits an optional empty %s and preserves nested selection shape', async (component) => {
        const api = mountForm([{
            fieldName: 'settings', label: '设置', component: 'Input',
            children: [selectField(component)],
        }])
        await flushPromises()
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ sources: [] }] })
        await selectPrimary()
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ sources: ['primary'] }] })
        api.setProps({ disabled: true })
        await flushPromises()
        expect(wrapper!.get('input[role="combobox"]').attributes('disabled')).toBeDefined()
        expect(wrapper!.get('[data-slot="combobox-chip-remove"]').attributes('disabled')).toBeDefined()
    })

    it.each(['multi-select', 'api-multi-select'] as const)('keeps repeated %s controls as separate array values', async (component) => {
        const api = mountForm([{
            fieldName: 'settings', label: '设置', component: 'Input',
            children: [selectField(component, { array: true })],
        }])
        await flushPromises()
        await selectPrimary()
        await wrapper!.findAll('button').find((button) => button.text() === '+ 添加')!.trigger('click')
        await flushPromises()
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ sources: [{ value: ['primary'] }, { value: [] }] }] })
        expect(wrapper!.findAll('input[role="combobox"]')).toHaveLength(2)
        expect(wrapper!.findAll('input[role="combobox"]')[1]!.attributes('placeholder')).toBe('请选择播放线路')
    })

    it('recognizes reactive component objects without confusing a similarly named custom editor', () => {
        expect(isMultiSelectFieldComponent(reactive({ ...MultiSelect }))).toBe(false)
        expect(isMultiSelectFieldComponent(reactive(MultiSelect))).toBe(true)
        expect(isMultiSelectFieldComponent(reactive(ApiMultiSelect))).toBe(true)
        expect(isMultiSelectFieldComponent(defineComponent({ name: 'MultiSelect' }))).toBe(false)
    })
})
