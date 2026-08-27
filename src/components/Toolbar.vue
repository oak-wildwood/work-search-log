<script setup lang="ts">
import { ref } from 'vue'
import type { Entry } from '../types'
import { toCsv } from '../lib/csv'
import { parseBackupJson, toBackupJson } from '../lib/backup'
import { useStateConfig } from '../composables/useStateConfig'

const props = defineProps<{
  entries: Entry[]
}>()

const emit = defineEmits<{
  import: [entries: Entry[]]
  'clear-all': []
}>()

const fileInput = ref<HTMLInputElement>()
const importMessage = ref('')

// Retention and the agency's name both vary by state, so the footer sentence is
// assembled from the config rather than asserted in the markup. `agencyShort`
// reads "your state agency" until a state is picked, which is why it sits after
// a dash rather than starting a sentence.
const { config } = useStateConfig()

function downloadBlob(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function exportCsv() {
  downloadBlob(toCsv(props.entries), 'work-search-log.csv', 'text/csv')
}

function exportJson() {
  downloadBlob(toBackupJson(props.entries), 'work-search-log-backup.json', 'application/json')
}

function triggerImport() {
  fileInput.value?.click()
}

async function handleFileChange(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const text = await file.text()
  const parsed = parseBackupJson(text)
  if (!parsed) {
    importMessage.value = 'Could not read that file — is it a Work Search Log JSON backup?'
  } else if (
    props.entries.length === 0 ||
    confirm(
      `This replaces your current ${props.entries.length} logged ${props.entries.length === 1 ? 'entry' : 'entries'} with the ${parsed.length} from this backup. Continue?`,
    )
  ) {
    emit('import', parsed)
    importMessage.value = `Imported ${parsed.length} ${parsed.length === 1 ? 'entry' : 'entries'}.`
  }
  ;(e.target as HTMLInputElement).value = ''
  setTimeout(() => (importMessage.value = ''), 3000)
}

function handleClearAll() {
  if (
    confirm(
      'Delete every logged activity? This cannot be undone — export a backup first if unsure.',
    )
  ) {
    emit('clear-all')
  }
}
</script>

<template>
  <footer class="app-footer no-print">
    <p class="footer-note">
      Keep this {{ config.retention }} — {{ config.agencyShort }} may request it for any week, at
      any time.
    </p>
    <div class="footer-row">
      <nav class="links">
        <button class="link-btn" type="button" @click="exportCsv">Export CSV</button>
        <button class="link-btn" type="button" @click="exportJson">Backup</button>
        <button class="link-btn" type="button" @click="triggerImport">Import backup</button>
        <button class="link-btn danger" type="button" @click="handleClearAll">Clear all</button>
      </nav>
      <span class="privacy">Saved in this browser only</span>
    </div>
    <input
      ref="fileInput"
      type="file"
      accept="application/json"
      aria-label="Backup file to import"
      class="visually-hidden"
      @change="handleFileChange"
    />
    <p class="status" role="status" aria-live="polite">{{ importMessage }}</p>
  </footer>
</template>

<style scoped>
.app-footer {
  margin-top: 30px;
  padding-top: 16px;
  border-top: 1px solid var(--line);
}
.footer-note {
  font-size: 12px;
  color: var(--muted);
  margin: 0 0 12px;
  line-height: 1.6;
}
.footer-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px 16px;
}
.links {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 16px;
}
.link-btn {
  background: none;
  border: none;
  color: var(--brass);
  font-family: var(--font-mono);
  font-size: 13px;
  text-decoration: underline;
  cursor: pointer;
  padding: 2px 0;
}
.link-btn:hover {
  color: var(--green-deep);
}
.link-btn.danger {
  color: var(--muted);
}
.link-btn.danger:hover {
  color: var(--warn);
}
.privacy {
  font-size: 12px;
  color: var(--muted);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.status {
  font-size: 12px;
  color: var(--muted);
  text-align: center;
  margin-top: 8px;
  min-height: 14px;
}
</style>
