// @vitest-environment happy-dom
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@healseek/uikit-shadcnui'

describe('Resizable primitives', () => {
    it('renders a horizontal group with accessible handle and panel sizes', () => {
        const wrapper = mount(ResizablePanelGroup, {
            slots: {
                default: () => [
                    h(ResizablePanel, { defaultSize: 40, minSize: 20 }, () => 'left'),
                    h(ResizableHandle, { withHandle: true }),
                    h(ResizablePanel, { defaultSize: 60, maxSize: 80 }, () => 'right'),
                ],
            },
        })

        expect(wrapper.attributes('data-direction')).toBe('horizontal')
        expect(wrapper.findAll('[data-slot="resizable-panel"]')).toHaveLength(2)
        expect(wrapper.get('[data-slot="resizable-handle"]').attributes('role')).toBe('separator')
        expect(wrapper.get('[data-slot="resizable-handle"]').attributes('aria-orientation')).toBe('vertical')
        expect(wrapper.get('[data-slot="resizable-handle"] > div')).toBeTruthy()
    })

    it('supports vertical direction and keyboard focus hook', () => {
        const wrapper = mount(ResizablePanelGroup, {
            props: { direction: 'vertical' },
            slots: { default: () => [h(ResizablePanel, null, () => 'top'), h(ResizableHandle), h(ResizablePanel, null, () => 'bottom')] },
        })

        expect(wrapper.get('[data-slot="resizable-handle"]').attributes('aria-orientation')).toBe('horizontal')
        expect(wrapper.get('[data-slot="resizable-handle"]').attributes('tabindex')).toBe('0')
    })

    it('restores panel sizes from storageKey', async () => {
        localStorage.setItem('resizable-test', '[30,70]')
        const wrapper = mount(ResizablePanelGroup, {
            props: { storageKey: 'resizable-test' },
            slots: { default: () => [h(ResizablePanel, { defaultSize: 40 }, () => 'left'), h(ResizableHandle), h(ResizablePanel, { defaultSize: 60 }, () => 'right')] },
        })
        await nextTick()
        const panels = wrapper.findAll('[data-slot="resizable-panel"]')
        expect(panels[0]!.attributes('style')).toContain('flex-basis: 30%')
        expect(panels[1]!.attributes('style')).toContain('flex-basis: 70%')
        localStorage.removeItem('resizable-test')
    })
})
