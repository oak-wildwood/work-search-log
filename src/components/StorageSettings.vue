<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useEntries } from '../composables/useEntries'
import {
  useStorageBackend,
  validateServerUrl,
  type Backend,
} from '../composables/useStorageBackend'
import { DEFAULT_SERVER_PORT, LocalServerRepository } from '../lib/localServerRepository'
import { noAutofillAttrs } from '../lib/noAutofill'
import ConfirmDialog from './ConfirmDialog.vue'

type Status =
  | { kind: 'idle' }
  | { kind: 'testing' }
  | { kind: 'waiting' }
  | { kind: 'connected' }
  | { kind: 'blocked' }
  | { kind: 'unauthorized' }
  | { kind: 'unreachable'; pending: number }
  | { kind: 'malformed' }

const { entries } = useEntries()
const { storage, available, serverActive, pendingCount, save } = useStorageBackend()

// Edited locally and only committed by `commit()`, so dismissing leaves nothing behind.
const draftBackend = ref<Backend>('browser')
const draftUrl = ref('')
const draftToken = ref('')
const formError = ref('')
const status = ref<Status>({ kind: 'idle' })
const consentDialog = ref<InstanceType<typeof ConfirmDialog> | null>(null)

// The probe is a plain object, never a Vue proxy: it is an adapter, like the ones the
// store is handed. `testedKey` remembers which address and token it last connected to.
let probe: LocalServerRepository | null = null
let testedKey: string | null = null
const keyOf = () => `${draftUrl.value.trim()}\n${draftToken.value}`

const useServer = computed(() => draftBackend.value === 'local-server')
const urlError = computed(() => (useServer.value ? validateServerUrl(draftUrl.value) : null))
const busy = computed(() => status.value.kind === 'testing' || status.value.kind === 'waiting')

function reset() {
  draftBackend.value = storage.value.backend
  draftUrl.value = storage.value.serverUrl
  draftToken.value = storage.value.token
  formError.value = ''
  status.value = { kind: 'idle' }
  probe = null
  testedKey = null
}

// Editing the address or token makes an earlier result stale.
watch([draftUrl, draftToken], () => {
  formError.value = ''
  if (testedKey !== null && testedKey !== keyOf()) {
    probe = null
    testedKey = null
    status.value = { kind: 'idle' }
  }
})

const plural = (n: number) => `${n} ${n === 1 ? 'change' : 'changes'}`

const statusText = computed(() => {
  const s = status.value
  switch (s.kind) {
    case 'testing':
      return 'Testing…'
    case 'waiting':
      return 'Waiting for Chrome’s permission prompt'
    case 'connected':
      return 'Connected'
    case 'blocked':
      return 'Blocked in Chrome’s site settings'
    case 'unauthorized':
      return 'Token rejected'
    case 'unreachable':
      return `Server unreachable, ${s.pending === 0 ? 'no changes' : plural(s.pending)} waiting`
    case 'malformed':
      return 'Error: the server sent an unexpected response'
    default:
      if (serverActive.value && storage.value.backend === 'local-server') {
        return pendingCount.value === 0
          ? 'In use. No changes waiting.'
          : `In use. ${plural(pendingCount.value)} waiting for the server.`
      }
      return 'Not tested yet'
  }
})

const showHelp = computed(() =>
  ['blocked', 'unauthorized', 'unreachable', 'malformed'].includes(status.value.kind),
)

async function runTest() {
  formError.value = ''
  if (urlError.value || busy.value) return
  let candidate: LocalServerRepository
  try {
    // Constructing it sends nothing: only testConnection() below does.
    candidate = new LocalServerRepository({
      baseUrl: draftUrl.value.trim(),
      token: draftToken.value,
      reconcileOnLoad: false,
    })
  } catch {
    formError.value = 'The local server can’t be used here.'
    return
  }
  status.value = { kind: 'testing' }
  const permission = await candidate.permission()
  if (permission === 'denied') {
    status.value = { kind: 'blocked' }
    return
  }
  if (permission === 'prompt') status.value = { kind: 'waiting' }
  // No reconcile: that would copy the log to the server before consent is asked for.
  const result = await candidate.testConnection({ reconcile: false })
  if (result.kind === 'connected') {
    probe = candidate
    testedKey = keyOf()
    status.value = { kind: 'connected' }
  } else if ((await candidate.permission()) === 'denied') {
    // Refusing the prompt looks like any other failure to the request itself.
    status.value = { kind: 'blocked' }
  } else if (result.kind === 'unreachable') {
    status.value = { kind: 'unreachable', pending: candidate.pendingCount() }
  } else {
    status.value = { kind: result.kind }
  }
}

/**
 * Applies the choice. False means stay in the dialog: the address is unusable, it
 * hasn't been tested, or the claimant declined to copy their log to the server.
 */
