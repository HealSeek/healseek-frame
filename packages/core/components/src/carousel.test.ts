// @vitest-environment happy-dom
import { h, nextTick } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@healseek/uikit-shadcnui'

describe('Carousel public exports', () => {
    it('renders region and slide semantics with previous/next controls', () => {
        const wrapper = mount(Carousel, {
            slots: {
                default: () => [
                    h(CarouselContent, null, () => [h(CarouselItem, null, () => 'One'), h(CarouselItem, null, () => 'Two')]),
                    h(CarouselPrevious),
                    h(CarouselNext),
                ],
            },
        })

        expect(wrapper.attributes('role')).toBe('region')
        expect(wrapper.attributes('aria-roledescription')).toBe('carousel')
        expect(wrapper.findAll('[data-slot="carousel-item"]')).toHaveLength(2)
        expect(wrapper.get('[data-slot="carousel-previous"]').attributes('aria-label')).toBe('Previous slide')
        expect(wrapper.get('[data-slot="carousel-next"]').attributes('aria-label')).toBe('Next slide')
    })

    it('supports vertical orientation', () => {
        const wrapper = mount(Carousel, {
            props: { orientation: 'vertical' },
            slots: { default: () => h(CarouselContent, null, () => h(CarouselItem, null, () => 'One')) },
        })

        expect(wrapper.find('.flex-col').exists()).toBe(true)
    })

    it('keeps navigation controls enabled at loop boundaries', async () => {
        const wrapper = mount(Carousel, {
            props: { loop: true },
            slots: { default: () => [h(CarouselContent, null, () => [h(CarouselItem, null, () => 'One'), h(CarouselItem, null, () => 'Two')]), h(CarouselPrevious), h(CarouselNext)] },
        })
        await nextTick()
        await nextTick()
        expect((wrapper.get('[data-slot="carousel-previous"]').element as HTMLButtonElement).disabled).toBe(false)
        expect((wrapper.get('[data-slot="carousel-next"]').element as HTMLButtonElement).disabled).toBe(false)
    })

    it('autoplays looped slides and pauses while hovered', async () => {
        vi.useFakeTimers()
        const wrapper = mount(Carousel, {
            props: { loop: true, autoplayInterval: 100 },
            slots: { default: () => h(CarouselContent, null, () => [h(CarouselItem, null, () => 'One'), h(CarouselItem, null, () => 'Two')]) },
        })
        await nextTick()
        await nextTick()
        await vi.advanceTimersByTimeAsync(100)
        expect(wrapper.attributes('data-current-index')).toBe('1')
        await wrapper.trigger('mouseenter')
        await vi.advanceTimersByTimeAsync(200)
        expect(wrapper.attributes('data-current-index')).toBe('1')
        await wrapper.trigger('mouseleave')
        await vi.advanceTimersByTimeAsync(100)
        expect(wrapper.attributes('data-current-index')).toBe('0')
        wrapper.unmount()
        vi.useRealTimers()
    })
})
