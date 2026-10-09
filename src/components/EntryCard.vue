<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { formatISODate } from '../lib/weeks'
import type { Entry } from '../types'
import { useSearch } from '../composables/useSearch'
import { useEntries } from '../composables/useEntries'
import { canFollowUp, countLinkedTo } from '../lib/followUp'
import ConfirmDialog from './ConfirmDialog.vue'
import HighlightText from './HighlightText.vue'

const props = defineProps<{
  entry: Entry
}>()

const emit = defineEmits<{
  edit: [entry: Entry]
  remove: [id: string]
  followUp: [entry: Entry]
}>()

const { entries } = useEntries()

/** The Entry this one links to, if it is still in the log. */
const linkedEntry = computed(() => {
  const target = props.entry.linkedTo
  return target ? (entries.value.find((e) => e.id === target) ?? null) : null
})

const linkedCount = computed(() => countLinkedTo(entries.value, props.entry.id))

const { normalizedQuery: searchQuery, activeMatchId } = useSearch()
const highlighted = computed(() => props.entry.id === activeMatchId.value)

const showDetails = ref(false)

const hasDetails = computed(
  () =>
    props.entry.jobType ||
    props.entry.address ||
    props.entry.phone ||
    props.entry.contactName ||
    props.entry.result ||
    props.entry.notes,
)

// A search match can live in a collapsed detail field, so jumping to it has to
// open the card — not just scroll to it — or the highlighted text stays hidden.
watch(
  highlighted,
  (isHighlighted) => {
    if (isHighlighted && hasDetails.value) showDetails.value = true
  },
  { immediate: true },
)

function toggleDetails() {
  showDetails.value = !showDetails.value
}

const removeDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null)

async function handleRemove(entry: Entry) {
  if (await removeDialog.value?.open()) {
    emit('remove', entry.id)
  }
}
</script>

<template>
  <!-- The card-wide click is a mouse convenience layered on top of the real
       "Details" button below, which is already fully keyboard-operable — so
       there's no missing keyboard equivalent here to add. -->
  <!-- eslint-disable-next-line vuejs-accessibility/click-events-have-key-events, vuejs-accessibility/no-static-element-interactions -->
  <div
    :id="`entry-${entry.id}`"
    class="entry"
    :class="{ clickable: hasDetails, highlighted }"
    @click="hasDetails && toggleDetails()"
  >
    <div class="entry-row">
      <span class="activity">
        <HighlightText :text="entry.activity || '—'" :query="searchQuery" :active="highlighted" />
      </span>
      <div class="entry-actions">
        <!-- Kept as a real button so the card stays keyboard-operable; the
             card-wide click is a convenience on top of it, not a replacement. -->
        <button v-if="hasDetails" class="text-link" type="button" @click.stop="toggleDetails">
          {{ showDetails ? 'Hide' : 'Details' }}
        </button>
        <button
          v-if="canFollowUp(entry)"
          class="text-link"
          type="button"
          title="Log another activity for this job"
          @click.stop="emit('followUp', entry)"
        >
          Follow up
        </button>
        <button class="icon-btn" title="Edit" @click.stop="emit('edit', entry)">✎</button>
        <button class="icon-btn" title="Delete" @click.stop="handleRemove(entry)">✕</button>
      </div>
    </div>
    <div class="summary">
      <span>{{ formatISODate(entry.date) }}</span>
      <template v-if="entry.employer">
        <span> · </span>
        <HighlightText :text="entry.employer" :query="searchQuery" :active="highlighted" />
      </template>
      <template v-if="entry.siteAppliedOn">
        <span> · </span>
        <HighlightText :text="entry.siteAppliedOn" :query="searchQuery" :active="highlighted" />
      </template>
      <!-- The claimant's own funnel tag, not something an agency asked for, so it
           stays off the printed sheet. -->
      <span v-if="entry.contract" class="contract-tag no-print">Contract</span>
    </div>
    <!-- On screen only: the printed row already names the employer and title (ADR 0009). -->
    <p v-if="linkedEntry" class="linked no-print">
      Same job as your {{ formatISODate(linkedEntry.date) }} entry
    </p>

    <div v-if="hasDetails" class="details" :class="{ collapsed: !showDetails }">
      <div v-if="entry.jobType" class="row">
        <span class="label">Job sought</span>
        <HighlightText :text="entry.jobType" :query="searchQuery" :active="highlighted" />
      </div>
      <div v-if="entry.address" class="row">
        <span class="label">Address</span>
        <HighlightText :text="entry.address" :query="searchQuery" :active="highlighted" />
      </div>
      <div v-if="entry.phone" class="row">
        <span class="label">Phone</span>
        <HighlightText :text="entry.phone" :query="searchQuery" :active="highlighted" />
      </div>
      <div v-if="entry.contactName" class="row">
        <span class="label">Contact</span>
        <HighlightText :text="entry.contactName" :query="searchQuery" :active="highlighted" />
        <span v-if="entry.contactMethod">({{ entry.contactMethod }})</span>
      </div>
      <div v-if="entry.result" class="row">
        <span class="label">Result</span>
        <HighlightText :text="entry.result" :query="searchQuery" :active="highlighted" />
      </div>
      <div v-if="entry.notes" class="row">
        <span class="label">Notes</span>
        <HighlightText :text="entry.notes" :query="searchQuery" :active="highlighted" />
      </div>
    </div>
  </div>

  <ConfirmDialog ref="removeDialog" confirm-label="Delete" danger>
    Delete the {{ formatISODate(entry.date) }} entry for {{ entry.employer || 'this activity' }}?
    <template v-if="linkedCount">
      {{ linkedCount === 1 ? '1 entry links' : `${linkedCount} entries link` }} to it.
      {{ linkedCount === 1 ? 'It stays' : 'They stay' }} in the log.
    </template>
  </ConfirmDialog>
