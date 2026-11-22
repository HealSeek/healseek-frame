import { loadEnv, type ConfigEnv } from 'vite'
import { defineViteConfig } from '@healseek/vite-config'

function envPort(value: string | undefined, fallback: number): number {
    const port = Number.parseInt(value ?? '', 10)
    return Number.isInteger(port) && port > 0 && port < 65_536 ? port : fallback
}

function envBoolean(value: string | undefined, fallback: boolean): boolean {
    if (value == null || value.trim() === '') return fallback
    return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

// https://vite.dev/config/
export default ({ mode }: ConfigEnv) => {
    const env = loadEnv(mode, process.cwd(), '')
    const port = envPort(env.VITE_PORT, 5174)
    const nitroMock = envBoolean(env.VITE_NITRO_MOCK, false)
    return defineViteConfig({
        base: env.VITE_BASE || '/',
        devtools: envBoolean(env.VITE_DEVTOOLS, false),
        server: {
            host: true,
            port,
            proxy: nitroMock ? {
                '/api': {
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                    target: 'http://127.0.0.1:4174',
                },
            } : undefined,
        },
        preview: { port },
    })
}
