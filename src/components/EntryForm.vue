<script setup lang="ts">
import { reactive, ref, watch } from 'vue'
import type { Entry, EntryDraft } from '../types'
import { ACTIVITY_OPTIONS, CONTACT_METHOD_OPTIONS, RESULT_OPTIONS, SITE_OPTIONS } from '../types'

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

const OTHER_SITE = '__other__'
const siteChoice = ref('')

function isKnownSite(value: string): boolean {
  return (SITE_OPTIONS as readonly string[]).includes(value)
}

function syncSiteChoice(value: string) {
  siteChoice.value = !value ? '' : isKnownSite(value) ? value : OTHER_SITE
}

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
  },
  { immediate: true },
)

function handleSubmit() {
  if (!draft.date || !draft.activity) {
    message.value = 'Date and activity type are required.'
    return
  }
  emit('submit', { ...draft })
  if (props.editing) {
    message.value = ''
    return
  }
  const keepDate = datePinned.value ? draft.date : ''
  Object.assign(draft, blankDraft())
  draft.date = keepDate
  siteChoice.value = ''
  message.value = 'Saved.'
  setTimeout(() => {
    if (message.value === 'Saved.') message.value = ''
  }, 1800)
}

function handleCancel() {
  Object.assign(draft, blankDraft())
  siteChoice.value = ''
  emit('cancel')
}
</script>

<template>
  <form class="add-form" @submit.prevent="handleSubmit">
    <h2>{{ editing ? 'Edit activity' : 'Log a new activity' }}</h2>

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
      <select id="f-activity" v-model="draft.activity" required>
        <option value="">Select an activity type…</option>
        <option v-for="opt in ACTIVITY_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
      </select>
    </div>

    <div class="field">
      <label for="f-site">Site applied on</label>
      <select id="f-site" v-model="siteChoice">
        <option value="">Select a site…</option>
        <option v-for="opt in SITE_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
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

    <div class="two-col">
      <div class="field">
        <label for="f-jobtype">Type of job sought</label>
        <input
          id="f-jobtype"
          v-model="draft.jobType"
          type="text"
          placeholder="e.g. Warehouse associate"
        />
      </div>
      <div class="field">
        <label for="f-result">Result</label>
        <select id="f-result" v-model="draft.result">
          <option value="">Select result…</option>
          <option v-for="opt in RESULT_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
        </select>
      </div>
    </div>

    <div class="field">
      <label for="f-employer">Employer name</label>
      <input id="f-employer" v-model="draft.employer" type="text" placeholder="Company name" />
    </div>

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
          <option v-for="opt in CONTACT_METHOD_OPTIONS" :key="opt" :value="opt">{{ opt }}</option>
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

    <div class="form-actions">
      <button type="submit" class="save-btn">{{ editing ? 'Save changes' : 'Add to log' }}</button>
      <button v-if="editing" type="button" class="ghost-btn" @click="handleCancel">Cancel</button>
    </div>
    <p class="status" role="status" aria-live="polite">{{ message }}</p>
  </form>
</template>

<style scoped>
.add-form {
  background: var(--paper-2);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 16px;
  margin: 22px 0 30px;
}
h2 {
  font-family: var(--font-display);
  font-size: 16px;
  margin: 0 0 12px;
  color: var(--green-deep);
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
  gap: 8px;
  margin-top: 4px;
}
.save-btn {
  flex: 1;
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
.status {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  margin: 10px 0 0;
  min-height: 14px;
}
</style>
