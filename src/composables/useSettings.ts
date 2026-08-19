import { computed, ref, watch } from 'vue'
import { readJSON, writeJSON } from '../lib/storage'
import type { ExemptPeriod, RequirementEntry, RequirementSchedule } from '../config/types'

const STORAGE_KEY = 'work-search-log:settings:v2'
const LEGACY_KEY = 'work-search-log:settings:v1'

export interface Settings {
  /**
   * Whose log this is, for the printed header. Deliberately the only personal
   * detail kept: a browser-only app has nowhere safe to hold an SSN or a claim
   * number, since any key protecting them would sit in the same storage.
   */
  name: string
  /** Null until the claimant picks one; the generic config stands in meanwhile. */
  stateCode: string | null
  requirements: RequirementEntry[]
  exemptPeriods: ExemptPeriod[]
  /** ISO timestamp the setup step was finished or dismissed. Null means never shown. */
  onboardedAt: string | null
}

/**
 * No preset weekly count, deliberately. The required number varies by state, by
 * county, and by claimant, and it appears on the claimant's determination letter
 * — guessing it would be worse than showing nothing.
 */
function blankSettings(): Settings {
  return { name: '', stateCode: null, requirements: [], exemptPeriods: [], onboardedAt: null }
}

function migrateLegacy(): Settings | null {
  const legacy = readJSON<{ minPerWeek?: unknown } | null>(LEGACY_KEY, null)
  const minPerWeek = legacy?.minPerWeek
  if (typeof minPerWeek !== 'number' || !Number.isFinite(minPerWeek)) return null
  return {
    name: '',
    stateCode: null,
    // Epoch-dated so it covers every week already logged, matching the single
    // fixed count those weeks were scored against before schedules existed.
    requirements: [{ effective: '1970-01-01', total: minPerWeek, minEmployerContacts: null }],
    exemptPeriods: [],
    onboardedAt: null,
  }
}

function loadSettings(): Settings {
  const stored = readJSON<Partial<Settings> | null>(STORAGE_KEY, null)
  if (stored) {
    return {
      name: typeof stored.name === 'string' ? stored.name : '',
      stateCode: typeof stored.stateCode === 'string' ? stored.stateCode : null,
      requirements: Array.isArray(stored.requirements) ? stored.requirements : [],
      exemptPeriods: Array.isArray(stored.exemptPeriods) ? stored.exemptPeriods : [],
      onboardedAt: typeof stored.onboardedAt === 'string' ? stored.onboardedAt : null,
    }
  }
  return migrateLegacy() ?? blankSettings()
}

const settings = ref<Settings>(loadSettings())

watch(
  settings,
  (value) => {
    writeJSON(STORAGE_KEY, value)
  },
  { deep: true },
)

const schedule = computed<RequirementSchedule>(() => ({
  requirements: settings.value.requirements,
  exemptPeriods: settings.value.exemptPeriods,
}))

/**
 * Records a weekly requirement taking effect on `effective` — normally the start
 * of the current week, so that correcting the number going forward never
 * retroactively marks already-logged weeks as failing.
 */
function setWeeklyRequirement(
  effective: string,
  total: number | null,
  minEmployerContacts: number | null = null,
) {
  const existing = settings.value.requirements.find((r) => r.effective === effective)
  if (existing) {
    existing.total = total
    existing.minEmployerContacts = minEmployerContacts
  } else {
    settings.value.requirements = [
      ...settings.value.requirements,
      { effective, total, minEmployerContacts },
    ].sort((a, b) => a.effective.localeCompare(b.effective))
  }
}

function setStateCode(code: string | null) {
  settings.value.stateCode = code
}

function setName(name: string) {
  settings.value.name = name.trim()
}

/**
 * Marks setup as seen. Called whether it was filled in or dismissed, so someone
 * who'd rather not answer isn't asked again every visit.
 */
function markOnboarded() {
  settings.value.onboardedAt = new Date().toISOString()
}

/** True on a first run, when setup hasn't been shown yet. */
const needsOnboarding = computed(() => settings.value.onboardedAt === null)

function addExemptPeriod(period: ExemptPeriod) {
  settings.value.exemptPeriods = [...settings.value.exemptPeriods, period].sort((a, b) =>
    a.start.localeCompare(b.start),
  )
}

function removeExemptPeriod(index: number) {
  settings.value.exemptPeriods = settings.value.exemptPeriods.filter((_, i) => i !== index)
}

export function useSettings() {
  return {
    settings,
    schedule,
    needsOnboarding,
    setWeeklyRequirement,
    setStateCode,
    setName,
    markOnboarded,
    addExemptPeriod,
    removeExemptPeriod,
  }
}
