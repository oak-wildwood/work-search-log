<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { Entry, EntryDraft } from '../types'
import { useStateConfig } from '../composables/useStateConfig'
import { resolveActivity } from '../config'

const { config } = useStateConfig()

const props = defineProps<{
  editing?: Entry | null
}>()

const emit = defineEmits<{
  submit: [draft: EntryDraft]
  cancel: []
}>()

function blankDraft(): EntryDraft {
  return {
    date: '',
    activityId: '',
    activity: '',
    siteAppliedOn: '',
    jobType: '',
    employer: '',
    address: '',
    phone: '',
    contactName: '',
    contactMethod: '',
    result: '',
    notes: '',
  }
}

const draft = reactive<EntryDraft>(blankDraft())
const message = ref('')
const datePinned = ref(false)
const showMoreFields = ref(false)

const OTHER_SITE = '__other__'
/** Stands in for an activity label that no longer maps to a type in the current config. */
const LEGACY_ACTIVITY = '__legacy__'

const siteChoice = ref('')
const legacyActivityLabel = ref('')

function isKnownSite(value: string): boolean {
  return config.value.siteOptions.includes(value)
}

function syncSiteChoice(value: string) {
  siteChoice.value = !value ? '' : isKnownSite(value) ? value : OTHER_SITE
}

const selectedActivity = computed(
  () => config.value.activityTypes.find((a) => a.id === draft.activityId) ?? null,
)

const showSiteField = computed(() => !selectedActivity.value?.offline)

watch(selectedActivity, (activity) => {
  if (activity?.offline) {
    draft.siteAppliedOn = ''
    siteChoice.value = ''
  }
})

watch(siteChoice, (choice) => {
  if (choice !== OTHER_SITE) {
    draft.siteAppliedOn = choice
  } else if (isKnownSite(draft.siteAppliedOn)) {
    draft.siteAppliedOn = ''
  }
})

watch(
  () => props.editing,
  (entry) => {
    Object.assign(draft, entry ? { ...entry } : blankDraft())
    syncSiteChoice(draft.siteAppliedOn)
    // An entry logged under a different config keeps its original label rather than
    // being silently reassigned or blanked.
    const resolved = entry ? resolveActivity(config.value, entry) : null
    if (resolved) {
      draft.activityId = resolved.id
      legacyActivityLabel.value = ''
    } else if (entry?.activity) {
      draft.activityId = LEGACY_ACTIVITY
      legacyActivityLabel.value = entry.activity
    } else {
      draft.activityId = ''
      legacyActivityLabel.value = ''
    }
  },
  { immediate: true },
)

function handleSubmit() {
  if (!draft.date || !draft.activityId) {
    message.value = 'Date and activity are required.'
    return
  }
  const keepingLegacy = draft.activityId === LEGACY_ACTIVITY
  emit('submit', {
    ...draft,
    activityId: keepingLegacy ? '' : draft.activityId,
    activity: keepingLegacy ? legacyActivityLabel.value : (selectedActivity.value?.label ?? ''),
  })
  if (props.editing) {
    message.value = ''
    return
  }
  const keepDate = datePinned.value ? draft.date : ''
  Object.assign(draft, blankDraft())
  draft.date = keepDate
  siteChoice.value = ''
  legacyActivityLabel.value = ''
  message.value = 'Saved.'
  setTimeout(() => {
    if (message.value === 'Saved.') message.value = ''
  }, 1800)
}

function handleCancel() {
  Object.assign(draft, blankDraft())
  siteChoice.value = ''
  legacyActivityLabel.value = ''
  emit('cancel')
}
</script>

