import { describe, expect, it, vi } from 'vitest'
import { getRequestErrorDetails, getResponseEnvelopeDetails, RequestError } from '../src'
import { installRequest } from '../src/internal'
import type { RequestOptions } from '../src/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

function makeStore() {
    const accessToken = 'access-1'
    return {
        getAccessToken: () => accessToken,
    }
}

function makeOptions(store: ReturnType<typeof makeStore>, overrides: Partial<RequestOptions> = {}): RequestOptions {
    return { baseURL: 'http://localhost', useStore: () => store, ...overrides }
}

describe('@healseek/request', () => {
    it('keeps native FormData through Axios transforms while still serializing plain JSON objects', async () => {
        const instance = installRequest({ provide: vi.fn() } as any, makeOptions(makeStore()))
        const captured: any[] = []
        instance.defaults.adapter = async (config) => {
            captured.push(config)
            return { data: {}, status: 200, statusText: 'OK', headers: {}, config }
        }
        const form = new FormData()
        form.append('file', new Blob(['image bytes'], { type: 'image/png' }), 'cover.png')
        form.append('variant', 'original')
        await instance.post('/upload', form)
        expect(captured[0].data).toBe(form)
        expect(captured[0].data.get('file').name).toBe('cover.png')
        expect(captured[0].headers.get('Content-Type')).not.toContain('application/json')
        await instance.post('/record', { title: 'JSON still works' })
        expect(captured[1].data).toBe('{"title":"JSON still works"}')
        expect(captured[1].headers.get('Content-Type')).toBe('application/json')
    })

    it('normalizes Nitro nested error data', () => {
        const details = getRequestErrorDetails({
            response: {
                status: 400,
                data: { statusCode: 400, statusMessage: 'Bad Request', data: { code: 'USERNAME_EXISTS', message: 'username already exists' } },
            },
        })
        expect(details).toMatchObject({ httpStatus: 400, code: 'USERNAME_EXISTS', message: 'username already exists' })
    })

    it('normalizes message aliases and keeps the backend data available', () => {
        expect(getRequestErrorDetails({
            response: {
                status: 400,
                data: { data: { code: 'INVALID', msg: 'invalid request' } },
            },
        })).toMatchObject({
            httpStatus: 400,
            code: 'INVALID',
            message: 'invalid request',
        })
    })

    it('normalizes numeric business codes to the string error-code contract', () => {
        expect(getRequestErrorDetails({
            response: {
                status: 400,
                data: { code: 1001, msg: 'invalid request' },
            },
        })).toMatchObject({
            httpStatus: 400,
            code: '1001',
            message: 'invalid request',
        })
    })

    it('reads status, code and msg from a nested error payload', () => {
        expect(getRequestErrorDetails({
            data: {
                error: { status: 422, errorCode: 1002, msg: 'validation failed' },
            },
        })).toMatchObject({
            httpStatus: 422,
            code: '1002',
            message: 'validation failed',
        })
    })

    it('supports an application-configured string success code and msg alias', () => {
        const details = getResponseEnvelopeDetails({
            code: '0',
            msg: 'ok',
            data: { id: 'demo' },
        }, {
            successCodes: ['0'],
            messageKeys: ['message', 'msg'],
        })

        expect(details).toMatchObject({
            isEnvelope: true,
            success: true,
            code: '0',
            message: 'ok',
            data: { id: 'demo' },
        })
    })

    it('unwraps an application envelope nested inside a Nitro data wrapper', () => {
        const details = getResponseEnvelopeDetails({
            statusCode: 200,
            statusMessage: 'OK',
            data: { code: '0', data: { id: 'nested-demo' }, msg: 'ok' },
        }, { successCodes: ['0'] })

        expect(details).toMatchObject({
            isEnvelope: true,
            success: true,
            code: '0',
            message: 'ok',
            data: { id: 'nested-demo' },
        })
    })

    it('marks a configured business error without treating it as an HTTP error', () => {
        const details = getResponseEnvelopeDetails({
            code: 'INVALID_CREDENTIALS',
            msg: 'invalid credentials',
            data: null,
        }, { successCodes: ['0'] })

        expect(details).toMatchObject({
            isEnvelope: true,
            success: false,
            code: 'INVALID_CREDENTIALS',
            message: 'invalid credentials',
        })
    })

    it('injects the current access token and exposes it to app interceptors', async () => {
        const store = makeStore()
        const instance = installRequest({ provide: vi.fn() } as any, makeOptions(store))
        let capturedHeader: string | undefined
        let capturedToken: string | null | undefined
        instance.defaults.adapter = vi.fn(async (config: any) => {
            capturedHeader = config.headers.get('Authorization')
            capturedToken = config.__authToken
            return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
        })
        await instance.get('/me')
        expect(capturedHeader).toBe('Bearer access-1')
        expect(capturedToken).toBe('access-1')
    })

    it('allows application token lookup and request/response hooks', async () => {
        const store = makeStore()
        const calls: string[] = []
        const instance = installRequest({ provide: vi.fn() } as any, makeOptions(store, {
            hooks: {
                getAccessToken: async (_store, config) => { calls.push(`token:${config.url}`); return 'custom-access' },
                setAuthHeader: async (config, token) => { calls.push(`header:${token}`); config.headers.set('X-Access-Token', token ?? '') },
                onRequest: async (config) => { calls.push(`request:${config.url}`) },
                onResponse: async (response) => { calls.push(`response:${response.status}`) },
            },
        }))
        let capturedToken: string | undefined
        instance.defaults.adapter = vi.fn(async (config: any) => {
            capturedToken = config.headers.get('X-Access-Token')
            return { data: { ok: true }, status: 200, statusText: 'OK', headers: {}, config }
        })
        await instance.get('/custom-headers')
        expect(capturedToken).toBe('custom-access')
        expect(calls).toEqual(['token:/custom-headers', 'header:custom-access', 'request:/custom-headers', 'response:200'])
    })

    it('does not refresh or retry a 401 response', async () => {
        const store = makeStore()
        const errorHandler = vi.fn()
        const instance = installRequest({ provide: vi.fn() } as any, makeOptions(store, { errorHandler }))
        let calls = 0
        instance.defaults.adapter = vi.fn(async (config: any) => {
            calls += 1
            const error: any = new Error('expired')
            error.config = config
            error.response = { status: 401, data: { message: 'expired' } }
            throw error
        })
        await expect(instance.get('/protected')).rejects.toMatchObject({ name: 'RequestError', httpStatus: 401, message: 'expired' })
        expect(calls).toBe(1)
        expect(errorHandler).toHaveBeenCalledOnce()
    })

    it('skips auth injection for auth endpoints and still normalizes errors', async () => {
        const store = makeStore()
        const instance = installRequest({ provide: vi.fn() } as any, makeOptions(store))
        let capturedHeader: string | undefined
        instance.defaults.adapter = vi.fn(async (config: any) => {
            capturedHeader = config.headers.get('Authorization')
            const error: any = new Error('invalid credentials')
            error.config = config
            error.response = { status: 401, data: { code: 'INVALID_CREDENTIALS', message: 'invalid credentials' } }
            throw error
        })
        await expect(instance.post('/auth/login', {}, { __skipAuth: true })).rejects.toMatchObject({ name: 'RequestError', code: 'INVALID_CREDENTIALS' })
        expect(capturedHeader).toBeUndefined()
    })

    it('normalizes server errors into RequestError and calls the app handler', async () => {
        const store = makeStore()
        const errorHandler = vi.fn()
        const instance = installRequest({ provide: vi.fn() } as any, makeOptions(store, { errorHandler }))
        instance.defaults.adapter = vi.fn(async (config: any) => {
            const error: any = new Error('backend exploded')
            error.config = config
            error.response = { status: 500, data: { message: 'backend exploded' } }
            throw error
        })
        await expect(instance.get('/failure')).rejects.toBeInstanceOf(RequestError)
        expect(errorHandler).toHaveBeenCalledWith(expect.objectContaining({ httpStatus: 500, message: 'backend exploded' }))
    })
})
