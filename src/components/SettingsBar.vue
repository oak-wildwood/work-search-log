<script setup lang="ts">
import { useSettings } from '../composables/useSettings'

const { settings } = useSettings()
</script>

<template>
  <div class="min-setting">
    <label for="minPerWeek">Required activities per week:</label>
    <input id="minPerWeek" v-model.number="settings.minPerWeek" type="number" min="1" />
  </div>
</template>

<style scoped>
.min-setting {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--muted);
  margin-top: 14px;
}
.min-setting input {
  width: 50px;
  text-align: center;
  font-family: var(--font-mono);
  padding: 6px;
  border: 1px solid var(--line);
  border-radius: 3px;
  background: var(--card);
  color: var(--ink);
}
</style>
