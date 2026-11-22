<script setup lang="ts">
import { computed, ref } from 'vue'
import { Icon } from '@healseek/shared/icons'
import { DataPanel, FilterBar, MetricStrip, SectionPage, StatusBadge } from '@healseek/components'
import { Badge, Button } from '@healseek/uikit-shadcnui'

defineOptions({ name: 'DashboardAnalytics' })

const query = ref('')
const metrics = [
    {
        key: 'events',
        label: '事件总数',
        value: '13.4K',
        hint: '近 30 天',
        icon: 'lucide:activity',
        tone: 'info' as const,
    },
    {
        key: 'success',
        label: '成功率',
        value: '98.6%',
        hint: '较上期 +1.4%',
        icon: 'lucide:circle-check',
        tone: 'success' as const,
    },
    {
        key: 'duration',
        label: '平均耗时',
        value: '284 ms',
        hint: 'P95 612 ms',
        icon: 'lucide:gauge',
    },
    {
        key: 'alerts',
        label: '异常事件',
        value: '24',
        hint: '较上期 -18%',
        icon: 'lucide:triangle-alert',
        tone: 'warning' as const,
    },
]
const weekData = [
    { day: '周一', value: 40, label: '1.2K' },
    { day: '周二', value: 65, label: '1.8K' },
    { day: '周三', value: 50, label: '1.4K' },
    { day: '周四', value: 78, label: '2.1K' },
    { day: '周五', value: 92, label: '2.6K' },
    { day: '周六', value: 70, label: '1.9K' },
    { day: '周日', value: 88, label: '2.4K' },
]
const records = [
    {
        name: '工作区同步',
        scope: '成员服务',
        count: '4,829',
        status: 'success' as const,
        time: '刚刚',
    },
    {
        name: '数据导入',
        scope: '内容服务',
        count: '3,211',
        status: 'success' as const,
        time: '12 分钟前',
    },
    {
        name: '审批处理',
        scope: '权限服务',
        count: '2,156',
        status: 'pending' as const,
        time: '25 分钟前',
    },
    {
        name: '报表生成',
        scope: '分析服务',
        count: '1,872',
        status: 'info' as const,
        time: '1 小时前',
    },
    {
        name: '通知派发',
        scope: '消息服务',
        count: '1,340',
        status: 'warning' as const,
        time: '昨天',
    },
]
const filteredRecords = computed(() =>
    records.filter((record) =>
        `${record.name} ${record.scope}`
            .toLocaleLowerCase()
            .includes(query.value.toLocaleLowerCase()),
    ),
)
</script>

