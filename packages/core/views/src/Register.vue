<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useForm, type FormFieldSchema } from '@healseek/forms'
import { Button } from '@healseek/uikit-shadcnui'
import { z } from 'zod'
import type { RegisterValues } from './auth-types'

defineOptions({ name: 'FrameworkRegister' })

interface RegisterText {
    brand: string
    brandDescription: string
    title: string
    description: string
    username: string
    usernamePlaceholder: string
    email: string
    emailPlaceholder: string
    password: string
    passwordPlaceholder: string
    passwordDescription: string
    confirmPassword: string
    confirmPasswordPlaceholder: string
    confirmPasswordDescription: string
    securityQuestion: string
    securityQuestionPlaceholder: string
    securityAnswer: string
    securityAnswerPlaceholder: string
    verificationToken: string
    verificationTokenPlaceholder: string
    verificationHint: string
    submitting: string
    submit: string
    loginPrompt: string
    login: string
}

interface RegisterDisplay {
    showBrandPanel: boolean
    showLoginLink: boolean
    showSecurityFields: boolean
    showVerificationToken: boolean
}

const props = withDefaults(defineProps<{
    loading?: boolean
    /** Application-owned minimum; defaults to the framework's six-character baseline. */
    passwordMinLength?: number
    text?: Partial<RegisterText>
    display?: Partial<RegisterDisplay>
}>(), { loading: false, passwordMinLength: 6 })

const emit = defineEmits<{
    submit: [values: RegisterValues]
    login: []
}>()

const { t } = useI18n()
// Field structure and validation are initialized together. Remount the view to
// change these options after setup, just as for the underlying form schema.
const showSecurityFields = props.display?.showSecurityFields === true
const showVerificationToken = props.display?.showVerificationToken === true
const passwordMinLength = Number.isInteger(props.passwordMinLength) && props.passwordMinLength > 0
    ? props.passwordMinLength : 6
const passwordMinimum = () => t('auth.register.passwordMinimum', { min: passwordMinLength }, `密码至少需要 ${passwordMinLength} 位字符`)
const passwordLengthMessage = () => passwordMinLength === 6
    ? t('auth.register.passwordLength', '密码至少 6 位') : passwordMinimum()
const copy = computed<RegisterText>(() => ({
    brand: props.text?.brand ?? 'Framework',
    brandDescription: props.text?.brandDescription ?? '',
    title: props.text?.title ?? t('auth.register.title', '注册'),
    description: props.text?.description ?? t('auth.register.description', '填写以下信息创建账号'),
    username: props.text?.username ?? t('auth.register.username', '用户名'),
    usernamePlaceholder: props.text?.usernamePlaceholder ?? t('auth.register.usernamePlaceholder', '请输入用户名'),
    email: props.text?.email ?? t('auth.register.email', '邮箱'),
    emailPlaceholder: props.text?.emailPlaceholder ?? t('auth.register.emailPlaceholder', '请输入邮箱'),
    password: props.text?.password ?? t('auth.register.password', '密码'),
    passwordPlaceholder: props.text?.passwordPlaceholder ?? (passwordMinLength === 6
        ? t('auth.register.passwordPlaceholder', '请输入密码')
        : t('auth.register.passwordMinimumPlaceholder', { min: passwordMinLength }, `至少 ${passwordMinLength} 位字符`)),
    passwordDescription: props.text?.passwordDescription ?? (passwordMinLength === 6
        ? t('auth.register.passwordDescription', '密码至少需要 6 位字符') : passwordMinimum()),
    confirmPassword: props.text?.confirmPassword ?? t('auth.register.confirmPassword', '确认密码'),
    confirmPasswordPlaceholder: props.text?.confirmPasswordPlaceholder ?? t('auth.register.confirmPasswordPlaceholder', '请再次输入密码'),
    confirmPasswordDescription: props.text?.confirmPasswordDescription ?? t('auth.register.confirmPasswordDescription', '两次密码必须一致'),
    securityQuestion: props.text?.securityQuestion ?? t('auth.register.securityQuestion', '密保问题'),
    securityQuestionPlaceholder: props.text?.securityQuestionPlaceholder ?? t('auth.register.securityQuestionPlaceholder', '例如：我的第一所学校？'),
    securityAnswer: props.text?.securityAnswer ?? t('auth.register.securityAnswer', '密保答案'),
    securityAnswerPlaceholder: props.text?.securityAnswerPlaceholder ?? t('auth.register.securityAnswerPlaceholder', '请输入答案，今后可用于找回密码'),
    verificationToken: props.text?.verificationToken ?? t('auth.register.verificationToken', '邮箱验证令牌'),
    verificationTokenPlaceholder: props.text?.verificationTokenPlaceholder ?? t('auth.register.verificationTokenPlaceholder', '请粘贴邮箱中的验证令牌（如有）'),
    verificationHint: props.text?.verificationHint ?? t('auth.register.verificationHint', '请使用应用发送的验证邮件中提供的令牌或链接。'),
    submitting: props.text?.submitting ?? t('auth.register.submitting', '注册中…'),
    submit: props.text?.submit ?? t('auth.register.submit', '注册'),
    loginPrompt: props.text?.loginPrompt ?? t('auth.register.loginPrompt', '已有账号？'),
    login: props.text?.login ?? t('auth.register.login', '立即登录'),
}))

