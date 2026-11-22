// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw } from 'vue'
import { TagInput } from '@healseek/components'
import { useForm, type FormApi, type FormFieldSchema } from './index'

let wrapper: VueWrapper | undefined

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
})

function mountForm(schema: FormFieldSchema[]): FormApi {
    let api!: FormApi
    wrapper = mount(defineComponent({
        setup() {
            const [Form, formApi] = useForm({ schema, showDefaultActions: false })
            api = formApi
            return () => h(Form)
        },
    }))
    return api
}

describe('TagInput form integration', () => {
    it.each(['TagInput', 'tag-input', markRaw(TagInput)] as const)(
        'keeps %s tags in one array value, clears committed validation and resets to []', async (component) => {
            const api = mountForm([{ fieldName: 'tags', label: '标签', component, rules: 'required' }])
            await flushPromises()
            expect(api.values.value.tags).toEqual([{ value: [] }])
            const input = wrapper!.get('input')
            expect(input.attributes('name')).toBe('tags[0].value')
            const id = input.attributes('id')
            expect(wrapper!.get('label').attributes('for')).toBe(id)
            await input.trigger('blur')
            await vi.waitFor(() => expect(api.errors.value['tags[0].value']).toBe('必填'))
            await input.setValue('first')
            await input.trigger('keydown', { key: 'Enter' })
            await vi.waitFor(() => expect(api.errors.value['tags[0].value']).toBeUndefined())
            expect(input.attributes('aria-invalid')).toBe('false')
            expect(await api.validateAndSubmit()).toEqual({ tags: [{ value: ['first'] }] })
            await api.setValues({ tags: [{ value: ['loaded', 'external'] }] })
            await flushPromises()
            expect(wrapper!.findAll('[data-slot="tag-input-tag"]')).toHaveLength(2)
            api.resetForm()
            await flushPromises()
            expect(api.values.value.tags).toEqual([{ value: [] }])
            expect(wrapper!.findAll('[data-slot="tag-input-tag"]')).toHaveLength(0)
        },
    )

    it('submits an optional empty tag value and initializes nested fields with []', async () => {
        const api = mountForm([{
            fieldName: 'settings', label: '设置', component: 'Input',
            children: [{ fieldName: 'tags', label: '标签', component: 'TagInput' }],
        }])
        await flushPromises()
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ tags: [] }] })
        const input = wrapper!.get('input')
        expect(input.attributes('placeholder')).toBe('请输入标签')
        await input.setValue('nested')
        await input.trigger('blur')
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ tags: ['nested'] }] })
        api.setProps({ disabled: true })
        await flushPromises()
        expect(input.attributes('disabled')).toBeDefined()
        expect(wrapper!.find('[data-slot="tag-input-remove"]').exists()).toBe(false)
    })

    it('treats repeated tag editors as rows of string arrays', async () => {
        const api = mountForm([{
            fieldName: 'groups', label: '标签组', component: 'TagInput', array: true,
        }])
        await flushPromises()
        await wrapper!.get('input').setValue('one')
        await wrapper!.get('input').trigger('keydown', { key: 'Enter' })
        await wrapper!.findAll('button').find((button) => button.text() === '+ 添加')!.trigger('click')
        await flushPromises()
        expect(await api.validateAndSubmit()).toEqual({ groups: [{ value: ['one'] }, { value: [] }] })
        expect(wrapper!.findAll('input')).toHaveLength(2)
    })
})
