import { ref } from 'vue'
import type { Entry, EntryDraft } from '../types'
import { readJSON, writeJSON } from '../lib/storage'

const STORAGE_KEY = 'work-search-log:entries:v1'

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

// Module-level state: every component calling useEntries() shares one store,
// with no need for provide/inject or a state-management library.
const entries = ref<Entry[]>(readJSON<Entry[]>(STORAGE_KEY, []))
const saveError = ref(false)

function persist() {
  saveError.value = !writeJSON(STORAGE_KEY, entries.value)
}

function addEntry(draft: EntryDraft) {
  const now = new Date().toISOString()
  entries.value = [...entries.value, { ...draft, id: makeId(), createdAt: now, updatedAt: now }]
  persist()
}

function updateEntry(id: string, draft: EntryDraft) {
  const index = entries.value.findIndex((e) => e.id === id)
  if (index === -1) return
  const next = [...entries.value]
  next[index] = { ...next[index], ...draft, updatedAt: new Date().toISOString() }
  entries.value = next
  persist()
}

function removeEntry(id: string) {
  entries.value = entries.value.filter((e) => e.id !== id)
  persist()
}

function clearAll() {
  entries.value = []
  persist()
}

function replaceAll(next: Entry[]) {
  entries.value = next
  persist()
}

export function useEntries() {
  return { entries, saveError, addEntry, updateEntry, removeEntry, clearAll, replaceAll }
}
