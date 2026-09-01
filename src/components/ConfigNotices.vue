<script setup lang="ts">
import type { StateConfig } from '../config/types'

defineProps<{
  saveError: boolean
  isFallback: boolean
  config: StateConfig
  stale: boolean
}>()

defineEmits<{ 'open-preferences': [] }>()
</script>

<template>
  <p v-if="saveError" class="save-error no-print" role="alert">
    Your browser is blocking local storage, so changes here won't be saved. Try leaving private
    browsing mode, or export a backup after each session.
  </p>

  <p v-if="isFallback" class="notice no-print">
    No rules are bundled for that state yet, so this is using the generic setup. Enter the number of
    activities your determination letter requires each week in
    <button class="link-inline" type="button" @click="$emit('open-preferences')">preferences</button
    >.
  </p>

  <p v-else-if="config.hasOnlineLogging" class="notice no-print">
    {{ config.agencyShort }} records work search in its own portal, so that portal is the official
    record. Keep this as your own backup copy.
  </p>

  <p v-if="config.rulesUrl || stale" class="notice subtle no-print">
    <template v-if="stale">
      These settings haven't been checked against
      {{ config.agencyShort }}'s current rules{{
        config.lastVerified ? ` since ${config.lastVerified}` : ''
      }}. Confirm them before you rely on this.
    </template>
    <template v-else>
      Settings last checked against agency rules {{ config.lastVerified }}.
    </template>
    <a v-if="config.rulesUrl" :href="config.rulesUrl" target="_blank" rel="noopener noreferrer">
      Agency rules
    </a>
  </p>
</template>

<style scoped>
.save-error {
  background: rgba(162, 71, 47, 0.1);
  border: 1px solid var(--warn);
  color: var(--warn);
  border-radius: 4px;
  padding: 10px 12px;
  font-size: 13px;
  margin-bottom: 16px;
}
.notice {
  border: 1px solid var(--line);
  border-left: 3px solid var(--brass);
  border-radius: 4px;
  padding: 9px 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--muted);
  margin: 0 0 12px;
}
.notice.subtle {
  border: none;
  border-left: none;
  padding: 0;
  font-size: 12px;
}
.notice a {
  color: var(--brass);
}
</style>
