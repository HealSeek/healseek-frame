import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('../../ui-kit/shadcn-vue/src', import.meta.url)),
            // Keep workspace source packages on one module id. Without these
            // aliases Vitest can resolve `@healseek/stores` once through the
            // app's importer and once through the root symlink, creating two
            // auth stores during multi-test bootstrap.
            '@healseek/stores/auth': resolve(fileURLToPath(new URL('../stores', import.meta.url)), 'src/auth/index.ts'),
            '@healseek/stores$': resolve(fileURLToPath(new URL('../stores', import.meta.url)), 'src/index.ts'),
            // Resolve against this package's linked dependencies. The root
            // workspace intentionally does not expose Vue/Pinia as root
            // dependencies, so a ../../../node_modules alias breaks when
            // pnpm recreates workspace links.
            pinia: resolve(fileURLToPath(new URL('./node_modules/pinia', import.meta.url))),
            vue: resolve(fileURLToPath(new URL('./node_modules/vue', import.meta.url))),
        },
    },
    test: {
        environment: 'happy-dom',
        globals: false,
        // Registration and Pinia are intentionally process-singletons during
        // framework bootstrap. Run these tests in one file at a time so a
        // locale test cannot reset another test's active app mid-navigation.
        fileParallelism: false,
        include: ['test/**/*.test.ts'],
    },
})
