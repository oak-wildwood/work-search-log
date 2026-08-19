<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEntries } from './composables/useEntries'
import { useSettings } from './composables/useSettings'
import { useStateConfig } from './composables/useStateConfig'
import {
  currentWeekKey,
  formatDate,
  formatISODate,
  groupByWeek,
  toLocalISODate,
  weekStartDate,
  type WeekGroup as Week,
} from './lib/weeks'
import { evaluateWeeks, outcomeClass, type WeekStatus } from './lib/requirements'
import type { Entry, EntryDraft } from './types'
import AppHeader from './components/AppHeader.vue'
import WeekGroup from './components/WeekGroup.vue'
import EntryForm from './components/EntryForm.vue'
import Toolbar from './components/Toolbar.vue'
import EmptyState from './components/EmptyState.vue'
import PreferencesDialog from './components/PreferencesDialog.vue'

const { entries, saveError, addEntry, updateEntry, removeEntry, clearAll, replaceAll } =
  useEntries()
const { settings, schedule, needsOnboarding } = useSettings()
const { config, isFallback, stale } = useStateConfig()

const editingEntry = ref<Entry | null>(null)

// Opens by itself on a first run, and by request from the header after that.
const firstRun = needsOnboarding.value
const prefsOpen = ref(firstRun)

const thisWeekStart = computed(() =>
  weekStartDate(toLocalISODate(new Date()), config.value.weekStartDay),
)
const thisWeekEnd = computed(() => {
  const end = new Date(thisWeekStart.value)
  end.setDate(end.getDate() + 6)
  return end
})
const thisWeekKey = computed(() => currentWeekKey(config.value.weekStartDay))

/** Weeks that actually contain entries — what the history list renders. */
const weeks = computed(() => groupByWeek(entries.value, config.value.weekStartDay))

/**
 * Scoring runs over the current week too, even when it's empty, so the summary at
 * the top has a status before anything has been logged.
 */
const statuses = computed(() => {
  const groups: Week[] = [...weeks.value]
  if (!groups.some((g) => g.key === thisWeekKey.value)) {
    groups.push({
      key: thisWeekKey.value,
      start: thisWeekStart.value,
      end: thisWeekEnd.value,
      entries: [],
    })
  }
  return evaluateWeeks(groups, config.value, schedule.value)
})

const thisWeek = computed<WeekStatus | undefined>(() => statuses.value.get(thisWeekKey.value))

const thisWeekSegments = computed(() => {
  const status = thisWeek.value
  if (!status?.required) return []
  const total = Math.min(status.required, 12)
  return Array.from({ length: total }, (_, i) => i < status.counted)
})

function handleSubmit(draft: EntryDraft) {
  if (editingEntry.value) {
    updateEntry(editingEntry.value.id, draft)
    editingEntry.value = null
  } else {
    addEntry(draft)
  }
}

