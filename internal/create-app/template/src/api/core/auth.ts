import { getRequestClient } from '@healseek/app'
import type { AuthSession, AuthTokens } from '@healseek/stores/auth'
import type { LoginParams, RegisterParams } from '../../auth/contract'

export async function login(params: LoginParams): Promise<AuthSession> {
    const response = await getRequestClient().post<AuthSession>('/auth/login', params, { __skipAuth: true })
    return response.data
}

export async function register(params: RegisterParams): Promise<AuthSession> {
    const response = await getRequestClient().post<AuthSession>('/auth/register', params, { __skipAuth: true })
    return response.data
}

export async function refresh(refreshToken: string): Promise<AuthTokens> {
    const response = await getRequestClient().post<AuthTokens>('/auth/refresh', { refreshToken }, { __skipAuth: true })
    return response.data
}

export async function revoke(tokens: { accessToken: string | null; refreshToken: string | null }): Promise<void> {
    await getRequestClient().post('/auth/logout', tokens, { __skipAuth: true })
}
