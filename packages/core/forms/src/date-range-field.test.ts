// @vitest-environment happy-dom
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, markRaw, type PropType } from 'vue'
import { createI18n } from 'vue-i18n'
import { DateTimeRangePicker, Input } from '@healseek/components'
import { z } from 'zod'
import { useForm, type FormApi, type FormFieldSchema } from './index'

let wrapper: VueWrapper | undefined
const selected: [Date, Date] = [new Date(2025, 0, 2, 9), new Date(2025, 0, 3, 10, 30)]
// A custom text editor can share a picker-like name. Names must not change its validation timing.
const CustomTextInput = defineComponent({
    name: 'DateTimeRangePicker',
    props: { modelValue: { type: String, default: '' } },
    emits: ['update:modelValue'],
    setup(props, { emit }) {
        return () => h('input', {
            value: props.modelValue,
            onInput: (event: Event) => emit('update:modelValue', (event.target as HTMLInputElement).value),
        })
    },
})

afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
    document.body.innerHTML = ''
})

function rangeStub(name: string, mode: string) {
    return defineComponent({
        name,
        props: {
            modelValue: { type: Array as PropType<[Date, Date]>, default: undefined },
            disabled: Boolean,
            id: String,
            name: String,
            ariaInvalid: { type: [Boolean, String], default: undefined },
            placeholder: String,
        },
        emits: ['update:modelValue'],
        setup(props, { emit }) {
            return () => h('div', { 'data-range-picker': mode }, [
                h('button', {
                    type: 'button',
                    id: props.id,
                    name: props.name,
                    disabled: props.disabled,
                    'aria-invalid': props.ariaInvalid,
                    'aria-label': props.placeholder,
                    'data-range-select': '',
                    'data-start': props.modelValue?.[0]?.getTime(),
                    'data-end': props.modelValue?.[1]?.getTime(),
                    onClick: () => emit('update:modelValue', selected.map((date) => new Date(date))),
                }, 'Select range'),
                h('button', {
                    type: 'button',
                    disabled: props.disabled,
                    'data-range-clear': '',
                    onClick: () => emit('update:modelValue', undefined),
                }, 'Clear range'),
            ])
        },
    })
}

function mountForm(schema: FormFieldSchema[]): FormApi {
    let api!: FormApi
    wrapper = mount(defineComponent({
        setup() {
            const [Form, formApi] = useForm({ schema, showDefaultActions: false })
            api = formApi
            return () => h(Form)
        },
    }), {
        global: {
            stubs: {
                DateRangePicker: rangeStub('DateRangePicker', 'date'),
                DateTimeRangePicker: rangeStub('DateTimeRangePicker', 'datetime'),
            },
        },
    })
    return api
}