const schema: FormFieldSchema[] = [
    {
        fieldName: 'username',
        label: copy.value.username,
        component: 'Input',
        rules: z.string().min(1, t('auth.register.requiredUsername', '请输入用户名')),
        componentProps: { autocomplete: 'username', placeholder: copy.value.usernamePlaceholder },
    },
    {
        fieldName: 'email',
        label: copy.value.email,
        component: 'Email',
        rules: z.string()
            .min(1, t('auth.register.requiredEmail', '请输入邮箱'))
            .email(t('auth.register.invalidEmail', '请输入有效的邮箱地址')),
        componentProps: { autocomplete: 'email', placeholder: copy.value.emailPlaceholder },
    },
    {
        fieldName: 'password',
        label: copy.value.password,
        component: 'Password',
        rules: z.string().min(passwordMinLength, passwordLengthMessage()),
        description: copy.value.passwordDescription,
        componentProps: { autocomplete: 'new-password', placeholder: copy.value.passwordPlaceholder },
    },
    {
        fieldName: 'confirmPassword',
        label: copy.value.confirmPassword,
        component: 'Password',
        rules: z.string().min(1, t('auth.register.requiredConfirmPassword', '请再次输入密码')),
        description: copy.value.confirmPasswordDescription,
        componentProps: { autocomplete: 'new-password', placeholder: copy.value.confirmPasswordPlaceholder },
    },
    ...(showSecurityFields ? [
        {
            fieldName: 'securityQuestion',
            label: copy.value.securityQuestion,
            component: 'Input' as const,
            rules: z.string().min(1, t('auth.register.requiredSecurityQuestion', '请输入密保问题')),
            componentProps: { autocomplete: 'off', placeholder: copy.value.securityQuestionPlaceholder },
            description: t('auth.register.securityQuestionDescription', '请设置一个只有你知道的问题。'),
        },
        {
            fieldName: 'securityAnswer',
            label: copy.value.securityAnswer,
            component: 'Password' as const,
            rules: z.string().min(1, t('auth.register.requiredSecurityAnswer', '请输入密保答案')),
            componentProps: { autocomplete: 'off', placeholder: copy.value.securityAnswerPlaceholder },
            description: t('auth.register.securityAnswerDescription', '答案区分大小写，请妥善保存。'),
        },
    ] : []),
    ...(showVerificationToken ? [{
        fieldName: 'verificationToken',
        label: copy.value.verificationToken,
        component: 'Input' as const,
        rules: z.string().optional(),
        componentProps: { autocomplete: 'one-time-code', placeholder: copy.value.verificationTokenPlaceholder },
        description: copy.value.verificationHint,
    }] : []),
]

