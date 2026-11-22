import type { MenuItem } from '@healseek/router'

export interface SidebarViewParent {
    title: string
    titleKey?: string
    url: string
}

/** A path-driven contextual navigation surface, matching new-api's drill-in sidebar model. */
export interface SidebarView {
    id: string
    pathPattern: RegExp
    parent: SidebarViewParent
    menus: MenuItem[]
}

/** Return the first contextual view whose path pattern matches the current route. */
export function resolveSidebarView(pathname: string, views: readonly SidebarView[]): SidebarView | null {
    return views.find((view) => {
        view.pathPattern.lastIndex = 0
        return view.pathPattern.test(pathname)
    }) ?? null
}
