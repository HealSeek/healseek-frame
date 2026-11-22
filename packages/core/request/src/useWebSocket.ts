/**
 * useWebSocket — auto-reconnecting WebSocket composable with heartbeat
 * and message dispatch. Lives in @healseek/request so the realtime
 * primitives sit next to the HTTP client.
 */
import { onBeforeUnmount, ref, shallowRef } from 'vue'

export type WebSocketState = 'connecting' | 'open' | 'closed'

export interface UseWebSocketOptions {
    url: string
    protocols?: string | string[]
    /** Auto-reconnect on close. Default: true */
    reconnect?: boolean
    /** Delay between reconnect attempts (ms). Default: 3000 */
    reconnectDelay?: number
    /** Heartbeat interval (ms). Default: 25000. Set to 0 to disable. */
    heartbeatInterval?: number
    /** Custom heartbeat payload. Default: 'ping' (text frame). */
    heartbeatPayload?: string | (() => string)
    onMessage?: (data: unknown, raw: MessageEvent) => void
    onOpen?: (event: Event) => void
    onClose?: (event: CloseEvent) => void
    onError?: (event: Event) => void
}

export function useWebSocket(options: UseWebSocketOptions) {
    const state = ref<WebSocketState>('closed')
    const socket = shallowRef<WebSocket | null>(null)
    const reconnectTimer = shallowRef<ReturnType<typeof setTimeout> | null>(null)
    const heartbeatTimer = shallowRef<ReturnType<typeof setInterval> | null>(null)

    function clearTimers() {
        if (reconnectTimer.value) {
            clearTimeout(reconnectTimer.value)
            reconnectTimer.value = null
        }
        if (heartbeatTimer.value) {
            clearInterval(heartbeatTimer.value)
            heartbeatTimer.value = null
        }
    }

    function startHeartbeat() {
        const interval = options.heartbeatInterval ?? 25000
        if (interval <= 0) return
        heartbeatTimer.value = setInterval(() => {
            if (socket.value?.readyState === WebSocket.OPEN) {
                const payload =
                    typeof options.heartbeatPayload === 'function'
                        ? options.heartbeatPayload()
                        : (options.heartbeatPayload ?? 'ping')
                socket.value.send(payload)
            }
        }, interval)
    }

    function connect() {
        if (typeof WebSocket === 'undefined') return
        state.value = 'connecting'
        try {
            const ws = new WebSocket(options.url, options.protocols)
            socket.value = ws

            ws.addEventListener('open', (event) => {
                state.value = 'open'
                startHeartbeat()
                options.onOpen?.(event)
            })
            ws.addEventListener('message', (raw) => {
                let data: unknown = raw.data
                if (typeof data === 'string') {
                    try { data = JSON.parse(data) } catch { /* leave as string */ }
                }
                options.onMessage?.(data, raw)
            })
            ws.addEventListener('error', (event) => {
                options.onError?.(event)
            })
            ws.addEventListener('close', (event) => {
                state.value = 'closed'
                clearTimers()
                options.onClose?.(event)
                socket.value = null
                if (options.reconnect !== false) {
                    reconnectTimer.value = setTimeout(
                        connect,
                        options.reconnectDelay ?? 3000,
                    )
                }
            })
        } catch (err) {
            state.value = 'closed'
            options.onError?.(err as Event)
        }
    }

    function send(data: string | ArrayBuffer | Blob) {
        socket.value?.send(data)
    }

    function close(code?: number, reason?: string) {
        clearTimers()
        options.reconnect = false
        socket.value?.close(code, reason)
        socket.value = null
        state.value = 'closed'
    }

    connect()

    onBeforeUnmount(() => {
        options.reconnect = false
        clearTimers()
        socket.value?.close()
        socket.value = null
    })

    return { state, socket, send, close }
}
