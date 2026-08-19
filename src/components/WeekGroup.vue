<script setup lang="ts">
import { computed, ref } from 'vue'
import type { WeekGroup } from '../lib/weeks'
import type { WeekStatus } from '../lib/requirements'
import type { Entry } from '../types'
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

function fmtDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const badgeClass = computed(() => {
  switch (props.status?.outcome) {
    case 'met':
      return 'ok'
    case 'short':
      return 'warn'
    default:
      return 'neutral'
  }
})

/** No requirement on file means no verdict — the badge shows the count and nothing more. */
const badgeText = computed(() => {
  const status = props.status
  if (!status) return `${props.group.entries.length}`
  if (status.outcome === 'exempt') return 'Exempt'
  if (status.required === null) return `${status.counted}`
  return `${status.counted} / ${status.required}`
})

const expanded = ref(props.defaultExpanded)
</script>

<template>
  <div class="week-block">
    <button class="week-head" type="button" :aria-expanded="expanded" @click="expanded = !expanded">
      <span class="caret">{{ expanded ? '▾' : '▸' }}</span>
      <span class="week-title">{{ fmtDate(group.start) }} – {{ fmtDate(group.end) }}</span>
      <span class="week-meta">
        <span class="week-activity-count">
          {{ group.entries.length }} {{ group.entries.length === 1 ? 'activity' : 'activities' }}
        </span>
        <span class="week-count" :class="badgeClass">{{ badgeText }}</span>
      </span>
    </button>

    <p v-if="status?.exemptReason" class="week-note">Exempt — {{ status.exemptReason }}</p>
    <p
      v-if="status?.minEmployerContacts"
      class="week-note week-note-scoring"
      :class="{ warn: status.employerContacts < status.minEmployerContacts }"
    >
      {{ status.employerContacts }} of {{ status.minEmployerContacts }} required employer contacts
    </p>
    <p
      v-for="notice in status?.notices ?? []"
      :key="notice"
      class="week-note week-note-scoring warn"
    >
      {{ notice }}
    </p>
    <div v-show="expanded" class="week-entries">
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
  align-items: center;
  gap: 8px;
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
  font-size: 11px;
  flex: 0 0 auto;
}
.week-title {
  font-family: var(--font-display);
  font-weight: 600;
  font-size: 16px;
  color: var(--green-deep);
}
.week-meta {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}
.week-activity-count {
  font-size: 12px;
  color: var(--muted);
}
.week-count {
  font-size: 12px;
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid var(--line);
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
  font-size: 11px;
  color: var(--muted);
  margin: -4px 0 8px;
  line-height: 1.5;
}
.week-note.warn {
  color: var(--warn);
}
@media print {
  /* Every week prints in full, whatever was expanded on screen. `v-show` sets an
     inline display:none, which a stylesheet !important still overrides. */
  .week-entries {
    display: block !important;
  }
  .week-head {
    cursor: default;
    break-after: avoid;
    page-break-after: avoid;
  }
  .caret {
    display: none;
  }
  /* This app's scoring stays off the printed sheet. The counted-vs-required badge
     and the cap warnings are our reading of the rules, and printing them would
     assert to an agency that one of the claimant's own activities shouldn't
     count. The activity list is the record; the verdict is theirs to reach.
     An exempt week keeps its reason, which explains a gap rather than judging it. */
  .week-count,
  .week-note-scoring {
    display: none;
  }
}
</style>
