<script setup lang="ts">
import type { Entry } from '../types'

defineProps<{
  entry: Entry
}>()

const emit = defineEmits<{
  edit: [entry: Entry]
  remove: [id: string]
}>()

function fmtDate(dateStr: string): string {
  return new Date(`${dateStr}T00:00:00`).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function handleRemove(entry: Entry) {
  if (
    confirm(`Delete the ${fmtDate(entry.date)} entry for ${entry.employer || 'this activity'}?`)
  ) {
    emit('remove', entry.id)
  }
}
</script>

<template>
  <div class="entry">
    <div class="entry-actions">
      <button class="icon-btn" title="Edit" @click="emit('edit', entry)">✎</button>
      <button class="icon-btn" title="Delete" @click="handleRemove(entry)">✕</button>
    </div>
    <div class="date">{{ fmtDate(entry.date) }}</div>
    <div class="row"><span class="label">Activity</span> {{ entry.activity || '—' }}</div>
    <div v-if="entry.siteAppliedOn" class="row">
      <span class="label">Site</span> {{ entry.siteAppliedOn }}
    </div>
    <div class="row"><span class="label">Job sought</span> {{ entry.jobType || '—' }}</div>
    <div class="row"><span class="label">Employer</span> {{ entry.employer || '—' }}</div>
    <div v-if="entry.address" class="row">
      <span class="label">Address</span> {{ entry.address }}
    </div>
    <div v-if="entry.phone" class="row"><span class="label">Phone</span> {{ entry.phone }}</div>
    <div v-if="entry.contactName" class="row">
      <span class="label">Contact</span> {{ entry.contactName }}
      <span v-if="entry.contactMethod">({{ entry.contactMethod }})</span>
    </div>
    <div class="row"><span class="label">Result</span> {{ entry.result || '—' }}</div>
    <div v-if="entry.notes" class="row"><span class="label">Notes</span> {{ entry.notes }}</div>
  </div>
</template>

<style scoped>
.entry {
  background: var(--card);
  border: 1px solid var(--line);
  border-left: 3px solid var(--green);
  border-radius: 4px;
  padding: 12px 14px;
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.55;
  position: relative;
}
.row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.label {
  color: var(--brass);
  font-weight: 600;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  min-width: 78px;
}
.date {
  font-family: var(--font-display);
  font-weight: 700;
  color: var(--green-deep);
  font-size: 14px;
  margin-bottom: 4px;
}
.entry-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 2px;
}
.icon-btn {
  background: none;
  border: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  padding: 4px 6px;
  border-radius: 3px;
}
.icon-btn:hover {
  color: var(--warn);
  background: rgba(162, 71, 47, 0.08);
}
</style>
