import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_SERVER_PORT, DEFAULT_SERVER_URL } from '../lib/localServerRepository'

const KEY = 'work-search-log:storage:v1'

/**
 * The record is read once at module load, so each case needs a fresh module
 * instance: vi.resetModules() plus a dynamic import. No component is mounted
 * here, so a second copy of Vue does no harm.
 */
async function load() {
  vi.resetModules()
  const backend = await import('./useStorageBackend')
  const server = await import('../lib/localServerRepository')
  const repository = await import('../lib/entryRepository')
  return {
    ...backend,
    LocalServerRepository: server.LocalServerRepository,
    LocalStorageEntryRepository: repository.LocalStorageEntryRepository,
  }
}

beforeEach(() => {
  localStorage.clear()
  vi.stubEnv('DEV', false)
  vi.stubEnv('VITE_DEMO_DATA', undefined)
  // Enabling the server reconciles on load, which calls fetch.
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => new Response('[]', { status: 200 })),
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe('useStorageBackend', () => {
  it('defaults to browser storage, the usual address, and no token', async () => {
    const { useStorageBackend } = await load()
    expect(useStorageBackend().storage.value).toEqual({
      backend: 'browser',
      serverUrl: DEFAULT_SERVER_URL,
      token: '',
    })
    expect(DEFAULT_SERVER_URL).toBe(`http://127.0.0.1:${DEFAULT_SERVER_PORT}`)
    expect(DEFAULT_SERVER_PORT).toBe(8765)
  })

  it('reads a saved record', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ backend: 'local-server', serverUrl: 'http://localhost:9000', token: 'tok' }),
    )
    const { useStorageBackend } = await load()
    expect(useStorageBackend().storage.value).toEqual({
      backend: 'local-server',
      serverUrl: 'http://localhost:9000',
      token: 'tok',
    })
  })

  it.each([
    ['not JSON', '{not json'],
    ['not an object', '"local-server"'],
    ['an unknown backend', JSON.stringify({ backend: 'cloud', serverUrl: 5, token: 7 })],
  ])('falls back to the defaults when the record is %s', async (_name, raw) => {
    localStorage.setItem(KEY, raw)
    const { useStorageBackend } = await load()
    expect(useStorageBackend().storage.value).toEqual({
      backend: 'browser',
      serverUrl: DEFAULT_SERVER_URL,
      token: '',
    })
  })

  it('saves the choice and trims the address', async () => {
    const { useStorageBackend } = await load()
    useStorageBackend().save({
      backend: 'local-server',
      serverUrl: '  http://127.0.0.1:9000  ',
      token: 'tok',
    })
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      backend: 'local-server',
      serverUrl: 'http://127.0.0.1:9000',
      token: 'tok',
    })
  })

  it('drops the token when switching back to browser storage, keeping the address', async () => {
    const { useStorageBackend } = await load()
    const { save } = useStorageBackend()
    save({ backend: 'local-server', serverUrl: 'http://127.0.0.1:9000', token: 'tok' })
    save({ backend: 'browser', serverUrl: 'http://127.0.0.1:9000', token: 'tok' })
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({
      backend: 'browser',
      serverUrl: 'http://127.0.0.1:9000',
      token: '',
    })
  })

  it('writes nothing until something is saved', async () => {
    const { useStorageBackend, createEntryRepository } = await load()
    useStorageBackend()
    createEntryRepository()
    expect(localStorage.getItem(KEY)).toBeNull()
  })
})

describe('createEntryRepository', () => {
  it('uses browser storage by default and makes no request', async () => {
    const { createEntryRepository, LocalStorageEntryRepository } = await load()
    expect(createEntryRepository()).toBeInstanceOf(LocalStorageEntryRepository)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('uses the local server once it is turned on', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ backend: 'local-server', serverUrl: DEFAULT_SERVER_URL, token: 'tok' }),
    )
    const { createEntryRepository, useStorageBackend, LocalServerRepository } = await load()
    expect(createEntryRepository()).toBeInstanceOf(LocalServerRepository)
    expect(useStorageBackend().serverActive.value).toBe(true)
  })

  it('falls back to browser storage when the saved address no longer parses', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ backend: 'local-server', serverUrl: 'http://example.com', token: 'tok' }),
    )
    const { createEntryRepository, useStorageBackend, LocalStorageEntryRepository } = await load()
    expect(createEntryRepository()).toBeInstanceOf(LocalStorageEntryRepository)
    expect(useStorageBackend().serverActive.value).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('never uses the server in a demo build, even when saved', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    localStorage.setItem(
      'work-search-log:storage:v1:demo',
      JSON.stringify({ backend: 'local-server', serverUrl: DEFAULT_SERVER_URL, token: 'tok' }),
    )
    const { createEntryRepository, useStorageBackend, LocalStorageEntryRepository } = await load()
    expect(createEntryRepository()).toBeInstanceOf(LocalStorageEntryRepository)
    expect(useStorageBackend().available).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('reports the pending count of the live server', async () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ backend: 'local-server', serverUrl: DEFAULT_SERVER_URL, token: 'tok' }),
    )
    localStorage.setItem(
      'work-search-log:pending:v1',
      JSON.stringify([{ op: 'remove', id: 'a', updatedAt: '2000-01-01T00:00:00.000Z' }]),
    )
    const { createEntryRepository, useStorageBackend } = await load()
    createEntryRepository()
    expect(useStorageBackend().pendingCount.value).toBe(1)
  })
})

describe('validateServerUrl', () => {
  it.each([
    'http://127.0.0.1:8765',
    'http://localhost:8765',
    'http://[::1]:8765',
    '  http://127.0.0.1:8765  ',
  ])('accepts %s', async (url) => {
    const { validateServerUrl } = await load()
    expect(validateServerUrl(url)).toBeNull()
  })

  it.each([
    ['', /address/i],
    ['   ', /address/i],
    ['not a url', /valid/i],
    ['http://example.com', /loopback/i],
    ['http://127.0.0.1@example.com', /loopback/i],
    ['http://localhost.example.com', /loopback/i],
    ['http://user:pw@127.0.0.1', /loopback/i],
    ['ftp://127.0.0.1', /loopback/i],
  ])('rejects %j in plain language', async (url, message) => {
    const { validateServerUrl } = await load()
    expect(validateServerUrl(url)).toMatch(message)
  })
})
