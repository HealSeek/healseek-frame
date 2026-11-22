import { nextTick, onBeforeUnmount, onMounted, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useTabStore } from '@healseek/stores/tabs'

/**
 * Keeps the layout content viewport position with its framework tab.
 *
 * Vue Router's savedPosition only covers browser history entries.  A
 * dashboard tab switch is a normal `router.push`, so the viewport position
 * belongs to the tab model instead.  The before/after hooks also run when a
 * KeepAlive view is reused, which makes switching back to a tab restore the
 * position users left there.
 */
export function useTabScroll(viewport: Ref<HTMLElement | null>): void {
    const route = useRoute()
    const router = useRouter()
    const tabs = useTabStore()
    let removeBefore: (() => void) | undefined
    let removeAfter: (() => void) | undefined

    function tabFor(fullPath: string) {
        return tabs.tabs.find((tab) => tab.fullPath === fullPath)
    }

    function saveCurrentPosition(): void {
        const element = viewport.value
        if (!element) return
        const tab = tabFor(route.fullPath)
        if (tab) tabs.setScrollTop(tab.id, element.scrollTop)
    }

    function restorePosition(fullPath: string): void {
        void nextTick(() => {
            const element = viewport.value
            if (!element || route.fullPath !== fullPath) return
            element.scrollTop = Math.max(0, tabFor(fullPath)?.scrollTop ?? 0)
        })
    }

    onMounted(() => {
        window.addEventListener('pagehide', saveCurrentPosition)
        removeBefore = router.beforeEach(() => {
            saveCurrentPosition()
            return true
        })
        removeAfter = router.afterEach((to, _from, failure) => {
            if (failure) return
            restorePosition(to.fullPath)
        })
        restorePosition(route.fullPath)
    })

    onBeforeUnmount(() => {
        window.removeEventListener('pagehide', saveCurrentPosition)
        removeBefore?.()
        removeAfter?.()
        removeBefore = undefined
        removeAfter = undefined
    })
}
