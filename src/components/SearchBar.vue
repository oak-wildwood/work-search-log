<script setup lang="ts">
import { useSearch } from '../composables/useSearch'

const { searchQuery, matchCount, activeIndex, next, prev } = useSearch()

function clear() {
  searchQuery.value = ''
}

/**
 * Left/right arrows step through matches while the box is focused, like a
 * browser find bar — but only unmodified presses, so shift/ctrl/alt+arrow
 * still do their normal text-selection or word-jump thing.
 */
function onKeydown(e: KeyboardEvent) {
  if (e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return
  if (e.key === 'ArrowRight') {
    e.preventDefault()
    next()
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault()
    prev()
  } else if (e.key === 'Escape' && searchQuery.value) {
    clear()
  }
}
</script>

<template>
  <div class="search-bar no-print">
    <span class="search-icon" aria-hidden="true">⌕</span>
    <input
      v-model="searchQuery"
      type="search"
      class="search-input"
      placeholder="Search job listings…"
      @keydown="onKeydown"
    />
    <div v-if="searchQuery.trim()" class="search-status">
      <span class="search-count">{{ matchCount ? activeIndex + 1 : 0 }} of {{ matchCount }}</span>
      <button
        class="nav-btn"
        type="button"
        title="Previous match (←)"
        :disabled="matchCount === 0"
        @click="prev"
      >
        ‹
      </button>
      <button
        class="nav-btn"
        type="button"
        title="Next match (→)"
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
  font-size: 14px;
  flex: 0 0 auto;
}
.search-input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-family: var(--font-mono);
  font-size: 13px;
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
  font-size: 11px;
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
  font-size: 14px;
  line-height: 1;
  padding: 4px 5px;
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
  font-size: 11px;
  color: var(--muted);
}
</style>
