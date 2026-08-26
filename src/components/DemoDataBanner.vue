<script setup lang="ts">
import { useEntries } from '../composables/useEntries'

const { isDemoData } = useEntries()
</script>

<template>
  <p v-if="isDemoData" class="demo-banner no-print" role="status">
    Sample data — these entries are for demonstration only and are not a real work search record.
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
