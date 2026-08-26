<script setup lang="ts">
import { computed } from 'vue'
import type { Settings } from '../composables/useSettings'
import type { StateConfig } from '../config/types'
import type { Entry } from '../types'
import { formatDate, formatISODate } from '../lib/weeks'

const props = defineProps<{
  settings: Settings
  config: StateConfig
  entries: Entry[]
}>()

/**
 * The printed sheet is the one an agency may actually read, so it states plain
 * facts — who logged it, for which agency, over what span — and deliberately
 * omits this app's own scoring. Whether an activity satisfies a requirement is
 * the agency's determination, not something this tool should assert to them.
 */
const printPeriod = computed(() => {
  let first = ''
  let last = ''
  for (const { date } of props.entries) {
    if (!date) continue
    if (!first || date < first) first = date
    if (!last || date > last) last = date
  }
  if (!first) return '—'
  return first === last ? formatISODate(first) : `${formatISODate(first)} – ${formatISODate(last)}`
})

const printedOn = computed(() => formatDate(new Date()))
</script>

<template>
  <section class="print-only print-cover">
    <dl>
      <div>
        <dt>Name</dt>
        <!-- Unset leaves a ruled line to write on, rather than an em dash. -->
        <dd :class="{ blank: !settings.name }">{{ settings.name }}</dd>
      </div>
      <div>
        <!-- Always a blank line: agencies ask for a claim number or SSN, and this
             app deliberately stores neither, so the claimant writes it in. The
             label follows the state's own wording for the identifier. -->
        <dt>{{ config.claimIdLabel }}</dt>
        <dd class="blank"></dd>
      </div>
      <div>
        <dt>Agency</dt>
        <dd>{{ config.agencyName }}</dd>
      </div>
      <div>
        <dt>Period covered</dt>
        <dd>{{ printPeriod }}</dd>
      </div>
      <div>
        <dt>Activities logged</dt>
        <dd>{{ entries.length }}</dd>
      </div>
      <div>
        <dt>Printed</dt>
        <dd>{{ printedOn }}</dd>
      </div>
    </dl>
    <p class="print-statement">
      A record of work search activities, created and maintained by the claimant named above.
      Activities are listed in full, grouped by week. Identifying numbers are intentionally left
      blank to be completed by hand.
    </p>
  </section>
</template>

<style scoped>
@media print {
  .print-cover {
    margin-bottom: 18px;
  }
  .print-cover dl {
    margin: 0;
    display: grid;
    grid-template-columns: max-content 1fr;
    gap: 2px 14px;
  }
  .print-cover dl div {
    display: contents;
  }
  .print-cover dt {
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #444;
  }
  .print-cover dd {
    margin: 0;
    font-size: 12px;
  }
  .print-cover dd.blank {
    border-bottom: 1px solid #000;
    min-width: 240px;
  }
  .print-statement {
    font-size: 10px;
    line-height: 1.5;
    color: #444;
    margin: 10px 0 0;
    padding-top: 8px;
    border-top: 1px solid #000;
  }
}
</style>
