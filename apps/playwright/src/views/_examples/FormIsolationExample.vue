<script setup lang="ts">
import { computed, ref } from 'vue'
import { useForm } from '@healseek/forms'
import { useModal } from '@healseek/composables'
import { Button } from '@healseek/uikit-shadcnui'

interface FirstValues {
    name: string
    address: string
    sort: string
}

interface SecondValues {
    category: string
    sort: string
}

const preparingFirst = ref(false)
const firstPrepared = ref(false)
const firstStatus = ref('尚未打开第一表单')
const secondStatus = ref('尚未打开第二表单')
const firstResult = ref<FirstValues>()
const secondResult = ref<SecondValues>()

function readValue(values: Record<string, unknown>, name: string): string {
    const value = values[name]
    return String(Array.isArray(value) ? value[0]?.value ?? '' : value ?? '')
}

// These controllers share a field name and are created in the same setup.
// Each form must retain its own values, validation and context before mounting.
const [FirstForm, firstFormApi] = useForm({
    layout: 'vertical',
    showDefaultActions: false,
    schema: [
        {
            component: 'Input',
            fieldName: 'name',
            label: '名称',
            rules: 'required',
            componentProps: { 'aria-label': '第一表单名称', 'data-test': 'first-form-name' },
        },
        {
            component: 'Input',
            fieldName: 'address',
            label: '地址',
            rules: 'required',
            componentProps: { 'aria-label': '第一表单地址', 'data-test': 'first-form-address' },
        },
        {
            component: 'Input',
            fieldName: 'sort',
            label: '排序',
            rules: 'required',
            componentProps: { 'aria-label': '第一表单排序', 'data-test': 'first-form-sort' },
        },
    ],
})

const [SecondForm, secondFormApi] = useForm({
    layout: 'vertical',
    showDefaultActions: false,
    schema: [
        {
            component: 'Input',
            fieldName: 'category',
            label: '分类',
            rules: 'required',
            componentProps: { 'aria-label': '第二表单分类', 'data-test': 'second-form-category' },
        },
        {
            component: 'Input',
            fieldName: 'sort',
            label: '排序',
            rules: 'required',
            componentProps: { 'aria-label': '第二表单排序', 'data-test': 'second-form-sort' },
        },
    ],
})

const [SecondModal, secondModalApi] = useModal<undefined, SecondValues>({
    title: '第二表单',
    description: '分类和排序属于第二表单；修改、校验或提交不会改变第一表单。',
    confirmText: '确认第二表单',
    onConfirm: async () => {
        const values = await secondFormApi.validateAndSubmit()
        if (!values) return false
        return { category: readValue(values, 'category'), sort: readValue(values, 'sort') }
    },
})

const [FirstModal, firstModalApi] = useModal<undefined, FirstValues>({
    title: '第一表单',
    description: '异步数据先写入 FormApi 再打开；关闭和重开会保留本次页面中的草稿。',
    confirmText: '确认第一表单',
    onConfirm: async () => {
        const values = await firstFormApi.validateAndSubmit()
        if (!values) return false
        return {
            name: readValue(values, 'name'),
            address: readValue(values, 'address'),
            sort: readValue(values, 'sort'),
        }
    },
})

const draftJson = computed(() => JSON.stringify({
    first: firstFormApi.values.value,
    second: secondFormApi.values.value,
}, null, 2))

async function openFirst(): Promise<void> {
    if (preparingFirst.value) return
    preparingFirst.value = true
    firstStatus.value = '正在异步准备第一表单…'
    try {
        // Simulate application-owned data loading before the form renderer mounts.
        await new Promise((resolve) => setTimeout(resolve, 150))
        const values = firstPrepared.value
            ? await firstFormApi.getRawValues()
            : {
                name: [{ value: '演示名称' }],
                address: [{ value: '演示地址' }],
                sort: [{ value: '10' }],
            }
        await firstFormApi.setValues(values)
        firstFormApi.clearValid()
        firstPrepared.value = true
        firstModalApi.open()
        firstStatus.value = '第一表单已打开，数据已回填'
        void firstModalApi.waitForResult().then((outcome) => {
            if (outcome.accepted && outcome.result) firstResult.value = outcome.result
            firstStatus.value = outcome.accepted ? '第一表单已确认' : `第一表单关闭：${outcome.reason}，草稿保留`
        })
    } finally {
        preparingFirst.value = false
    }
}

async function openSecond(): Promise<void> {
    await secondFormApi.setValues({
        category: [{ value: '常规' }],
        sort: [{ value: '20' }],
    })
    secondFormApi.clearValid()
    secondModalApi.open()
    secondStatus.value = '第二表单已打开，第一表单保持不变'
    void secondModalApi.waitForResult().then((outcome) => {
        if (outcome.accepted && outcome.result) secondResult.value = outcome.result
        secondStatus.value = outcome.accepted ? '第二表单已确认' : `第二表单关闭：${outcome.reason}`
    })
}
</script>

<template>
    <div data-test="form-isolation-example" class="rounded-xl border bg-card p-4 sm:p-5">
        <h2 class="text-base font-semibold">同一 setup 的独立表单</h2>
        <p class="mt-1 text-sm text-muted-foreground">
            两个表单共用排序字段名，但数据、校验和提交结果相互独立。第一表单支持异步回填和取消后重开保留草稿。
        </p>
        <div class="mt-4 flex flex-wrap gap-2">
            <Button size="sm" :disabled="preparingFirst" data-test="open-first-form" @click="openFirst">
                {{ preparingFirst ? '准备中…' : '异步回填并打开第一表单' }}
            </Button>
        </div>
        <div class="mt-4 space-y-2 text-xs text-muted-foreground" aria-live="polite">
            <p data-test="first-form-status">{{ firstStatus }}</p>
            <p data-test="second-form-status">{{ secondStatus }}</p>
            <p v-if="firstResult" data-test="first-form-result">第一表单结果：{{ JSON.stringify(firstResult) }}</p>
            <p v-if="secondResult" data-test="second-form-result">第二表单结果：{{ JSON.stringify(secondResult) }}</p>
        </div>
        <pre data-test="form-isolation-values" class="mt-3 max-h-48 overflow-auto rounded-lg bg-muted/60 p-3 text-[11px] leading-5">{{ draftJson }}</pre>

        <FirstModal>
            <FirstForm />
            <Button class="mt-4" size="sm" variant="outline" data-test="open-second-form" @click="openSecond">
                打开第二表单
            </Button>
            <SecondModal>
                <SecondForm />
            </SecondModal>
        </FirstModal>
    </div>
</template>
