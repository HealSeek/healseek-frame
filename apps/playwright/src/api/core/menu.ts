import { getRequestClient } from '@healseek/app'
import type { MenuItemInput } from '@healseek/router'

export async function loadMenus(): Promise<unknown> {
    const response = await getRequestClient().get('/menus')
    return response.data
}

export function normalizeMenus(raw: unknown): MenuItemInput[] {
    if (Array.isArray(raw)) return raw as MenuItemInput[]
    if (raw && typeof raw === 'object' && Array.isArray((raw as { items?: unknown }).items)) {
        return (raw as { items: MenuItemInput[] }).items
    }
    return []
}
