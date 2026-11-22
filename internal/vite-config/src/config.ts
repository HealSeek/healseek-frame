
import type { Plugin, UserConfig } from 'vite';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { loadEnv } from 'vite'

const __dirname = dirname(fileURLToPath(import.meta.url))

export interface ViteConfig extends UserConfig {
    /**
     * 是否启用Vue Devtools 默认读取VITE_DEVTOOLS环境变量
     */
    devtools?: boolean;
    /**
     * Optional Vite plugins that ship with the framework. Apps opt in
     * per-flag. Each plugin is lazily imported so apps that don't use
     * them don't pay the dep cost.
     */
    vitePlugins?: {
        /** `vite-plugin-mock` for dev JSON endpoints. */
        mock?: boolean | { prefix?: string }
        /** `vite-plugin-compression` for gzip/brotli at build time. */
        compression?: boolean | { algorithm?: 'gzip' | 'brotli' | 'deflate' | 'deflate-raw' }
        /** `rollup-plugin-visualizer` to emit a `stats.html` bundle map. */
        visualizer?: boolean | { template?: 'treemap' | 'sunburst' | 'network' }
    };
}

const APP_CONFIG_GLOBAL = '_HEALSEEK_APP_CONF_'

/**
 * Mirrors vben-admin's extra-app-config plugin.
 *
 * `VITE_GLOB_*` values are build-time values in development and are emitted
 * into a small `_app.config.js` asset for production. This lets a deployed
 * bundle change its API endpoint without rebuilding the application.
 */
function appConfigPlugin(): Plugin {
    let configBase = '/'
    let source = `${APP_CONFIG_GLOBAL}={};`

    return {
        name: 'healseek:extra-app-config',
        apply: 'build',
        configResolved(config) {
            configBase = config.base.endsWith('/') ? config.base : `${config.base}/`
            const env = loadEnv(config.mode, config.root, '')
            const values = Object.fromEntries(
                Object.entries(env).filter(([key]) => key.startsWith('VITE_GLOB_')),
            )
            const variable = `window.${APP_CONFIG_GLOBAL}`
            source = `${variable}=${JSON.stringify(values)};Object.freeze(${variable});Object.defineProperty(window,"${APP_CONFIG_GLOBAL}",{configurable:false,writable:false});`
        },
        generateBundle() {
            this.emitFile({
                fileName: '_app.config.js',
                source,
                type: 'asset',
            })
        },
        transformIndexHtml(html) {
            return {
                html,
                tags: [{
                    attrs: { src: `${configBase}_app.config.js` },
                    tag: 'script',
                }],
            }
        },
    }
}

/**
 * 框架级 Vite 配置预设
 *
 * 内置：Vue、Tailwind CSS 4、appConfigPlugin、# 路径别名
 * 应用层可传入自定义配置覆盖，不使用也不影响
 *
 * @example
 * ```ts
 * // apps/xxx/vite.config.ts — 最简用法
 * import { defineViteConfig } from '@healseek/vite-config';
 * export default defineViteConfig();
 *
 * // 自定义覆盖
 * export default defineViteConfig({
 *   plugins: [myPlugin()],
 *   server: { port: 3000 },
 * });
 * ```
 */