<template>
  <form class="add-form" @submit.prevent="handleSubmit">
    <div class="card-head">
      <h2>{{ editing ? 'Edit activity' : 'Log an activity' }}</h2>
      <p class="hint" role="status" aria-live="polite">
        {{ message || 'Date and activity are required.' }}
      </p>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="f-date">Date</label>
        <div class="date-row">
          <input id="f-date" v-model="draft.date" type="date" required />
          <button
            type="button"
            class="pin-btn"
            :class="{ active: datePinned }"
            :aria-pressed="datePinned"
            title="Keep this date after saving, for backfilling several entries at once"
            @click="datePinned = !datePinned"
          >
            📌
          </button>
        </div>
      </div>
      <div class="field">
        <label for="f-activity">What you did</label>
        <select id="f-activity" v-model="draft.activityId" required>
          <option value="">Select an activity type…</option>
          <option v-for="opt in config.activityTypes" :key="opt.id" :value="opt.id">
            {{ opt.label }}
          </option>
          <option v-if="legacyActivityLabel" :value="LEGACY_ACTIVITY">
            {{ legacyActivityLabel }} (as logged)
          </option>
        </select>
      </div>
    </div>

    <div v-if="showSiteField" class="two-col">
      <div class="field">
        <label for="f-site">Site or source</label>
        <select id="f-site" v-model="siteChoice">
          <option value="">Select a site…</option>
          <option v-for="opt in config.siteOptions" :key="opt" :value="opt">{{ opt }}</option>
          <option :value="OTHER_SITE">Other…</option>
        </select>
        <input
          v-if="siteChoice === OTHER_SITE"
          v-model="draft.siteAppliedOn"
          type="text"
          placeholder="Type the site name"
          class="site-other-input"
        />
      </div>
      <div class="field">
        <label for="f-result">Result</label>
        <select id="f-result" v-model="draft.result">
          <option value="">Select result…</option>
          <option v-for="opt in config.resultOptions" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </div>
    <div v-else class="field">
      <label for="f-result">Result</label>
      <select id="f-result" v-model="draft.result">
        <option value="">Select result…</option>
        <option v-for="opt in config.resultOptions" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>

    <div class="two-col">
      <div class="field">
        <label for="f-employer">Employer</label>
        <input id="f-employer" v-model="draft.employer" type="text" placeholder="Company name" />
      </div>
      <div class="field">
        <label for="f-jobtype">Job sought</label>
        <input
          id="f-jobtype"
          v-model="draft.jobType"
          type="text"
          placeholder="e.g. Warehouse associate"
        />
      </div>
    </div>

    <template v-if="showMoreFields">
      <hr class="divider" />

      <div class="two-col">
        <div class="field">
          <label for="f-addr">Employer address / website</label>
          <input
            id="f-addr"
            v-model="draft.address"
            type="text"
            placeholder="Address, email, or URL"
          />
        </div>
        <div class="field">
          <label for="f-phone">Employer phone (with area code)</label>
          <input id="f-phone" v-model="draft.phone" type="text" placeholder="(xxx) xxx-xxxx" />
        </div>
      </div>

      <div class="two-col">
        <div class="field">
          <label for="f-contact">Contact name</label>
          <input
            id="f-contact"
            v-model="draft.contactName"
            type="text"
            placeholder="Person you spoke with"
          />
        </div>
        <div class="field">
          <label for="f-method">Contact method</label>
          <select id="f-method" v-model="draft.contactMethod">
            <option value="">Select method…</option>
            <option v-for="opt in config.contactMethods" :key="opt" :value="opt">
              {{ opt }}
            </option>
          </select>
        </div>
      </div>

      <div class="field">
        <label for="f-notes">Notes (optional)</label>
        <textarea
          id="f-notes"
          v-model="draft.notes"
          placeholder="Any extra detail worth remembering"
        ></textarea>
      </div>
    </template>

    <div class="form-actions">
      <button type="submit" class="save-btn">{{ editing ? 'Save changes' : 'Add to log' }}</button>
      <button type="button" class="ghost-btn" @click="showMoreFields = !showMoreFields">
        {{ showMoreFields ? 'Fewer fields' : 'More fields' }}
      </button>
      <button v-if="editing" type="button" class="ghost-btn" @click="handleCancel">Cancel</button>
    </div>
  </form>
</template>

<style scoped>
.add-form {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 20px;
  margin: 22px 0 30px;
  box-shadow: 0 2px 10px var(--shadow);
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 16px;
  margin-bottom: 14px;
}
h2 {
  font-family: var(--font-display);
  font-size: 16px;
  margin: 0;
  color: var(--green-deep);
}
.hint {
  font-size: 11px;
  color: var(--muted);
  margin: 0;
  min-height: 14px;
}
.divider {
  border: none;
  border-top: 1px dashed var(--line);
  margin: 14px 0;
}
.field {
  margin-bottom: 10px;
}
.field label {
  display: block;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brass);
  margin-bottom: 3px;
}
.site-other-input {
  margin-top: 6px;
}
.two-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}
@media (max-width: 480px) {
  .two-col {
    grid-template-columns: 1fr;
  }
}
input,
select,
textarea {
  width: 100%;
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 8px 9px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--card);
  color: var(--ink);
}
textarea {
  resize: vertical;
  min-height: 38px;
}
.date-row {
  display: flex;
  gap: 6px;
}
.date-row input {
  flex: 1;
}
.pin-btn {
  flex: 0 0 auto;
  width: 38px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--card);
  cursor: pointer;
  font-size: 15px;
  opacity: 0.45;
  filter: grayscale(1);
  transition:
    opacity 0.15s ease,
    filter 0.15s ease;
}
.pin-btn.active {
  opacity: 1;
  filter: none;
  border-color: var(--brass);
  background: rgba(138, 109, 59, 0.1);
}
.form-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 4px;
}
.save-btn {
  flex: 1 1 auto;
  min-width: 140px;
  background: var(--green-deep);
  color: var(--paper);
  border: none;
  padding: 11px;
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 13px;
  letter-spacing: 0.04em;
  border-radius: 3px;
  cursor: pointer;
  transition: background-color 0.15s ease;
}
.save-btn:hover {
  background: var(--green);
}
.ghost-btn {
  background: transparent;
  border: 1px solid var(--brass);
  color: var(--brass);
  padding: 9px 14px;
  font-family: var(--font-mono);
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}
.ghost-btn:hover {
  background: rgba(138, 109, 59, 0.1);
}
</style>
