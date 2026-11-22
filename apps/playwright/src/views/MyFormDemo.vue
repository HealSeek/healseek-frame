<script setup lang="ts">
/**
 * MyFormDemo — framework form integration playground.
 *
 * This page intentionally exercises the controller boundary instead of
 * hard-coding a second business form implementation:
 * - the main AForm owns the submitted values;
 * - a custom schema field opens a framework ModalApi;
 * - the modal renders another AForm for dense/optional settings;
 * - confirm patches the parent field, while cancel/close leaves it untouched;
 * - dependencies demonstrate fields that appear only when a switch is enabled.
 */
import { computed, defineComponent, h, markRaw, ref, type PropType } from 'vue'
import { z } from 'zod'
import { useForm, type FormFieldSchema } from '@healseek/forms'
import { CodeEditor, DatePickerField, JsonCodeEditor, JsonField } from '@healseek/components'
import { SectionPage } from '@healseek/components'
import { useModal } from '@healseek/composables'
import {
    Badge,
    Button,
} from '@healseek/uikit-shadcnui'
import { Icon } from '@healseek/shared/icons'
import FormIsolationExample from './_examples/FormIsolationExample.vue'

defineOptions({ name: 'MyFormDemo' })

type AdvancedConfig = {
    model: string
    temperature: string
    timeout: string
    fallback: string
    fallbackModel?: string
}

type ActionState = 'idle' | 'confirmed' | 'cancelled' | 'dismissed' | 'invalid' | 'submitted'

function getRowValue(value: unknown): unknown {
    if (Array.isArray(value)) return (value[0] as Record<string, unknown> | undefined)?.value
    return value
}

function getPathValue(values: Record<string, unknown>, path: string): unknown {
    const value = path
        .replace(/\[(\d+)\]/g, '.$1')
        .split('.')
        .filter(Boolean)
        .reduce<unknown>((current, segment) => (
            current && typeof current === 'object'
                ? (current as Record<string, unknown>)[segment]
                : undefined
        ), values)
    return getRowValue(value)
}

function getConfigFromParent(values: Record<string, unknown>): AdvancedConfig {
    const value = getRowValue(values.advancedConfig)
    return {
        model: typeof (value as AdvancedConfig | undefined)?.model === 'string'
            ? (value as AdvancedConfig).model
            : 'gpt-4o-mini',
        temperature: String((value as AdvancedConfig | undefined)?.temperature ?? '0.2'),
        timeout: String((value as AdvancedConfig | undefined)?.timeout ?? '30'),
        fallback: typeof (value as AdvancedConfig | undefined)?.fallback === 'string'
            ? (value as AdvancedConfig).fallback
            : 'disabled',
        fallbackModel: typeof (value as AdvancedConfig | undefined)?.fallbackModel === 'string'
            ? (value as AdvancedConfig).fallbackModel
            : 'claude-3-5-sonnet',
    }
}

function normalizeConfig(values: Record<string, unknown>): AdvancedConfig {
    const read = (name: keyof AdvancedConfig): unknown => getRowValue(values[name])
    return {
        model: String(read('model') ?? ''),
        temperature: String(read('temperature') ?? '0.2'),
        timeout: String(read('timeout') ?? '30'),
        fallback: String(read('fallback') ?? 'disabled'),
        fallbackModel: String(read('fallbackModel') ?? ''),
    }
}

const dependencyStatus = ref('等待修改“通知模式”')
const actionLog = ref('尚未执行 FormApi 操作')
const dynamicFieldPresent = ref(false)
const bioUpdated = ref(false)
const controllerDisabled = ref(false)
const controllerLoading = ref(false)
const snapshotJson = ref('点击“读取快照”查看 getValueSnapshot() 返回值')
const jsonFieldValue = ref('{\n  "endpoint": "/v1/chat/completions",\n  "timeout": 30,\n  "headers": { "x-request-id": "demo" }\n}')
const jsonCodeEditorValue = ref('{\n  "model": "gpt-4o-mini",\n  "stream": true\n}')
const selectedDialogResult = ref('尚未保存 Dialog 子表单')

