// @vitest-environment happy-dom
import { h, defineComponent } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
    Accordion,
    AccordionContent,
    AccordionHeader,
    AccordionItem,
    AccordionTrigger,
} from '@healseek/uikit-shadcnui'

function accordionHost(props: Record<string, unknown> = {}) {
    return defineComponent({
        setup: () => () => h(Accordion, props, () => [
            h(AccordionItem, { value: 'one' }, () => [
                h(AccordionHeader, null, () => h(AccordionTrigger, null, () => 'One')),
                h(AccordionContent, null, () => 'First content'),
            ]),
            h(AccordionItem, { value: 'two', disabled: true }, () => [
                h(AccordionHeader, null, () => h(AccordionTrigger, null, () => 'Two')),
                h(AccordionContent, null, () => 'Second content'),
            ]),
        ]),
    })
}

describe('Accordion public exports', () => {
    it('preserves item, trigger and content ARIA relationships', () => {
        const wrapper = mount(accordionHost({ type: 'single', defaultValue: 'one', collapsible: true }))
        const trigger = wrapper.get('[data-slot="accordion-trigger"]')
        const content = wrapper.get('[data-slot="accordion-content"]')

        expect(wrapper.get('[data-slot="accordion"]')).toBeTruthy()
        expect(trigger.attributes('aria-expanded')).toBe('true')
        expect(content.attributes('aria-labelledby')).toBe(trigger.attributes('id'))
        expect(content.attributes('role')).toBe('region')
    })

    it('supports multiple values and disabled items', () => {
        const wrapper = mount(accordionHost({ type: 'multiple', defaultValue: ['one'] }))
        const triggers = wrapper.findAll('[data-slot="accordion-trigger"]')

        expect(triggers[0].attributes('aria-expanded')).toBe('true')
        expect(triggers[1].attributes('data-disabled')).toBeDefined()
        expect(triggers[1].attributes('disabled')).toBeDefined()
    })
})
