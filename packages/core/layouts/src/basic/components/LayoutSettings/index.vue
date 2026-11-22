<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import {
    Button,
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    useSidebar,
} from '@healseek/uikit-shadcnui'
import { Icon } from '@healseek/shared/icons'
import {
    usePreferencesStore,
    type ContentLayout,
    type LayoutDensity,
    type SidebarCollapsible,
    type SidebarVariant,
    type ThemeFont,
    type ThemePreset,
    type ThemeRadius,
    type ThemeMode,
} from '@healseek/stores'
import PreviewIcon from './PreviewIcon.vue'
import PreviewCard from './PreviewCard.vue'
import SectionTitle from './SectionTitle.vue'

defineOptions({ name: 'LayoutSettings' })

const props = defineProps<{ title?: string; description?: string }>()
const preferences = usePreferencesStore()
const { open: sidebarOpen, setOpen: setSidebarOpen } = useSidebar()
const { t, te } = useI18n()
const resolvedTitle = computed(() => props.title ?? (te('common.layoutSettingsTitle') ? t('common.layoutSettingsTitle') : '主题设置'))
const resolvedDescription = computed(() => props.description ?? (te('common.layoutSettingsDescription') ? t('common.layoutSettingsDescription') : '调整界面外观与工作区布局，设置会自动保存。'))
const openSettingsText = computed(() => te('common.openLayoutSettings') ? t('common.openLayoutSettings') : '打开主题设置')
const resetAllText = computed(() => te('common.resetAllSettings') ? t('common.resetAllSettings') : '恢复全部默认')
const open = ref(false)
const current = computed(() => preferences.preferences)
const defaults = computed(() => preferences.defaults)
const customExtension = computed(() => preferences.preferencesExtension)
const customValues = computed(() => preferences.customPreferences)

function updateTheme<K extends keyof typeof current.value.theme>(key: K, value: (typeof current.value.theme)[K]): void {
    preferences.updatePreferences({ theme: { [key]: value } })
}
function updateLayout<K extends keyof typeof current.value.layout>(key: K, value: (typeof current.value.layout)[K]): void {
    preferences.updatePreferences({ layout: { [key]: value } })
}
const selectedLayout = computed<SidebarCollapsible | 'default'>(() => {
    if (sidebarOpen.value) return 'default'
    return current.value.layout.sidebarCollapsible
})
function selectLayout(value: SidebarCollapsible | 'default'): void {
    if (value === 'default') {
        // new-api's default layout means expanded, while the collapsible
        // capability remains available for the next toggle.
        setSidebarOpen(true)
        return
    }
    updateLayout('sidebarCollapsible', value)
    setSidebarOpen(false)
}
function resetLayout(): void {
    updateLayout('sidebarCollapsible', defaults.value.layout.sidebarCollapsible)
    setSidebarOpen(true)
}
function resetTheme(): void { preferences.updatePreferences({ theme: { ...defaults.value.theme } }) }
function resetAll(): void { preferences.reset(); setSidebarOpen(true) }
function selectPreset(value: ThemePreset): void { preferences.updatePreferences({ theme: { preset: value, primaryColor: '' } }) }
function updateCustomField(key: string, value: unknown): void {
    preferences.updateCustomPreferences({ [key]: value })
}
function updateCustomSelect(key: string, options: { value: unknown }[] | undefined, value: string): void {
    const option = options?.find((item) => String(item.value) === value)
    if (option) updateCustomField(key, option.value)
}
function updateCustomNumber(key: string, raw: string): void {
    if (raw.trim() === '') return
    const value = Number(raw)
    if (Number.isFinite(value)) updateCustomField(key, value)
}
function label(value: string): string { return te(value) ? t(value) : value }
function customFieldComponent(field: { component: string }): string {
    return field.component.toLowerCase()
}