<template>
    <SectionPage class="min-h-full">
        <template #breadcrumb
            ><span class="text-xs text-muted-foreground"
                >仪表盘 / 分析</span
            ></template
        >
        <template #title>分析视图</template>
        <template #description
            >使用通用数据面板、指标条和筛选栏组合页面。</template
        >
        <template #actions
            ><Button size="sm" variant="outline"
                ><Icon icon="lucide:download" class="size-4" />导出</Button
            ><Button size="sm"
                ><Icon icon="lucide:calendar-days" class="size-4" />近 30
                天</Button
            ></template
        >

        <div class="space-y-4 sm:space-y-5">
            <MetricStrip :metrics="metrics" />
            <div
                class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]"
            >
                <section
                    class="min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                >
                    <div
                        class="flex items-start justify-between gap-3 border-b px-4 py-3 sm:px-5"
                    >
                        <div>
                            <h2 class="text-sm font-semibold">事件趋势</h2>
                            <p class="mt-0.5 text-xs text-muted-foreground">
                                近一周工作区事件变化
                            </p>
                        </div>
                        <Badge variant="outline" class="gap-1 text-success"
                            ><Icon
                                icon="lucide:trending-up"
                                class="size-3"
                            />+24.3%</Badge
                        >
                    </div>
                    <div class="px-4 py-5 sm:px-5">
                        <div
                            class="flex h-48 items-end gap-2 border-b border-dashed border-border/80 sm:gap-4"
                        >
                            <div
                                v-for="item in weekData"
                                :key="item.day"
                                class="group flex min-w-0 flex-1 flex-col items-center gap-2"
                            >
                                <span
                                    class="text-[10px] font-medium text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                                    >{{ item.label }}</span
                                >
                                <div
                                    class="w-full rounded-t-sm bg-primary/65 transition-colors group-hover:bg-primary"
                                    :style="{ height: item.value + '%' }"
                                />
                                <span
                                    class="text-[10px] text-muted-foreground"
                                    >{{ item.day }}</span
                                >
                            </div>
                        </div>
                    </div>
                </section>
                <section
                    class="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                >
                    <div class="border-b px-4 py-3 sm:px-5">
                        <h2 class="text-sm font-semibold">来源分布</h2>
                        <p class="mt-0.5 text-xs text-muted-foreground">
                            按服务模块统计
                        </p>
                    </div>
                    <div class="space-y-4 px-4 py-4 sm:px-5">
                        <div
                            v-for="item in [
                                {
                                    name: '成员服务',
                                    pct: 42,
                                    color: 'bg-primary',
                                },
                                {
                                    name: '内容服务',
                                    pct: 28,
                                    color: 'bg-success',
                                },
                                {
                                    name: '权限服务',
                                    pct: 18,
                                    color: 'bg-warning',
                                },
                                {
                                    name: '其他服务',
                                    pct: 12,
                                    color: 'bg-muted-foreground',
                                },
                            ]"
                            :key="item.name"
                        >
                            <div
                                class="mb-1.5 flex items-center justify-between text-sm"
                            >
                                <span>{{ item.name }}</span
                                ><span class="font-medium tabular-nums"
                                    >{{ item.pct }}%</span
                                >
                            </div>
                            <div
                                class="h-1.5 overflow-hidden rounded-full bg-muted"
                            >
                                <div
                                    class="h-full rounded-full transition-all duration-500"
                                    :class="item.color"
                                    :style="{ width: item.pct + '%' }"
                                />
                            </div>
                        </div>
                    </div>
                </section>
            </div>
            <DataPanel class="rounded-xl"
                ><template #toolbar
                    ><div
                        class="flex flex-wrap items-center justify-between gap-3"
                    >
                        <div>
                            <h2 class="text-sm font-semibold">事件明细</h2>
                            <p class="mt-0.5 text-xs text-muted-foreground">
                                可复用的数据列表容器
                            </p>
                        </div>
                        <FilterBar
                            v-model="query"
                            class="w-full sm:w-auto"
                            placeholder="搜索事件或服务"
                        /></div
                ></template>
                <div v-if="filteredRecords.length" class="overflow-x-auto">
                    <table class="w-full min-w-[620px] text-left text-sm">
                        <thead
                            class="bg-muted/30 text-xs text-muted-foreground"
                        >
                            <tr>
                                <th class="px-4 py-2.5 font-medium sm:px-5">
                                    事件
                                </th>
                                <th class="px-4 py-2.5 font-medium sm:px-5">
                                    服务
                                </th>
                                <th class="px-4 py-2.5 font-medium sm:px-5">
                                    数量
                                </th>
                                <th class="px-4 py-2.5 font-medium sm:px-5">
                                    状态
                                </th>
                                <th
                                    class="px-4 py-2.5 text-right font-medium sm:px-5"
                                >
                                    时间
                                </th>
                            </tr>
                        </thead>
                        <tbody class="divide-y">
                            <tr
                                v-for="record in filteredRecords"
                                :key="record.name"
                                class="transition-colors hover:bg-accent"
                            >
                                <td class="px-4 py-3 font-medium sm:px-5">
                                    {{ record.name }}
                                </td>
                                <td
                                    class="px-4 py-3 text-muted-foreground sm:px-5"
                                >
                                    {{ record.scope }}
                                </td>
                                <td
                                    class="px-4 py-3 font-mono tabular-nums sm:px-5"
                                >
                                    {{ record.count }}
                                </td>
                                <td class="px-4 py-3 sm:px-5">
                                    <StatusBadge :status="record.status" />
                                </td>
                                <td
                                    class="px-4 py-3 text-right text-xs text-muted-foreground sm:px-5"
                                >
                                    {{ record.time }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div
                    v-else
                    class="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                    没有匹配的记录
                </div></DataPanel
            >
        </div>
    </SectionPage>
</template>
