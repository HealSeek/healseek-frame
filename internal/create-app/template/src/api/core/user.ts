import { getRequestClient } from '@healseek/app'
import type { User } from '@healseek/stores/auth'

export async function getCurrentUser(): Promise<User> {
    const response = await getRequestClient().get<{ user: User }>('/auth/me')
    return response.data.user
}
