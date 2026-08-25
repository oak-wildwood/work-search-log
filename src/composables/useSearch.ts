import { computed, nextTick, ref, watch } from 'vue'
import { useEntries } from './useEntries'
import { useStateConfig } from './useStateConfig'
import { groupByWeek } from '../lib/weeks'
import type { Entry } from '../types'

const SEARCHABLE_FIELDS = [
  'activity',
  'employer',
  'siteAppliedOn',
  'jobType',
  'address',
  'phone',
  'contactName',
  'contactMethod',
  'result',
  'notes',
] as const satisfies readonly (keyof Entry)[]

// Module-level state, same as useEntries/useSettings: the search bar and every
// entry card need the same query and active match without threading props
// through WeekGroup, which has nothing to do with search.
const searchQuery = ref('')
const activeMatchIndex = ref(0)

const { entries } = useEntries()
const { config } = useStateConfig()

/**
 * Trimmed and lowercased once here rather than by every HighlightText
 * instance doing the same normalization on the same string.
 */
const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())

/** Matching entries, in the same top-to-bottom order the history list renders. */
const searchMatches = computed(() => {
  const term = normalizedQuery.value
  if (!term) return []
  const matches: string[] = []
  for (const group of groupByWeek(entries.value, config.value.weekStartDay)) {
    for (const entry of group.entries) {
      if (SEARCHABLE_FIELDS.some((field) => entry[field]?.toLowerCase().includes(term))) {
        matches.push(entry.id)
      }
    }
  }
  return matches
})

// A new search (or an edit that changes which entries match) starts back at
// the first result rather than leaving the index pointing at whatever used to
// be there.
watch(searchMatches, () => {
  activeMatchIndex.value = 0
})

const activeMatchId = computed(() => searchMatches.value[activeMatchIndex.value] ?? null)

function next() {
  if (!searchMatches.value.length) return
  activeMatchIndex.value = (activeMatchIndex.value + 1) % searchMatches.value.length
}

function prev() {
  if (!searchMatches.value.length) return
  activeMatchIndex.value =
    (activeMatchIndex.value - 1 + searchMatches.value.length) % searchMatches.value.length
}

// Waits a tick so the week/entry that just expanded (via each EntryCard/
// WeekGroup watching activeMatchId itself) has actually rendered before
// scrolling to it.
watch(activeMatchId, async (id) => {
  if (!id) return
  await nextTick()
  document.getElementById(`entry-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
})

export function useSearch() {
  return {
    searchQuery,
    normalizedQuery,
    matchCount: computed(() => searchMatches.value.length),
    activeIndex: activeMatchIndex,
    activeMatchId,
    next,
    prev,
  }
}
