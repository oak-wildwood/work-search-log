import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DOMWrapper, flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import App from './App.vue'
import PreferencesDialog from './components/PreferencesDialog.vue'
import { useEntries } from './composables/useEntries'
import { useSettings } from './composables/useSettings'
import { STORAGE_BACKEND_KEY, useStorageBackend } from './composables/useStorageBackend'
import { toBackupJson } from './lib/backup'
import { toCsv } from './lib/csv'
import { DEFAULT_SERVER_URL } from './lib/localServerRepository'

// Opting in to the local server touches the network and holds a secret, so the
// guarantees around both live together here rather than scattered per component.

const TOKEN = 'synthetic-token-0000'

let wrapper: VueWrapper | undefined
const body = () => new DOMWrapper(document.body)

beforeEach(() => {
  localStorage.clear()
  useEntries().clearAll()
})

afterEach(() => {
  wrapper?.unmount()
  wrapper = undefined
  useEntries().clearAll()
  useStorageBackend().save({ backend: 'browser', serverUrl: DEFAULT_SERVER_URL, token: '' })
  localStorage.removeItem(STORAGE_BACKEND_KEY)
  vi.unstubAllGlobals()
})

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

describe('off by default', () => {
  it('a fresh app makes no fetch calls, through a first run and its Save', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)

    wrapper = mount(App)
    await flushPromises()
    await body().get('.primary').trigger('click')
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_BACKEND_KEY)).toBeNull()
  })

  it('opening Preferences later, and saving it, makes no fetch calls either', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    useSettings().markOnboarded()

    wrapper = mount(PreferencesDialog, { props: { open: true } })
    await flushPromises()
    await body().get('.primary').trigger('click')
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
    expect(localStorage.getItem(STORAGE_BACKEND_KEY)).toBeNull()
  })

  it('logging, editing and removing entries makes no fetch calls', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const { entries, updateEntry, removeEntry } = useEntries()

    logSyntheticEntry()
    const { id, ...draft } = entries.value[0]
    updateEntry(id, { ...draft, notes: 'edited' })
    removeEntry(id)
    await flushPromises()

    expect(fetchSpy).not.toHaveBeenCalled()
  })
})

describe('the token stays out of the record', () => {
  beforeEach(() => {
    useStorageBackend().save({
      backend: 'local-server',
      serverUrl: DEFAULT_SERVER_URL,
      token: TOKEN,
    })
    logSyntheticEntry()
    // Not vacuous: the token really is stored, just not with anything exported.
    expect(localStorage.getItem(STORAGE_BACKEND_KEY)).toContain(TOKEN)
  })

  it('is absent from the settings object the print view is handed', () => {
    expect(JSON.stringify(useSettings().settings.value)).not.toContain(TOKEN)
  })

  it('is absent from the JSON backup', () => {
    const json = toBackupJson(useEntries().entries.value)
    expect(json).not.toContain(TOKEN)
    expect(Object.keys(JSON.parse(json)).sort()).toEqual(['entries', 'schema', 'version'])
  })

  it('is absent from the CSV export', () => {
    expect(toCsv(useEntries().entries.value)).not.toContain(TOKEN)
  })

  it('is absent from the print view and the rest of the page', async () => {
    useSettings().markOnboarded()
    wrapper = mount(App)
    await flushPromises()

    const printed = wrapper.findAll('.print-only')
    expect(printed.length).toBeGreaterThan(0)
    for (const section of printed) {
      expect(section.html()).not.toContain(TOKEN)
      expect(section.text()).not.toContain(TOKEN)
    }
    expect(wrapper.html()).not.toContain(TOKEN)
  })
})
