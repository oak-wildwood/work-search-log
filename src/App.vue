<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEntries } from './composables/useEntries'
import { useSettings } from './composables/useSettings'
import { groupByWeek, weekStartDate } from './lib/weeks'
import type { Entry, EntryDraft } from './types'
import AppHeader from './components/AppHeader.vue'
import WeekGroup from './components/WeekGroup.vue'
import EntryForm from './components/EntryForm.vue'
import Toolbar from './components/Toolbar.vue'
import EmptyState from './components/EmptyState.vue'

const { entries, saveError, addEntry, updateEntry, removeEntry, clearAll, replaceAll } =
  useEntries()
const { settings } = useSettings()

const weeks = computed(() => groupByWeek(entries.value))
const editingEntry = ref<Entry | null>(null)

function todayLocalISO(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const thisWeekStart = computed(() => weekStartDate(todayLocalISO()))
const thisWeekEnd = computed(() => {
  const end = new Date(thisWeekStart.value)
  end.setDate(end.getDate() + 6)
  return end
})
const thisWeekCount = computed(
  () =>
    entries.value.filter((e) => weekStartDate(e.date).getTime() === thisWeekStart.value.getTime())
      .length,
)
const thisWeekMet = computed(() => thisWeekCount.value >= settings.value.minPerWeek)
const thisWeekSegments = computed(() => {
  const total = Math.min(Math.max(settings.value.minPerWeek, 1), 8)
  return Array.from({ length: total }, (_, i) => i < thisWeekCount.value)
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
</script>

<template>
  <AppHeader />

  <main>
    <p v-if="saveError" class="save-error" role="alert">
      Your browser is blocking local storage, so changes here won't be saved. Try leaving private
      browsing mode, or export a backup after each session.
    </p>

    <section class="this-week">
      <p class="eyebrow">This week</p>
      <div class="this-week-row">
        <h2 class="range">{{ fmtDate(thisWeekStart) }} – {{ fmtDate(thisWeekEnd) }}</h2>
        <div class="summary">
          <span class="count" :class="thisWeekMet ? 'ok' : 'warn'">{{ thisWeekCount }}</span>
          <div class="segments">
            <span
              v-for="(filled, i) in thisWeekSegments"
              :key="i"
              class="segment"
              :class="{ filled }"
            ></span>
          </div>
          <span class="caption">of {{ settings.minPerWeek }} logged</span>
        </div>
      </div>
    </section>

    <div id="entry-form">
      <EntryForm :editing="editingEntry" @submit="handleSubmit" @cancel="cancelEdit" />
    </div>

    <div class="history-head">
      <span class="history-label">History</span>
      <span class="history-total">{{ entries.length }} total</span>
    </div>

    <div id="weeks">
      <EmptyState v-if="entries.length === 0" />
      <WeekGroup
        v-for="(group, index) in weeks"
        :key="group.key"
        :group="group"
        :min-per-week="settings.minPerWeek"
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
.history-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
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
.history-total {
  font-size: 12px;
  color: var(--muted);
}
</style>
