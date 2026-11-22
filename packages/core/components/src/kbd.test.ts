// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { h, defineComponent } from 'vue'
import { describe, expect, it } from 'vitest'
import { Kbd, KbdGroup } from '@healseek/uikit-shadcnui'

describe('Kbd public export', () => {
    it('renders keyboard hint and group through the root entry', () => {
        const Host=defineComponent({setup:()=>()=>h(KbdGroup,null,{default:()=>h(Kbd,null,{default:()=> '⌘ K'})})})
        const wrapper=mount(Host)
        expect(wrapper.text()).toContain('⌘ K')
    })
})
