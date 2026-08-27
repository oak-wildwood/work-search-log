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
      <span class="eyebrow">{{ config.agencyName }}</span>
    </div>
    <div class="header-controls no-print">
      <div class="identity">
        <template v-if="settings.name">
          <span class="claimant">{{ settings.name }}</span>
          <span class="sep" aria-hidden="true">·</span>
        </template>
        <button
          class="prefs-btn"
          type="button"
          title="Preferences"
          @click="$emit('open-preferences')"
        >
          <span class="prefs-gear" aria-hidden="true">⚙</span>
          <span class="prefs-summary">{{ summary }}</span>
        </button>
      </div>
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
.header-controls {
  display: flex;
  align-items: center;
  gap: 14px;
  /* When this wraps to its own line under the title on narrow screens,
     `space-between` on `header` has nothing left to space it against and it
     falls back to the left edge — this keeps it pinned to the right instead. */
  margin-left: auto;
}
.identity {
  display: flex;
  align-items: center;
  gap: 8px;
}
.claimant {
  font-size: 14px;
  font-weight: 600;
  color: var(--ink);
}
.sep {
  color: var(--muted);
  font-size: 13px;
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
  /* Below this width the desktop single-row layout no longer fits, so the
     header becomes a 2-row grid: the title alone on row one, and the agency
     name paired with the identity/settings cluster on row two. `title-row`
     is unwrapped via `display: contents` so its children (h1, .eyebrow) can
     be placed independently rather than travelling together. */
  header {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-areas: 'title title' 'eyebrow controls';
    gap: 8px 12px;
  }
  .title-row {
    display: contents;
  }
  h1 {
    grid-area: title;
  }
  .eyebrow {
    grid-area: eyebrow;
    align-self: center;
    /* The identity chip is the actionable control and always keeps its full
       width; the agency label is decorative context, so it's what gives way
       first — truncating cleanly reads better than wrapping into a stack of
       single words. */
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }
  .header-controls {
    grid-area: controls;
    margin-left: 0;
    flex-shrink: 0;
  }
  /* The claimant's name and the settings summary are two views of the same
     thing — whose log, under what rules — so on the narrow layout they read
     as one chip instead of two adjacent controls. */
  .identity {
    border: 1px solid var(--line);
    border-radius: 14px;
    padding: 6px 10px;
    gap: 5px;
    background: var(--card);
    white-space: nowrap;
  }
  .prefs-btn {
    border: none;
    background: none;
    padding: 0;
  }
  .claimant {
    font-size: 13px;
  }
  .prefs-gear {
    font-size: 16px;
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