export const defineViteConfig = (config: ViteConfig = {}): UserConfig => {
    const {
        devtools: _devtools,
        vitePlugins,
        plugins: appPlugins = [],
        resolve: appResolve,
        optimizeDeps: appOptimizeDeps,
        ...restConfig
    } = config;

    // Framework-provided Vite plugins, each gated by an opt-in flag so
    // apps that don't need them don't pay the dep cost (the plugin
    // modules are lazily imported below).
    const frameworkPlugins: NonNullable<ViteConfig['plugins']> = []

    if (vitePlugins?.mock) {
        const opts = typeof vitePlugins.mock === 'object' ? vitePlugins.mock : {}
        const prefix = (opts as { prefix?: string }).prefix ?? '/mock'
        // Synchronous import is fine here — these are dev-only deps and
        // the bundler will tree-shake the unused branches in prod.
        const { default: vitePluginMock } = require('vite-plugin-mock') as {
            default: (config: any) => any
        }
        frameworkPlugins.push(vitePluginMock({
            prefix,
            supportTs: true,
        }))
    }

    if (vitePlugins?.compression) {
        const opts = typeof vitePlugins.compression === 'object' ? vitePlugins.compression : {}
        const algorithm = opts.algorithm ?? 'gzip'
        const { default: vitePluginCompression } = require('vite-plugin-compression') as {
            default: (config: any) => any
        }
        frameworkPlugins.push(vitePluginCompression({ algorithm }))
    }

    if (vitePlugins?.visualizer) {
        const opts = typeof vitePlugins.visualizer === 'object' ? vitePlugins.visualizer : {}
        const template = (opts as { template?: 'treemap' | 'sunburst' | 'network' }).template ?? 'treemap'
        const { visualizer } = require('rollup-plugin-visualizer') as {
            visualizer: (config?: any) => any
        }
        frameworkPlugins.push(visualizer({ template, filename: 'stats.html', gzipSize: true }))
    }

    const frameworkOptimizeDepsInclude = [
        '@iconify/vue',
        '@internationalized/date',
        '@lucide/vue',
        '@radix-icons/vue',
        '@vee-validate/zod',
        '@vueuse/core',
        'axios',
        'chart.js',
        'class-variance-authority',
        'clsx',
        'pinia',
        'pinia-plugin-persistedstate',
        'radix-ui',
        'reka-ui',
        'tailwind-merge',
        'vee-validate',
        'vue-chartjs',
        'vue-input-otp',
        'vue-i18n',
        'vue-router',
        'vue-sonner',
        'zod',
    ]
    const frameworkOptimizeDepsExclude = [
        '@healseek/config',
        '@healseek/layouts',
        '@healseek/components',
        '@healseek/router',
        '@healseek/stores',
        '@healseek/uikit-shadcnui',
        '@healseek/forms',
        '@healseek/views',
        '@healseek/app',
        '@healseek/app-ui',
        '@healseek/composables',
        '@healseek/request',
        '@healseek/request/internal',
        '@healseek/permission',
        '@healseek/tabs',
        '@healseek/shared',
        '@healseek/router/internal',
    ]

    return {
        resolve: {
            alias: {
                '#': resolve(process.cwd(), 'src'),
                '@': resolve(__dirname, '../../../packages/ui-kit/shadcn-vue/src'),
                // `@healseek/shared` exposes subpath-only exports (icons/utils).
                // Pin it to the workspace source so Vite can resolve those
                // subpaths even when a pnpm symlink has not been prebundled.
                '@healseek/shared/icons': resolve(__dirname, '../../../packages/shared/src/icons/index.ts'),
                '@healseek/shared/utils': resolve(__dirname, '../../../packages/shared/src/utils/index.ts'),
                '@healseek/shared': resolve(__dirname, '../../../packages/shared/src'),
                // Framework internals are imported by @healseek/app itself.
                // Resolve them to workspace source explicitly so a stale or
                // partially linked pnpm workspace cannot leave a dev server
                // with a 500 while resolving the subpath exports.
                '@healseek/router/internal': resolve(__dirname, '../../../packages/core/router/src/internal.ts'),
                '@healseek/request/internal': resolve(__dirname, '../../../packages/core/request/src/internal.ts'),
                ...(appResolve?.alias as Record<string, string>),
            },
            ...appResolve,
        },
        // Workspace source packages are consumed directly from `src/`
        // (no build step) — they don't need dep-pre-bundling. Excluding
        // them also avoids the Vite/rolldown dep-scan trying to resolve
        // a tsconfig adjacent to each `src/index.ts`, which would fail
        // for packages that only have a package-root `tsconfig.json`.
        optimizeDeps: {
            ...appOptimizeDeps,
            include: Array.from(new Set([
                ...frameworkOptimizeDepsInclude,
                ...(appOptimizeDeps?.include ?? []),
            ])),
            exclude: Array.from(new Set([
                ...frameworkOptimizeDepsExclude,
                ...(appOptimizeDeps?.exclude ?? []),
            ])),
        },
        plugins: [
            vue(),
            tailwindcss(),
            appConfigPlugin(),
            ...frameworkPlugins,
            ...appPlugins,
        ],
        ...restConfig,
    };
};
