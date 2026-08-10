import { ref, watch } from 'vue'
import { readJSON, writeJSON } from '../lib/storage'

const STORAGE_KEY = 'work-search-log:settings:v1'

interface Settings {
  minPerWeek: number
}

const settings = ref<Settings>(readJSON<Settings>(STORAGE_KEY, { minPerWeek: 3 }))

watch(
  settings,
  (value) => {
    writeJSON(STORAGE_KEY, value)
  },
  { deep: true },
)

export function useSettings() {
  return { settings }
}
