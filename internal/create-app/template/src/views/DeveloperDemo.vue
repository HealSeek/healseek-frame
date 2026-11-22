<script setup lang="ts">
import { ref } from 'vue'
import { ServiceHealthCard } from '@healseek/app-ui'
import { useModal, useToast } from '@healseek/composables'
import { useForm, type FormFieldSchema } from '@healseek/forms'
import { SectionPage, StatCard, StatusBadge } from '@healseek/components'
import { PermissionButton } from '@healseek/permission'
import { Button } from '@healseek/uikit-shadcnui'
import { useAuthStore } from '@healseek/stores/auth'
import { useRequest } from '@healseek/request'
import { createDemoApi } from '../api/demo'

defineOptions({ name: 'DeveloperDemo' })

const schema: FormFieldSchema[] = [
    {
        fieldName: 'projectName',
        label: '项目名称',
        component: 'Input',
        rules: 'required,min:2',
    },
]

const submitResult = ref('尚未提交')
const toast = useToast()
const demoApi = createDemoApi(useRequest())
const [Form, formApi] = useForm({
    schema,
    handleSubmit: async (values) => {
        submitResult.value = `已提交：${JSON.stringify(values)}`
        toast.success('提交成功')
    },
})

const [DemoModal, modalApi] = useModal<{ source: string }>({
    title: '框架 ModalApi',
    description: '页面只持有 controller，不需要管理 Dialog 内部状态。',
    onConfirm: async () => {
        await new Promise((resolve) => setTimeout(resolve, 200))
        toast.success('操作成功')
    },
})

function resetForm() {
    formApi.resetForm()
    submitResult.value = '尚未提交'
    toast.info('表单已重置')
}

async function testTokenRefresh() {
    const auth = useAuthStore()
    if (!auth.refreshToken) {
        toast.error('请先登录')
        return
    }
    auth.setTokens({ accessToken: 'expired-demo-token' })
    try {
        const responses = await demoApi.protectedResources(false)
        const username = (responses[0] as { username?: string } | undefined)?.username ?? '用户'
        toast.success(`${username} 的令牌已刷新`)
    } catch {
        toast.error('受保护请求失败')
    }
}
</script>

<template>
    <SectionPage class="min-h-full">
        <template #title>开发者接入示例</template>
        <template #description>
            这个页面同时展示框架组件、权限按钮、tuple useForm 和 useModal。
        </template>

        <div class="space-y-4">
            <div class="grid gap-3 sm:grid-cols-2">
                <StatCard title="框架包" value="core" icon="lucide:layers-3" />
                <div class="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                    <div class="flex items-center justify-between gap-3">
                        <span class="text-sm font-medium">业务扩展层</span>
                        <StatusBadge status="success" text="framework" />
                    </div>
                    <p class="mt-2 text-xs text-muted-foreground">
                        组件通过公开入口组合，不修改框架内部实现。
                    </p>
                </div>
            </div>

            <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <h2 class="text-sm font-semibold">app-ui 业务扩展</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                    业务组件可以组合框架能力，不需要修改框架内置组件。
                </p>
                <ServiceHealthCard
                    class="mt-4"
                    name="示例业务服务"
                    description="由 app-ui 提供的业务级组合组件。"
                    :metrics="[
                        { label: '可用率', value: '99.98%' },
                        { label: 'P95 延迟', value: '284 ms' },
                    ]"
                />
            </section>

            <section class="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <h2 class="text-sm font-semibold">useForm / FormApi</h2>
                <p class="mt-1 text-xs text-muted-foreground">
                    推荐的 tuple API：页面拿到渲染器和唯一 controller。
                </p>
                <component :is="Form" class="mt-4" />
                <p class="mt-2 text-xs text-muted-foreground">{{ submitResult }}</p>
            </section>

            <section class="flex flex-wrap gap-2 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
                <PermissionButton permission="demo.dynamic" size="sm">权限按钮</PermissionButton>
                <Button size="sm" variant="secondary" @click="resetForm">重置表单</Button>
                <Button size="sm" variant="outline" @click="modalApi.open({ source: 'starter' })">
                    打开 useModal
                </Button>
                <Button size="sm" variant="outline" @click="testTokenRefresh">
                    验证 401 刷新
                </Button>
                <DemoModal>
                    <template #default="{ data }">
                        <p class="text-sm text-muted-foreground">payload: {{ data?.source ?? 'none' }}</p>
                    </template>
                </DemoModal>
            </section>
        </div>
    </SectionPage>
</template>