const validationShape: Record<string, z.ZodTypeAny> = {
    username: z.array(z.object({
        value: z.string().min(1, t('auth.register.requiredUsername', '请输入用户名')),
    })).min(1),
    email: z.array(z.object({
        value: z.string()
            .min(1, t('auth.register.requiredEmail', '请输入邮箱'))
            .email(t('auth.register.invalidEmail', '请输入有效的邮箱地址')),
    })).min(1),
    password: z.array(z.object({
        value: z.string().min(passwordMinLength, passwordLengthMessage()),
    })).min(1),
    confirmPassword: z.array(z.object({
        value: z.string().min(1, t('auth.register.requiredConfirmPassword', '请再次输入密码')),
    })).min(1),
}
if (showSecurityFields) {
    validationShape.securityQuestion = z.array(z.object({ value: z.string().min(1, t('auth.register.requiredSecurityQuestion', '请输入密保问题')) })).min(1)
    validationShape.securityAnswer = z.array(z.object({ value: z.string().min(1, t('auth.register.requiredSecurityAnswer', '请输入密保答案')) })).min(1)
}
if (showVerificationToken) {
    validationShape.verificationToken = z.array(z.object({ value: z.string().optional() })).min(1)
}
const validation = z.object(validationShape).superRefine((values, context) => {
    if (values.password[0]?.value !== values.confirmPassword[0]?.value) {
        context.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['confirmPassword', 0, 'value'],
            message: t('auth.register.passwordMismatch', copy.value.confirmPasswordDescription),
        })
    }
})

function firstValue(values: Record<string, unknown>, fieldName: string): string {
    const rows = values[fieldName]
    if (!Array.isArray(rows)) return ''
    const value = rows[0]
    return value && typeof value === 'object' && 'value' in value
        ? String((value as { value?: unknown }).value ?? '')
        : ''
}

const [AForm, formApi] = useForm({
    schema,
    validation,
    layout: 'vertical',
    showDefaultActions: false,
    wrapperClass: 'flex flex-col gap-4',
})

watch(() => props.loading, (loading) => {
    formApi.setProps({ loading })
}, { immediate: true })

const busy = computed(() => props.loading || formApi.loading)

function submit(values: Record<string, unknown>) {
    emit('submit', {
        username: firstValue(values, 'username'),
        email: firstValue(values, 'email'),
        password: firstValue(values, 'password'),
        confirmPassword: firstValue(values, 'confirmPassword'),
        ...(showSecurityFields ? {
            securityQuestion: firstValue(values, 'securityQuestion'),
            securityAnswer: firstValue(values, 'securityAnswer'),
        } : {}),
        ...(showVerificationToken ? {
            verificationToken: firstValue(values, 'verificationToken') || undefined,
        } : {}),
    })
}
</script>

<template>
    <div class="flex min-h-screen">
        <div v-if="props.display?.showBrandPanel !== false" class="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary via-primary/80 to-primary/60 lg:flex">
            <div class="relative z-10 flex w-full items-center justify-center p-12 text-white">
                <div class="max-w-md space-y-6 text-center">
                    <h1 class="text-4xl font-bold">{{ copy.brand }}</h1>
                    <p v-if="copy.brandDescription" class="text-lg opacity-90">{{ copy.brandDescription }}</p>
                </div>
            </div>
        </div>

        <div class="flex flex-1 items-center justify-center bg-background p-8">
            <div class="w-full max-w-md space-y-6">
                <div class="text-center lg:hidden">
                    <h1 class="text-2xl font-bold">{{ copy.brand }}</h1>
                </div>

                <div class="space-y-2 text-center lg:text-left">
                    <h2 class="text-2xl font-bold tracking-tight">{{ copy.title }}</h2>
                    <p class="text-sm text-muted-foreground">{{ copy.description }}</p>
                </div>

                <AForm :aria-busy="busy" novalidate @submit="submit">
                    <template #actions="{ submitting }">
                        <div class="flex flex-col gap-3">
                            <Button type="submit" class="h-10 w-full" :disabled="busy || submitting">
                                <Icon v-if="busy || submitting" icon="lucide:loader-2" class="mr-2 size-4 animate-spin" />
                                {{ busy || submitting ? copy.submitting : copy.submit }}
                            </Button>
                        </div>
                    </template>
                </AForm>

                <div v-if="props.display?.showLoginLink !== false" class="text-center text-sm">
                    <span class="text-muted-foreground">{{ copy.loginPrompt }}</span>
                    <button type="button" class="ml-1 cursor-pointer text-primary hover:underline" :disabled="busy" @click="emit('login')">{{ copy.login }}</button>
                </div>
            </div>
        </div>
    </div>
</template>
