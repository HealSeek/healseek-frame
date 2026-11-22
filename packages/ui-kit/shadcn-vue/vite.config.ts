import { defineViteConfig } from '@healseek/vite-config';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
// https://vite.dev/config/
export default defineViteConfig({
    resolve:{
        alias:{
            '@': resolve(__dirname, 'src'),
        }
    }
})
