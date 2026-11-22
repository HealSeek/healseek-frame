<script setup lang="ts">
import { computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Icon } from '@iconify/vue'
import { useForm, type FormFieldSchema } from '@healseek/forms'
import { Button } from '@healseek/uikit-shadcnui'
import { z } from 'zod'
import type { LoginValues } from './auth-types'

defineOptions({ name: 'FrameworkLogin' })

interface LoginText {
    brand: string
    brandDescription: string
    title: string
    description: string
    username: string
    usernamePlaceholder: string
    password: string
    passwordPlaceholder: string
    forgotPassword: string
    recoverPassword: string
    submitting: string
    submit: string
    registerPrompt: string
    register: string
}

interface LoginDisplay {
    showBrandPanel: boolean
    showForgotPassword: boolean
    showRegisterLink: boolean
}

const props = withDefaults(defineProps<{
    loading?: boolean
    text?: Partial<LoginText>
    display?: Partial<LoginDisplay>
}>(), { loading: false })

const emit = defineEmits<{
    submit: [values: LoginValues]
    register: []
    recoverPassword: []
}>()

const { t } = useI18n()
const copy = computed<LoginText>(() => ({
    brand: props.text?.brand ?? 'Framework',
    brandDescription: props.text?.brandDescription ?? '',
    title: props.text?.title ?? t('auth.login.title', '登录'),
    description: props.text?.description ?? t('auth.login.welcome', '欢迎回来，请登录您的账号'),
    username: props.text?.username ?? t('auth.login.username', '用户名'),
    usernamePlaceholder: props.text?.usernamePlaceholder ?? t('auth.login.usernamePlaceholder', '请输入用户名'),
    password: props.text?.password ?? t('auth.login.password', '密码'),
    passwordPlaceholder: props.text?.passwordPlaceholder ?? t('auth.login.passwordPlaceholder', '请输入密码'),
    forgotPassword: props.text?.forgotPassword ?? t('auth.login.forgotPassword', '忘记了密码？'),
    recoverPassword: props.text?.recoverPassword ?? t('auth.login.recoverPassword', '找回密码'),
    submitting: props.text?.submitting ?? t('auth.login.submitting', '登录中…'),
    submit: props.text?.submit ?? t('auth.login.submit', '登录'),
    registerPrompt: props.text?.registerPrompt ?? t('auth.login.registerPrompt', '还没有账号？'),
    register: props.text?.register ?? t('auth.login.register', '立即注册'),
}))

const schema: FormFieldSchema[] = [
    {
        fieldName: 'username',
        label: copy.value.username,
        component: 'Input',
        rules: z.string().min(1, t('auth.login.requiredUsername', '请输入用户名')),
        componentProps: {
            type: 'text',
            autocomplete: 'username',
            placeholder: copy.value.usernamePlaceholder,
        },
    },
    {
        fieldName: 'password',
        label: copy.value.password,
        component: 'Password',
        rules: z.string().min(1, t('auth.login.requiredPassword', '请输入密码')),
        componentProps: {
            autocomplete: 'current-password',
            placeholder: copy.value.passwordPlaceholder,
        },
    },
]

const [AForm, formApi] = useForm({
    schema,
    layout: 'vertical',
    showDefaultActions: false,
    wrapperClass: 'space-y-4',
})

function firstValue(values: Record<string, unknown>, fieldName: string): string {
    const rows = values[fieldName]
    if (!Array.isArray(rows)) return ''
    const value = rows[0]
    return value && typeof value === 'object' && 'value' in value
        ? String((value as { value?: unknown }).value ?? '')
        : ''
}

watch(() => props.loading, (loading) => formApi.setProps({ loading }), { immediate: true })
const busy = computed(() => props.loading || formApi.loading)

function submit(values: Record<string, unknown>) {
    emit('submit', {
        username: firstValue(values, 'username'),
        password: firstValue(values, 'password'),
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
                        <div class="space-y-4">
                            <p v-if="props.display?.showForgotPassword !== false" class="text-sm text-muted-foreground">
                                {{ copy.forgotPassword }}
                                <button type="button" class="ml-1 cursor-pointer text-primary hover:underline" :disabled="busy" @click="emit('recoverPassword')">{{ copy.recoverPassword }}</button>
                            </p>
                            <Button type="submit" class="h-10 w-full" :disabled="busy || submitting">
                                <Icon :icon="busy || submitting ? 'lucide:loader-2' : 'lucide:log-in'" class="mr-2 size-4" :class="{ 'animate-spin': busy || submitting }" />
                                {{ busy || submitting ? copy.submitting : copy.submit }}
                            </Button>
                        </div>
                    </template>
                </AForm>

                <div v-if="props.display?.showRegisterLink !== false" class="text-center text-sm">
                    <span class="text-muted-foreground">{{ copy.registerPrompt }}</span>
                    <button type="button" class="ml-1 cursor-pointer text-primary hover:underline" :disabled="busy" @click="emit('register')">{{ copy.register }}</button>
                </div>
            </div>
        </div>
    </div>
</template>
