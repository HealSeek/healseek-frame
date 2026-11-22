import { getResponseEnvelopeDetails, RequestError, type ResponseEnvelopeOptions } from '@healseek/request'
import type { AxiosResponse, InternalAxiosRequestConfig } from 'axios'

/** The demo backend's protocol stays in the application layer. */
export const appEnvelopeOptions: ResponseEnvelopeOptions = {
    codeKeys: ['code'],
    successKeys: ['success'],
    dataKeys: ['data'],
    messageKeys: ['message', 'msg', 'statusMessage'],
    successCodes: ['0', 0],
}

export function unwrapAppResponse(response: AxiosResponse): AxiosResponse {
    const details = getResponseEnvelopeDetails(response.data, appEnvelopeOptions)
    if (!details.isEnvelope) return response
    if (details.success === false) {
        throw new RequestError(details.message ?? 'Request failed', {
            code: details.code === undefined ? undefined : String(details.code),
            httpStatus: response.status,
            data: response.data,
            config: response.config as InternalAxiosRequestConfig,
        })
    }
    response.data = details.data
    return response
}
