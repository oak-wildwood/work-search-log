<script setup lang="ts">
import { computed } from 'vue'
import { useSearch } from '../composables/useSearch'

const { searchQuery, matchCount, activeIndex, next, prev } = useSearch()

const statusText = computed(() =>
  matchCount.value ? `${activeIndex.value + 1} of ${matchCount.value}` : 'No matches',
)

function clear() {
  searchQuery.value = ''
}

/**
 * Enter/Shift+Enter step through matches, matching how browser find-in-page
 * and most search UIs do it. Left/right arrows would fight the box's own job
 * as a text field: they're the keys a sighted user reaches for to move the
 * caret while fixing a typo, and the same keys a screen reader uses to read
 * the field's text character by character in forms mode — either way,
 * repurposing them turns an expected editing gesture into a surprise.
 */
function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault()
    if (e.shiftKey) prev()
    else next()
  } else if (e.key === 'Escape' && searchQuery.value) {
    clear()
  }
}
</script>

<template>
  <div class="search-bar no-print" role="search">
    <span class="search-icon" aria-hidden="true">⌕</span>
    <input
      v-model="searchQuery"
      type="search"
      class="search-input"
      placeholder="Search job listings…"
      aria-label="Search job listings"
      @keydown="onKeydown"
    />
    <div v-if="searchQuery.trim()" class="search-status">
      <!-- role="status" announces each change (e.g. "2 of 10") to screen
           readers without moving focus — otherwise stepping through matches
           is silent for anyone not looking at the screen. -->
      <span class="search-count" role="status" aria-live="polite">{{ statusText }}</span>
      <button
        class="nav-btn"
        type="button"
        title="Previous match (Shift+Enter)"
        :disabled="matchCount === 0"
        @click="prev"
      >
        ‹
      </button>
      <button
        class="nav-btn"
        type="button"
        title="Next match (Enter)"
        :disabled="matchCount === 0"
        @click="next"
      >
        ›
      </button>
      <button class="clear-btn" type="button" title="Clear search" @click="clear">✕</button>
    </div>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  border: 1px solid var(--line);
  border-radius: 16px;
  background: var(--card);
  padding: 6px 12px;
  margin-bottom: 16px;
}
.search-icon {
  color: var(--brass);
  font-size: 24px;
  flex: 0 0 auto;
}
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-family: var(--font-mono);
  font-size: 14px;
  color: var(--ink);
  padding: 2px 0;
}
.search-input:focus {
  outline: none;
}
.search-input::-webkit-search-cancel-button {
  display: none;
}
.search-status {
  display: flex;
  align-items: center;
  gap: 2px;
  flex: 0 0 auto;
}
.search-count {
  font-size: 12px;
  color: var(--muted);
  white-space: nowrap;
  margin-right: 4px;
}
.nav-btn,
.clear-btn {
  border: none;
  background: none;
  color: var(--brass);
  cursor: pointer;
  font-size: 15px;
  line-height: 1;
  padding: 5px 6px;
  border-radius: 3px;
}
.nav-btn:hover:not(:disabled),
.clear-btn:hover {
  color: var(--green-deep);
  background: rgba(138, 109, 59, 0.1);
}
.nav-btn:disabled {
  color: var(--placeholder);
  cursor: default;
}
.clear-btn {
  font-size: 12px;
  color: var(--muted);
}
</style>
