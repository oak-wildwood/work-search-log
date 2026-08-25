import { ref } from 'vue'
import type { Entry, EntryDraft } from '../types'
import { readJSON, writeJSON } from '../lib/storage'
import { createSeedEntries } from '../lib/seedEntries'

const STORAGE_KEY = 'work-search-log:entries:v1'

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const storedEntries = readJSON<Entry[] | null>(STORAGE_KEY, null)
// Dev server only, and only on first run — a production build never sees
// this, and clearing storage or clicking "Clear all" doesn't bring it back.
const seeded = storedEntries === null && import.meta.env.DEV

// Module-level state: every component calling useEntries() shares one store,
// with no need for provide/inject or a state-management library.
const entries = ref<Entry[]>(storedEntries ?? (seeded ? createSeedEntries() : []))
const saveError = ref(false)

function persist() {
  saveError.value = !writeJSON(STORAGE_KEY, entries.value)
}

// Written immediately so the seed behaves like real data — edits and removals
// stick, and reloading doesn't regenerate a fresh batch mid-session.
if (seeded) persist()

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
