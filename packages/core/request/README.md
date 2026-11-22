# @healseek/request

`@healseek/request` owns the single Axios instance created by `createApp()`. The
application registers its transport policy before startup and receives the
client from `getRequestClient()` in its API modules.

```ts
// src/api/request.ts
import { registerRequestSetup } from '@healseek/app'
import { appConfig } from '../config/env'

registerRequestSetup({
  baseURL: appConfig.apiURL,
  hooks: {
    onRequest(config) {
      config.headers.set('X-App-Client', 'demo')
      return config
    },
    onError(context) {
      console.error(context.message)
      return false
    },
  },
  setup({ client }) {
    // Add application interceptors or a mock adapter here.
    void client
  },
})
```

The framework adds the access token and normalizes failures to `RequestError`.
Applications own endpoint paths, response envelopes, error text, 401 single
flight refresh and refresh-failure navigation. `registerSessionRestore()` is
used for the hard-refresh flow. API modules call `getRequestClient()` and do
not create another Axios instance.

`@healseek/request` does not assume a universal business success code. Apps can
use `getResponseEnvelopeDetails()` with their own `successCodes`, data keys and
message aliases. The parser supports nested Nitro `data` wrappers and the
common `message`/`msg` aliases; the Playwright demo keeps its `code: '0'`
protocol in `apps/playwright/src/api/envelope.ts`.

Realtime helpers are also exported as `useWebSocket` and `useEventSource`.

`useEventSource` keeps the original `url`, `reconnect`, `reconnectDelay`,
`eventName`, and callback options while adding injectable transport factories,
last-event-id recovery, exponential reconnect backoff, heartbeat watchdogs,
terminal `complete`/`error` events, and explicit `pause()`/`resume()`/`retry()`
controls. The exported `EventSourceProtocolEventPayload<T>` union describes
the `message`, `progress`, `heartbeat`, `complete`, and `error` payloads,
including their optional `id`, `data`, `progress`, `heartbeat`, `message`, and
`error` fields. Native `EventSource` cannot set arbitrary request headers, so
its last event id is sent as the configurable `lastEventIdParam` query
parameter; custom factories receive the id directly and may send it as a
header. The demo `/demo/events` endpoint is intentionally public so the
component showcase can connect with native `EventSource`; the framework does
not choose an authentication strategy. An authenticated application must
choose a cookie, an explicitly permitted query token, or an injected
fetch/stream factory and keep that policy in the application layer.

Use `useEventSourceSession` when a bounded, deduplicated event buffer is
needed. It exposes `items`, `status`, `totalBytes`, and `clear()` while the
transport remains independent from any DOM scrolling or rendering code. Its
default buffer policy keeps the newest 1000 items and drops the oldest items
when `maxItems` or `maxBytes` is exceeded; set `dropOldest: false` to discard
the newest item instead. In that mode, discarded items are not passed to
`onItem`. Items with the same SSE id are ignored while that ID remains in the
retained buffer. Eviction also removes its deduplication entry, so a replay of
an evicted ID can be accepted again. The ID index has at most one entry per
retained item; rejected items are not indexed, and `dedupe: false` does not
accumulate IDs. `clear()` resets both the buffer and the index but preserves
the transport's Last-Event-ID for reconnection. When
`heartbeatTimeout` is enabled, only heartbeat events refresh the watchdog;
ordinary messages and progress events do not count as a heartbeat.
