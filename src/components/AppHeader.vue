<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useSettings } from '../composables/useSettings'
import { useStateConfig } from '../composables/useStateConfig'
import { resolveRequirement } from '../lib/requirements'
import { toLocalISODate, weekStartDate } from '../lib/weeks'

defineEmits<{ 'open-preferences': [] }>()

const { isDark, toggleTheme } = useTheme()
const { settings, schedule } = useSettings()
const { config } = useStateConfig()

const thisWeekKey = computed(() =>
  toLocalISODate(weekStartDate(toLocalISODate(new Date()), config.value.weekStartDay)),
)

const current = computed(() => resolveRequirement(schedule.value, thisWeekKey.value))

/** What the preferences button shows, so the active setup is visible without opening it. */
const summary = computed(() => {
  const parts = [settings.value.stateCode ?? 'No state']
  parts.push(current.value?.total ? `${current.value.total}/wk` : 'no goal')
  return parts.join(' · ')
})
</script>

<template>
  <header>
    <div class="title-row">
      <h1>Work Search Log</h1>
      <!-- The agency name comes from the selected state, which is what used to
           require a separate branch per state. -->
      <span class="eyebrow">{{ config.agencyName }}</span>
      <span v-if="settings.name" class="claimant">{{ settings.name }}</span>
    </div>
    <div class="header-controls no-print">
      <button
        class="prefs-btn"
        type="button"
        title="Preferences"
        @click="$emit('open-preferences')"
      >
        <span class="prefs-gear" aria-hidden="true">⚙</span>
        <span class="prefs-summary">{{ summary }}</span>
      </button>
      <button
        class="theme-toggle"
        :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
        @click="toggleTheme"
      >
        {{ isDark ? '☀' : '☾' }}
      </button>
    </div>
  </header>
</template>

<style scoped>
header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 20px;
  padding: 20px 20px;
  border-bottom: 3px double var(--brass);
  background: var(--paper-2);
}
.title-row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
h1 {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 22px;
  margin: 0;
  color: var(--green-deep);
  letter-spacing: -0.01em;
}
.eyebrow {
  font-size: 11px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brass);
}
.header-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}
.claimant {
  font-size: 12px;
  color: var(--muted);
}
.prefs-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  font: inherit;
  font-size: 12px;
  padding: 5px 10px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--card);
  color: var(--brass);
  cursor: pointer;
}
.prefs-btn:hover {
  border-color: var(--brass);
}
.prefs-gear {
  font-size: 13px;
  line-height: 1;
}
.prefs-summary {
  font-family: var(--font-mono);
  color: var(--ink);
}
.theme-toggle {
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--card);
  color: var(--brass);
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
}
.theme-toggle:hover {
  border-color: var(--brass);
}

@media print {
  header {
    border-bottom: 2px solid #000;
    background: none;
    padding: 0 0 12px;
  }
}
</style>
