<script setup lang="ts">
import { useTheme } from '../composables/useTheme'
import { useSettings } from '../composables/useSettings'

const { isDark, toggleTheme } = useTheme()
const { settings } = useSettings()
</script>

<template>
  <header>
    <div class="title-row">
      <h1>Work Search Log</h1>
      <span class="eyebrow">Work Search Activity Record</span>
    </div>
    <div class="header-controls no-print">
      <label class="goal">
        Goal
        <input v-model.number="settings.minPerWeek" type="number" min="1" />
        / wk
      </label>
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
.goal {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--brass);
}
.goal input {
  width: 46px;
  text-align: center;
  font-family: var(--font-mono);
  font-size: 13px;
  padding: 5px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--card);
  color: var(--ink);
  text-transform: none;
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