const themeModes: { value: ThemeMode; label: string; kind: 'theme-system' | 'theme-light' | 'theme-dark' }[] = [
    { value: 'system', label: 'common.layoutSettings.themeSystem', kind: 'theme-system' },
    { value: 'light', label: 'common.layoutSettings.themeLight', kind: 'theme-light' },
    { value: 'dark', label: 'common.layoutSettings.themeDark', kind: 'theme-dark' },
]
const presets: { value: ThemePreset; label: string; swatches: string[] }[] = [
    { value: 'default', label: 'common.layoutSettings.presetDefault', swatches: ['#6ea8fe', '#9b87f5'] },
    { value: 'anthropic', label: 'common.layoutSettings.presetAnthropic', swatches: ['#faf9f5', '#d97757'] },
    { value: 'simple-large', label: 'common.layoutSettings.presetSimpleLarge', swatches: ['#18181b', '#fafafa'] },
    { value: 'underground', label: 'common.layoutSettings.presetUnderground', swatches: ['#4d8f70', '#a75d8f'] },
    { value: 'rose-garden', label: 'common.layoutSettings.presetRoseGarden', swatches: ['#d12d58', '#f4a1b0'] },
    { value: 'lake-view', label: 'common.layoutSettings.presetLakeView', swatches: ['#46d4a8', '#4a8aa2'] },
    { value: 'sunset-glow', label: 'common.layoutSettings.presetSunsetGlow', swatches: ['#d95838', '#e9a56c'] },
    { value: 'forest-whisper', label: 'common.layoutSettings.presetForestWhisper', swatches: ['#3a9b8b', '#516eaa'] },
    { value: 'ocean-breeze', label: 'common.layoutSettings.presetOceanBreeze', swatches: ['#3472e7', '#6f5be7'] },
    { value: 'lavender-dream', label: 'common.layoutSettings.presetLavenderDream', swatches: ['#8254d7', '#8bb7dc'] },
]
const fonts: { value: ThemeFont; label: string }[] = [{ value: 'sans', label: 'common.layoutSettings.fontSans' }, { value: 'serif', label: 'common.layoutSettings.fontSerif' }]
const radii: { value: ThemeRadius; label: string }[] = [
    { value: 'none', label: '0' }, { value: 'sm', label: '0.3' }, { value: 'md', label: '0.5' }, { value: 'lg', label: '0.75' }, { value: 'xl', label: '1.0' },
]
const densities: { value: LayoutDensity; label: string }[] = [{ value: 'compact', label: 'common.layoutSettings.densityCompact' }, { value: 'default', label: 'common.layoutSettings.densityDefault' }, { value: 'loose', label: 'common.layoutSettings.densityLoose' }]
const sidebarOptions: { value: SidebarVariant; label: string; kind: 'sidebar-sidebar' | 'sidebar-inset' | 'sidebar-floating' }[] = [
    { value: 'inset', label: 'common.layoutSettings.sidebarInset', kind: 'sidebar-inset' }, { value: 'floating', label: 'common.layoutSettings.sidebarFloating', kind: 'sidebar-floating' }, { value: 'sidebar', label: 'common.layoutSettings.sidebar', kind: 'sidebar-sidebar' },
]
const layoutOptions: { value: SidebarCollapsible | 'default'; label: string; kind: 'layout-default' | 'layout-compact' | 'layout-full' }[] = [
    { value: 'default', label: 'common.layoutSettings.layoutDefault', kind: 'layout-default' }, { value: 'icon', label: 'common.layoutSettings.layoutCompact', kind: 'layout-compact' }, { value: 'offcanvas', label: 'common.layoutSettings.layoutOffcanvas', kind: 'layout-full' },
]
const contentOptions: { value: ContentLayout; label: string; kind: 'content-full' | 'content-centered' }[] = [
    { value: 'centered', label: 'common.layoutSettings.contentCentered', kind: 'content-centered' }, { value: 'full', label: 'common.layoutSettings.contentFull', kind: 'content-full' },
]
</script>