describe('date range form fields', () => {
    it.each([
        ['text alias', 'Input'], ['text component object', markRaw(Input)], ['custom text component', markRaw(CustomTextInput)],
    ] as const)('preserves blur validation timing for a %s', async (_, component) => {
        let api!: FormApi
        wrapper = mount(defineComponent({
            setup() {
                const [Form, formApi] = useForm({
                    showDefaultActions: false,
                    schema: [{ fieldName: 'name', label: '名称', component, rules: z.string().min(3, '长度不足') }],
                })
                api = formApi
                return () => h(Form)
            },
        }))
        await flushPromises()
        const input = wrapper.get<HTMLInputElement>('input')
        await input.trigger('blur')
        await vi.waitFor(() => expect(api.errors.value['name[0].value']).toBe('长度不足'))
        input.element.value = 'valid'
        await input.trigger('input')
        await flushPromises()
        expect(api.errors.value['name[0].value']).toBe('长度不足')
        await input.trigger('blur')
        await vi.waitFor(() => expect(api.errors.value['name[0].value']).toBeUndefined())
    })

    it.each(['ordinary', 'nested object', 'nested array', 'component object'] as const)(
        'clears a blurred required error immediately after confirming a real %s range', async (kind) => {
            let api!: FormApi
            const rangeField: FormFieldSchema = {
                fieldName: 'period', label: '有效期',
                component: kind === 'component object' ? markRaw(DateTimeRangePicker) : 'DateTimeRangePicker',
                rules: z.tuple([z.date(), z.date()]),
                array: kind === 'nested array',
                componentProps: {
                    minDate: new Date(2026, 9, 1), maxDate: new Date(2026, 9, 31), numberOfMonths: 1,
                },
            }
            const schema: FormFieldSchema[] = kind === 'nested object' || kind === 'nested array'
                ? [{ fieldName: 'settings', label: '设置', component: 'Input', children: [rangeField] }]
                : [rangeField]
            const path = kind === 'nested object' ? 'settings[0].period'
                : kind === 'nested array' ? 'settings[0].period[0].value' : 'period[0].value'
            wrapper = mount(defineComponent({
                setup() {
                    const [Form, formApi] = useForm({
                        schema, showDefaultActions: false,
                        initialValues: kind === 'component object' ? { period: [{ value: undefined }] } : undefined,
                    })
                    api = formApi
                    return () => h(Form)
                },
            }), {
                attachTo: document.body,
                global: { plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: {} })] },
            })
            await flushPromises()
            const trigger = wrapper.get<HTMLButtonElement>('[data-date-range-trigger]')
            trigger.element.focus()
            await trigger.trigger('click')
            await flushPromises()
            // Opening the calendar moves focus away from the still-empty
            // trigger. Confirming must clear that blur error on this commit.
            await vi.waitFor(() => expect(api.errors.value[path]).toBeTruthy())
            expect(trigger.attributes('aria-invalid')).toBe('true')
            const popup = document.querySelector<HTMLElement>('[data-slot="popover-content"]')!
            expect(popup).toBeTruthy()
            popup.querySelector<HTMLButtonElement>('[data-value="2026-10-20"]')!.click()
            await flushPromises()
            const end = popup.querySelector<HTMLButtonElement>('[data-value="2026-10-22"]')!
            end.dispatchEvent(new MouseEvent('mouseenter'))
            end.click()
            await flushPromises()
            const confirm = [...popup.querySelectorAll<HTMLButtonElement>('button')]
                .find((button) => button.textContent?.trim() === '确定')!
            expect(confirm.disabled).toBe(false)
            confirm.click()
            await vi.waitFor(() => {
                expect(api.errors.value[path]).toBeUndefined()
                expect(trigger.attributes('aria-invalid')).toBe('false')
            })
            expect(document.activeElement).toBe(trigger.element)
            expect(document.querySelector('[data-slot="popover-content"]')).toBeNull()
            const values = api.values.value as Record<string, Array<Record<string, unknown>>>
            const range = kind === 'nested object' ? values.settings[0].period
                : kind === 'nested array' ? (values.settings[0].period as Array<{ value: unknown }>)[0].value
                : values.period[0].value
            expect((range as Date[]).map((date) => date.getDate())).toEqual([20, 22])
        },
    )

    it.each([
        ['DateRangePicker', 'date'],
        ['daterange', 'date'],
        ['DateTimeRangePicker', 'datetime'],
        ['datetimerange', 'datetime'],
    ] as const)('renders %s as one %s range control with form attributes', async (component, mode) => {
        mountForm([{
            fieldName: 'period',
            label: '时间范围',
            component,
            componentProps: { id: 'period', name: 'period' },
        }])
        await flushPromises()

        expect(wrapper!.findAll('[data-range-picker]')).toHaveLength(1)
        expect(wrapper!.get('[data-range-picker]').attributes('data-range-picker')).toBe(mode)
        const control = wrapper!.get('[data-range-select]')
        expect(control.attributes('id')).toBe('period')
        expect(control.attributes('name')).toBe('period')
        expect(control.attributes('aria-label')).toBe('请选择时间范围')
    })

    it.each([
        'DateRangePicker', 'daterange', 'DateTimeRangePicker', 'datetimerange',
    ] as const)('keeps an empty %s field undefined on submission and reset', async (component) => {
        const api = mountForm([{ fieldName: 'period', label: '时间范围', component }])
        await flushPromises()

        expect(await api.validateAndSubmit()).toEqual({ period: [{ value: undefined }] })
        await wrapper!.get('[data-range-select]').trigger('click')
        expect(((api.values.value.period as Array<{ value?: [Date, Date] }>)[0]).value).toEqual(selected)
        expect(await api.validateAndSubmit()).toEqual({ period: [{ value: selected }] })
        api.resetForm()
        await flushPromises()
        expect(((api.values.value.period as Array<{ value?: [Date, Date] }>)[0]).value).toBeUndefined()
        expect(wrapper!.get('[data-range-select]').attributes('data-start')).toBeUndefined()
    })

    it('round-trips a complete tuple as one field and validates clearing a required range', async () => {
        const initial: [Date, Date] = [new Date(2025, 0, 1), new Date(2025, 0, 2)]
        const api = mountForm([{
            fieldName: 'period',
            label: '时间范围',
            component: 'datetimerange',
            defaultValue: initial,
            rules: z.tuple([z.date(), z.date()]),
        }])
        await flushPromises()
        expect(await api.validateAndSubmit()).toEqual({ period: [{ value: initial }] })

        await wrapper!.get('[data-range-select]').trigger('click')
        expect(await api.validateAndSubmit()).toEqual({ period: [{ value: selected }] })
        expect((api.values.value.period as unknown[])).toHaveLength(1)

        await api.setValues({ period: [{ value: initial }] })
        await flushPromises()
        expect(wrapper!.get('[data-range-select]').attributes('data-start')).toBe(String(initial[0].getTime()))
        await wrapper!.get('[data-range-clear]').trigger('click')
        expect((await api.validateField('period')).valid).toBe(false)
        expect(wrapper!.get('[data-range-select]').attributes('aria-invalid')).toBe('true')

        api.resetForm()
        await flushPromises()
        expect((await api.validate()).valid).toBe(true)
        expect(((api.values.value.period as Array<{ value?: [Date, Date] }>)[0]).value).toEqual(initial)
    })

    it('supports a nested range field, undefined defaults and inherited disabled state', async () => {
        const api = mountForm([{
            fieldName: 'settings',
            label: '设置',
            component: 'Input',
            children: [{ fieldName: 'period', label: '时间范围', component: 'daterange' }],
        }])
        await flushPromises()
        expect((api.values.value.settings as Array<{ period?: [Date, Date] }>)[0].period).toBeUndefined()

        await wrapper!.get('[data-range-select]').trigger('click')
        expect(await api.validateAndSubmit()).toEqual({ settings: [{ period: selected }] })
        api.setProps({ disabled: true })
        await flushPromises()
        expect(wrapper!.get('[data-range-select]').attributes('disabled')).toBeDefined()
        expect(wrapper!.get('[data-range-clear]').attributes('disabled')).toBeDefined()
    })

    it('uses typed tuple validation for the required shorthand and dynamic required state', async () => {
        const api = mountForm([{
            fieldName: 'period',
            label: '时间范围',
            component: 'daterange',
            dependencies: { triggerFields: [], required: true },
        }])
        await flushPromises()
        expect((await api.validate()).valid).toBe(false)
        await wrapper!.get('[data-range-select]').trigger('click')
        expect(await api.validateAndSubmit()).toEqual({ period: [{ value: selected }] })
    })

    it('creates empty range rows without converting a range tuple into repeated form rows', async () => {
        const api = mountForm([{
            fieldName: 'periods', label: '时间范围', component: 'datetimerange', array: true,
        }])
        await flushPromises()
        await wrapper!.get('[data-range-select]').trigger('click')
        await wrapper!.findAll('button').find((button) => button.text() === '+ 添加')!.trigger('click')
        await flushPromises()

        expect((api.values.value.periods as Array<{ value?: [Date, Date] }>)).toEqual([
            { value: selected }, { value: undefined },
        ])
        expect(wrapper!.findAll('[data-range-picker]')).toHaveLength(2)
    })
})
