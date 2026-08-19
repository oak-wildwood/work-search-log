import { computed } from 'vue'
import { useSettings } from './useSettings'
import { getStateConfig, isStale } from '../config'

/** The state config in force, resolved reactively from the selected state code. */
export function useStateConfig() {
  const { settings } = useSettings()

  const resolved = computed(() => getStateConfig(settings.value.stateCode))
  const config = computed(() => resolved.value.config)
  /** True when a state was selected but no config is bundled for it. */
  const isFallback = computed(() => resolved.value.isFallback)
  const stale = computed(() => isStale(config.value))

  return { config, isFallback, stale }
}
