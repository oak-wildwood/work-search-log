<script setup lang="ts">
import { ref } from 'vue'
import type { Entry } from '../types'
import { toCsv } from '../lib/csv'
import { parseBackupJson, toBackupJson } from '../lib/backup'

const props = defineProps<{
  entries: Entry[]
}>()

const emit = defineEmits<{
  import: [entries: Entry[]]
  'clear-all': []
}>()

const fileInput = ref<HTMLInputElement>()
const importMessage = ref('')

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

function handlePrint() {
  window.print()
}
</script>

<template>
  <div class="toolbar-wrap">
    <div class="toolbar">
      <button class="ghost-btn" @click="exportCsv">Export CSV</button>
      <button class="ghost-btn" @click="exportJson">Backup (JSON)</button>
      <button class="ghost-btn" @click="triggerImport">Import backup</button>
      <button class="ghost-btn" @click="handlePrint">Print / save PDF</button>
    </div>
    <button class="danger-link" @click="handleClearAll">Clear all entries</button>
    <input
      ref="fileInput"
      type="file"
      accept="application/json"
      class="visually-hidden"
      @change="handleFileChange"
    />
    <p class="status" role="status" aria-live="polite">{{ importMessage }}</p>
  </div>
</template>

<style scoped>
.toolbar-wrap {
  margin: 14px 0 0;
}
.toolbar {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.ghost-btn {
  flex: 1 1 auto;
  min-width: 120px;
  background: transparent;
  border: 1px solid var(--brass);
  color: var(--brass);
  padding: 9px;
  font-family: var(--font-mono);
  font-size: 12px;
  border-radius: 3px;
  cursor: pointer;
}
.ghost-btn:hover {
  background: rgba(138, 109, 59, 0.1);
}
.danger-link {
  display: block;
  margin: 12px auto 0;
  background: none;
  border: none;
  color: var(--muted);
  font-family: var(--font-mono);
  font-size: 11px;
  text-decoration: underline;
  cursor: pointer;
}
.danger-link:hover {
  color: var(--warn);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
}
.status {
  font-size: 11px;
  color: var(--muted);
  text-align: center;
  margin-top: 8px;
  min-height: 14px;
}
</style>