<template>
    <Sheet v-model:open="open">
        <SheetTrigger as-child>
            <Button data-slot="layout-settings-trigger" variant="ghost" size="icon" :aria-label="openSettingsText" :title="resolvedTitle" class="size-9">
                <Icon icon="lucide:palette" class="size-4" />
            </Button>
        </SheetTrigger>
        <SheetContent data-slot="layout-settings" side="right" class="h-dvh min-h-0 w-full shrink-0 gap-0 overflow-hidden border-l bg-background/98 p-0 shadow-none sm:max-w-md">
            <SheetHeader class="shrink-0 border-b border-border/70 bg-background/95 px-4 py-3 text-start backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4">
                <SheetTitle>{{ resolvedTitle }}</SheetTitle>
                <SheetDescription>{{ resolvedDescription }}</SheetDescription>
            </SheetHeader>
            <div data-slot="layout-settings-scroll" class="hover-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
                <div class="flex flex-col gap-6">
                <section data-section="theme" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.theme')" :show-reset="current.theme.mode !== defaults.theme.mode" @reset="updateTheme('mode', defaults.theme.mode)" />
                    <div class="grid grid-cols-3 gap-3">
                        <button v-for="option in themeModes" :key="option.value" type="button" class="group flex flex-col gap-1.5 text-left outline-none" :aria-pressed="current.theme.mode === option.value" @click="updateTheme('mode', option.value)">
                            <PreviewCard :selected="current.theme.mode === option.value"><PreviewIcon :kind="option.kind" /></PreviewCard>
                            <span class="text-center text-xs">{{ label(option.label) }}</span>
                        </button>
                    </div>
                </section>
                <section data-section="preset" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.preset')" :show-reset="current.theme.preset !== defaults.theme.preset || !!current.theme.primaryColor" @reset="resetTheme" />
                    <div class="grid grid-cols-4 gap-3">
                        <button v-for="preset in presets" :key="preset.value" type="button" class="group flex flex-col gap-1.5 text-left outline-none" :aria-pressed="current.theme.preset === preset.value && !current.theme.primaryColor" @click="selectPreset(preset.value)">
                            <PreviewCard :selected="current.theme.preset === preset.value && !current.theme.primaryColor" class="h-12"><span class="absolute inset-0 rounded-md" :style="{ background: `linear-gradient(135deg, ${preset.swatches[0]}, ${preset.swatches[1]})` }" /></PreviewCard>
                            <span class="truncate text-center text-xs">{{ label(preset.label) }}</span>
                        </button>
                    </div>
                </section>
                <section data-section="font" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.font')" :show-reset="current.theme.font !== defaults.theme.font" @reset="updateTheme('font', defaults.theme.font)" />
                    <div class="grid grid-cols-2 gap-3">
                        <button v-for="font in fonts" :key="font.value" type="button" class="group flex flex-col gap-1.5 outline-none" :aria-pressed="current.theme.font === font.value" @click="updateTheme('font', font.value)">
                            <PreviewCard :selected="current.theme.font === font.value" class="h-12"><span class="text-foreground text-xl" :class="font.value === 'serif' ? 'font-serif' : 'font-sans'">Aa</span></PreviewCard>
                            <span class="text-center text-xs">{{ label(font.label) }}</span>
                        </button>
                    </div>
                </section>
                <section data-section="radius" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.radius')" :show-reset="current.theme.radiusScale !== defaults.theme.radiusScale" @reset="updateTheme('radiusScale', defaults.theme.radiusScale)" />
                    <div class="grid grid-cols-5 gap-2">
                        <button v-for="radius in radii" :key="radius.value" type="button" class="group flex flex-col gap-1.5 outline-none" :aria-pressed="current.theme.radiusScale === radius.value" @click="updateTheme('radiusScale', radius.value)">
                            <PreviewCard :selected="current.theme.radiusScale === radius.value" class="h-10"><span class="size-6 border-2 border-primary bg-primary/70" :style="{ borderRadius: radius.value === 'none' ? '0' : `var(--radius-${radius.value})` }" /></PreviewCard>
                            <span class="text-center text-[11px] text-muted-foreground">{{ radius.label }}</span>
                        </button>
                    </div>
                </section>
                <section data-section="density" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.density')" :show-reset="current.theme.layoutDensity !== defaults.theme.layoutDensity" @reset="updateTheme('layoutDensity', defaults.theme.layoutDensity)" />
                    <div class="grid grid-cols-3 gap-3">
                        <button v-for="density in densities" :key="density.value" type="button" class="group flex flex-col gap-1.5 outline-none" :aria-pressed="current.theme.layoutDensity === density.value" @click="updateTheme('layoutDensity', density.value)">
                            <PreviewCard :selected="current.theme.layoutDensity === density.value" class="h-10"><span class="flex w-12 flex-col gap-1"><i v-for="line in density.value === 'compact' ? 4 : density.value === 'loose' ? 2 : 3" :key="line" class="h-1 rounded-full bg-primary/70" /></span></PreviewCard>
                            <span class="text-center text-xs">{{ label(density.label) }}</span>
                        </button>
                    </div>
                </section>
                <section data-section="sidebar" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.sidebarTitle')" :show-reset="current.layout.sidebarVariant !== defaults.layout.sidebarVariant" @reset="updateLayout('sidebarVariant', defaults.layout.sidebarVariant)" />
                    <div class="grid grid-cols-3 gap-3">
                        <button v-for="option in sidebarOptions" :key="option.value" type="button" class="group flex flex-col gap-1.5 outline-none" :aria-pressed="current.layout.sidebarVariant === option.value" @click="updateLayout('sidebarVariant', option.value)">
                            <PreviewCard :selected="current.layout.sidebarVariant === option.value"><PreviewIcon :kind="option.kind" /></PreviewCard>
                            <span class="text-center text-xs">{{ label(option.label) }}</span>
                        </button>
                    </div>
                </section>
                <section data-section="layout" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.layoutTitle')" :show-reset="selectedLayout !== 'default' || current.layout.sidebarCollapsible !== defaults.layout.sidebarCollapsible" @reset="resetLayout" />
                    <div class="grid grid-cols-3 gap-3">
                        <button v-for="option in layoutOptions" :key="option.value" type="button" class="group flex flex-col gap-1.5 outline-none" :aria-pressed="selectedLayout === option.value" @click="selectLayout(option.value)">
                            <PreviewCard :selected="selectedLayout === option.value"><PreviewIcon :kind="option.kind" /></PreviewCard>
                            <span class="text-center text-xs">{{ label(option.label) }}</span>
                        </button>
                    </div>
                </section>
                <section data-section="content" class="flex flex-col gap-2.5">
                    <SectionTitle :title="label('common.layoutSettings.contentTitle')" :show-reset="current.layout.contentLayout !== defaults.layout.contentLayout" @reset="updateLayout('contentLayout', defaults.layout.contentLayout)" />
                    <div class="grid grid-cols-2 gap-3">
                        <button v-for="option in contentOptions" :key="option.value" type="button" class="group flex flex-col gap-1.5 outline-none" :aria-pressed="current.layout.contentLayout === option.value" @click="updateLayout('contentLayout', option.value)">
                            <PreviewCard :selected="current.layout.contentLayout === option.value"><PreviewIcon :kind="option.kind" /></PreviewCard>
                            <span class="text-center text-xs">{{ label(option.label) }}</span>
                        </button>
                    </div>
                    <label v-if="current.layout.contentLayout === 'centered'" class="mt-1 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                        <span>{{ label('common.layoutSettings.maxWidth') }}</span>
                        <select
                            class="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
                            :value="current.layout.contentMaxWidth || defaults.layout.contentMaxWidth || 1280"
                            @change="updateLayout('contentMaxWidth', Number(($event.target as HTMLSelectElement).value))"
                        >
                            <option :value="960">960px</option>
                            <option :value="1280">1280px</option>
                            <option :value="1536">1536px</option>
                        </select>
                    </label>
                </section>
                <section v-if="customExtension?.fields.length" data-section="custom" class="flex flex-col gap-3 border-t pt-5">
                    <SectionTitle :title="label(customExtension.title || customExtension.tabLabel)" />
                    <div v-for="field in customExtension.fields" :key="String(field.key)" class="flex flex-col gap-1.5 rounded-md border px-3 py-2.5 text-sm">
                        <label :for="`preference-${String(field.key)}`" class="font-medium">{{ label(field.label) }}</label>
                        <p v-if="field.tip" class="text-xs text-muted-foreground">{{ label(field.tip) }}</p>
                        <select
                            v-if="customFieldComponent(field) === 'select'"
                            :id="`preference-${String(field.key)}`"
                            class="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            :disabled="field.disabled"
                            :value="customValues[String(field.key)]"
                            @change="updateCustomSelect(String(field.key), field.options, ($event.target as HTMLSelectElement).value)"
                        >
                            <option v-for="option in field.options || []" :key="String(option.value)" :value="option.value">{{ label(option.label) }}</option>
                        </select>
                        <input
                            v-else-if="customFieldComponent(field) === 'switch'"
                            :id="`preference-${String(field.key)}`"
                            type="checkbox"
                            class="size-4 self-end accent-primary"
                            :disabled="field.disabled"
                            :checked="Boolean(customValues[String(field.key)])"
                            @change="updateCustomField(String(field.key), ($event.target as HTMLInputElement).checked)"
                        />
                        <input
                            v-else
                            :id="`preference-${String(field.key)}`"
                            :type="customFieldComponent(field) === 'number' || customFieldComponent(field) === 'inputnumber' ? 'number' : 'text'"
                            class="h-9 rounded-md border border-input bg-background px-2 text-sm"
                            :disabled="field.disabled"
                            :placeholder="field.placeholder ? label(field.placeholder) : undefined"
                            :value="customValues[String(field.key)] ?? ''"
                            v-bind="field.componentProps"
                            @input="customFieldComponent(field) === 'number' || customFieldComponent(field) === 'inputnumber' ? updateCustomNumber(String(field.key), ($event.target as HTMLInputElement).value) : updateCustomField(String(field.key), ($event.target as HTMLInputElement).value)"
                        />
                    </div>
                </section>
                <section class="flex flex-col gap-3 border-t pt-5">
                    <label class="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm">
                        <span><span class="block font-medium">{{ label('common.layoutSettings.customColor') }}</span><span class="text-xs text-muted-foreground">{{ label('common.layoutSettings.customColorDescription') }}</span></span>
                        <input :value="current.theme.primaryColor || '#2563eb'" type="color" class="size-8 cursor-pointer rounded border bg-background p-0.5" aria-label="自定义主色" @input="updateTheme('primaryColor', ($event.target as HTMLInputElement).value)" />
                    </label>
                    <label class="flex items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm">
                        <span><span class="block font-medium">{{ label('common.layoutSettings.animation') }}</span><span class="text-xs text-muted-foreground">{{ label('common.layoutSettings.animationDescription') }}</span></span>
                        <input type="checkbox" :checked="current.theme.animationEnabled !== false" class="size-4 accent-primary" @change="updateTheme('animationEnabled', ($event.target as HTMLInputElement).checked)" />
                    </label>
                </section>
                </div>
            </div>
            <SheetFooter class="mt-0 shrink-0 grid grid-cols-1 gap-2 border-t border-border/70 bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 sm:py-4">
                <Button variant="outline" class="w-full border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/10" :aria-label="resetAllText" @click="resetAll"><Icon icon="lucide:rotate-ccw" class="size-4" />{{ resetAllText }}</Button>
            </SheetFooter>
        </SheetContent>
    </Sheet>
</template>
