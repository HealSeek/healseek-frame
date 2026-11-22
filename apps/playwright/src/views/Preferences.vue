<script setup lang="ts">
/**
 * Preferences settings — real settings panel demoing all the theme
 *细化 fields (P2-B C4). Each control calls `usePreferencesStore().updatePreferences()`
 * which triggers `manager.applyTheme()` and persists to localStorage.
 */
import { computed } from 'vue'
import { Label, Input, NativeSelect } from '@healseek/uikit-shadcnui'
import { usePreferencesStore } from '@healseek/stores/preferences'
import { Icon } from '@healseek/shared/icons'
import { SectionPage } from '@healseek/components'

defineOptions({ name: 'Preferences' })

const prefs = usePreferencesStore()

const themePresets = [
    'default',
    'anthropic',
    'simple-large',
    'underground',
    'rose-garden',
    'lake-view',
    'sunset-glow',
    'forest-whisper',
    'ocean-breeze',
    'lavender-dream',
] as const
const themeRadiusScales = ['default', 'none', 'sm', 'md', 'lg', 'xl'] as const

const themeMode = computed({
    get: () => prefs.preferences.theme.mode ?? prefs.defaults.theme.mode,
    set: (v: 'light' | 'dark' | 'system') =>
        prefs.updatePreferences({ theme: { mode: v } }),
})

const themePreset = computed({
    get: () =>
        prefs.preferences.theme.preset ??
        prefs.defaults.theme.preset ??
        'default',
    set: (v: (typeof themePresets)[number]) =>
        prefs.updatePreferences({ theme: { preset: v } }),
})

const primaryColor = computed({
    get: () => prefs.preferences.theme.primaryColor ?? '',
    set: (v: string) => prefs.updatePreferences({ theme: { primaryColor: v } }),
})

const grayColor = computed({
    get: () => prefs.preferences.theme.grayColor ?? 'slate',
    set: (v: string) =>
        prefs.updatePreferences({ theme: { grayColor: v as any } }),
})

const radiusScale = computed({
    get: () =>
        prefs.preferences.theme.radiusScale ??
        prefs.defaults.theme.radiusScale ??
        'default',
    set: (v: (typeof themeRadiusScales)[number]) =>
        prefs.updatePreferences({ theme: { radiusScale: v } }),
})

const density = computed({
    get: () =>
        prefs.preferences.theme.layoutDensity ??
        prefs.defaults.theme.layoutDensity ??
        'default',
    set: (v: string) =>
        prefs.updatePreferences({ theme: { layoutDensity: v as any } }),
})

const animEnabled = computed({
    get: () =>
        prefs.preferences.theme.animationEnabled ??
        prefs.defaults.theme.animationEnabled ??
        true,
    set: (v: boolean) =>
        prefs.updatePreferences({ theme: { animationEnabled: v } }),
})

const weakMode = computed({
    get: () =>
        prefs.preferences.theme.weakMode ??
        prefs.defaults.theme.weakMode ??
        false,
    set: (v: boolean) => prefs.updatePreferences({ theme: { weakMode: v } }),
})

function resetTheme() {
    prefs.reset()
}
</script>

