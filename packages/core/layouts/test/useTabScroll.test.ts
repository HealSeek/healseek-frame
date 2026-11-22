import { afterEach, describe, expect, it } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { createPinia } from 'pinia'
import { useTabStore } from '@healseek/stores/tabs'
import { useTabScroll } from '../src/basic/useTabScroll'

const mountedApps: Array<ReturnType<typeof createApp>> = []

afterEach(() => {
    for (const app of mountedApps.splice(0)) app.unmount()
    document.body.replaceChildren()
})

describe('layout tab scrolling', () => {
    it('restores each query tab to its own content viewport position', async () => {
        const pinia = createPinia()
        const tabs = useTabStore(pinia)
        const router = createRouter({
            history: createMemoryHistory(),
            routes: [{ path: '/reports', component: defineComponent({ render: () => null }) }],
        })
        router.afterEach((to) => tabs.addOrActivate(to))
        await router.push('/reports?range=week')

        const View = defineComponent({
            setup() {
                const viewport = ref<HTMLElement | null>(null)
                useTabScroll(viewport)
                return () => h('div', { ref: viewport })
            },
        })
        const host = document.createElement('div')
        document.body.appendChild(host)
        const app = createApp(View).use(pinia).use(router)
        app.mount(host)
        mountedApps.push(app)
        await nextTick()

        const viewport = host.firstElementChild as HTMLElement
        viewport.scrollTop = 320
        await router.push('/reports?range=month')
        await nextTick()
        expect(tabs.tabs.find((tab) => tab.fullPath === '/reports?range=week')?.scrollTop).toBe(320)
        expect(viewport.scrollTop).toBe(0)

        viewport.scrollTop = 64
        await router.push('/reports?range=week')
        await nextTick()
        expect(tabs.tabs.find((tab) => tab.fullPath === '/reports?range=month')?.scrollTop).toBe(64)
        expect(viewport.scrollTop).toBe(320)

        viewport.scrollTop = 400
        window.dispatchEvent(new Event('pagehide'))
        expect(tabs.tabs.find((tab) => tab.fullPath === '/reports?range=week')?.scrollTop).toBe(400)
    })
})
