import type { InjectionKey, Ref } from 'vue'

export const pageFooterTargetKey: InjectionKey<Ref<HTMLElement | null>> = Symbol('healseek-page-footer-target')