</template>

<style scoped>
.entry {
  background: var(--card);
  border: 1px solid var(--line);
  border-left: 3px solid var(--green);
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 8px;
  font-size: 14px;
  line-height: 1.5;
  /* Notes and results are free text and sometimes a pasted URL — without
     this, one unbroken long word forces the flex rows below wider than the
     card and drags the whole page into horizontal scroll on narrow screens. */
  overflow-wrap: anywhere;
}
.entry.clickable {
  cursor: pointer;
}
.entry.clickable:hover {
  border-color: var(--brass);
}
.entry.highlighted {
  border-color: var(--stamp);
  box-shadow: 0 0 0 1px var(--stamp);
}
.entry-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  min-width: 0;
}
.activity {
  font-weight: 600;
  color: var(--ink);
}
.entry-actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
}
.summary {
  font-size: 13px;
  color: var(--muted);
  margin-top: 2px;
}
.linked {
  font-size: 12px;
  color: var(--muted);
  margin: 2px 0 0;
}
.contract-tag {
  margin-left: 8px;
  padding: 0 6px;
  border: 1px solid var(--brass);
  border-radius: 3px;
  color: var(--brass);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.details {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed var(--line);
}
.row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  margin-bottom: 3px;
  min-width: 0;
}
.label {
  color: var(--brass);
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  min-width: 78px;
}
.text-link {
  background: none;
  border: none;
  color: var(--brass);
  cursor: pointer;
  font-size: 12px;
  font-family: var(--font-mono);
  text-decoration: underline;
  padding: 4px 4px;
  white-space: nowrap;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 21px;
  line-height: 1;
  padding: 8px;
  border-radius: 4px;
}
.icon-btn:hover {
  color: var(--warn);
  background: rgba(162, 71, 47, 0.08);
}

@media print {
  .entry {
    break-inside: avoid;
    page-break-inside: avoid;
  }
  .entry-actions {
    display: none;
  }
}
</style>
