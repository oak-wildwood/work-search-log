<script setup lang="ts">
import { computed } from 'vue'
import { formatDate } from '../lib/weeks'
import { outcomeClass, type WeekStatus } from '../lib/requirements'

const props = defineProps<{
  thisWeekStart: Date
  thisWeekEnd: Date
  thisWeek: WeekStatus | undefined
}>()

defineEmits<{ 'open-preferences': [] }>()

/** The segment bar caps out here rather than rendering one box per requirement. */
const MAX_SEGMENTS = 12

const thisWeekSegments = computed(() => {
  const status = props.thisWeek
  if (!status?.required) return []
  const total = Math.min(status.required, MAX_SEGMENTS)
  return Array.from({ length: total }, (_, i) => i < status.counted)
})
</script>

<template>
  <section class="this-week">
    <p class="eyebrow">This week</p>
    <div class="this-week-row">
      <h2 class="range">{{ formatDate(thisWeekStart) }} – {{ formatDate(thisWeekEnd) }}</h2>
      <div class="summary">
        <template v-if="thisWeek?.outcome === 'exempt'">
          <span class="exempt-badge">Exempt</span>
          <span class="caption">{{ thisWeek.exemptReason }}</span>
        </template>
        <template v-else>
          <span class="count" :class="outcomeClass(thisWeek?.outcome)">{{
            thisWeek?.counted ?? 0
          }}</span>
          <div v-if="thisWeekSegments.length" class="segments">
            <span
              v-for="(filled, i) in thisWeekSegments"
              :key="i"
              class="segment"
              :class="{ filled }"
            ></span>
          </div>
          <span class="caption">
            <template v-if="thisWeek?.required">of {{ thisWeek.required }} logged</template>
            <template v-else>
              logged —
              <button class="link-inline" type="button" @click="$emit('open-preferences')">
                set your weekly requirement
              </button>
            </template>
          </span>
        </template>
      </div>
    </div>
    <p
      v-if="thisWeek?.minEmployerContacts"
      class="caption sub"
      :class="{ short: thisWeek.employerContacts < thisWeek.minEmployerContacts }"
    >
      {{ thisWeek.employerContacts }} of {{ thisWeek.minEmployerContacts }} required employer
      contacts
    </p>
  </section>
</template>

<style scoped>
.this-week {
  margin-bottom: 8px;
}
.eyebrow {
  font-size: 12px;
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
.count.neutral {
  color: var(--muted);
}
.exempt-badge {
  font-size: 13px;
  padding: 3px 8px;
  border-radius: 10px;
  border: 1px solid var(--brass);
  color: var(--brass);
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
  font-size: 12px;
  color: var(--muted);
}
.caption.sub {
  margin: 6px 0 0;
  text-align: right;
}
.caption.short {
  color: var(--warn);
}

@media print {
  /* The on-screen "This week" summary is replaced by the cover block, which says
     the same thing in terms an agency reader can act on. */
  .this-week {
    display: none;
  }
}
</style>
