<script setup lang="ts">
import { ref } from 'vue'
import { useDrawer, useModal } from '@healseek/composables'
import { Button } from '@healseek/uikit-shadcnui'
import ExternalSelectForm from './ExternalSelectForm.vue'

interface SelectionResult {
    category: string
}

const firstCategory = ref('general')
const nestedCategory = ref('general')
const firstStatus = ref('尚未打开主弹窗')
const secondStatus = ref('尚未打开嵌套弹窗')
const drawerStatus = ref('尚未打开抽屉')
const firstResult = ref<SelectionResult>()
const nestedResult = ref<SelectionResult>()
const interactionCount = ref(0)

// The page creates only overlay controllers. Forms live in separate children,
// so this demo covers Select portals and focus without the multi-form issue.
const [SecondModal, secondModalApi] = useModal<undefined, SelectionResult>({
    title: '嵌套 Modal 中的子表单',
    description: '子组件的 Select 浮层只属于当前弹窗，不应落在遮罩之下。',
    confirmText: '确认分类',
    onConfirm: () => ({ category: nestedCategory.value }),
})

const [FirstModal, firstModalApi] = useModal<undefined, SelectionResult>({
    title: 'Modal 内的 Select',
    description: '打开分类下拉，测试选项、外部点击、Escape 及嵌套弹层。',
    confirmText: '确认主弹窗',
    onConfirm: () => ({ category: firstCategory.value }),
})

const [ExampleDrawer, exampleDrawerApi] = useDrawer({
    title: 'Drawer → Modal → Select',
    description: '在抽屉中打开弹窗，检查上下层焦点和关闭顺序。',
    showConfirm: false,
    cancelText: '关闭抽屉',
})

function openFirst(): void {
    firstStatus.value = '主弹窗已打开'
    firstModalApi.open()
    void firstModalApi.waitForResult().then((outcome) => {
        if (outcome.accepted && outcome.result) firstResult.value = outcome.result
        firstStatus.value = outcome.accepted ? '主弹窗已确认' : `主弹窗关闭：${outcome.reason}`
    })
}

function openSecond(): void {
    secondStatus.value = '嵌套弹窗已打开'
    secondModalApi.open()
    void secondModalApi.waitForResult().then((outcome) => {
        if (outcome.accepted && outcome.result) nestedResult.value = outcome.result
        secondStatus.value = outcome.accepted ? '嵌套弹窗已确认' : `嵌套弹窗关闭：${outcome.reason}`
    })
}

function openDrawer(): void {
    drawerStatus.value = '抽屉已打开'
    exampleDrawerApi.open()
    void exampleDrawerApi.waitForResult().then((outcome) => {
        drawerStatus.value = `抽屉关闭：${outcome.reason}`
    })
}
</script>

<template>
    <section data-test="overlay-select-example" class="rounded-xl border bg-card p-4 sm:p-5">
        <h2 class="text-base font-semibold">Select 与嵌套弹层</h2>
        <p class="mt-1 text-sm text-muted-foreground">
            演示 Modal → Select、Modal → Modal → Select 和 Drawer → Modal → Select。
            每个子组件只创建一个表单，页面负责弹层打开、关闭和结果展示。
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
            <Button size="sm" data-test="open-first-form" @click="openFirst">打开带 Select 的 Modal</Button>
            <Button size="sm" variant="outline" data-test="open-form-drawer" @click="openDrawer">打开嵌套抽屉</Button>
        </div>
        <div class="mt-4 space-y-2 text-xs text-muted-foreground" aria-live="polite">
            <p data-test="first-form-status">{{ firstStatus }}</p>
            <p data-test="second-form-status">{{ secondStatus }}</p>
            <p data-test="drawer-status">{{ drawerStatus }}</p>
            <p v-if="firstResult" data-test="first-form-result">主弹窗结果：{{ JSON.stringify(firstResult) }}</p>
            <p v-if="nestedResult" data-test="second-form-result">嵌套弹窗结果：{{ JSON.stringify(nestedResult) }}</p>
        </div>

        <FirstModal>
            <ExternalSelectForm label="主弹窗分类" test-prefix="first-form" @change="firstCategory = $event" />
            <p class="mt-4 text-xs text-muted-foreground">
                下拉打开时点击其他区域应先关闭下拉；按 Escape 也应先关闭下拉，再关闭当前弹窗。
            </p>
            <div class="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" data-test="modal-outside-select" @click="interactionCount++">
                    普通按钮（已点击 {{ interactionCount }} 次）
                </Button>
                <Button size="sm" variant="outline" data-test="open-second-form" @click="openSecond">打开嵌套 Modal</Button>
            </div>
            <SecondModal>
                <ExternalSelectForm @change="nestedCategory = $event" />
                <p class="mt-4 text-xs text-muted-foreground">
                    分类为子组件 useForm 的 Select。选择后返回嵌套弹窗，关闭嵌套弹窗后主弹窗仍可操作。
                </p>
            </SecondModal>
        </FirstModal>

        <ExampleDrawer>
            <p class="text-sm text-muted-foreground">
                打开弹窗后选择分类，再逐层按 Escape：Select → Modal → Drawer。
                全部关闭后页面仍应正常滚动。
            </p>
            <Button class="mt-4" size="sm" data-test="drawer-open-first-form" @click="openFirst">在抽屉中打开 Modal</Button>
        </ExampleDrawer>
    </section>
</template>