/**
 * A schema component can expose actions in addition to modelValue.  This is
 * the app-side composition point for a dense field; it does not modify the
 * framework form renderer or the shadcn primitives.
 */
const AdvancedConfigTrigger = defineComponent({
    name: 'AdvancedConfigTrigger',
    props: {
        modelValue: {
            type: Object as PropType<Partial<AdvancedConfig>>,
            default: () => ({}),
        },
        onOpen: Function as PropType<() => void>,
    },
    setup(props) {
        const summary = computed(() => {
            const model = props.modelValue?.model || '未配置'
            const temperature = props.modelValue?.temperature ?? '—'
            return `${model} · 温度 ${temperature}`
        })
        return () => h('div', { class: 'flex min-w-0 flex-wrap items-center gap-2' }, [
            h(Button, {
                type: 'button',
                variant: 'outline',
                size: 'sm',
                class: 'shrink-0',
                onClick: () => props.onOpen?.(),
            }, {
                default: () => [
                    h(Icon, { icon: 'lucide:sliders-horizontal', class: 'size-4' }),
                    '配置高级参数',
                ],
            }),
            h('span', { class: 'truncate text-xs text-muted-foreground' }, summary.value),
        ])
    },
})

const schema: FormFieldSchema[] = [
    {
        component: markRaw(CodeEditor),
        label: 'JavaScript 源码',
        fieldName: 'sourceCode',
        defaultValue: 'export function greet(name) {\n  return `Hello, ${name}!`;\n}\n',
        componentProps: { language: 'javascript', height: 220 },
        rules: 'required',
        description: '支持语法高亮、行号、Tab 缩进、撤销重做、折叠和 Ctrl/⌘+F 搜索。源码只编辑，不执行。',
    },
    {
        component: 'Input',
        label: '用户名称',
        fieldName: 'username',
        rules: 'required,min:3',
        description: '规则 DSL：required、min:3；提交或失焦时显示字段级错误。',
    },
    {
        component: 'Password',
        label: '用户密码',
        fieldName: 'password',
        rules: 'required,min:6',
    },
    {
        component: 'Select',
        label: '用户角色',
        fieldName: 'role',
        defaultValue: 'operator',
        componentProps: {
            options: [
                { label: '管理员', value: 'admin' },
                { label: '运营人员', value: 'operator' },
                { label: '只读访客', value: 'viewer' },
            ],
            allowClear: true,
        },
        rules: 'required',
    },
    {
        component: DatePickerField,
        label: '生效日期时间',
        fieldName: 'effectiveAt',
        defaultValue: () => new Date(2025, 0, 2, 9, 30),
        componentProps: { type: 'datetime', locale: 'zh-CN' },
    },
    {
        component: 'Select',
            label: '通知模式',
        fieldName: 'notify',
        defaultValue: 'disabled',
        componentProps: {
            options: [
                { label: '关闭通知', value: 'disabled' },
                    { label: '邮件通知', value: 'email' },
                    { label: '摘要通知（锁定地址）', value: 'digest' },
            ],
        },
        dependencies: {
                triggerFields: [],
            onChange: (value) => {
                    dependencyStatus.value = value === 'email'
                        ? '邮件通知：邮箱已显示并动态变为必填'
                        : value === 'digest'
                            ? '摘要通知：邮箱保留但被禁用，不参与必填校验'
                            : '关闭通知：邮箱字段从渲染树移除，不参与校验'
            },
        },
    },
    {
        component: 'Email',
        label: '通知邮箱',
        fieldName: 'notificationEmail',
        dependencies: {
            triggerFields: ['notify'],
            show: ({ values }) => getRowValue(values.notify) !== 'disabled',
            if: ({ values }) => getRowValue(values.notify) !== 'disabled',
            disabled: ({ values }) => getRowValue(values.notify) === 'digest',
            required: ({ values }) => getRowValue(values.notify) === 'email',
            rules: ({ values }) => getRowValue(values.notify) === 'email' ? 'required,email' : undefined,
            componentProps: ({ values }) => ({
                placeholder: getRowValue(values.notify) === 'digest'
                    ? '摘要通知不会修改此地址'
                    : '请输入接收通知的邮箱',
            }),
        },
    },
    {
        component: AdvancedConfigTrigger,
        label: '高级参数',
        fieldName: 'advancedConfig',
        rules: z.object({
            model: z.string().min(1, '请选择默认模型'),
            temperature: z.string(),
            timeout: z.string(),
            fallback: z.string(),
            fallbackModel: z.string().optional(),
        }).optional(),
        defaultValue: {
            model: 'gpt-4o-mini',
            temperature: '0.2',
            timeout: '30',
            fallback: 'disabled',
            fallbackModel: 'claude-3-5-sonnet',
        } satisfies AdvancedConfig,
        description: '将复杂配置收进独立 Modal，确认后才会写回主表单。',
        componentProps: () => ({ onOpen: openAdvancedConfig }),
    },
    {
        component: 'Select',
        label: '安全模式',
        fieldName: 'securityMode',
        defaultValue: 'basic',
        componentProps: {
            options: [
                { label: '基础', value: 'basic' },
                { label: '严格（要求访问密钥）', value: 'strict' },
                { label: '只读（锁定访问密钥）', value: 'readonly' },
            ],
        },
    },
    {
        component: 'Input',
        label: '访问密钥',
        fieldName: 'accessKey',
        dependencies: {
            triggerFields: ['securityMode'],
            required: ({ values }) => getRowValue(values.securityMode) === 'strict',
            rules: ({ values }) => getRowValue(values.securityMode) === 'strict' ? 'required,min:8' : undefined,
            disabled: ({ values }) => getRowValue(values.securityMode) === 'readonly',
            componentProps: ({ values }) => ({
                placeholder: getRowValue(values.securityMode) === 'strict' ? '严格模式至少 8 位' : '可选访问密钥',
            }),
        },
    },
    {
        array: true,
        children: [
            { fieldName: 'name', label: '联系人姓名', component: 'Input', rules: 'required' },
            { fieldName: 'phone', label: '手机号', component: 'Input', rules: 'required,phone' },
            {
                fieldName: 'address',
                label: '地址',
                component: 'Input',
                children: [
                    { fieldName: 'city', label: '城市', component: 'Input', rules: 'required' },
                    { fieldName: 'country', label: '国家/地区', component: 'Input', defaultValue: 'CN' },
                ],
            },
        ],
        component: 'Input',
        label: '联系人（嵌套数组）',
        fieldName: 'contacts',
        maxItems: 3,
        addButtonText: '+ 添加联系人',
        removeButtonText: '移除联系人',
        description: 'children 会生成嵌套对象；数组行支持添加、删除和独立校验。',
    },
    {
        component: 'Textarea',
        label: '个人简介',
        fieldName: 'bio',
        description: '这是一个可选字段，留空时不会显示必填标记。',
        componentProps: {
            rows: 4,
        },
    },
    {
        component: JsonField,
        label: '请求 JSON 配置',
        fieldName: 'requestConfig',
        defaultValue: JSON.stringify({ endpoint: '/v1/chat/completions', timeout: 30 }),
        componentProps: {
            valueType: 'any',
            template: { endpoint: '/v1/chat/completions', timeout: 30, headers: { 'x-request-id': 'form-demo' } },
        },
        description: 'JsonField 直接作为 FormFieldSchema 自定义组件，提交、重置和错误状态由表单接管。',
    },
]

