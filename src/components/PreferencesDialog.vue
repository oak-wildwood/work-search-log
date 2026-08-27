<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useSettings } from '../composables/useSettings'
import { useTheme } from '../composables/useTheme'
import { getStateConfig, listStateConfigs } from '../config'
import { resolveRequirement } from '../lib/requirements'
import { currentWeekKey } from '../lib/weeks'

const props = defineProps<{
  open: boolean
  /** First run gets explanatory copy; later visits are a plain settings panel. */
  firstRun?: boolean
}>()

const emit = defineEmits<{ close: [] }>()

const { settings, schedule, setWeeklyRequirement, setStateCode, setName, markOnboarded } =
  useSettings()
const { isDark, toggleTheme } = useTheme()

const states = listStateConfigs()

// Edited locally and only committed on save, so dismissing leaves nothing behind.
const draftName = ref('')
const draftState = ref('')

const draftConfig = computed(() => getStateConfig(draftState.value || null).config)

/** The number the state fixes for everyone, where it fixes one at all. */
const stateFixedCount = computed(() => draftConfig.value.weeklyRequirement ?? null)

const weekKey = computed(() => currentWeekKey(draftConfig.value.weekStartDay))

/**
 * Only what the person actually chose is stored; the state's own number fills in
 * behind it. That makes switching states re-derive the offered number for free,
 * while anything typed by hand survives the switch, with no provenance flag to
 * keep in sync.
 */
const enteredCount = ref<number | null>(null)

const draftCount = computed<number | null>({
  get: () => enteredCount.value ?? stateFixedCount.value,
  set: (value) => (enteredCount.value = value),
})

function reset() {
  draftName.value = settings.value.name
  draftState.value = settings.value.stateCode ?? ''
  enteredCount.value = resolveRequirement(schedule.value, weekKey.value)?.total ?? null
}

watch(
  () => props.open,
  (open) => open && reset(),
  { immediate: true },
)

const countHint = computed(() => {
  const config = draftConfig.value
  if (stateFixedCount.value !== null) {
    return `${config.agencyShort} sets this statewide. Your determination letter overrides it.`
  }
  if (config.requirementSource === 'county') {
    return `${config.agencyShort} sets this by ${config.jurisdictionLabel.toLowerCase()}. Your determination letter has your number.`
  }
  return 'Your determination letter has this number. Leave it blank if you don’t have it yet.'
})

function save() {
  setName(draftName.value)
  setStateCode(draftState.value || null)
  const count =
    typeof draftCount.value === 'number' && draftCount.value > 0 ? draftCount.value : null
  const existing = resolveRequirement(schedule.value, weekKey.value)?.total ?? null
  // Dated to this week, so correcting the number never reaches back and marks
  // already-logged weeks as failing.
  if (count !== existing) setWeeklyRequirement(weekKey.value, count, null)
  markOnboarded()
  emit('close')
}

function dismiss() {
  markOnboarded()
  emit('close')
}
</script>

<template>
  <!-- The dialog's real semantics live on .panel below; this is just a
       dimming/click-catching layer, not a control of its own — role
       "presentation" says so, and Escape (which bubbles up from whichever
       field inside .panel has focus) is the keyboard equivalent of the
       click-to-dismiss it offers to mouse users. -->
  <div
    v-if="open"
    class="backdrop no-print"
    role="presentation"
    @click.self="dismiss"
    @keydown.esc="dismiss"
  >
    <div class="panel" role="dialog" aria-modal="true" aria-labelledby="prefs-title">
      <h2 id="prefs-title">{{ firstRun ? 'Set up your log' : 'Preferences' }}</h2>
      <p v-if="firstRun" class="lede">
        Three questions, then you're done. You can change any of it later.
      </p>

      <label class="field">
        <span class="label">Your name</span>
        <input v-model="draftName" type="text" placeholder="For the printed log" />
      </label>

      <label class="field">
        <span class="label">State</span>
        <select v-model="draftState">
          <option value="">Not set — use the generic setup</option>
          <option v-for="s in states" :key="s.code" :value="s.code">
            {{ s.code }} — {{ s.agencyShort }}
          </option>
        </select>
      </label>

      <label class="field">
        <span class="label">Activities required each week</span>
        <input
          v-model.number="draftCount"
          type="number"
          min="1"
          placeholder="—"
          data-testid="weekly-requirement"
        />
        <span class="hint">
          {{ countHint }}
          <a
            v-if="draftConfig.requirementLookupUrl"
            :href="draftConfig.requirementLookupUrl"
            target="_blank"
            rel="noopener noreferrer"
          >
            Look up your {{ draftConfig.jurisdictionLabel.toLowerCase() }}
          </a>
        </span>
      </label>

      <div class="field row">
        <span class="label">Theme</span>
        <button class="ghost" type="button" @click="toggleTheme">
          {{ isDark ? '☀ Switch to light' : '☾ Switch to dark' }}
        </button>
      </div>

      <p class="privacy">
        Kept in this browser only — nothing is sent anywhere. Your name is the only personal detail
        stored. A claim number or Social Security number is never stored or asked for; the printed
        copy leaves a blank line for you to fill in by hand.
      </p>

      <div class="actions">
        <button class="primary" type="button" @click="save">
          {{ firstRun ? 'Start logging' : 'Save' }}
        </button>
        <button class="ghost" type="button" @click="dismiss">
          {{ firstRun ? 'Skip for now' : 'Cancel' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 50;
}
.panel {
  background: var(--card);
  border: 1px solid var(--line);
  border-top: 3px double var(--brass);
  border-radius: 6px;
  padding: 22px;
  width: 100%;
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}
h2 {
  font-family: var(--font-display);
  font-size: 20px;
  color: var(--green-deep);
  margin: 0 0 4px;
}
.lede {
  font-size: 13px;
  color: var(--muted);
  margin: 0 0 16px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 14px;
}
.field.row {
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
}
.label {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brass);
}
input,
select {
  font: inherit;
  font-size: 14px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--paper);
  color: inherit;
}
.hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
}
.hint a {
  color: var(--brass);
  white-space: nowrap;
}
.privacy {
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
  border-top: 1px solid var(--line);
  padding-top: 12px;
  margin: 18px 0 0;
}
.actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}
button {
  font: inherit;
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--line);
  background: var(--card);
  color: inherit;
}
button.primary {
  flex: 1;
  background: var(--ok);
  border-color: var(--ok);
  color: var(--paper);
  font-weight: 600;
}
button.ghost:hover,
button.primary:hover {
  border-color: var(--brass);
}
</style>
