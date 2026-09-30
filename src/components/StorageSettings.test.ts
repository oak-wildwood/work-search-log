import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'
import StorageSettings from './StorageSettings.vue'
import { useEntries } from '../composables/useEntries'
import {
  STORAGE_BACKEND_KEY,
  createEntryRepository,
  useStorageBackend,
} from '../composables/useStorageBackend'
import { DEFAULT_SERVER_URL, PENDING_KEY } from '../lib/localServerRepository'

const TOKEN = 'synthetic-token-0000'

let wrapper: VueWrapper | undefined
const body = () => new DOMWrapper(document.body)
type Exposed = { reset: () => void; commit: () => Promise<boolean> }
const exposed = () => wrapper!.vm.$.exposed as unknown as Exposed

interface Call {
  method: string
  url: string
}
let calls: Call[] = []

/** Stubs fetch with a handler, recording each call. */
function stubFetch(
  handler: (method: string, url: string, body?: string) => Response | Promise<Response>,
) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET'
      calls.push({ method, url })
      return handler(method, url, init.body as string | undefined)
    }),
  )
}

const healthyServer = () =>
  stubFetch((method) => new Response(method === 'GET' ? '[]' : '{}', { status: 200 }))

function stubPermission(state: string) {
  vi.stubGlobal('navigator', { permissions: { query: async () => ({ state }) } })
}

function logSyntheticEntry() {
  useEntries().addEntry({
    date: '2000-01-03',
    activityId: 'test-activity',
    activity: 'Test activity',
    siteAppliedOn: 'test-site.invalid',
    jobType: 'Test job type',
    employer: 'Test Employer',
    address: '0 Test Way',
    phone: '000-000-0000',
    contactName: 'Test Contact',
    contactMethod: 'test',
    result: 'test result',
    notes: 'test notes',
  })
}

// `reset()` changes the drafts, so wait for the render that shows them.
async function mountSection() {
  wrapper = mount(StorageSettings)
  exposed().reset()
  await nextTick()
  return wrapper
}

async function chooseServer(url?: string, token = TOKEN) {
  await wrapper!.get('input[value="local-server"]').setValue(true)
  if (url !== undefined) await wrapper!.get('[data-testid="storage-url"]').setValue(url)
  await wrapper!.get('[data-testid="storage-token"]').setValue(token)
}

const press = async () => {
  await wrapper!.get('[data-testid="storage-test"]').trigger('click')
  await flushPromises()
}
const statusText = () => wrapper!.get('[data-testid="storage-status"]').text()
const saved = () => JSON.parse(localStorage.getItem(STORAGE_BACKEND_KEY) ?? 'null')

