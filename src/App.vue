<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEntries } from './composables/useEntries'
import { useSettings } from './composables/useSettings'
import { useStateConfig } from './composables/useStateConfig'
import {
  currentWeekKey,
  groupByWeek,
  toLocalISODate,
  weekStartDate,
  type WeekGroup as Week,
} from './lib/weeks'
import { evaluateWeeks, type WeekStatus } from './lib/requirements'
import type { Entry, EntryDraft } from './types'
import AppHeader from './components/AppHeader.vue'
import WeekGroup from './components/WeekGroup.vue'
import EntryForm from './components/EntryForm.vue'
import Toolbar from './components/Toolbar.vue'
import EmptyState from './components/EmptyState.vue'
import PreferencesDialog from './components/PreferencesDialog.vue'
import SearchBar from './components/SearchBar.vue'
import PrintCover from './components/PrintCover.vue'
import ConfigNotices from './components/ConfigNotices.vue'
import WeekSummary from './components/WeekSummary.vue'

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
</script>

<template>
  <AppHeader @open-preferences="prefsOpen = true" />

  <PreferencesDialog :open="prefsOpen" :first-run="firstRun" @close="prefsOpen = false" />

  <main>
    <SearchBar />

    <PrintCover :settings="settings" :config="config" :entries="entries" />

    <ConfigNotices
      :save-error="saveError"
      :is-fallback="isFallback"
      :config="config"
      :stale="stale"
      @open-preferences="prefsOpen = true"
    />

    <WeekSummary
      :this-week-start="thisWeekStart"
      :this-week-end="thisWeekEnd"
      :this-week="thisWeek"
      @open-preferences="prefsOpen = true"
    />

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
  .history-head {
    display: none;
  }
}
</style>
