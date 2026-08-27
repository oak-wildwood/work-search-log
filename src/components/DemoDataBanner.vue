<script setup lang="ts">
// Keyed to the flag rather than to whether entries were actually seeded: the
// profile seeds on its own condition, so a build with real entries but a demo
// profile would otherwise say nothing.
import { DEMO_DATA_ENABLED } from '../lib/demoMode'
</script>

<template>
  <p v-if="DEMO_DATA_ENABLED" class="demo-banner no-print" role="status">
    Sample data — this profile and these entries are for demonstration only and are not a real work
    search record.
  </p>
</template>

<style scoped>
.demo-banner {
  background: var(--warn);
  color: var(--paper);
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  padding: 8px 12px;
  margin: 0;
}
</style>
