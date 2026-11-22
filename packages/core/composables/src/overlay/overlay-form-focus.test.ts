import { afterEach, expect, it } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import { useForm, type FormApi } from '@healseek/forms'
import { useDrawer } from '../drawer/use-drawer'
import { useModal } from '../modal/use-modal'
import { overlayStack } from './overlay-stack'

let wrapper: VueWrapper | undefined
afterEach(async () => {
    wrapper?.unmount()
    await nextTick()
    await new Promise((resolve) => setTimeout(resolve, 250))
    overlayStack.clear()
    document.body.innerHTML = ''
})

it('keeps invalid same-name focus inside the top Modal over a Drawer', async () => {
    let parentForm!: FormApi, childForm!: FormApi
    let drawer!: ReturnType<typeof useDrawer>[1], modal!: ReturnType<typeof useModal>[1]
    const Host = defineComponent({ setup() {
        const schema = [{ fieldName: 'name', label: 'Name', component: 'Input', rules: 'required' }]
        const [Parent, parent] = useForm({ schema })
        const [Child, child] = useForm({ schema })
        parentForm = parent; childForm = child
        const [Drawer, drawerApi] = useDrawer({ title: 'Parent form', description: 'Parent fields' })
        const [Modal, modalApi] = useModal({ title: 'Child form', description: 'Child fields' })
        drawer = drawerApi; modal = modalApi
        return () => h('main', [
            h(Drawer, {}, { default: () => h(Parent, { 'data-form': 'parent' }) }),
            h(Modal, {}, { default: () => h(Child, { 'data-form': 'child' }) }),
        ])
    } })
    wrapper = mount(Host, { attachTo: document.body })
    drawer.open()
    await nextTick(); await flushPromises()
    modal.open()
    await nextTick(); await flushPromises()
    await childForm.submitForm()
    await flushPromises()
    const child = document.querySelector<HTMLInputElement>('[data-form=child] input')!
    const parent = document.querySelector<HTMLInputElement>('[data-form=parent] input')!
    expect(document.activeElement).toBe(child)
    expect(child.id).not.toBe(parent.id)
    expect(parentForm.errors.value).toEqual({})
    expect(modal.state.open).toBe(true)
    expect(drawer.state.open).toBe(true)
    await modal.close()
    await nextTick(); await flushPromises()
    await parentForm.submitForm()
    expect(document.activeElement).toBe(parent)
})
