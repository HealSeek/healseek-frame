import './api/request'
import './router'
import './locales'
import './style.css'

import App from './App.vue'
import preferences from './preferences'
import { createApp } from '@healseek/app'

const { mount } = await createApp({ root: App, preferences })

mount('#app')