const advancedSchema: FormFieldSchema[] = [
    {
        component: 'Select',
        label: '默认模型',
        fieldName: 'model',
        rules: 'required',
        componentProps: {
            options: [
                { label: 'GPT-4o Mini', value: 'gpt-4o-mini' },
                { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
                { label: 'Qwen 2.5 72B', value: 'qwen2.5-72b' },
            ],
        },
    },
    {
        component: 'Number',
        label: '温度',
        fieldName: 'temperature',
        rules: 'required',
        componentProps: { min: 0, max: 2, step: 0.1 },
    },
    {
        component: 'Number',
        label: '超时时间（秒）',
        fieldName: 'timeout',
        rules: 'required',
        componentProps: { min: 1, max: 120 },
    },
    {
        component: 'Select',
        label: '失败回退',
        fieldName: 'fallback',
        defaultValue: 'disabled',
        componentProps: {
            options: [
                { label: '不启用回退', value: 'disabled' },
                { label: '启用备用模型', value: 'enabled' },
            ],
        },
    },
    {
        component: 'Select',
        label: '备用模型',
        fieldName: 'fallbackModel',
        dependencies: {
            triggerFields: ['fallback'],
            show: ({ values }) => getRowValue(values.fallback) === 'enabled',
            if: ({ values }) => getRowValue(values.fallback) === 'enabled',
            required: ({ values }) => getRowValue(values.fallback) === 'enabled',
            rules: ({ values }) => getRowValue(values.fallback) === 'enabled' ? 'required' : undefined,
        },
        componentProps: {
            options: [
                { label: 'Claude 3.5 Sonnet', value: 'claude-3-5-sonnet' },
                { label: 'Qwen 2.5 72B', value: 'qwen2.5-72b' },
            ],
        },
    },
]

const toastlessStatus: Record<ActionState, { label: string; tone: 'secondary' | 'default' | 'destructive' }> = {
    idle: { label: '等待配置', tone: 'secondary' },
    confirmed: { label: '已确认回填', tone: 'default' },
    cancelled: { label: '已取消，主表单未改变', tone: 'secondary' },
    dismissed: { label: '已关闭，主表单未改变', tone: 'secondary' },
    invalid: { label: '请先修正弹窗表单', tone: 'destructive' },
    submitted: { label: '主表单已提交', tone: 'default' },
}

const actionState = ref<ActionState>('idle')
const lastSubmission = ref<Record<string, unknown> | null>(null)
const [AForm, formApi] = useForm({
    schema,
    layout: 'horizontal',
    initialValues: {
        contacts: [{
            name: 'Ada Lovelace',
            phone: '13800138000',
            address: { city: '伦敦', country: 'UK' },
        }],
    },
})
const [AdvancedForm, advancedFormApi] = useForm({
    schema: advancedSchema,
    layout: 'vertical',
    showDefaultActions: false,
})
const [DialogForm, dialogFormApi] = useForm({
    schema: [
        { component: 'Input', label: '标签名称', fieldName: 'label', rules: 'required,min:2' },
        {
            component: 'Select',
            label: '标签颜色',
            fieldName: 'color',
            defaultValue: 'blue',
            componentProps: {
                options: [
                    { label: '蓝色', value: 'blue' },
                    { label: '绿色', value: 'green' },
                    { label: '橙色', value: 'orange' },
                ],
            },
        },
    ],
    layout: 'vertical',
    showDefaultActions: false,
    initialValues: {
        label: [{ value: '重点渠道' }],
        color: [{ value: 'blue' }],
    },
})

const [AdvancedModal, advancedModalApi] = useModal({
    title: '配置高级参数',
    description: '只在点击“确认”后回填主表单，关闭或取消不会污染当前输入。',
    confirmText: '确认并回填',
    onConfirm: async () => {
        const values = await advancedFormApi.validateAndSubmit()
        if (!values) {
            actionState.value = 'invalid'
            return false
        }
        return normalizeConfig(values)
    },
    onCancel: () => {
        actionState.value = 'cancelled'
    },
    onBeforeClose: (reason) => {
        if (reason === 'escape' || reason === 'outside' || reason === 'close-button') {
            actionState.value = 'dismissed'
        }
    },
})

const [TagDialog, tagDialogApi] = useModal<undefined, { label: string; color: string }>({
    title: 'Dialog 子表单',
    description: '独立的 useForm 实例，只有确认成功才会把结果回传到页面状态。',
    confirmText: '确认并回传',
    onConfirm: async () => {
        const values = await dialogFormApi.validateAndSubmit()
        if (!values) return false
        return {
            label: String(getRowValue(values.label) ?? ''),
            color: String(getRowValue(values.color) ?? ''),
        }
    },
})

const errorCount = computed(() => Object.keys(formApi.errors.value).length)
const schemaCount = computed(() => formApi.schema.length)
const currentMode = computed(() => String(getPathValue(formApi.values.value, 'notify') ?? 'disabled'))
const currentState = computed(() => {
    void formApi.values.value
    void formApi.errors.value
    return formApi.getState()
})
const inspectorJson = computed(() => JSON.stringify({
    values: formApi.values.value,
    errors: formApi.errors.value,
    state: currentState.value,
    schema: formApi.schema.map((field) => field.fieldName),
}, null, 2))

function openAdvancedConfig() {
    const config = getConfigFromParent(formApi.values.value)
    void advancedFormApi.setValues({
        model: [{ value: config.model }],
        temperature: [{ value: config.temperature }],
        timeout: [{ value: config.timeout }],
        fallback: [{ value: config.fallback }],
        fallbackModel: [{ value: config.fallbackModel }],
    })
    advancedFormApi.clearValid()
    actionState.value = 'idle'
    advancedModalApi.open(config)
    void advancedModalApi.waitForResult().then((outcome) => {
        if (!outcome.accepted || !outcome.result) return
        formApi.setFieldValue('advancedConfig[0].value', outcome.result)
        actionState.value = 'confirmed'
        setAction('Modal 子表单：确认后通过 typed result 回填主表单')
    })
}

function setAction(message: string): void {
    actionLog.value = message
}

async function validateMain(): Promise<void> {
    const result = await formApi.validate()
    setAction(result.valid ? 'validate()：通过' : 'validate()：失败，' + Object.keys(result.errors).length + ' 个字段需要修正')
}

async function validateEmail(): Promise<void> {
    const result = await formApi.validateField('notificationEmail')
    setAction(result.valid ? 'validateField(notificationEmail)：通过' : 'validateField(notificationEmail)：失败，错误已显示在字段下方')
}

function resetSelectedFields(): void {
    formApi.resetFields(['username', 'notificationEmail', 'accessKey'])
    setAction('resetFields()：已重置用户名、通知邮箱和访问密钥')
}

function clearValidation(): void {
    formApi.clearValid()
    setAction('clearValid()：已清空字段错误')
}

function focusFirstField(): void {
    formApi.scrollToField('username')
    setAction('scrollToField(username)：已聚焦第一个字段')
}

function toggleDisabled(): void {
    controllerDisabled.value = !controllerDisabled.value
    formApi.setProps({ disabled: controllerDisabled.value })
    setAction('setProps({ disabled: ' + controllerDisabled.value + ' })')
}

async function simulateLoading(): Promise<void> {
    if (controllerLoading.value) return
    controllerLoading.value = true
    formApi.setProps({ loading: true })
    setAction('setProps({ loading: true })：模拟异步保存中…')
    await new Promise((resolve) => setTimeout(resolve, 900))
    controllerLoading.value = false
    formApi.setProps({ loading: false })
    setAction('setProps({ loading: false })：异步状态已结束')
}

async function readSnapshot(): Promise<void> {
    const snapshot = await formApi.getValueSnapshot()
    snapshotJson.value = JSON.stringify({
        getValues: snapshot.values,
        getRawValues: snapshot.rawValues,
        selected: await formApi.getValues(['username', 'role']),
    }, null, 2)
    setAction('getValueSnapshot()：已读取当前值和原始值')
}

async function readValidatedValues(): Promise<void> {
    const values = await formApi.getValues(['username', 'role'], true)
    snapshotJson.value = JSON.stringify({ selected: values }, null, 2)
    setAction('getValues(fields, true)：读取并触发校验')
}

function addDynamicField(): void {
    if (dynamicFieldPresent.value) return
    formApi.appendSchemaByField({
        component: 'Select',
        label: '团队（动态追加）',
        fieldName: 'team',
        defaultValue: 'platform',
        rules: 'required',
        componentProps: {
            options: [
                { label: '平台工程', value: 'platform' },
                { label: '业务应用', value: 'application' },
                { label: '数据分析', value: 'analytics' },
            ],
        },
    }, 'role')
    dynamicFieldPresent.value = true
    setAction('appendSchemaByField()：已在用户角色后追加团队字段')
}

function removeDynamicField(): void {
    if (!dynamicFieldPresent.value) return
    formApi.removeSchemaByField('team')
    dynamicFieldPresent.value = false
    setAction('removeSchemaByField(team)：已移除动态字段')
}

function updateBioDescription(): void {
    bioUpdated.value = !bioUpdated.value
    formApi.updateSchema([{
        fieldName: 'bio',
        description: bioUpdated.value
            ? '该说明由 updateSchema() 动态更新。'
            : '可选字段，不设置 required 时不会出现必填标记。',
    }])
    setAction('updateSchema()：已更新个人简介字段说明')
}

function resetDynamicSchema(): void {
    formApi.resetSchema(schema)
    dynamicFieldPresent.value = false
    bioUpdated.value = false
    setAction('resetSchema()：已恢复演示表单的初始 schema')
}

async function onSubmit(values: Record<string, unknown>) {
    lastSubmission.value = values
    actionState.value = 'submitted'
    setAction('AForm submit：提交成功，结果已写入最近一次提交')
    // eslint-disable-next-line no-console
    console.log('Submitted values:', values)
}

async function openTagDialog(): Promise<void> {
    dialogFormApi.clearValid()
    await dialogFormApi.setValues({
        label: [{ value: '重点渠道' }],
        color: [{ value: 'blue' }],
    })
    tagDialogApi.open()
    void tagDialogApi.waitForResult().then((outcome) => {
        if (!outcome.accepted || !outcome.result) return
        selectedDialogResult.value = JSON.stringify(outcome.result)
        setAction('Dialog 子表单：确认后通过 typed result 回传到页面状态')
    })
}
</script>

<template>
    <SectionPage class="min-h-full">
        <template #breadcrumb>
            <span class="text-xs text-muted-foreground">开发者工具 / 表单</span>
        </template>
        <template #title>表单系统演示</template>
        <template #description>
            用一个可操作的实验台展示 Schema、字段依赖、动态校验、嵌套数组、FormApi 控制器和弹窗子表单联动。
        </template>

        <div class="space-y-6">
            <section class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div class="rounded-xl border bg-card p-4">
                    <p class="text-xs text-muted-foreground">当前 schema 字段</p>
                    <p class="mt-2 text-2xl font-semibold">{{ schemaCount }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">可通过 append / remove / reset 动态修改</p>
                </div>
                <div class="rounded-xl border bg-card p-4">
                    <p class="text-xs text-muted-foreground">当前错误数</p>
                    <p class="mt-2 text-2xl font-semibold" :class="errorCount ? 'text-destructive' : 'text-foreground'">{{ errorCount }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">错误只显示在对应表单项下方</p>
                </div>
                <div class="rounded-xl border bg-card p-4">
                    <p class="text-xs text-muted-foreground">通知模式</p>
                    <p class="mt-2 text-2xl font-semibold">{{ currentMode }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">show / if / required / disabled</p>
                </div>
                <div class="rounded-xl border bg-card p-4">
                    <p class="text-xs text-muted-foreground">控制器状态</p>
                    <p class="mt-2 text-2xl font-semibold">{{ currentState.loading ? 'loading' : currentState.disabled ? 'disabled' : 'ready' }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">由 FormApi.setProps 实时控制</p>
                </div>
            </section>

            <section class="rounded-xl border bg-card p-4 sm:p-5">
                <h2 class="text-lg font-semibold">JsonField 回填与可视化编辑</h2>
                <p class="mt-1 text-sm text-muted-foreground">表单只绑定 JSON 字符串，可用键值行或 JSON 模式编辑。选择模板后点击“加载模板”才会替换当前内容，模板还会作为编辑器占位提示。</p>
                <JsonField v-model="jsonFieldValue" class="mt-4" :templates="[
                  { label: '标准请求', description: '30 秒超时，带请求标识。', value: { endpoint: '/v1/chat/completions', timeout: 30, headers: { 'x-request-id': 'demo' } } },
                  { label: '长任务请求', description: '120 秒超时，适合等待时间较长的请求。', value: { endpoint: '/v1/jobs', timeout: 120, retry: true } },
                ]" value-type="any" nested />
                <pre class="mt-3 max-h-40 overflow-auto rounded-lg bg-muted/60 p-3 text-xs">{{ jsonFieldValue }}</pre>
                <div class="mt-6 border-t border-border/70 pt-5">
                    <h3 class="text-base font-medium">JsonCodeEditor 原始 JSON</h3>
                    <p class="mt-1 text-sm text-muted-foreground">工具栏间距、格式化和复制反馈与 new-api 对齐；复制失败时编辑草稿保持不变。</p>
                    <JsonCodeEditor v-model="jsonCodeEditorValue" class="mt-3" />
                </div>
            </section>

            <section data-test="json-form-section" class="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(22rem,0.65fr)]">
                <div class="min-w-0 rounded-xl border bg-card p-4 sm:p-6">
                    <div class="mb-5 flex flex-wrap items-start justify-between gap-3">
                        <div>
                            <h2 class="text-base font-semibold">Schema 表单与依赖字段</h2>
                            <p class="mt-1 text-sm text-muted-foreground">必填标记、字段级错误、动态规则、嵌套数组和自定义字段都在这里。</p>
                        </div>
                        <div class="flex flex-wrap gap-1.5">
                            <Badge variant="outline">required</Badge>
                            <Badge variant="outline">dependencies</Badge>
                            <Badge variant="outline">children</Badge>
                        </div>
                    </div>
                    <AForm data-test="json-form" @submit="onSubmit">
                        <template #actions="{ submitting, reset }">
                            <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 pt-4">
                                <div class="flex flex-wrap gap-2">
                                    <Button data-test="json-form-reset" type="button" variant="ghost" size="sm" @click="reset">重置全部</Button>
                                    <Button type="button" variant="outline" size="sm" @click="clearValidation">清空错误</Button>
                                </div>
                                <div class="flex flex-wrap gap-2">
                                    <Button data-test="json-form-validate" type="button" variant="outline" size="sm" @click="validateMain">校验</Button>
                                    <Button type="submit" size="sm" :disabled="submitting || controllerLoading">
                                        {{ submitting ? '提交中…' : '提交演示表单' }}
                                    </Button>
                                </div>
                            </div>
                        </template>
                    </AForm>
                    <div class="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        依赖状态：{{ dependencyStatus }}
                    </div>
                </div>

                <aside class="min-w-0 rounded-xl border bg-card p-4 sm:p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h2 class="text-base font-semibold">FormApi 控制台</h2>
                            <p class="mt-1 text-sm text-muted-foreground">每个按钮都对应一个公开的控制器方法。</p>
                        </div>
                        <Badge :variant="errorCount ? 'destructive' : 'secondary'">{{ errorCount ? errorCount + ' errors' : 'valid' }}</Badge>
                    </div>
                    <div class="mt-4 grid grid-cols-2 gap-2">
                        <Button variant="outline" size="sm" @click="validateEmail">validateField</Button>
                        <Button variant="outline" size="sm" @click="resetSelectedFields">resetFields</Button>
                        <Button variant="outline" size="sm" @click="focusFirstField">scrollToField</Button>
                        <Button variant="outline" size="sm" @click="readSnapshot">读取快照</Button>
                        <Button variant="outline" size="sm" @click="readValidatedValues">读取并校验</Button>
                        <Button variant="outline" size="sm" @click="toggleDisabled">{{ controllerDisabled ? '解除禁用' : 'setProps 禁用' }}</Button>
                        <Button variant="outline" size="sm" :disabled="controllerLoading" @click="simulateLoading">模拟 loading</Button>
                        <Button variant="outline" size="sm" @click="clearValidation">clearValid</Button>
                    </div>
                    <p class="mt-4 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">{{ actionLog }}</p>
                    <pre class="mt-3 max-h-80 overflow-auto rounded-lg bg-muted/60 p-3 text-[11px] leading-5">{{ inspectorJson }}</pre>
                    <pre class="mt-3 max-h-48 overflow-auto rounded-lg bg-muted/60 p-3 text-[11px] leading-5">{{ snapshotJson }}</pre>
                </aside>
            </section>

            <section class="grid gap-6 lg:grid-cols-2">
                <div class="rounded-xl border bg-card p-4 sm:p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h2 class="text-base font-semibold">运行时 Schema 操作</h2>
                            <p class="mt-1 text-sm text-muted-foreground">不改页面组件，直接通过 FormApi 增删改字段定义。</p>
                        </div>
                        <Badge variant="outline">schema API</Badge>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" :disabled="dynamicFieldPresent" @click="addDynamicField">appendSchemaByField</Button>
                        <Button size="sm" variant="outline" :disabled="!dynamicFieldPresent" @click="removeDynamicField">removeSchemaByField</Button>
                        <Button size="sm" variant="outline" @click="updateBioDescription">updateSchema</Button>
                        <Button size="sm" variant="ghost" @click="resetDynamicSchema">resetSchema</Button>
                    </div>
                    <div class="mt-4 space-y-2 text-xs text-muted-foreground">
                        <p>• 动态追加团队字段会自动接入必填校验和默认值。</p>
                        <p>• updateSchema 会即时更新个人简介字段说明。</p>
                        <p>• resetSchema 会清理被删除字段的值和错误。</p>
                    </div>
                </div>
                <div class="rounded-xl border bg-card p-4 sm:p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h2 class="text-base font-semibold">提交结果</h2>
                            <p class="mt-1 text-sm text-muted-foreground">getValues、getRawValues 和最近一次提交值可以分别读取。</p>
                        </div>
                        <Badge :variant="lastSubmission ? 'default' : 'secondary'">{{ lastSubmission ? '已提交' : '等待提交' }}</Badge>
                    </div>
                    <pre class="mt-4 max-h-64 overflow-auto rounded-lg bg-muted/60 p-3 text-xs leading-5">{{ lastSubmission ? JSON.stringify(lastSubmission, null, 2) : '提交通过后，结果会显示在这里。' }}</pre>
                </div>
            </section>

            <section class="grid gap-6 lg:grid-cols-2">
                <div class="rounded-xl border bg-card p-4 sm:p-5">
                    <div class="flex items-start justify-between gap-3">
                        <div>
                            <h2 class="text-base font-semibold">Modal 子表单回填</h2>
                            <p class="mt-1 text-sm text-muted-foreground">确认、取消、关闭按钮、遮罩和 Esc 都会产生不同的父表单状态。</p>
                        </div>
                        <Badge :variant="actionState === 'invalid' ? 'destructive' : actionState === 'confirmed' ? 'default' : 'secondary'">
                            {{ toastlessStatus[actionState].label }}
                        </Badge>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                        <Button size="sm" @click="openAdvancedConfig">打开高级参数 Modal</Button>
                        <Button size="sm" variant="outline" @click="openTagDialog">打开 Dialog 子表单</Button>
                    </div>
                    <p class="mt-4 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">{{ selectedDialogResult }}</p>
                    <AdvancedModal>
                        <template #default>
                            <AdvancedForm />
                            <p class="mt-3 text-xs text-muted-foreground">弹窗表单校验失败时 Modal 保持打开；只有确认成功才会写回 advancedConfig。</p>
                        </template>
                    </AdvancedModal>
                </div>

                <div class="rounded-xl border bg-card p-4 sm:p-5">
                    <h2 class="text-base font-semibold">AForm actions 插槽</h2>
                    <p class="mt-1 text-sm text-muted-foreground">主表单底部按钮由页面通过 actions 插槽提供，框架只负责传递 submitting、errors 和 reset。</p>
                    <div class="mt-4 grid gap-3 sm:grid-cols-3">
                        <div class="rounded-lg bg-muted/50 p-3">
                            <p class="text-xs text-muted-foreground">字段级错误</p>
                            <p class="mt-1 text-sm font-medium">{{ errorCount ? '自动聚焦首错' : '暂无错误' }}</p>
                        </div>
                        <div class="rounded-lg bg-muted/50 p-3">
                            <p class="text-xs text-muted-foreground">动态必填</p>
                            <p class="mt-1 text-sm font-medium">{{ currentMode === 'email' ? '邮箱必填' : '邮箱可选/隐藏' }}</p>
                        </div>
                        <div class="rounded-lg bg-muted/50 p-3">
                            <p class="text-xs text-muted-foreground">嵌套数组</p>
                            <p class="mt-1 text-sm font-medium">contacts[] / address.city</p>
                        </div>
                    </div>
                </div>
            </section>
            <FormIsolationExample />
        </div>

        <TagDialog>
            <DialogForm />
        </TagDialog>
    </SectionPage>
</template>
