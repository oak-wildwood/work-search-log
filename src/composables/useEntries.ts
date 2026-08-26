import { ref } from 'vue'
import type { Entry, EntryDraft } from '../types'
import { readJSON, writeJSON } from '../lib/storage'
import { createSeedEntries } from '../lib/seedEntries'

const STORAGE_KEY = 'work-search-log:entries:v1'

function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

const storedEntries = readJSON<Entry[] | null>(STORAGE_KEY, null)
// Dev server or an explicit opt-in flag, and only on first run — clearing
// storage or clicking "Clear all" doesn't bring it back. The flag is never
// set for the GitHub Pages build, only (by hand, in the dashboard) for Vercel
// preview deploys, so a claimant using the real app never sees it. Vite
// inlines env vars as strings, so this compares against the literal '1'
// rather than truthiness — '0' and 'false' are both non-empty strings and
// would otherwise turn seeding on when they plainly mean off.
const seeded =
  storedEntries === null && (import.meta.env.DEV || import.meta.env.VITE_DEMO_DATA === '1')

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
  return {
    entries,
    saveError,
    isDemoData: seeded,
    addEntry,
    updateEntry,
    removeEntry,
    clearAll,
    replaceAll,
  }
}
