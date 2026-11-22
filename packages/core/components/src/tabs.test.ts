// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@healseek/uikit-shadcnui'

describe('Tabs public export', () => {
    it('renders tabs and links active trigger to its content', () => {
        const Host=defineComponent({setup:()=>()=>h(Tabs,{modelValue:'one'},()=>[h(TabsList,null,()=>[h(TabsTrigger,{value:'one'},()=> 'One')]),h(TabsContent,{value:'one'},()=> 'Content')])})
        const wrapper=mount(Host)
        expect(wrapper.get('[data-slot="tabs"]')).toBeTruthy()
        expect(wrapper.text()).toContain('One')
        expect(wrapper.text()).toContain('Content')
    })

    it('keeps the active state and disabled trigger semantics from Reka UI', () => {
        const Host = defineComponent({
            setup: () => () => h(Tabs, { defaultValue: 'one' }, () => [
                h(TabsList, null, () => [
                    h(TabsTrigger, { value: 'one' }, () => 'One'),
                    h(TabsTrigger, { value: 'two', disabled: true }, () => 'Two'),
                ]),
                h(TabsContent, { value: 'one' }, () => 'Content'),
            ]),
        })
        const wrapper = mount(Host)

        expect(wrapper.get('[data-slot="tabs-trigger"][data-state="active"]').text()).toBe('One')
        expect(wrapper.get('[data-slot="tabs-trigger"][data-disabled]')).toBeTruthy()
    })

    it('accepts a controlled model value from the root', () => {
        const Host = defineComponent({
            setup: () => () => h(Tabs, {
                modelValue: 'two',
            }, () => [
                h(TabsList, null, () => [
                    h(TabsTrigger, { value: 'one' }, () => 'One'),
                    h(TabsTrigger, { value: 'two' }, () => 'Two'),
                ]),
                h(TabsContent, { value: 'one' }, () => 'One content'),
                h(TabsContent, { value: 'two' }, () => 'Two content'),
            ]),
        })
        const wrapper = mount(Host)

        expect(wrapper.get('[data-slot="tabs-trigger"][data-state="active"]').text()).toBe('Two')
    })
})
