import type { ChartConfig, ChartSeriesConfigMap } from '@healseek/uikit-shadcnui'

export type FrameworkChartType = 'line' | 'bar' | 'pie' | 'doughnut' | 'radar'
// Chart.js treats null as a gap; callers must not replace missing observations with zero.
type PrimitiveDataset = ChartConfig['data']['datasets'][number]
export type FrameworkChartData = Omit<ChartConfig['data'], 'datasets'> & {
    datasets: Array<Omit<PrimitiveDataset, 'data'> & { data: Array<number | null> }>
}
export type FrameworkChartOptions = ChartConfig['options']
export type FrameworkChartConfig = ChartSeriesConfigMap

export interface ChartLegendItem {
    label: string
    color: string
}

export interface ChartTooltipItem {
    color: string
    name: string
    value: number | string
}