<template>
    <SectionPage class="min-h-full">
        <template #breadcrumb
            ><span class="text-xs text-muted-foreground"
                >工作区 / 偏好设置</span
            ></template
        >
        <template #title>偏好设置</template>
        <template #description
            >所有改动会实时生效，并按应用命名空间保存到 localStorage。</template
        >
        <template #actions
            ><button
                type="button"
                class="inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-3 text-xs font-medium transition-colors hover:bg-accent"
                @click="resetTheme"
            >
                <Icon icon="lucide:rotate-ccw" class="size-3.5" />重置
            </button></template
        >

        <div class="mx-auto max-w-3xl space-y-4 sm:space-y-5">
            <section
                class="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
            >
                <div>
                    <h2 class="text-sm font-semibold">主题</h2>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                        沿用 new-api 的简洁设置分组，颜色和圆角由框架 token
                        驱动。
                    </p>
                </div>

                <div class="grid gap-3 sm:grid-cols-3">
                    <div class="space-y-1.5">
                        <Label>主题模式</Label>
                        <NativeSelect v-model="themeMode">
                            <option value="light">浅色</option>
                            <option value="dark">深色</option>
                            <option value="system">跟随系统</option>
                        </NativeSelect>
                    </div>

                    <div class="space-y-1.5">
                        <Label>主题预设</Label>
                        <NativeSelect v-model="themePreset">
                            <option
                                v-for="preset in themePresets"
                                :key="preset"
                                :value="preset"
                            >
                                {{ preset }}
                            </option>
                        </NativeSelect>
                    </div>

                    <div class="space-y-1.5">
                        <Label>中性色 (Gray)</Label>
                        <NativeSelect v-model="grayColor">
                            <option value="zinc">zinc</option>
                            <option value="slate">slate</option>
                            <option value="gray">gray</option>
                            <option value="neutral">neutral</option>
                            <option value="stone">stone</option>
                        </NativeSelect>
                    </div>
                </div>

                <div class="space-y-1.5">
                    <Label>主色 (Primary Color)</Label>
                    <div class="flex items-center gap-3">
                        <input
                            v-model="primaryColor"
                            type="color"
                            class="h-9 w-12 cursor-pointer rounded-md border border-input"
                        />
                        <Input
                            v-model="primaryColor"
                            placeholder="留空使用默认 (hsl 222.2 47.4% 11.2%)"
                            class="flex-1"
                        />
                    </div>
                    <p class="text-xs text-muted-foreground">
                        支持 hex (#3461f0)、oklch 或 hsl 字符串
                    </p>
                </div>

                <div class="space-y-1.5">
                    <div class="flex items-center justify-between">
                        <Label>圆角预设</Label>
                        <NativeSelect v-model="radiusScale">
                            <option
                                v-for="scale in themeRadiusScales"
                                :key="scale"
                                :value="scale"
                            >
                                {{ scale }}
                            </option>
                        </NativeSelect>
                    </div>
                </div>
            </section>

            <section
                class="space-y-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10 sm:p-5"
            >
                <div>
                    <h2 class="text-sm font-semibold">布局</h2>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                        控制工作区内容密度和动效偏好。
                    </p>
                </div>

                <div class="space-y-1.5">
                    <Label>密度</Label>
                    <div class="grid grid-cols-3 gap-2">
                        <button
                            v-for="d in [
                                'compact',
                                'default',
                                'loose',
                            ] as const"
                            :key="d"
                            type="button"
                            :class="[
                                'rounded-md border px-3 py-2 text-sm',
                                density === d
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-input bg-background hover:bg-accent',
                            ]"
                            @click="density = d"
                        >
                            {{
                                {
                                    compact: '紧凑',
                                    default: '默认',
                                    loose: '宽松',
                                }[d]
                            }}
                        </button>
                    </div>
                </div>

                <div
                    class="flex items-center justify-between rounded-md border border-input px-3 py-2.5"
                >
                    <div>
                        <Label>动画</Label>
                        <p class="text-xs text-muted-foreground">
                            关闭后所有过渡与动画静止（无障碍偏好）
                        </p>
                    </div>
                    <label
                        class="inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-input transition-colors has-[:checked]:bg-primary"
                    >
                        <input
                            :checked="animEnabled"
                            type="checkbox"
                            class="peer sr-only"
                            @change="
                                (e) =>
                                    (animEnabled = (
                                        e.target as HTMLInputElement
                                    ).checked)
                            "
                        />
                        <span
                            class="ml-0.5 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4"
                        />
                    </label>
                </div>

                <div
                    class="flex items-center justify-between rounded-md border border-input px-3 py-2.5"
                >
                    <div>
                        <Label>弱色模式</Label>
                        <p class="text-xs text-muted-foreground">
                            对整个应用加灰度滤镜（专注阅读）
                        </p>
                    </div>
                    <label
                        class="inline-flex h-5 w-9 cursor-pointer items-center rounded-full bg-input transition-colors has-[:checked]:bg-primary"
                    >
                        <input
                            :checked="weakMode"
                            type="checkbox"
                            class="peer sr-only"
                            @change="
                                (e) =>
                                    (weakMode = (e.target as HTMLInputElement)
                                        .checked)
                            "
                        />
                        <span
                            class="ml-0.5 h-4 w-4 rounded-full bg-background transition-transform peer-checked:translate-x-4"
                        />
                    </label>
                </div>
            </section>
        </div>
    </SectionPage>
</template>
