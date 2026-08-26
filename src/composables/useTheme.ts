import { computed, ref, watchEffect } from 'vue'
import { readJSON, writeJSON } from '../lib/storage'

const STORAGE_KEY = 'work-search-log:theme:v1'

type ThemePreference = 'light' | 'dark' | null

const preference = ref<ThemePreference>(readJSON<ThemePreference>(STORAGE_KEY, null))
const systemIsDark = ref(false)

const isDark = computed(() => (preference.value ? preference.value === 'dark' : systemIsDark.value))

function toggleTheme() {
  preference.value = isDark.value ? 'light' : 'dark'
  writeJSON(STORAGE_KEY, preference.value)
}

let initialized = false

/**
 * Deferred to first call rather than run at module scope, so importing this
 * module has no side effects — jsdom (and other test environments) has no
 * matchMedia.
 */
function init() {
  if (initialized) return
  initialized = true

  const media = window.matchMedia('(prefers-color-scheme: dark)')
  systemIsDark.value = media.matches
  media.addEventListener('change', (e) => {
    systemIsDark.value = e.matches
  })

  watchEffect(() => {
    document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
  })
}

export function useTheme() {
  init()
  return { isDark, toggleTheme }
}
