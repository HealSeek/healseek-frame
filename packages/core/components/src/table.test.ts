// @vitest-environment happy-dom
import { h } from 'vue'
import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import {
    Table,
    TableBody,
    TableCaption,
    TableCell,
    TableFooter,
    TableHead,
    TableHeader,
    TableRow,
} from '@healseek/uikit-shadcnui'

describe('Table public exports', () => {
    it('renders the responsive container and table slots', () => {
        const wrapper = mount(Table, {
            slots: {
                default: () => [
                    h(TableCaption, null, () => '渠道列表'),
                    h(TableHeader, null, () => h(TableRow, null, () => h(TableHead, null, () => '名称'))),
                    h(TableBody, null, () => h(TableRow, { 'data-state': 'selected' }, () => h(TableCell, null, () => 'OpenAI'))),
                    h(TableFooter, null, () => h(TableRow, null, () => h(TableCell, null, () => '合计'))),
                ],
            },
        })

        expect(wrapper.get('[data-slot="table-container"]')).toBeTruthy()
        expect(wrapper.get('[data-slot="table"]').element.tagName).toBe('TABLE')
        expect(wrapper.get('[data-slot="table-caption"]').text()).toBe('渠道列表')
        expect(wrapper.findAll('[data-slot="table-row"]')[1].attributes('data-state')).toBe('selected')
        expect(wrapper.get('[data-slot="table-footer"]')).toBeTruthy()
    })

    it('can disable the overflow container', () => {
        const wrapper = mount(Table, { props: { withContainer: false }, slots: { default: 'Rows' } })

        expect(wrapper.find('[data-slot="table-container"]').exists()).toBe(false)
        expect(wrapper.get('[data-slot="table"]').element.tagName).toBe('TABLE')
    })
})
