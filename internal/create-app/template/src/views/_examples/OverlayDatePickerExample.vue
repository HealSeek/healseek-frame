<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { DatePicker, DateTimePicker } from '@healseek/components'
import { useDrawer, useModal } from '@healseek/composables'
import { Button } from '@healseek/uikit-shadcnui'
import ExternalDateForm from './ExternalDateForm.vue'

const date = ref<Date>()
const dateTime = ref<Date>()
const [DateModal, modalApi] = useModal({ title: 'Modal 中的日期表单', description: '日历选择、时间回填与逐层 Escape。', showConfirm: false })
const [DateDrawer, drawerApi] = useDrawer({ title: 'Drawer 中的日期表单', description: '抽屉中直接选日期，或打开嵌套 Modal。', showConfirm: false })
const [CoverModal, coverApi] = useModal({ title: '新的顶层 Modal', description: '原日历应收起，焦点留在当前弹窗。', showConfirm: false })
let timer: ReturnType<typeof setTimeout> | undefined

// The delay lets developers open a calendar before a new host covers it.
function scheduleCover(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
        if (modalApi.state.open) coverApi.open()
    }, 2000)
}

onBeforeUnmount(() => { if (timer) clearTimeout(timer) })
</script>

<template>
    <section data-test="overlay-date-example" class="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:p-5">
        <div>
            <h2 class="text-base font-semibold">日期控件与嵌套弹层</h2>
            <p class="mt-1 text-sm text-muted-foreground">DatePicker / DateTimePicker 在独立页面、Modal、Drawer 和外接 AForm 中共享弹层归属规则。</p>
        </div>
        <div data-test="standalone-date-controls" class="flex flex-wrap gap-3">
            <DatePicker v-model="date" />
            <DateTimePicker v-model="dateTime" class="w-full sm:w-auto" />
        </div>
        <p data-test="standalone-date-value" class="break-all text-xs text-muted-foreground">日期：{{ date?.toISOString() ?? '未选择' }}；日期时间：{{ dateTime?.toISOString() ?? '未选择' }}</p>
        <div class="flex flex-wrap gap-2">
            <Button size="sm" data-test="open-date-modal" @click="modalApi.open()">打开日期 Modal</Button>
            <Button size="sm" variant="outline" data-test="open-date-drawer" @click="drawerApi.open()">打开日期 Drawer</Button>
        </div>
        <DateModal>
            <ExternalDateForm test-prefix="modal-date" />
            <div class="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="outline" data-test="schedule-date-cover" @click="scheduleCover">2 秒后打开子弹窗</Button>
                <Button size="sm" variant="outline" data-test="close-date-owner" @click="modalApi.close()">关闭日期弹窗</Button>
            </div>
            <CoverModal>
                <Button data-test="date-cover-action" @click="coverApi.close()">返回日期表单</Button>
            </CoverModal>
        </DateModal>
        <DateDrawer>
            <ExternalDateForm test-prefix="drawer-date" />
            <Button class="mt-4" size="sm" data-test="drawer-open-date-modal" @click="modalApi.open()">抽屉中打开日期 Modal</Button>
        </DateDrawer>
    </section>
</template>
