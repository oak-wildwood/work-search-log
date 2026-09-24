<script setup lang="ts">
// Keyed to the flag rather than to whether entries were actually seeded: the
// profile seeds on its own condition, so a build with real entries but a demo
// profile would otherwise say nothing.
import { onMounted, onUnmounted, ref } from 'vue'
import { DEMO_DATA_ENABLED } from '../lib/demoMode'

const bannerEl = ref<HTMLElement>()

// Published as a CSS variable so the sticky search bar can offset below this
// banner instead of the two overlapping once both are pinned to the top.
function publishHeight() {
  if (bannerEl.value) {
    document.documentElement.style.setProperty(
      '--demo-banner-height',
      `${bannerEl.value.offsetHeight}px`,
    )
  }
}

onMounted(() => {
  publishHeight()
  window.addEventListener('resize', publishHeight)
})
onUnmounted(() => window.removeEventListener('resize', publishHeight))
</script>

<template>
  <p v-if="DEMO_DATA_ENABLED" ref="bannerEl" class="demo-banner no-print" role="status">
    Sample data — this profile and these entries are for demonstration only and are not a real work
    search record.
  </p>
</template>

<style scoped>
.demo-banner {
  position: sticky;
  top: 0;
  /* Below the preferences dialog overlay (z-index: 50) so opening it still
     covers this. */
  z-index: 10;
  background: var(--warn);
  color: var(--paper);
  text-align: center;
  font-size: 13px;
  font-weight: 600;
  padding: 8px 12px;
  margin: 0;
}
</style>
