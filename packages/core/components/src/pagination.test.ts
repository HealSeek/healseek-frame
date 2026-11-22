// @vitest-environment happy-dom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@healseek/uikit-shadcnui'

describe('Pagination public exports', () => {
    it('renders navigation, active page and previous/next semantics', () => {
        const wrapper = mount(Pagination, {
            slots: {
                default: () => h(PaginationContent, null, () => [
                    h(PaginationItem, null, () => h(PaginationPrevious, { href: '/previous' })),
                    h(PaginationItem, null, () => h(PaginationLink, { href: '/page/2', isActive: true }, () => '2')),
                    h(PaginationItem, null, () => h(PaginationEllipsis)),
                    h(PaginationItem, null, () => h(PaginationNext, { href: '/next' })),
                ]),
            },
        })

        expect(wrapper.attributes('role')).toBe('navigation')
        expect(wrapper.attributes('aria-label')).toBe('pagination')
        expect(wrapper.get('[data-slot="pagination-link"][data-active]').attributes('aria-current')).toBe('page')
        expect(wrapper.get('[aria-label="Go to previous page"]').attributes('href')).toBe('/previous')
        expect(wrapper.get('[aria-label="Go to next page"]').attributes('href')).toBe('/next')
        expect(wrapper.get('[data-slot="pagination-ellipsis"]').attributes('aria-hidden')).toBe('true')
    })

    it('forwards a custom class and supports a compact link size', () => {
        const wrapper = mount(PaginationLink, { props: { size: 'sm', class: 'custom' }, slots: { default: '1' } })

        expect(wrapper.classes()).toContain('custom')
        expect(wrapper.classes()).toContain('h-8')
    })
})
