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

const dialogEl = ref<HTMLDialogElement | null>(null)

// Restored to whatever it was before locking, rather than assumed to be '',
// so this doesn't clobber an overflow style some other part of the app set.
let previousBodyOverflow = ''

// `<dialog>`'s own open/closed state is imperative — showModal()/close() rather
// than an attribute Vue can bind — so it has to be driven from the prop here
// instead of a `v-if` in the template. `flush: 'post'` (with `immediate`) is
// what makes this safe to run on mount: it defers the callback until after the
// initial render, the same point `onMounted` would fire, so `dialogEl.value`
// is guaranteed to exist even when a first run opens the dialog immediately —
// and since Vue resolves cascading updates within a flush before the browser
// paints, deferring `reset()` here too doesn't risk a flash of stale fields.
//
// showModal() gives focus containment and an inert, top-layer background for
// free, but — confirmed by hand, not assumed — it does *not* stop the page
// behind the ::backdrop from scrolling under wheel/touch input. That still
// has to be locked explicitly.
watch(
  () => props.open,
  (open) => {
    if (open) {
      reset()
      dialogEl.value?.showModal()
      previousBodyOverflow = document.body.style.overflow
      document.body.style.overflow = 'hidden'
    } else {
      dialogEl.value?.close()
      document.body.style.overflow = previousBodyOverflow
    }
  },
  { immediate: true, flush: 'post' },
)

/**
 * `::backdrop` isn't a real element, so a click "on the backdrop" is a click
 * that lands directly on the dialog itself rather than on any of its content —
 * but that's also true of a click in the dialog's own padding, which target
 * equality alone can't tell apart from one. `offsetX`/`offsetY` are relative
 * to the dialog's own padding box regardless of its internal scroll position,
 * so comparing them against its content dimensions catches only clicks that
 * actually fall outside that box — the true backdrop.
 */
function onDialogClick(event: MouseEvent) {
  const dialog = dialogEl.value
  if (!dialog || event.target !== dialog) return
  const inside =
    event.offsetX >= 0 &&
    event.offsetX <= dialog.clientWidth &&
    event.offsetY >= 0 &&
    event.offsetY <= dialog.clientHeight
  if (!inside) dismiss()
}

/**
 * The native `close` event fires for Escape and backdrop-driven cancellation
 * as well as our own programmatic `close()` call below. Routing it through
 * `dismiss()` is what makes Escape count as "seen" for onboarding purposes —
 * but `dismiss()` itself triggers that same `close()` call via the watcher
 * above, which would re-enter here a second time once the dialog is already
 * closed. Checking `props.open` first — true only when the browser initiated
 * this, not us — keeps `dismiss()` to a single call either way.
 */
function onNativeClose() {
  if (props.open) dismiss()
}

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
  <!-- No `v-if`: the element stays mounted so `dialogEl` is stable, and
       `showModal()`/`close()` (driven from `open` above) are what actually
       show and hide it. `no-print` has to live here rather than on a wrapper,
       since Teleport moves this element outside `main` entirely. -->
  <Teleport to="body">
    <!-- `<dialog>` is already a native interactive/modal element with its own
         keyboard handling (Escape) built in; the click handler below is only
         the standard click-on-the-backdrop-to-dismiss pattern, not a fake
         button standing in for one. -->
    <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
    <dialog
      ref="dialogEl"
      class="panel no-print"
      aria-labelledby="prefs-title"
      @click="onDialogClick"
      @close="onNativeClose"
    >
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
    </dialog>
  </Teleport>
</template>

<style scoped>
.panel {
  color: inherit;
  background: var(--card);
  border: 1px solid var(--line);
  border-top: 3px double var(--brass);
  border-radius: 6px;
  padding: 22px;
  /* `width: 100%` of the fixed-position containing block set up by
     `dialog:modal`'s UA-stylesheet `inset: 0` is the viewport, so this is
     the same 20px gutter the old flex-centered backdrop gave for free. */
  width: calc(100% - 40px);
  max-width: 420px;
  max-height: 90vh;
  overflow-y: auto;
}
.panel::backdrop {
  background: rgba(0, 0, 0, 0.45);
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
