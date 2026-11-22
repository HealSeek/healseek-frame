import { getRequestErrorDetails } from '@healseek/request'

export type AuthOperation = 'login' | 'register' | 'refresh' | 'me' | 'logout'

export interface AuthError {
    operation: AuthOperation
    message: string
    code?: string
    status?: number
    data?: unknown
}

export interface LoginParams {
    username: string
    password: string
}

export interface RegisterParams {
    username: string
    email: string
    password: string
    confirmPassword: string
}

/** Map transport errors into application-owned auth codes and messages. */
export function normalizeAuthError(error: unknown, operation: AuthOperation): AuthError {
    const details = getRequestErrorDetails(error)
    const status = details.httpStatus
    return {
        operation,
        message: details.message,
        code: details.code ?? (status === 401 && operation === 'login' ? 'INVALID_CREDENTIALS' : undefined),
        status,
        data: details.data,
    }
}
