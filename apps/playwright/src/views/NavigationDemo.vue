<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { Icon } from '@healseek/shared/icons'
import { SectionPage } from '@healseek/components'
import {
    Badge,
    Button,
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@healseek/uikit-shadcnui'

defineOptions({ name: 'NavigationDemo' })
const route = useRoute()
const currentPath = computed(() => route.path)
const expanded = ref(true)
const menuTree = [
    {
        title: '概览',
        path: '/dashboard/overview',
        icon: 'lucide:layout-dashboard',
    },
    { title: '分析', path: '/dashboard/analytics', icon: 'lucide:chart-bar' },
    {
        title: '组件中心',
        path: '/dashboard/components',
        icon: 'lucide:component',
    },
]
</script>

<template>
    <SectionPage class="min-h-full">
        <template #breadcrumb
            ><span class="text-xs text-muted-foreground"
                >开发者工具 / 导航</span
            ></template
        >
        <template #title>父子导航演示</template>
        <template #description
            >同一套路由树在展开、折叠和移动端 Sheet 状态下保持一致的 active
            语义。</template
        >
        <template #actions
            ><Badge variant="outline"
                >当前路径：{{ currentPath }}</Badge
            ></template
        >

        <div
            class="grid min-w-0 gap-4 xl:grid-cols-[minmax(15rem,0.8fr)_minmax(0,1.2fr)]"
        >
            <section
                class="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10"
            >
                <div class="border-b px-4 py-3 sm:px-5">
                    <h2 class="text-sm font-semibold">菜单树预览</h2>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                        对应框架侧栏的父子节点
                    </p>
                </div>
                <div class="p-3 sm:p-4">
                    <Collapsible v-model:open="expanded">
                        <CollapsibleTrigger
                            class="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors hover:bg-accent"
                            ><Icon
                                icon="lucide:panel-left"
                                class="size-4 text-muted-foreground" /><span
                                class="flex-1 text-left"
                                >仪表盘</span
                            ><Icon
                                icon="lucide:chevron-right"
                                :class="[
                                    'size-4 text-muted-foreground transition-transform',
                                    expanded && 'rotate-90',
                                ]"
                        /></CollapsibleTrigger>
                        <CollapsibleContent
                            class="ml-3 mt-1 space-y-1 border-l pl-3"
                        >
                            <RouterLink
                                v-for="item in menuTree"
                                :key="item.path"
                                :to="item.path"
                                class="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors hover:bg-accent"
                                :class="
                                    currentPath === item.path &&
                                    'bg-primary/10 font-medium text-primary'
                                "
                                ><Icon
                                    :icon="item.icon"
                                    class="size-4 shrink-0" /><span
                                    class="min-w-0 flex-1 truncate"
                                    >{{ item.title }}</span
                                ><Icon
                                    v-if="currentPath === item.path"
                                    icon="lucide:check"
                                    class="size-3.5"
                            /></RouterLink>
                        </CollapsibleContent>
                    </Collapsible>
                </div>
            </section>

            <div class="grid gap-4 sm:grid-cols-2">
                <section
                    class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
                >
                    <div class="mb-3 flex items-center gap-2">
                        <span
                            class="flex size-7 items-center justify-center rounded-md bg-muted"
                            ><Icon
                                icon="lucide:workflow"
                                class="size-4 text-muted-foreground"
                        /></span>
                        <h2 class="text-sm font-semibold">父级菜单</h2>
                    </div>
                    <p class="text-sm leading-relaxed text-muted-foreground">
                        父级节点保留展开状态和激活范围。当前路由匹配子项时，框架会自动展开对应分支。
                    </p>
                    <Button
                        class="mt-4"
                        size="sm"
                        variant="outline"
                        @click="expanded = !expanded"
                        >{{ expanded ? '折叠分支' : '展开分支' }}</Button
                    >
                </section>
                <section
                    class="rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
                >
                    <div class="mb-3 flex items-center gap-2">
                        <span
                            class="flex size-7 items-center justify-center rounded-md bg-muted"
                            ><Icon
                                icon="lucide:panel-top"
                                class="size-4 text-muted-foreground"
                        /></span>
                        <h2 class="text-sm font-semibold">响应式行为</h2>
                    </div>
                    <p class="text-sm leading-relaxed text-muted-foreground">
                        桌面折叠态显示图标和右侧菜单，移动端通过 Sheet
                        承载完整菜单，内容区始终保持独立滚动。
                    </p>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <Badge variant="secondary">expanded</Badge
                        ><Badge variant="outline">icon collapsed</Badge
                        ><Badge variant="outline">mobile sheet</Badge>
                    </div>
                </section>
            </div>
        </div>
    </SectionPage>
</template>
