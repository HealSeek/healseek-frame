import { describe, expect, it } from 'vitest'
import { RequestError } from '@healseek/request'
import { unwrapAppResponse } from './envelope'

function response(data: unknown) {
    return {
        data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {} as never,
    }
}

describe('playwright application response envelope', () => {
    it('unwraps the configured string success code', () => {
        expect(unwrapAppResponse(response({ code: '0', data: { id: 'demo' } })).data).toEqual({ id: 'demo' })
    })

    it('raises RequestError for a business error code and msg', () => {
        expect(() => unwrapAppResponse(response({ code: 'INVALID', msg: 'bad request', data: null }))).toThrowError(RequestError)
        try {
            unwrapAppResponse(response({ code: 'INVALID', msg: 'bad request', data: null }))
        } catch (error) {
            expect(error).toMatchObject({ code: 'INVALID', message: 'bad request', httpStatus: 200 })
        }
    })

    it('unwraps an application envelope inside Nitro data', () => {
        expect(unwrapAppResponse(response({ statusCode: 200, data: { code: '0', msg: 'ok', data: { id: 1 } } })).data).toEqual({ id: 1 })
    })
})
