import { registerAppLocales } from '@healseek/app'

registerAppLocales({ modules: import.meta.glob('./**/*.json') })