beforeEach(() => {
  localStorage.clear()
  useStorageBackend().save({ backend: 'browser', serverUrl: DEFAULT_SERVER_URL, token: '' })
  localStorage.removeItem(STORAGE_BACKEND_KEY)
  createEntryRepository()
  useEntries().clearAll()
  stubFetch(() => {
    throw new Error('no request expected')
  })
  vi.stubGlobal('navigator', {})
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  useEntries().clearAll()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('StorageSettings', () => {
  describe('off by default', () => {
    it('starts on browser storage with no server fields and sends nothing', async () => {
      await mountSection()
      await flushPromises()
      expect((wrapper!.get('input[value="browser"]').element as HTMLInputElement).checked).toBe(
        true,
      )
      expect(wrapper!.find('[data-testid="storage-url"]').exists()).toBe(false)
      expect(calls).toEqual([])
    })

    it('saves nothing and returns true when the choice is unchanged', async () => {
      await mountSection()
      expect(await exposed().commit()).toBe(true)
      expect(saved()).toBeNull()
    })
  })

  describe('the address', () => {
    it('offers the usual address', async () => {
      await mountSection()
      await chooseServer()
      expect((wrapper!.get('[data-testid="storage-url"]').element as HTMLInputElement).value).toBe(
        DEFAULT_SERVER_URL,
      )
    })

    it.each(['http://example.com', 'http://127.0.0.1@example.com', 'not a url', ''])(
      'rejects %j in plain language and will not test it',
      async (url) => {
        healthyServer()
        await mountSection()
        await chooseServer(url)
        expect(wrapper!.get('[data-testid="storage-url-error"]').text()).not.toBe('')
        expect(wrapper!.get('[data-testid="storage-test"]').attributes('disabled')).toBeDefined()
        await press()
        expect(calls).toEqual([])
        expect(await exposed().commit()).toBe(false)
        await nextTick()
        // Says what is wrong with the address, not merely that a test is missing.
        expect(wrapper!.get('[data-testid="storage-error"]').text()).toBe(
          wrapper!.get('[data-testid="storage-url-error"]').text(),
        )
        expect(saved()).toBeNull()
      },
    )

    it('shows the token as a password field', async () => {
      await mountSection()
      await chooseServer()
      expect(wrapper!.get('[data-testid="storage-token"]').attributes('type')).toBe('password')
    })
  })

  describe('no request before the button', () => {
    it('sends nothing while the fields are filled in, or when the choice is saved', async () => {
      healthyServer()
      await mountSection()
      await chooseServer('http://localhost:9000')
      await flushPromises()
      expect(calls).toEqual([])
      expect(await exposed().commit()).toBe(false)
      expect(calls).toEqual([])
    })

    it('sends one request when the button is pressed, and copies nothing', async () => {
      healthyServer()
      logSyntheticEntry()
      await mountSection()
      await chooseServer()
      await press()
      expect(calls.map((c) => c.method)).toEqual(['GET'])
    })
  })

  describe('status', () => {
    it('says Connected', async () => {
      healthyServer()
      await mountSection()
      await chooseServer()
      expect(statusText()).toBe('Not tested yet')
      await press()
      expect(statusText()).toBe('Connected')
      expect(wrapper!.find('[data-testid="storage-help"]').exists()).toBe(false)
    })

    it('is a live region', async () => {
      await mountSection()
      await chooseServer()
      expect(wrapper!.get('[data-testid="storage-status"]').attributes('role')).toBe('status')
    })

    it('says Token rejected on a 401, and points at the token', async () => {
      stubFetch(() => new Response('', { status: 401 }))
      await mountSection()
      await chooseServer()
      await press()
      expect(statusText()).toBe('Token rejected')
      expect(wrapper!.get('[data-testid="storage-help"]').text()).toMatch(/token/i)
    })

    it('counts the waiting changes when the server is unreachable', async () => {
      stubFetch(() => {
        throw new TypeError('Failed to fetch')
      })
      localStorage.setItem(
        PENDING_KEY,
        JSON.stringify([
          { op: 'put', id: 'a', updatedAt: '2000-01-01T00:00:00.000Z' },
          { op: 'remove', id: 'b', updatedAt: '2000-01-01T00:00:00.000Z' },
        ]),
      )
      await mountSection()
      await chooseServer()
      await press()
      expect(statusText()).toBe('Server unreachable, 2 changes waiting')
    })

    it('says so when nothing is waiting', async () => {
      stubFetch(() => new Response('', { status: 503 }))
      await mountSection()
      await chooseServer()
      await press()
      expect(statusText()).toBe('Server unreachable, no changes waiting')
    })

    it('reports an unexpected response as an error', async () => {
      stubFetch(() => new Response('{"not":"a list"}', { status: 200 }))
      await mountSection()
      await chooseServer()
      await press()
      expect(statusText()).toBe('Error: the server sent an unexpected response')
    })

    it('lists the four causes it cannot tell apart when the test fails', async () => {
      stubFetch(() => {
        throw new TypeError('Failed to fetch')
      })
      await mountSection()
      await chooseServer()
      await press()
      const help = wrapper!.get('[data-testid="storage-help"]')
      expect(help.findAll('li')).toHaveLength(4)
      // The refused-prompt cause quotes Chrome's own wording and says where to undo it.
      expect(help.text()).toContain('You chose Block when Chrome asked')
      expect(help.text()).toContain('“Access other apps and services on this device”')
      expect(help.text()).toContain('Site settings')
      expect(help.text()).toContain('Apps on device')
      expect(help.text()).toMatch(/isn’t running/i)
      expect(help.text()).toMatch(/port/i)
      expect(help.text()).toMatch(/allowed origins/i)
    })

    it('says Blocked, without sending anything, when Chrome has the permission denied', async () => {
      healthyServer()
      stubPermission('denied')
      await mountSection()
      await chooseServer()
      await press()
      expect(statusText()).toBe('Blocked in Chrome’s site settings')
      expect(calls).toEqual([])
      const help = wrapper!.get('[data-testid="storage-help"]').text()
      expect(help).toContain('“Access other apps and services on this device”')
      expect(help).toContain('click the site icon at the left of Chrome’s address bar')
      expect(help).toContain('set Apps on device to Allow')
      // The page can tell this one, so it doesn't list the four it can't.
      expect(wrapper!.find('[data-testid="storage-help"] li').exists()).toBe(false)
    })

    it('says Blocked when the prompt is refused mid-request', async () => {
      let state = 'prompt'
      vi.stubGlobal('navigator', { permissions: { query: async () => ({ state }) } })
      stubFetch(() => {
        state = 'denied'
        throw new TypeError('Failed to fetch')
      })
      await mountSection()
      await chooseServer()
      await press()
      expect(statusText()).toBe('Blocked in Chrome’s site settings')
    })

    it('waits for the prompt with the button disabled and no timeout', async () => {
      vi.useFakeTimers()
      stubPermission('prompt')
      let answer: (r: Response) => void = () => {}
      stubFetch(() => new Promise<Response>((resolve) => (answer = resolve)))
      await mountSection()
      await chooseServer()
      await wrapper!.get('[data-testid="storage-test"]').trigger('click')
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()
      expect(statusText()).toBe('Waiting for Chrome’s permission prompt')
      expect(wrapper!.get('[data-testid="storage-waiting-help"]').text()).toContain(
        '“Access other apps and services on this device”',
      )
      expect(wrapper!.get('[data-testid="storage-test"]').attributes('disabled')).toBeDefined()

      await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
      await nextTick()
      expect(statusText()).toBe('Waiting for Chrome’s permission prompt')

      answer(new Response('[]', { status: 200 }))
      await vi.advanceTimersByTimeAsync(0)
      await nextTick()
      expect(statusText()).toBe('Connected')
      expect(wrapper!.get('[data-testid="storage-test"]').attributes('disabled')).toBeUndefined()
    })

    it('goes back to Not tested yet when the token is edited after a test', async () => {
      healthyServer()
      await mountSection()
      await chooseServer()
      await press()
      await wrapper!.get('[data-testid="storage-token"]').setValue('another-synthetic-token')
      expect(statusText()).toBe('Not tested yet')
    })

    it('shows the pending count of a server that is in use', async () => {
      useStorageBackend().save({
        backend: 'local-server',
        serverUrl: DEFAULT_SERVER_URL,
        token: TOKEN,
      })
      localStorage.setItem(
        PENDING_KEY,
        JSON.stringify([{ op: 'remove', id: 'a', updatedAt: '2000-01-01T00:00:00.000Z' }]),
      )
      // The server is down, so the load reconciliation leaves the change pending.
      stubFetch(() => {
        throw new TypeError('Failed to fetch')
      })
      createEntryRepository()
      await mountSection()
      expect(statusText()).toBe('In use. 1 change waiting for the server.')
    })
  })

  describe('turning it on', () => {
    it('is refused until the connection has been tested', async () => {
      healthyServer()
      logSyntheticEntry()
      await mountSection()
      await chooseServer()
      expect(await exposed().commit()).toBe(false)
      expect(wrapper!.get('[data-testid="storage-error"]').text()).toMatch(/test the connection/i)
      expect(body().find('dialog[open]').exists()).toBe(false)
      expect(saved()).toBeNull()
    })

    it('needs a fresh test after the address changes', async () => {
      healthyServer()
      await mountSection()
      await chooseServer()
      await press()
      await wrapper!.get('[data-testid="storage-url"]').setValue('http://localhost:9000')
      expect(await exposed().commit()).toBe(false)
      expect(saved()).toBeNull()
    })

    it('asks before turning it on, and copies the log on the next load rather than now', async () => {
      healthyServer()
      logSyntheticEntry()
      await mountSection()
      await chooseServer()
      await press()

      const done = exposed().commit()
      await flushPromises()
      const dialog = body().get('dialog[open]')
      expect(dialog.text()).toContain('Copy your 1 entry')
      expect(dialog.text()).toContain('the next time you open the app')
      expect(saved()).toBeNull()
      await dialog.findAll('button')[1].trigger('click')
      expect(await done).toBe(true)

      expect(saved()).toEqual({
        backend: 'local-server',
        serverUrl: DEFAULT_SERVER_URL,
        token: TOKEN,
      })
      await flushPromises()
      // This session still stores in the browser only, so nothing is copied yet.
      expect(calls.map((c) => c.method)).toEqual(['GET'])

      // A reload builds the repository again, and that is what copies the log.
      createEntryRepository()
      await vi.waitFor(() => expect(calls.filter((c) => c.method === 'POST')).toHaveLength(1))
      expect(calls.find((c) => c.method === 'POST')!.url).toMatch(/\/wsl\/entries:bulk$/)
      expect(useEntries().entries.value).toHaveLength(1)
    })

    it('does not bring back an entry removed between turning it on and reloading', async () => {
      const onServer = new Map<string, unknown>()
      stubFetch((method, _url, body) => {
        if (method === 'POST') {
          for (const entry of JSON.parse(body!).entries) onServer.set(entry.id, entry)
          return new Response('{}')
        }
        return new Response(JSON.stringify([...onServer.values()]))
      })
      logSyntheticEntry()
      await mountSection()
      await chooseServer()
      await press()
      const done = exposed().commit()
      await flushPromises()
      await body().get('dialog[open]').findAll('button')[1].trigger('click')
      expect(await done).toBe(true)

      // Changes made before the reload only reach the browser's own copy.
      const { entries, removeEntry } = useEntries()
      removeEntry(entries.value[0].id)
      await flushPromises()

      createEntryRepository()
      await vi.waitFor(() => expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2))
      await flushPromises()

      expect(onServer.size).toBe(0)
      expect(calls.filter((c) => c.method === 'POST')).toEqual([])
      expect(JSON.parse(localStorage.getItem('work-search-log:entries:v1') ?? '[]')).toEqual([])
    })

    it('changes nothing, and copies nothing, when the copy is declined', async () => {
      healthyServer()
      logSyntheticEntry()
      await mountSection()
      await chooseServer()
      await press()

      const done = exposed().commit()
      await flushPromises()
      await body().get('dialog[open]').findAll('button')[0].trigger('click')
      expect(await done).toBe(false)
      await flushPromises()

      expect(saved()).toBeNull()
      expect(calls.map((c) => c.method)).toEqual(['GET'])
      expect(useEntries().entries.value).toHaveLength(1)
    })

    it('does not ask when there is nothing to copy', async () => {
      healthyServer()
      await mountSection()
      await chooseServer()
      await press()
      expect(await exposed().commit()).toBe(true)
      expect(body().find('dialog[open]').exists()).toBe(false)
      expect(saved()?.backend).toBe('local-server')
      await flushPromises()
      expect(calls.filter((c) => c.method === 'POST')).toEqual([])
    })
  })

  describe('turning it off', () => {
    it('needs no new test when nothing about an enabled server changed', async () => {
      useStorageBackend().save({
        backend: 'local-server',
        serverUrl: 'http://localhost:9000',
        token: TOKEN,
      })
      await mountSection()
      expect(await exposed().commit()).toBe(true)
      expect(calls).toEqual([])
    })

    it('returns to browser storage, drops the token, keeps the address and touches no server', async () => {
      useStorageBackend().save({
        backend: 'local-server',
        serverUrl: 'http://localhost:9000',
        token: TOKEN,
      })
      await mountSection()
      await wrapper!.get('input[value="browser"]').setValue(true)
      expect(await exposed().commit()).toBe(true)
      expect(saved()).toEqual({
        backend: 'browser',
        serverUrl: 'http://localhost:9000',
        token: '',
      })
      expect(calls).toEqual([])
    })
  })
})
