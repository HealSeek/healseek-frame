<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { Icon } from '@healseek/shared/icons'
import { DataPanel, FilterBar, MetricStrip, SectionPage, StatusBadge } from '@healseek/components'
import { Button } from '@healseek/uikit-shadcnui'

defineOptions({ name: 'DashboardOverview' })

const search = ref('')
const activeRange = ref<'week' | 'month'>('week')
const lastUpdated = ref(new Date())

const metrics = [
    {
        key: 'members',
        label: '活跃成员',
        value: '1,284',
        hint: '较上期 +12.4%',
        icon: 'lucide:users',
        tone: 'info' as const,
    },
    {
        key: 'tasks',
        label: '已完成任务',
        value: '2,408',
        hint: '较上期 +8.6%',
        icon: 'lucide:circle-check',
        tone: 'success' as const,
    },
    {
        key: 'pending',
        label: '待处理事项',
        value: '18',
        hint: '需要关注',
        icon: 'lucide:inbox',
        tone: 'warning' as const,
    },
    {
        key: 'availability',
        label: '服务可用率',
        value: '99.8%',
        hint: '过去 30 天',
        icon: 'lucide:activity',
    },
]

const chart = computed(() =>
    activeRange.value === 'week'
        ? [38, 52, 44, 66, 58, 74, 62]
        : [45, 52, 49, 61, 56, 72, 68, 77, 70, 83, 75, 88],
)
const chartLabels = computed(() =>
    activeRange.value === 'week'
        ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
        : [
              '1 周',
              '2 周',
              '3 周',
              '4 周',
              '5 周',
              '6 周',
              '7 周',
              '8 周',
              '9 周',
              '10 周',
              '11 周',
              '12 周',
          ],
)
const activities = [
    {
        id: 1,
        name: '成员资料更新',
        detail: '个人资料已保存',
        actor: '庄周',
        time: '刚刚',
        status: 'success' as const,
    },
    {
        id: 2,
        name: '审批请求',
        detail: '等待管理员处理',
        actor: '李四',
        time: '10 分钟前',
        status: 'pending' as const,
    },
    {
        id: 3,
        name: '报表生成',
        detail: '月度统计已准备就绪',
        actor: '系统',
        time: '1 小时前',
        status: 'success' as const,
    },
    {
        id: 4,
        name: '设置变更',
        detail: '工作区偏好已更新',
        actor: '王五',
        time: '昨天',
        status: 'info' as const,
    },
]
const filteredActivities = computed(() =>
    activities.filter((item) =>
        `${item.name} ${item.detail} ${item.actor}`
            .toLocaleLowerCase()
            .includes(search.value.toLocaleLowerCase()),
    ),
)
function refresh() {
    lastUpdated.value = new Date()
}
</script>