function startEdit(entry: Entry) {
  editingEntry.value = entry
  document.getElementById('entry-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function cancelEdit() {
  editingEntry.value = null
}

function handlePrint() {
  window.print()
}

/**
 * The printed sheet is the one an agency may actually read, so it states plain
 * facts — who logged it, for which agency, over what span — and deliberately
 * omits this app's own scoring. Whether an activity satisfies a requirement is
 * the agency's determination, not something this tool should assert to them.
 */
const printPeriod = computed(() => {
  let first = ''
  let last = ''
  for (const { date } of entries.value) {
    if (!date) continue
    if (!first || date < first) first = date
    if (!last || date > last) last = date
  }
  if (!first) return '—'
  return first === last ? formatISODate(first) : `${formatISODate(first)} – ${formatISODate(last)}`
})

const printedOn = computed(() => formatDate(new Date()))
</script>

<template>
  <AppHeader @open-preferences="prefsOpen = true" />

  <PreferencesDialog :open="prefsOpen" :first-run="firstRun" @close="prefsOpen = false" />

  <main>
    <section class="print-only print-cover">
      <dl>
        <div>
          <dt>Name</dt>
          <!-- Unset leaves a ruled line to write on, rather than an em dash. -->
          <dd :class="{ blank: !settings.name }">{{ settings.name }}</dd>
        </div>
        <div>
          <!-- Always a blank line: agencies ask for a claim number or SSN, and this
               app deliberately stores neither, so the claimant writes it in. The
               label follows the state's own wording for the identifier. -->
          <dt>{{ config.claimIdLabel }}</dt>
          <dd class="blank"></dd>
        </div>
        <div>
          <dt>Agency</dt>
          <dd>{{ config.agencyName }}</dd>
        </div>
        <div>
          <dt>Period covered</dt>
          <dd>{{ printPeriod }}</dd>
        </div>
        <div>
          <dt>Activities logged</dt>
          <dd>{{ entries.length }}</dd>
        </div>
        <div>
          <dt>Printed</dt>
          <dd>{{ printedOn }}</dd>
        </div>
      </dl>
      <p class="print-statement">
        A record of work search activities, created and maintained by the claimant named above.
        Activities are listed in full, grouped by week. Identifying numbers are intentionally left
        blank to be completed by hand.
      </p>
    </section>

    <p v-if="saveError" class="save-error no-print" role="alert">
      Your browser is blocking local storage, so changes here won't be saved. Try leaving private
      browsing mode, or export a backup after each session.
    </p>

    <p v-if="isFallback" class="notice no-print">
      No rules are bundled for that state yet, so this is using the generic setup. Enter the number
      of activities your determination letter requires each week in
      <button class="link-inline" type="button" @click="prefsOpen = true">preferences</button>.
    </p>

    <p v-else-if="config.hasOnlineLogging" class="notice no-print">
      {{ config.agencyShort }} records work search in its own portal, so that portal is the official
      record. Keep this as your own backup copy.
    </p>

    <p v-if="config.rulesUrl || stale" class="notice subtle no-print">
      <template v-if="stale">
        These settings haven't been checked against
        {{ config.agencyShort }}'s current rules{{
          config.lastVerified ? ` since ${config.lastVerified}` : ''
        }}. Confirm them before you rely on this.
      </template>
      <template v-else>
        Settings last checked against agency rules {{ config.lastVerified }}.
      </template>
      <a v-if="config.rulesUrl" :href="config.rulesUrl" target="_blank" rel="noopener noreferrer">
        Agency rules
      </a>
    </p>

    <section class="this-week">
      <p class="eyebrow">This week</p>
      <div class="this-week-row">
        <h2 class="range">{{ formatDate(thisWeekStart) }} – {{ formatDate(thisWeekEnd) }}</h2>
        <div class="summary">
          <template v-if="thisWeek?.outcome === 'exempt'">
            <span class="exempt-badge">Exempt</span>
            <span class="caption">{{ thisWeek.exemptReason }}</span>
          </template>
          <template v-else>
            <span class="count" :class="outcomeClass(thisWeek?.outcome)">{{
              thisWeek?.counted ?? 0
            }}</span>
            <div v-if="thisWeekSegments.length" class="segments">
              <span
                v-for="(filled, i) in thisWeekSegments"
                :key="i"
                class="segment"
                :class="{ filled }"
              ></span>
            </div>
            <span class="caption">
              <template v-if="thisWeek?.required">of {{ thisWeek.required }} logged</template>
              <template v-else>
                logged —
                <button class="link-inline" type="button" @click="prefsOpen = true">
                  set your weekly requirement
                </button>
              </template>
            </span>
          </template>
        </div>
      </div>
      <p
        v-if="thisWeek?.minEmployerContacts"
        class="caption sub"
        :class="{ short: thisWeek.employerContacts < thisWeek.minEmployerContacts }"
      >
        {{ thisWeek.employerContacts }} of {{ thisWeek.minEmployerContacts }} required employer
        contacts
      </p>
    </section>

    <div id="entry-form" class="no-print">
      <EntryForm :editing="editingEntry" @submit="handleSubmit" @cancel="cancelEdit" />
    </div>

    <div class="history-head">
      <span class="history-label">History</span>
      <div class="history-head-right">
        <span class="history-total">{{ entries.length }} total</span>
        <button
          class="print-btn no-print"
          type="button"
          title="Print work search log"
          aria-label="Print work search log"
          @click="handlePrint"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <polyline points="6 9 6 2 18 2 18 9"></polyline>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8"></rect>
          </svg>
        </button>
      </div>
    </div>

    <div id="weeks">
      <EmptyState v-if="entries.length === 0" class="no-print" />
      <WeekGroup
        v-for="(group, index) in weeks"
        :key="group.key"
        :group="group"
        :status="statuses.get(group.key)"
        :default-expanded="index === 0"
        @edit="startEdit"
        @remove="removeEntry"
      />
    </div>

    <Toolbar :entries="entries" @import="replaceAll" @clear-all="clearAll" />
  </main>
