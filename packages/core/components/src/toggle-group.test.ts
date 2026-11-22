// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { ToggleGroup, ToggleGroupItem } from '@healseek/uikit-shadcnui'

describe('ToggleGroup public export', () => {
    it('renders the group and item through the root export', () => {
        const Host=defineComponent({setup:()=>()=>h(ToggleGroup,{type:'single',modelValue:'a'},{default:()=>h(ToggleGroupItem,{value:'a'},()=> 'A')})})
        const wrapper=mount(Host)
        expect(wrapper.get('[data-slot="toggle-group"]')).toBeTruthy()
        expect(wrapper.get('[data-slot="toggle-group-item"]').text()).toBe('A')
    })
})
