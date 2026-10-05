import { readonly, ref } from 'vue'
import { DEMO_DATA_ENABLED, STORAGE_SUFFIX } from '../lib/demoMode'
import { LocalStorageEntryRepository, type EntryRepository } from '../lib/entryRepository'
import {
  DEFAULT_SERVER_URL,
  LocalServerRepository,
  parseLoopbackBase,
} from '../lib/localServerRepository'
import { readJSON, writeJSON } from '../lib/storage'

export const STORAGE_BACKEND_KEY = `work-search-log:storage:v1${STORAGE_SUFFIX}`

export type Backend = 'browser' | 'local-server'

/**
 * Where the log lives. Kept apart from `Settings` on purpose: `settings` is handed
 * whole to the print view, and the token here is a secret that must never sit next
 * to anything printed or exported. It is still `localStorage`, like everything else.
 */
export interface StorageBackendSettings {
  backend: Backend
  serverUrl: string
  token: string
}

function load(): StorageBackendSettings {
  const stored = readJSON<Partial<StorageBackendSettings> | null>(STORAGE_BACKEND_KEY, null)
  return {
    backend: stored?.backend === 'local-server' ? 'local-server' : 'browser',
    serverUrl: typeof stored?.serverUrl === 'string' ? stored.serverUrl : DEFAULT_SERVER_URL,
    token: typeof stored?.token === 'string' ? stored.token : '',
  }
}

const state = ref<StorageBackendSettings>(load())

const serverActive = ref(false)
const pendingCount = ref(0)
const caughtUp = ref(false)

/** A plain-language reason the address can't be used, or null when it can. */
export function validateServerUrl(raw: string): string | null {
  const address = raw.trim()
  if (address === '') return 'Enter the address the server is running at.'
  try {
    new URL(address)
  } catch {
    return `That isn’t a full address. It should look like ${DEFAULT_SERVER_URL}.`
  }
  try {
    parseLoopbackBase(address)
    return null
  } catch {
    return `Use an address on this computer, such as ${DEFAULT_SERVER_URL}. Only 127.0.0.1, localhost and [::1] are allowed.`
  }
}

/**
 * The repository the log is stored in, chosen once at load. A saved choice that
 * can't be honored (a demo build, an address that no longer parses) quietly falls
 * back to browser storage: a setting must never stop someone recording what they did.
 */
export function createEntryRepository(): EntryRepository {
  serverActive.value = false
  pendingCount.value = 0
  caughtUp.value = false
  const { backend, serverUrl, token } = state.value
  if (backend === 'local-server' && !DEMO_DATA_ENABLED) {
    try {
      const server = new LocalServerRepository({ baseUrl: serverUrl.trim(), token })
      serverActive.value = true
      pendingCount.value = server.pendingCount()
      server.onPendingChange((count) => (pendingCount.value = count))
      server.onCaughtUp(() => (caughtUp.value = true))
      return server
    } catch {
      // fall through to browser storage
    }
  }
  return new LocalStorageEntryRepository()
}

/** Commits the claimant's choice. Turning the server off also drops the token. */
function save(next: StorageBackendSettings) {
  const committed: StorageBackendSettings = {
    backend: next.backend,
    serverUrl: next.serverUrl.trim(),
    token: next.backend === 'local-server' ? next.token.trim() : '',
  }
  state.value = committed
  writeJSON(STORAGE_BACKEND_KEY, committed)
}

export function useStorageBackend() {
  return {
    storage: readonly(state),
    /** False in a demo build, where the server is never used. */
    available: !DEMO_DATA_ENABLED,
    /** Whether this page load is actually storing through the server. */
    serverActive: readonly(serverActive),
    pendingCount: readonly(pendingCount),
    /** Whether this page load has confirmed the server holds every entry in the log. */
    caughtUp: readonly(caughtUp),
    save,
  }
}
