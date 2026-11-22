import type { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios'

type MaybePromise<T> = T | Promise<T>

export interface RequestErrorContext {
    error: unknown
    /** Error thrown by Axios before the request layer normalizes it. */
    originalError: unknown
    message: string
    code?: string
    httpStatus?: number
    data?: unknown
    config?: unknown
}

export type RequestErrorHandler = (context: RequestErrorContext) => void | Promise<void>

/** Application callbacks around the framework's auth and error lifecycle. */
export interface RequestHooks {
    /** Overrides the default access-token lookup for this request. */
    getAccessToken?: (store: AuthStoreShape, config: InternalAxiosRequestConfig) => MaybePromise<string | null>
    /** Overrides the default Bearer Authorization header. */
    setAuthHeader?: (
        config: InternalAxiosRequestConfig,
        token: string | null,
    ) => MaybePromise<InternalAxiosRequestConfig | void>
    /** Runs after the auth header has been applied, including on retries. */
    onRequest?: (config: InternalAxiosRequestConfig) => MaybePromise<InternalAxiosRequestConfig | void>
    /** Runs after a successful response, including successful retry responses. */
    onResponse?: (response: AxiosResponse) => MaybePromise<AxiosResponse | void>
    /** Runs after error normalization; false skips errorHandler. */
    onError?: (context: RequestErrorContext) => MaybePromise<boolean | void>
}

/**
 * The auth store shape that the request layer needs. This is the
 * minimum surface the request layer uses; it does NOT import the real
 * `@healseek/stores/auth` to avoid a runtime circular dependency.
 */
export interface AuthStoreShape {
    /** Current access token (or null if signed out). */
    getAccessToken: () => string | null
}

/** Options accepted by `installRequest`. */
export interface RequestOptions {
    baseURL: string
    timeout?: number
    /** Accessor that returns the auth-store shape (used by interceptors). */
    useStore: () => AuthStoreShape
    /** Application overrides for token, header, request, response and error handling. */
    hooks?: RequestHooks
    /** Whether to log request/response info to the console. */
    debug?: boolean
    /** Optional app-owned error notification/logging hook. */
    errorHandler?: RequestErrorHandler
}

/** Transport overrides used by direct `installRequest()` integrations.
 *
 * Normal applications register these values through `registerRequestSetup()`;
 * the framework supplies the auth store bridge and endpoint modules stay in
 * the application.
 */
export type RequestOptionsOverrides = Partial<Omit<RequestOptions, 'useStore'>>

/** Vue injection key — apps use `inject(REQUEST_KEY)` to get the instance. */
export const REQUEST_KEY = Symbol('frameworkRequest') as InjectionKey<AxiosInstance>

import type { InjectionKey } from 'vue'
