import {
    computed,
    inject,
    provide,
    type InjectionKey,
    type MaybeRefOrGetter,
    toValue,
    type ComputedRef,
} from 'vue'
import type { StatusBadgeType } from './types'

/**
 * Provides the new-api StatusBadgeTypeContext equivalent for a Vue subtree.
 * A computed ref is used so callers can switch the visual type reactively.
 */
export const STATUS_BADGE_TYPE_KEY: InjectionKey<ComputedRef<StatusBadgeType>> =
    Symbol('healseek.status-badge.type')

export function provideStatusBadgeType(type: MaybeRefOrGetter<StatusBadgeType>): void {
    provide(STATUS_BADGE_TYPE_KEY, computed(() => toValue(type)))
}

export function useProvidedStatusBadgeType(): ComputedRef<StatusBadgeType> | undefined {
    return inject(STATUS_BADGE_TYPE_KEY, undefined)
}