</template>

<style scoped>
main {
  max-width: 640px;
  margin: 0 auto;
  padding: 18px 16px 60px;
}
.save-error {
  background: rgba(162, 71, 47, 0.1);
  border: 1px solid var(--warn);
  color: var(--warn);
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 12px;
  margin-bottom: 16px;
}
.notice {
  border: 1px solid var(--line);
  border-left: 3px solid var(--brass);
  border-radius: 4px;
  padding: 9px 12px;
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
  margin: 0 0 12px;
}
.notice.subtle {
  border: none;
  border-left: none;
  padding: 0;
  font-size: 11px;
}
.notice a {
  color: var(--brass);
}
.link-inline {
  font: inherit;
  padding: 0;
  border: none;
  background: none;
  color: var(--brass);
  text-decoration: underline;
  cursor: pointer;
}
.this-week {
  margin-bottom: 8px;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brass);
  margin: 0 0 4px;
}
.this-week-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.range {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  color: var(--green-deep);
  margin: 0;
}
.summary {
  display: flex;
  align-items: center;
  gap: 10px;
}
.count {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 26px;
  line-height: 1;
}
.count.ok {
  color: var(--ok);
}
.count.warn {
  color: var(--warn);
}
.count.neutral {
  color: var(--muted);
}
.exempt-badge {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid var(--brass);
  color: var(--brass);
}
.segments {
  display: flex;
  gap: 3px;
}
.segment {
  width: 10px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid var(--ok);
  background: transparent;
  opacity: 0.35;
}
.segment.filled {
  background: var(--ok);
  opacity: 1;
}
.caption {
  font-size: 11px;
  color: var(--muted);
}
.caption.sub {
  margin: 6px 0 0;
  text-align: right;
}
.caption.short {
  color: var(--warn);
}
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--line);
  padding-bottom: 6px;
  margin: 8px 0 14px;
}
.history-label {
  font-size: 11px;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--brass);
}
.history-head-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.history-total {
  font-size: 12px;
  color: var(--muted);
}
.print-btn {
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--card);
  color: var(--brass);
  cursor: pointer;
}
.print-btn:hover {
  border-color: var(--brass);
  color: var(--green-deep);
}

@media print {
  /* The on-screen "History / N total" strip is replaced by the cover block, which
     says the same thing in terms an agency reader can act on. */
  .history-head,
  .this-week {
    display: none;
  }
  .print-cover {
    margin-bottom: 18px;
  }
  .print-cover dl {
    margin: 0;
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 2px 14px;
  }
  .print-cover dl div {
    display: contents;
  }
  .print-cover dt {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #444;
  }
  .print-cover dd {
    margin: 0;
    font-size: 12px;
  }
  .print-cover dd.blank {
    border-bottom: 1px solid #000;
    min-width: 240px;
  }
  .print-statement {
    font-size: 10px;
    line-height: 1.5;
    color: #444;
    margin: 10px 0 0;
    padding-top: 8px;
    border-top: 1px solid #000;
  }
}
</style>
