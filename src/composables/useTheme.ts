import { computed, ref, watchEffect } from 'vue'
import { readJSON, writeJSON } from '../lib/storage'

const STORAGE_KEY = 'work-search-log:theme:v1'

type ThemePreference = 'light' | 'dark' | null

const preference = ref<ThemePreference>(readJSON<ThemePreference>(STORAGE_KEY, null))

const media = window.matchMedia('(prefers-color-scheme: dark)')
const systemIsDark = ref(media.matches)
media.addEventListener('change', (e) => {
  systemIsDark.value = e.matches
})

const isDark = computed(() => (preference.value ? preference.value === 'dark' : systemIsDark.value))

watchEffect(() => {
  document.documentElement.dataset.theme = isDark.value ? 'dark' : 'light'
})

function toggleTheme() {
  preference.value = isDark.value ? 'light' : 'dark'
  writeJSON(STORAGE_KEY, preference.value)
}

export function useTheme() {
  return { isDark, toggleTheme }
}