async function commit(): Promise<boolean> {
  formError.value = ''
  if (!available) return true
  const saved = storage.value
  const url = draftUrl.value.trim()

  if (draftBackend.value === 'browser') {
    if (saved.backend !== 'browser') save({ backend: 'browser', serverUrl: url, token: '' })
    return true
  }

  const unchanged =
    saved.backend === 'local-server' && saved.serverUrl === url && saved.token === draftToken.value
  if (unchanged) return true

  if (urlError.value) {
    formError.value = urlError.value
    return false
  }
  if (probe === null || testedKey !== keyOf()) {
    formError.value = 'Test the connection before turning this on.'
    return false
  }

  // A different server starts out empty, so it gets a copy of the log too. The
  // adapter mirrors every entry it lacks, so this is consent to turn it on.
  const copying =
    (saved.backend !== 'local-server' || saved.serverUrl !== url) && entries.value.length > 0
  if (copying && !(await consentDialog.value?.open())) return false

  save({ backend: 'local-server', serverUrl: url, token: draftToken.value })
  if (copying) void probe.reconcile()
  return true
}

defineExpose({ reset, commit })
</script>

<template>
  <fieldset v-if="available" class="storage">
    <legend class="label">Storage</legend>

    <label class="choice">
      <input v-model="draftBackend" type="radio" name="storage-backend" value="browser" />
      <span>Browser storage</span>
    </label>
    <label class="choice">
      <input v-model="draftBackend" type="radio" name="storage-backend" value="local-server" />
      <span>Local server</span>
    </label>
    <p class="hint">
      Browser storage is the default and sends nothing anywhere. A local server keeps a second copy
      on this computer. Changes take effect the next time you open the app.
    </p>

    <template v-if="useServer">
      <label class="field">
        <span class="label">Server address</span>
        <input
          v-model="draftUrl"
          type="url"
          spellcheck="false"
          :disabled="busy"
          :aria-invalid="urlError ? 'true' : 'false'"
          aria-describedby="storage-url-hint"
          data-testid="storage-url"
          v-bind="noAutofillAttrs"
        />
        <span id="storage-url-hint" class="hint">
          Only this computer is allowed: 127.0.0.1, localhost or [::1]. The usual port is
          {{ DEFAULT_SERVER_PORT }}.
        </span>
        <span v-if="urlError" class="error" data-testid="storage-url-error">{{ urlError }}</span>
      </label>

      <label class="field">
        <span class="label">Token</span>
        <input
          v-model="draftToken"
          type="password"
          spellcheck="false"
          :disabled="busy"
          data-testid="storage-token"
          v-bind="noAutofillAttrs"
        />
      </label>

      <div class="test">
        <button
          class="ghost"
          type="button"
          :disabled="busy || !!urlError"
          data-testid="storage-test"
          @click="runTest"
        >
          Test connection
        </button>
        <p class="status" role="status" data-testid="storage-status">{{ statusText }}</p>
      </div>

      <div v-if="showHelp" class="help" data-testid="storage-help">
        <p v-if="status.kind === 'unauthorized'">
          The server answered, but not with this token. Check that it is the one your server
          expects.
        </p>
        <template v-else>
          <p>The page can’t tell these apart, so check each in turn:</p>
          <ul>
            <li>Chrome’s permission for this site to reach your computer was refused.</li>
            <li>The server isn’t running.</li>
            <li>The address or port is wrong. The usual port is {{ DEFAULT_SERVER_PORT }}.</li>
            <li>This site’s address isn’t on the server’s list of allowed origins.</li>
          </ul>
        </template>
      </div>
    </template>

    <p v-if="formError" class="error" role="alert" data-testid="storage-error">{{ formError }}</p>

    <ConfirmDialog ref="consentDialog" confirm-label="Turn on and copy">
      Copy your {{ entries.length }} {{ entries.length === 1 ? 'entry' : 'entries' }} to the server
      on this computer? They also stay in this browser, and nothing is deleted.
    </ConfirmDialog>
  </fieldset>
</template>

<style scoped>
.storage {
  border: 0;
  border-top: 1px solid var(--line);
  margin: 0 0 14px;
  padding: 12px 0 0;
  min-width: 0;
}
.label {
  font-size: 12px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--brass);
}
legend.label {
  padding: 0;
  margin-bottom: 6px;
}
.choice {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 4px;
}
.field {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 12px 0 0;
}
input[type='url'],
input[type='password'] {
  font: inherit;
  font-size: 14px;
  padding: 7px 9px;
  border: 1px solid var(--line);
  border-radius: 4px;
  background: var(--paper);
  color: inherit;
}
.hint {
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
  margin: 6px 0 0;
}
.field .hint {
  margin: 0;
}
.error {
  font-size: 12px;
  line-height: 1.5;
  color: var(--warn);
}
p.error {
  margin: 10px 0 0;
}
.test {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
}
.status {
  font-size: 13px;
  margin: 0;
}
.help {
  font-size: 12px;
  line-height: 1.5;
  color: var(--muted);
  margin-top: 8px;
}
.help p {
  margin: 0 0 4px;
}
.help ul {
  margin: 0;
  padding-left: 18px;
}
button {
  font: inherit;
  font-size: 14px;
  padding: 8px 14px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid var(--line);
  background: var(--card);
  color: inherit;
}
button:disabled {
  cursor: default;
  opacity: 0.6;
}
button.ghost:not(:disabled):hover {
  border-color: var(--brass);
}
</style>
