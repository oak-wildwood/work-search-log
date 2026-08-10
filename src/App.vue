<script setup lang="ts">
import { computed, ref } from 'vue'
import { useEntries } from './composables/useEntries'
import { useSettings } from './composables/useSettings'
import { groupByWeek } from './lib/weeks'
import type { Entry, EntryDraft } from './types'
import AppHeader from './components/AppHeader.vue'
import SettingsBar from './components/SettingsBar.vue'
import WeekGroup from './components/WeekGroup.vue'
import EntryForm from './components/EntryForm.vue'
import Toolbar from './components/Toolbar.vue'
import EmptyState from './components/EmptyState.vue'

const { entries, saveError, addEntry, updateEntry, removeEntry, clearAll, replaceAll } =
  useEntries()
const { settings } = useSettings()

const weeks = computed(() => groupByWeek(entries.value))
const editingEntry = ref<Entry | null>(null)

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

    <SettingsBar />

    <div id="weeks">
      <EmptyState v-if="entries.length === 0" />
      <WeekGroup
        v-for="group in weeks"
        :key="group.key"
        :group="group"
        :min-per-week="settings.minPerWeek"
        @edit="startEdit"
        @remove="removeEntry"
      />
    </div>

    <div id="entry-form">
      <EntryForm :editing="editingEntry" @submit="handleSubmit" @cancel="cancelEdit" />
    </div>

    <Toolbar :entries="entries" @import="replaceAll" @clear-all="clearAll" />

    <footer>
      Everything above stays in this browser only — nothing is sent to a server. Export a backup
      regularly in case you clear your browser data.
    </footer>
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
footer {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  margin-top: 30px;
  line-height: 1.6;
}
</style>
