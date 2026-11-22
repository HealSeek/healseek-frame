/**
 * Unified HTTP client for the framework.
 *
 * Provides a single axios instance wired with Bearer token injection and
 * error normalization. The application owns 401 recovery and logout. It
 * pairs with the framework auth store and installs once per app via
 * `installRequest` in `createApp`.
 */
import { inject } from 'vue'
import type { AxiosInstance } from 'axios'
import { REQUEST_KEY } from './types'

export { getRequestErrorDetails, RequestError } from './error'
export type { RequestErrorDetails } from './error'
export {
    getResponseEnvelopeDetails,
    unwrapResponseEnvelope,
    type ResponseEnvelopeCode,
    type ResponseEnvelopeDetails,
    type ResponseEnvelopeOptions,
} from './envelope'
export type {
    RequestErrorContext,
    RequestErrorHandler,
    RequestHooks,
} from './types'
export {
    getRequestClient,
    registerRequestSetup,
    registerSessionRestore,
    type RequestRegistration,
    type RequestSetupContext,
} from './registry'

// Realtime composables — exported from the main barrel so apps can
// `import { useWebSocket, useEventSource } from '@healseek/request'`
// without reaching into deep paths.
export { useWebSocket, type UseWebSocketOptions, type WebSocketState } from './useWebSocket'
export {
    useEventSource,
    useEventSourceSession,
    type EventSourceCompletePayload,
    type EventSourceErrorPayload,
    type EventSourceEventId,
    type EventSourceFactory,
    type EventSourceFactoryOptions,
    type EventSourceHeartbeatPayload,
    type EventSourceErrorHandler,
    type EventSourceLike,
    type EventSourceMessagePayload,
    type EventSourceProgressPayload,
    type EventSourceProtocolEventPayload,
    type EventSourceProtocolEvent,
    type EventSourceProtocolPayload,
    type EventSourceSessionItem,
    type EventSourceSessionStatus,
    type EventSourceState,
    type EventSourceTerminalState,
    type UseEventSourceOptions,
    type UseEventSourceReturn,
    type UseEventSourceSessionOptions,
} from './useEventSource'

/** Convenience: pull the axios instance from a component context. */
export function useRequest(): AxiosInstance {
    const instance = inject(REQUEST_KEY)
    if (!instance) {
        throw new Error(
            '[request] useRequest() called outside a createApp that ran installRequest().',
        )
    }
    return instance
}
