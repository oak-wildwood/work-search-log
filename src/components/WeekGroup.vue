<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { WeekGroup } from '../lib/weeks'
import { outcomeClass, type WeekStatus } from '../lib/requirements'
import { formatDate } from '../lib/weeks'
import type { Entry } from '../types'
import { useSearch } from '../composables/useSearch'
import EntryCard from './EntryCard.vue'

const props = defineProps<{
  group: WeekGroup
  status?: WeekStatus
  defaultExpanded: boolean
}>()

defineEmits<{
  edit: [entry: Entry]
  remove: [id: string]
}>()

const badgeClass = computed(() => outcomeClass(props.status?.outcome))

/** No requirement on file means no verdict — the badge shows the count and nothing more. */
const badgeText = computed(() => {
  const status = props.status
  if (!status) return `${props.group.entries.length}`
  if (status.outcome === 'exempt') return 'Exempt'
  if (status.required === null) return `${status.counted}`
  return `${status.counted} / ${status.required}`
})

const expanded = ref(props.defaultExpanded)

const { activeMatchId } = useSearch()

// Search navigation can land on an entry in a week that's collapsed (or was
// never the first, auto-expanded one) — open it so the match is visible.
watch(
  activeMatchId,
  (id) => {
    if (id && props.group.entries.some((e) => e.id === id)) expanded.value = true
  },
  { immediate: true },
)
</script>

<template>
  <div class="week-block">
    <button class="week-head" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <span class="caret">{{ expanded ? '▾' : '▸' }}</span>
      <span class="week-title">{{ formatDate(group.start) }} – {{ formatDate(group.end) }}</span>
      <span class="week-meta">
        <span class="week-activity-count">
          {{ group.entries.length }} {{ group.entries.length === 1 ? 'activity' : 'activities' }}
        </span>
        <!-- Scoring is marked no-print wherever it is rendered. The badge and the
             cap warnings are this app's reading of the rules, and printing them
             would tell an agency that one of the claimant's own activities
             shouldn't count — their determination to make, not ours. An exempt
             week keeps its reason, which explains a gap rather than judging it. -->
        <span class="week-count no-print" :class="badgeClass">{{ badgeText }}</span>
      </span>
    </button>

    <p v-if="status?.exemptReason" class="week-note">Exempt — {{ status.exemptReason }}</p>
    <p
      v-if="status?.minEmployerContacts"
      class="week-note no-print"
      :class="{ warn: status.employerContacts < status.minEmployerContacts }"
    >
      {{ status.employerContacts }} of {{ status.minEmployerContacts }} required employer contacts
    </p>
    <p v-for="notice in status?.notices ?? []" :key="notice" class="week-note warn no-print">
      {{ notice }}
    </p>
    <div class="week-entries" :class="{ collapsed: !expanded }">
      <EntryCard
        v-for="entry in group.entries"
        :key="entry.id"
        :entry="entry"
        @edit="$emit('edit', $event)"
        @remove="$emit('remove', $event)"
      />
    </div>
  </div>
</template>

<style scoped>
.week-block {
  margin-bottom: 20px;
}
.week-head {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  border: none;
  border-bottom: 1px solid var(--line);
  background: none;
  padding: 0 0 8px;
  margin-bottom: 10px;
  cursor: pointer;
  font-family: inherit;
  text-align: left;
}
.caret {
  color: var(--brass);
  font-size: 18px;
  flex: 0 0 auto;
}
.week-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--green-deep);
  white-space: nowrap;
}
.week-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.week-activity-count {
  font-size: 13px;
  color: var(--muted);
  white-space: nowrap;
}
.week-count {
  font-size: 13px;
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid var(--line);
  white-space: nowrap;
}
.week-count.ok {
  color: var(--ok);
  border-color: var(--ok);
  background: rgba(63, 93, 68, 0.08);
}
.week-count.warn {
  color: var(--warn);
  border-color: var(--warn);
  background: rgba(162, 71, 47, 0.08);
}
.week-count.neutral {
  color: var(--muted);
}
.week-note {
  font-size: 12px;
  color: var(--muted);
  margin: -4px 0 8px;
  line-height: 1.5;
}
.week-note.warn {
  color: var(--warn);
}
@media (max-width: 480px) {
  .week-title {
    font-size: 15px;
  }
  .week-meta {
    /* Forces its own row below the caret/title instead of depending on the
       browser's line-fitting math, which was letting the pill and the count
       text wrap internally on narrow screens instead of the cluster as a
       whole moving down. */
    flex-basis: 100%;
    margin-left: 0;
    justify-content: flex-end;
  }
  .week-activity-count,
  .week-count {
    font-size: 12px;
  }
}
@media print {
  .week-head {
    cursor: default;
    break-after: avoid;
    page-break-after: avoid;
  }
  .caret {
    display: none;
  }
}
</style>
