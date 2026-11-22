// @vitest-environment happy-dom
import { mount } from '@vue/test-utils'
import { createI18n } from 'vue-i18n'
import { describe, expect, it } from 'vitest'
import ChartCard from './ChartCard.vue'
import { ChartContainer, ChartLegend, ChartTooltip } from '@healseek/uikit-shadcnui'
import { resolveChartColors } from '@healseek/uikit-shadcnui'

const global = { plugins: [createI18n({ legacy: false, locale: 'zh-CN', messages: { 'zh-CN': { common: { chartLoading: '正在加载图表', chartError: '图表加载失败', chartEmpty: '暂无图表数据', retry: '重试' } } } })] }

describe('ChartCard', () => {
    it('preserves missing observations as gaps while treating an all-null series as empty', () => {
        const gaps = { labels: ['一', '二', '三'], datasets: [{ label: '请求', data: [0, null, 2], spanGaps: false }] }
        const wrapper = mount(ChartCard, { global, props: { title: '真实趋势', data: gaps } })
        expect(wrapper.findComponent(ChartContainer).props('data')).toEqual(gaps)
        expect(wrapper.text()).not.toContain('暂无图表数据')
        const empty = mount(ChartCard, { global, props: { title: '未覆盖', data: { labels: ['一'], datasets: [{ data: [null] }] } } })
        expect(empty.findComponent(ChartContainer).exists()).toBe(false)
        expect(empty.text()).toContain('暂无图表数据')
    })
    it('renders a loading skeleton without mounting a chart', () => {
        const wrapper = mount(ChartCard, { global, props: { title: '调用趋势', loading: true } })
        expect(wrapper.attributes('aria-busy')).toBe('true')
        expect(wrapper.find('canvas').exists()).toBe(false)
        expect(wrapper.text()).not.toContain('暂无图表数据')
    })

    it('forwards a stable chart id and root accessibility contract', () => {
        const wrapper = mount(ChartCard, {
            global,
            props: {
                id: 'requests-overview',
                title: '调用趋势',
                data: { labels: ['一'], datasets: [{ label: '请求', data: [1] }] },
            },
        })
        const chart = wrapper.findComponent(ChartContainer)
        expect(chart.props('id')).toBe('requests-overview')
        expect(chart.attributes('data-slot')).toBe('chart')
        expect(chart.attributes('data-chart')).toBe('chart-requests-overview')
        expect(chart.attributes('role')).toBe('img')
        expect(chart.attributes('aria-label')).toBe('调用趋势')
        expect(chart.classes()).toEqual(expect.arrayContaining(['flex', 'min-w-0', 'justify-center', 'text-xs']))
    })

    it('renders the optional tooltip slot only in the chart state', () => {
        const wrapper = mount(ChartCard, {
            global,
            props: { title: '趋势', data: { labels: ['一'], datasets: [{ label: '请求', data: [1] }] }, tooltipLabel: '周一', tooltipItems: [{ color: '#111', name: '请求', value: 1 }] },
            slots: { tooltip: ({ label, items }: { label?: string; items: unknown[] }) => `${label}:${items.length}` },
        })
        expect(wrapper.text()).toContain('周一:1')
        const loading = mount(ChartCard, { global, props: { title: '趋势', loading: true, tooltipLabel: '隐藏' }, slots: { tooltip: '隐藏' } })
        expect(loading.text()).not.toContain('隐藏')
    })

    it('uses the shared new-api tooltip composition when no custom slot is supplied', () => {
        const wrapper = mount(ChartCard, {
            global,
            props: {
                title: '趋势',
                data: { labels: ['一'], datasets: [{ label: '请求', data: [1] }] },
                tooltipLabel: '周一',
                tooltipItems: [{ color: '#123456', name: '请求量', value: 2400 }],
            },
        })

        expect(wrapper.text()).toContain('周一')
        expect(wrapper.text()).toContain('请求量')
        expect(wrapper.findComponent(ChartTooltip).classes()).toContain('shadow-xl')
    })

    it('keeps tooltip and legend surfaces aligned with the new-api chart contract', () => {
        const tooltip = mount(ChartTooltip, {
            props: {
                label: '周一',
                payload: [
                    { color: '#123456', name: '这是一个需要截断但仍然可读的长指标名称', value: 2400 },
                    { color: '#abcdef', name: '成功率', value: '98%' },
                ],
            },
        })
        expect(tooltip.classes()).toEqual(expect.arrayContaining(['min-w-32', 'rounded-lg', 'border-border/50', 'bg-background', 'shadow-xl']))
        expect(tooltip.find('ul').classes()).toEqual(expect.arrayContaining(['grid', 'gap-1.5']))
        expect(tooltip.find('li').classes()).toEqual(expect.arrayContaining(['flex', 'w-full', 'items-center', 'gap-2']))
        expect(tooltip.find('li > span').classes()).toEqual(expect.arrayContaining(['h-2.5', 'w-2.5', 'rounded-sm']))
        expect(tooltip.find('li span.text-foreground').classes()).toEqual(expect.arrayContaining(['font-mono', 'font-medium', 'tabular-nums']))
        expect(tooltip.findAll('li')).toHaveLength(2)
        expect(tooltip.text()).toContain((2400).toLocaleString())
        expect(tooltip.text()).toContain('98%')

        const emptyTooltip = mount(ChartTooltip, { props: { payload: [] } })
        expect(emptyTooltip.find('ul').exists()).toBe(false)

        const legend = mount(ChartLegend, { props: { items: [{ label: '请求量', color: '#123456' }] } })
        expect(legend.classes()).toEqual(expect.arrayContaining(['items-center', 'justify-center', 'gap-4']))
        expect(legend.classes()).toContain('flex-wrap')
        expect(legend.find('li > span').classes()).toEqual(expect.arrayContaining(['h-2', 'w-2', 'rounded-sm']))
    })

    it('renders retry and empty states without a misleading chart', async () => {
        const errorWrapper = mount(ChartCard, { global, props: { title: '调用趋势', error: new Error('failed') } })
        expect(errorWrapper.get('[role="alert"]').text()).toContain('图表加载失败')
        await errorWrapper.find('button').trigger('click')
        expect(errorWrapper.emitted('retry')).toHaveLength(1)
        expect(errorWrapper.find('canvas').exists()).toBe(false)

        const emptyWrapper = mount(ChartCard, { global, props: { title: '调用趋势', empty: true, data: { labels: [], datasets: [] } } })
        expect(emptyWrapper.text()).toContain('暂无图表数据')
        expect(emptyWrapper.get('[role="status"]').text()).toContain('暂无图表数据')
        expect(emptyWrapper.find('canvas').exists()).toBe(false)

        const emptyDatasetWrapper = mount(ChartCard, { global, props: { title: '调用趋势', data: { labels: ['一'], datasets: [{ label: '请求', data: [] }] } } })
        expect(emptyDatasetWrapper.text()).toContain('暂无图表数据')
        expect(emptyDatasetWrapper.find('canvas').exists()).toBe(false)
    })

    it('marks loading state as a live status', () => {
        const wrapper = mount(ChartCard, { global, props: { title: '调用趋势', loading: true } })
        expect(wrapper.get('[role="status"]').attributes('aria-live')).toBe('polite')
    })

    it('normalizes Chart.js external tooltip payloads into the shared tooltip model', async () => {
        const wrapper = mount(ChartCard, { global, props: { title: '趋势', data: { labels: ['一'], datasets: [{ label: '请求', data: [1] }] } } })
        const chart = wrapper.findComponent(ChartContainer)
        const options = chart.props('options') as { plugins?: { tooltip?: { external?: (context: unknown) => void } } }
        const external = options.plugins?.tooltip?.external
        expect(external).toBeTypeOf('function')
        external!({ tooltip: { opacity: 1, title: ['一'], dataPoints: [{ label: '一', formattedValue: '1,240', dataset: { label: '请求', borderColor: '#123456' } }] } })
        await wrapper.vm.$nextTick()
        expect(wrapper.text()).toContain('1,240')
        expect(wrapper.text()).toContain('请求')
        external!({ tooltip: { opacity: 0 } })
    })

    it('derives theme-token legend items from config when legend is omitted', () => {
        const wrapper = mount(ChartCard, {
            global,
            props: {
                title: '趋势',
                data: { labels: ['一'], datasets: [{ label: 'requests', data: [1] }, { label: 'success', data: [1] }] },
                config: {
                    requests: { label: '请求量', color: 'var(--color-chart-1)' },
                    success: { label: '成功量', color: 'var(--color-chart-2)' },
                },
            },
        })
        expect(wrapper.text()).toContain('请求量')
        expect(wrapper.text()).toContain('成功量')
        expect(wrapper.findAll('li')).toHaveLength(2)
    })

    it('resolves light and dark config colors from the root theme', () => {
        const data = { datasets: [{ label: 'requests', data: [1] }] }
        const config = { requests: { theme: { light: '#111111', dark: '#eeeeee' }, color: '#999999' } }
        expect(resolveChartColors(data, config).datasets[0].borderColor).toBe('#111111')
        document.documentElement.classList.add('dark')
        expect(resolveChartColors(data, config).datasets[0].borderColor).toBe('#eeeeee')
        document.documentElement.classList.remove('dark')
    })
})