<template>
    <SectionPage class="min-h-full">
        <template #breadcrumb
            ><span class="text-xs text-muted-foreground"
                >仪表盘 / 概览</span
            ></template
        >
        <template #title>工作区概览</template>
        <template #description>成员、任务和运行状态的集中视图。</template>
        <template #actions>
            <span
                class="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex"
                ><span class="size-1.5 rounded-full bg-success" />{{
                    lastUpdated.toLocaleTimeString('zh-CN', {
                        hour: '2-digit',
                        minute: '2-digit',
                    })
                }}
                更新</span
            >
            <Button
                size="sm"
                variant="outline"
                title="刷新数据"
                aria-label="刷新数据"
                @click="refresh"
                ><Icon icon="lucide:refresh-cw" class="size-4"
            /></Button>
            <RouterLink
                to="/dashboard/analytics"
                class="inline-flex h-8 items-center gap-1.5 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >查看分析 <Icon icon="lucide:arrow-right" class="size-3.5"
            /></RouterLink>
        </template>

        <div class="space-y-4 sm:space-y-5">
            <section
                aria-labelledby="summary-title"
                class="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
            >
                <div class="border-b px-4 py-3 sm:px-5">
                    <h2 id="summary-title" class="text-sm font-semibold">
                        工作区概况
                    </h2>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                        关键数据与待办事项
                    </p>
                </div>
                <MetricStrip
                    :metrics="metrics"
                    class="rounded-none border-0 bg-transparent"
                />
            </section>

            <div
                class="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(18rem,1fr)]"
            >
                <section
                    aria-labelledby="activity-chart-title"
                    class="min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                >
                    <div
                        class="flex flex-wrap items-center justify-between gap-2 border-b px-4 py-3 sm:px-5"
                    >
                        <div>
                            <h2
                                id="activity-chart-title"
                                class="text-sm font-semibold"
                            >
                                活动趋势
                            </h2>
                            <p class="mt-0.5 text-xs text-muted-foreground">
                                工作区事件数量
                            </p>
                        </div>
                        <div
                            class="inline-flex h-8 items-center rounded-md border p-0.5 text-xs"
                            aria-label="时间范围"
                        >
                            <button
                                type="button"
                                class="h-6 rounded px-2.5 transition-colors"
                                :class="
                                    activeRange === 'week'
                                        ? 'bg-muted font-medium text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                "
                                :aria-pressed="activeRange === 'week'"
                                @click="activeRange = 'week'"
                            >
                                本周</button
                            ><button
                                type="button"
                                class="h-6 rounded px-2.5 transition-colors"
                                :class="
                                    activeRange === 'month'
                                        ? 'bg-muted font-medium text-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                "
                                :aria-pressed="activeRange === 'month'"
                                @click="activeRange = 'month'"
                            >
                                近三月
                            </button>
                        </div>
                    </div>
                    <div class="px-4 py-5 sm:px-5">
                        <div
                            class="flex h-44 items-end gap-1.5 border-b border-dashed border-border/80 sm:gap-3"
                        >
                            <div
                                v-for="(height, index) in chart"
                                :key="index"
                                class="group flex h-full min-w-0 flex-1 items-end"
                                :title="`${chartLabels[index]}：${height} 次`"
                            >
                                <div
                                    class="w-full rounded-t-sm bg-primary/65 transition-colors group-hover:bg-primary"
                                    :style="{ height: `${height}%` }"
                                />
                            </div>
                        </div>
                        <div
                            class="mt-2 flex gap-1.5 text-center text-[10px] text-muted-foreground sm:gap-3"
                        >
                            <span
                                v-for="label in chartLabels"
                                :key="label"
                                class="min-w-0 flex-1 truncate"
                                >{{ label }}</span
                            >
                        </div>
                    </div>
                </section>

                <section
                    aria-labelledby="quick-access-title"
                    class="min-w-0 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
                >
                    <div class="border-b px-4 py-3 sm:px-5">
                        <h2
                            id="quick-access-title"
                            class="text-sm font-semibold"
                        >
                            常用入口
                        </h2>
                        <p class="mt-0.5 text-xs text-muted-foreground">
                            继续处理工作区内容
                        </p>
                    </div>
                    <nav class="divide-y">
                        <RouterLink
                            v-for="item in [
                                {
                                    label: '组件展示',
                                    path: '/dashboard/components',
                                    icon: 'lucide:component',
                                },
                                {
                                    label: '表单示例',
                                    path: '/dashboard/my-form',
                                    icon: 'lucide:form-input',
                                },
                                {
                                    label: '布局示例',
                                    path: '/dashboard/navigation',
                                    icon: 'lucide:panel-left',
                                },
                                {
                                    label: '分析视图',
                                    path: '/dashboard/analytics',
                                    icon: 'lucide:chart-no-axes-combined',
                                },
                            ]"
                            :key="item.path"
                            :to="item.path"
                            class="flex items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none sm:px-5"
                            ><Icon
                                :icon="item.icon"
                                class="size-4 shrink-0 text-muted-foreground" /><span
                                class="min-w-0 flex-1 truncate"
                                >{{ item.label }}</span
                            ><Icon
                                icon="lucide:chevron-right"
                                class="size-4 text-muted-foreground"
                        /></RouterLink>
                    </nav>
                </section>
            </div>

            <DataPanel class="rounded-xl"
                ><template #toolbar
                    ><div
                        class="flex flex-wrap items-center justify-between gap-3"
                    >
                        <div>
                            <h2 class="text-sm font-semibold">最近活动</h2>
                            <p class="mt-0.5 text-xs text-muted-foreground">
                                工作区内的最新记录
                            </p>
                        </div>
                        <FilterBar
                            v-model="search"
                            class="w-full sm:w-auto"
                            placeholder="搜索活动或成员"
                        /></div
                ></template>
                <div v-if="filteredActivities.length" class="divide-y">
                    <div
                        v-for="item in filteredActivities"
                        :key="item.id"
                        class="flex min-w-0 items-center gap-3 px-4 py-3 transition-colors hover:bg-accent sm:px-5"
                    >
                        <div
                            class="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"
                        >
                            <Icon icon="lucide:history" class="size-4" />
                        </div>
                        <div class="min-w-0 flex-1">
                            <p class="truncate text-sm font-medium">
                                {{ item.name }}
                            </p>
                            <p class="truncate text-xs text-muted-foreground">
                                {{ item.detail }} · {{ item.actor }}
                            </p>
                        </div>
                        <StatusBadge
                            :status="item.status"
                            class="hidden sm:inline-flex"
                        /><span
                            class="shrink-0 text-xs text-muted-foreground"
                            >{{ item.time }}</span
                        >
                    </div>
                </div>
                <div
                    v-else
                    class="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                    没有匹配的活动
                </div></DataPanel
            >
        </div>
    </SectionPage>
</template>
