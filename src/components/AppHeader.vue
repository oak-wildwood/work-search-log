<script setup lang="ts">
import { computed } from 'vue'
import { useTheme } from '../composables/useTheme'
import { useSettings } from '../composables/useSettings'
import { useStateConfig } from '../composables/useStateConfig'
import { resolveRequirement } from '../lib/requirements'
import { currentWeekKey } from '../lib/weeks'

defineEmits<{ 'open-preferences': [] }>()

const { isDark, toggleTheme } = useTheme()
const { settings, schedule } = useSettings()
const { config } = useStateConfig()

const thisWeekKey = computed(() => currentWeekKey(config.value.weekStartDay))

const current = computed(() => resolveRequirement(schedule.value, thisWeekKey.value))

/** What the preferences button shows, so the active setup is visible without opening it. */
const summary = computed(() => {
  const state = settings.value.stateCode ?? 'Generic'
  const goal = current.value?.total ? `${current.value.total}/wk` : 'no goal'
  return `${state} · ${goal}`
})
</script>

<template>
  <header>
    <div class="title-row">
      <h1>Work Search Log</h1>
      <!-- The agency name comes from the selected state, which is what used to
           require a separate branch per state. -->
      <span class="eyebrow">
        <span class="eyebrow-full">{{ config.agencyName }}</span>
        <span class="eyebrow-short">{{ config.agencyShort }}</span>
      </span>
    </div>
    <div class="header-controls no-print">
      <span v-if="settings.name" class="claimant">{{ settings.name }}</span>
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
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brass);
}
.eyebrow-short {
  display: none;
}
.header-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  /* On a single row with the title (desktop), this pushes the controls to
     the right edge to pair with `justify-content: space-between` above. */
  margin-left: auto;
}
.claimant {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.prefs-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  font: inherit;
  font-size: 13px;
  padding: 7px 12px;
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
  font-size: 20px;
  line-height: 1;
}
.prefs-summary {
  font-family: var(--font-mono);
  color: var(--ink);
}
.theme-toggle {
  width: 32px;
  height: 32px;
  flex: 0 0 auto;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--card);
  color: var(--brass);
  cursor: pointer;
  font-size: 16px;
  line-height: 1;
}
.theme-toggle:hover {
  border-color: var(--brass);
}

@media (max-width: 480px) {
  /* Once the controls drop to their own line under the title, right-aligning
     them (correct on the single-row desktop layout) is the only thing on the
     page not flush with the left margin — everything else in the app reads
     top-to-bottom from the same left edge. Left-aligning here instead keeps
     that rhythm and needs no other layout changes. */
  .header-controls {
    margin-left: 0;
  }
  /* The agency's short form (e.g. "TWC") is already the identity this app
     uses for it elsewhere (footer, notices) — using it here too instead of
     the full name reads better at this width than either the long form or a
     truncated version of it. */
  .eyebrow-full {
    display: none;
  }
  .eyebrow-short {
    display: inline;
  }
}

@media print {
  header {
    border-bottom: 2px solid #000;
    background: none;
    padding: 0 0 12px;
  }
}
</style>
