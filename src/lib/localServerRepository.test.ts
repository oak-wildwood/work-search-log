import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Entry } from '../types'
import { STORAGE_KEY } from './entryRepository'
import { describeEntryRepositoryContract } from './entryRepositoryContract'
import { LocalServerRepository, PENDING_KEY, parseLoopbackBase } from './localServerRepository'

const BASE = 'http://127.0.0.1:4777'
const TOKEN = 'test-token'

// Deliberately synthetic — nothing here should read like a real employer.
function makeEntry(id: string, overrides: Partial<Entry> = {}): Entry {
  return {
    id,
    date: '2000-01-03',
    activityId: 'test-activity',
    activity: 'Test activity',
    siteAppliedOn: 'test-site.invalid',
    jobType: 'Test job type',
    employer: `Test Employer ${id}`,
    address: '0 Test Way',
    phone: '000-000-0000',
    contactName: 'Test Contact',
    contactMethod: 'test',
    result: 'test result',
    notes: 'test notes',
    createdAt: '2000-01-03T00:00:00.000Z',
    updatedAt: '2000-01-04T00:00:00.000Z',
    ...overrides,
  }
}

interface Call {
  method: string
  url: string
  init: RequestInit
}

/** A stand-in for the companion service, served through a stubbed global fetch. */
function installFakeServer() {
  const server = {
    entries: new Map<string, Entry>(),
    down: false,
    rejectBulk: false,
    rejectDelete: false,
    respond: null as null | (() => Response | Promise<Response>),
    calls: [] as Call[],
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      const method = init.method ?? 'GET'
      server.calls.push({ method, url: input, init })
      if (server.down) throw new TypeError('Failed to fetch')
      if (server.respond) return server.respond()
      const headers = init.headers as Record<string, string>
      if (headers.Authorization !== `Bearer ${TOKEN}`) return new Response('', { status: 401 })
      const path = input.slice(BASE.length)
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status })
      if (method === 'GET' && path === '/wsl/entries') return json([...server.entries.values()])
      if (method === 'POST' && path === '/wsl/entries:bulk') {
        if (server.rejectBulk) return json({}, 400)
        for (const e of JSON.parse(init.body as string).entries as Entry[])
          server.entries.set(e.id, e)
        return json({})
      }
      const id = decodeURIComponent(path.replace('/wsl/entries/', ''))
      if (method === 'PUT') {
        const e = JSON.parse(init.body as string) as Entry
        server.entries.set(id, e)
        return json(e)
      }
      if (method === 'DELETE') {
        if (server.rejectDelete) return json({}, 500)
        return server.entries.delete(id) ? json({}) : json({}, 404)
      }
      return json({}, 405)
    }),
  )
  return server
}

/**
 * Holds every bulk POST until released, so a test can act while a reconciliation is
 * in flight. Call after installFakeServer. `offline` makes later requests fail.
 */
function holdBulk() {
  const realFetch = globalThis.fetch as unknown as (
    input: string,
    init?: RequestInit,
  ) => Promise<Response>
  const hold = { reached: false, offline: false, release: () => {} }
  const gate = new Promise<void>((resolve) => (hold.release = resolve))
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string, init: RequestInit = {}) => {
      if (hold.offline) throw new TypeError('Failed to fetch')
      if (init.method === 'POST') {
        hold.reached = true
        await gate
      }
      return realFetch(input, init)
    }),
  )
  return hold
}

function stubPermission(state: string | Error) {
  const query = vi.fn(async () => {
    if (state instanceof Error) throw state
    return { state }
  })
  vi.stubGlobal('navigator', { permissions: { query } })
  return query
}

/** Headers arrive, but the body never finishes. */
const stalledBody = () =>
  new Response(
    new ReadableStream({
      start: (controller) => controller.enqueue(new TextEncoder().encode('[')),
    }),
    { status: 200 },
  )

const make = (opts: Partial<ConstructorParameters<typeof LocalServerRepository>[0]> = {}) =>
  new LocalServerRepository({ baseUrl: BASE, token: TOKEN, ...opts })
const settle = async (repo: LocalServerRepository) => {
  await repo.reconcile()
}
const localIds = () =>
  (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Entry[]).map((e) => e.id).sort()
const pending = () => JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]')

beforeEach(() => {
  localStorage.clear()
  stubPermission(new TypeError('unknown permission name'))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.unstubAllEnvs()
})

describeEntryRepositoryContract('LocalServerRepository', () => {
  localStorage.clear()
  installFakeServer()
  return make()
})

describe('loopback only', () => {
  it.each([
    'http://127.0.0.1:4777',
    'http://localhost:4777',
    'http://[::1]:4777',
    'https://127.0.0.1',
    'http://127.1:4777',
    'http://LOCALHOST:4777/',
  ])('accepts %s', (url) => {
    expect(() => parseLoopbackBase(url)).not.toThrow()
  })

  it.each([
    'http://127.0.0.1@example.com',
    'http://user:pw@127.0.0.1',
    'http://user@127.0.0.1',
    'http://localhost.example.com',
    'http://127.0.0.1.example.com',
    'http://localhost.',
    'http://example.com',
    'ftp://127.0.0.1',
    'not a url',
    '',
  ])('rejects %s', (url) => {
    expect(() => parseLoopbackBase(url)).toThrow()
    expect(() => make({ baseUrl: url })).toThrow()
  })

  it('sends every request with redirect: error', async () => {
    const server = installFakeServer()
    const repo = make()
    await repo.put(makeEntry('a'))
    await repo.remove('a')
    await repo.replaceAll([makeEntry('b')])
    await repo.list()
    await repo.testConnection()
    expect(server.calls.length).toBeGreaterThan(4)
    for (const call of server.calls) expect(call.init.redirect).toBe('error')
  })

  it('sends the bearer token and JSON bodies', async () => {
    const server = installFakeServer()
    const repo = make()
    await repo.put(makeEntry('a'))
    await settle(repo)
    const put = server.calls.find((c) => c.method === 'PUT')!
    expect((put.init.headers as Record<string, string>).Authorization).toBe(`Bearer ${TOKEN}`)
    expect((put.init.headers as Record<string, string>)['Content-Type']).toBe('application/json')
    expect(put.url).toBe(`${BASE}/wsl/entries/a`)
  })

  it('is never active in a demo build', async () => {
    vi.stubEnv('VITE_DEMO_DATA', '1')
    vi.resetModules()
    const mod = await import('./localServerRepository')
    expect(() => new mod.LocalServerRepository({ baseUrl: BASE, token: TOKEN })).toThrow(/demo/)
  })
})

describe('local first', () => {
  it('records locally and queues pending when the server is down at write time', async () => {
    const server = installFakeServer()
    server.down = true
    const repo = make({ reconcileOnLoad: false })
    await repo.put(makeEntry('a', { updatedAt: '2000-02-01T00:00:00.000Z' }))
    await settle(repo)
    expect(localIds()).toEqual(['a'])
    expect(pending()).toEqual([{ op: 'put', id: 'a', updatedAt: '2000-02-01T00:00:00.000Z' }])
    expect(repo.pendingCount()).toBe(1)
  })

  it('notifies pending-count subscribers and replays once the server is back', async () => {
    const server = installFakeServer()
    server.down = true
    const repo = make({ reconcileOnLoad: false })
    const counts: number[] = []
    repo.onPendingChange((n) => counts.push(n))
    await repo.put(makeEntry('a'))
    await repo.remove('gone')
    await settle(repo)
    expect(repo.pendingCount()).toBe(2)
    server.down = false
    expect(await repo.reconcile()).toBe(true)
    expect([...server.entries.keys()]).toEqual(['a'])
    expect(repo.pendingCount()).toBe(0)
    expect(counts).toEqual([1, 2, 0])
  })

  it('replays a pending remove to the server and keeps the entry gone locally', async () => {
    const server = installFakeServer()
    const repo = make({ reconcileOnLoad: false })
    await repo.put(makeEntry('a'))
    await settle(repo)
    server.down = true
    await repo.remove('a')
    await settle(repo)
    expect(server.entries.has('a')).toBe(true)
    server.down = false
    await repo.reconcile()
    expect(server.entries.has('a')).toBe(false)
    expect(localIds()).toEqual([])
  })

  it('treats a 404 on delete as success', async () => {
    const server = installFakeServer()
    const repo = make({ reconcileOnLoad: false })
    await repo.remove('never-existed')
    await settle(repo)
    expect(server.calls.some((c) => c.method === 'DELETE')).toBe(true)
    expect(repo.pendingCount()).toBe(0)
  })

  it('rejects when the local write fails', async () => {
    installFakeServer()
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    await expect(make({ reconcileOnLoad: false }).put(makeEntry('a'))).rejects.toThrow()
    vi.restoreAllMocks()
  })
})

describe('unreachable is not empty', () => {
  it.each([
    ['network error', () => null],
    ['500', () => new Response('', { status: 500 })],
    ['malformed body', () => new Response('{"not":"a list"}', { status: 200 })],
    ['non-JSON body', () => new Response('<html>', { status: 200 })],
    ['an entry with no id', () => new Response('[{"notes":"x"}]', { status: 200 })],
    [
      'an entry with a non-string field',
      () => new Response('[{"id":"x","notes":5}]', { status: 200 }),
    ],
    ['an entry that is not an object', () => new Response('["x"]', { status: 200 })],
  ])('never deletes local entries on %s at load', async (_name, make_) => {
    const server = installFakeServer()
    const body = make_()
    if (body) server.respond = () => body
    else server.down = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeEntry('a'), makeEntry('b')]))
    const repo = make()
    const listener = vi.fn()
    repo.onReconciled(listener)
    expect(await repo.reconcile()).toBe(false)
    expect(localIds()).toEqual(['a', 'b'])
    expect((await repo.list()).map((e) => e.id).sort()).toEqual(['a', 'b'])
    expect(listener).not.toHaveBeenCalled()
  })

  it('times out a hung request and keeps the write pending', async () => {
    vi.useFakeTimers()
    const server = installFakeServer()
    server.respond = () => new Promise<Response>(() => {})
    const repo = make({ reconcileOnLoad: false, timeoutMs: 1000 })
    await repo.put(makeEntry('a'))
    const done = repo.reconcile()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await done).toBe(false)
    expect(repo.pendingCount()).toBe(1)
    expect(localIds()).toEqual(['a'])
  })

  it('times out a response whose body stalls, without blocking what comes after', async () => {
    vi.useFakeTimers()
    const server = installFakeServer()
    server.respond = stalledBody
    const repo = make({ reconcileOnLoad: false, timeoutMs: 1000 })
    const stalled = repo.reconcile()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await stalled).toBe(false)
    server.respond = null
    const next = repo.reconcile()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await next).toBe(true)
  })
})

describe('reconciliation', () => {
  it('pushes an entry that is local only, rather than removing it', async () => {
    const server = installFakeServer()
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeEntry('a')]))
    const repo = make({ reconcileOnLoad: false })
    await repo.reconcile()
    expect(server.entries.has('a')).toBe(true)
    expect(localIds()).toEqual(['a'])
  })

  it('later updatedAt wins when both sides changed: local later', async () => {
    const server = installFakeServer()
    server.entries.set(
      'a',
      makeEntry('a', { notes: 'server', updatedAt: '2000-03-01T00:00:00.000Z' }),
    )
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makeEntry('a', { notes: 'local', updatedAt: '2000-04-01T00:00:00.000Z' })]),
    )
    await make({ reconcileOnLoad: false }).reconcile()
    expect(server.entries.get('a')?.notes).toBe('local')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0].notes).toBe('local')
  })

  it('later updatedAt wins when both sides changed: server later', async () => {
    const server = installFakeServer()
    server.entries.set(
      'a',
      makeEntry('a', { notes: 'server', updatedAt: '2000-05-01T00:00:00.000Z' }),
    )
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makeEntry('a', { notes: 'local', updatedAt: '2000-04-01T00:00:00.000Z' })]),
    )
    const repo = make({ reconcileOnLoad: false })
    const listener = vi.fn()
    repo.onReconciled(listener)
    server.down = true
    await repo.put(makeEntry('a', { notes: 'local', updatedAt: '2000-04-01T00:00:00.000Z' }))
    await settle(repo)
    server.down = false
    await repo.reconcile()
    expect(server.entries.get('a')?.notes).toBe('server')
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)[0].notes).toBe('server')
    expect(listener).toHaveBeenLastCalledWith([expect.objectContaining({ notes: 'server' })])
  })

  it('brings server-only entries into local storage and tells listeners, on load', async () => {
    const server = installFakeServer()
    server.entries.set('s', makeEntry('s'))
    const repo = make()
    const listener = vi.fn()
    repo.onReconciled(listener)
    await settle(repo)
    expect(localIds()).toEqual(['s'])
    expect(listener).toHaveBeenCalledWith([expect.objectContaining({ id: 's' })])
  })

  it('tells listeners after a pending replay, and stops after unsubscribe', async () => {
    const server = installFakeServer()
    server.down = true
    const repo = make({ reconcileOnLoad: false })
    const listener = vi.fn()
    const off = repo.onReconciled(listener)
    await repo.put(makeEntry('a'))
    await settle(repo)
    expect(listener).not.toHaveBeenCalled()
    server.down = false
    await repo.reconcile()
    expect(listener).toHaveBeenCalledTimes(1)
    off()
    await repo.reconcile()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('replaceAll bulk-upserts and deletes server ids absent from the new set', async () => {
    const server = installFakeServer()
    server.entries.set('old', makeEntry('old'))
    server.entries.set('keep', makeEntry('keep'))
    const repo = make({ reconcileOnLoad: false })
    await repo.replaceAll([makeEntry('keep', { notes: 'new' }), makeEntry('added')])
    await settle(repo)
    expect([...server.entries.keys()].sort()).toEqual(['added', 'keep'])
    expect(server.entries.get('keep')?.notes).toBe('new')
    expect(repo.pendingCount()).toBe(0)
  })

  it('replaceAll while unreachable sends no deletes and stays pending', async () => {
    const server = installFakeServer()
    server.down = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify([makeEntry('x')]))
    const repo = make({ reconcileOnLoad: false })
    await repo.replaceAll([makeEntry('y')])
    await settle(repo)
    expect(localIds()).toEqual(['y'])
    expect(
      pending()
        .map((p: { op: string; id: string }) => `${p.op}:${p.id}`)
        .sort(),
    ).toEqual(['put:y', 'remove:x'])
  })

  it('accepts an entry with only an id, date and activity, as a backup import allows', async () => {
    const server = installFakeServer()
    server.entries.set('srv', makeEntry('srv'))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([{ id: 'sparse', date: '2000-01-03', activity: 'Test activity' }]),
    )
    const repo = make({ reconcileOnLoad: false })
    expect(await repo.reconcile()).toBe(true)
    expect(server.entries.has('sparse')).toBe(true)
    expect(await repo.reconcile()).toBe(true)
    expect(await repo.testConnection()).toEqual({ kind: 'connected' })
  })

  it('still brings server entries in when the server rejects a push, and keeps it pending', async () => {
    const server = installFakeServer()
    server.down = true
    const repo = make({ reconcileOnLoad: false })
    await repo.put(makeEntry('mine'))
    await settle(repo)
    server.down = false
    server.rejectBulk = true
    server.entries.set('srv', makeEntry('srv'))
    const listener = vi.fn()
    repo.onReconciled(listener)
    expect(await repo.reconcile()).toBe(false)
    expect(localIds()).toEqual(['mine', 'srv'])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(pending()).toEqual([{ op: 'put', id: 'mine', updatedAt: '2000-01-04T00:00:00.000Z' }])
    server.rejectBulk = false
    expect(await repo.reconcile()).toBe(true)
    expect(server.entries.has('mine')).toBe(true)
    expect(repo.pendingCount()).toBe(0)
  })

  it('does not bring back an entry removed while a reconciliation is in flight', async () => {
    const server = installFakeServer()
    server.entries.set('a', makeEntry('a', { updatedAt: '2000-05-01T00:00:00.000Z' }))
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([makeEntry('a', { updatedAt: '2000-04-01T00:00:00.000Z' }), makeEntry('b')]),
    )
    const hold = holdBulk()
    const repo = make({ reconcileOnLoad: false })
    const done = repo.reconcile()
    await vi.waitFor(() => expect(hold.reached).toBe(true))
    await repo.remove('a')
    hold.release()
    expect(await done).toBe(true)
    expect(localIds()).toEqual(['b'])
    await settle(repo)
    expect(server.entries.has('a')).toBe(false)
  })

  it('keeps a change made while an earlier one was in flight pending', async () => {
    const server = installFakeServer()
    server.down = true
    const repo = make({ reconcileOnLoad: false })
    await repo.put(makeEntry('x', { updatedAt: '2000-01-05T00:00:00.000Z' }))
    await settle(repo)
    server.down = false
    const hold = holdBulk()
    const done = repo.reconcile()
    await vi.waitFor(() => expect(hold.reached).toBe(true))
    hold.offline = true
    await repo.put(makeEntry('x', { notes: 'edited', updatedAt: '2000-01-06T00:00:00.000Z' }))
    hold.release()
    expect(await done).toBe(true)
    await settle(repo)
    expect(pending()).toEqual([{ op: 'put', id: 'x', updatedAt: '2000-01-06T00:00:00.000Z' }])
  })

  describe('a replaceAll made while offline', () => {
    function offlineClearAll() {
      const server = installFakeServer()
      server.entries.set('x', makeEntry('x'))
      server.entries.set('u', makeEntry('u'))
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeEntry('x')]))
      const repo = make({ reconcileOnLoad: false })
      return { server, repo }
    }

    it('does not pull server-only entries back in while its operations are unsent', async () => {
      const { server, repo } = offlineClearAll()
      server.down = true
      await repo.replaceAll([])
      await settle(repo)
      server.down = false
      server.rejectDelete = true
      expect(await repo.reconcile()).toBe(false)
      expect(localIds()).toEqual([])
      expect(pending().map((p: { id: string }) => p.id)).toEqual(['x'])
    })

    it('lets server-only entries reach the app once its operations have replayed', async () => {
      const { server, repo } = offlineClearAll()
      server.down = true
      await repo.replaceAll([])
      await settle(repo)
      server.down = false
      const listener = vi.fn()
      repo.onReconciled(listener)
      expect(await repo.reconcile()).toBe(true)
      expect(server.entries.has('x')).toBe(false)
      expect(localIds()).toEqual(['u'])
      expect(listener).toHaveBeenLastCalledWith([expect.objectContaining({ id: 'u' })])
    })
  })
})

describe('testConnection', () => {
  it('reports connected', async () => {
    installFakeServer()
    expect(await make({ reconcileOnLoad: false }).testConnection()).toEqual({ kind: 'connected' })
  })

  it('reports unauthorized for a wrong token, 401 and 403', async () => {
    const server = installFakeServer()
    const repo = make({ reconcileOnLoad: false })
    for (const status of [401, 403]) {
      server.respond = () => new Response('', { status })
      expect(await repo.testConnection()).toEqual({ kind: 'unauthorized' })
    }
    server.respond = null
    expect(
      await new LocalServerRepository({
        baseUrl: BASE,
        token: 'wrong',
        reconcileOnLoad: false,
      }).testConnection(),
    ).toEqual({ kind: 'unauthorized' })
  })

  it('reports unreachable for network errors and other non-2xx', async () => {
    const server = installFakeServer()
    const repo = make({ reconcileOnLoad: false })
    server.down = true
    expect(await repo.testConnection()).toEqual({ kind: 'unreachable' })
    server.down = false
    server.respond = () => new Response('', { status: 503 })
    expect(await repo.testConnection()).toEqual({ kind: 'unreachable' })
  })

  it('replays what was written while prompting once it connects', async () => {
    let state = 'prompt'
    vi.stubGlobal('navigator', { permissions: { query: async () => ({ state }) } })
    const server = installFakeServer()
    const repo = make({ reconcileOnLoad: false })
    const listener = vi.fn()
    repo.onReconciled(listener)
    await repo.put(makeEntry('a'))
    await settle(repo)
    expect(server.calls).toEqual([])
    server.entries.set('s', makeEntry('s'))
    // The claimant answers the prompt while the request is waiting.
    server.respond = () => {
      state = 'granted'
      server.respond = null
      return new Response('[]', { status: 200 })
    }
    expect(await repo.testConnection()).toEqual({ kind: 'connected' })
    await vi.waitFor(() => expect(repo.pendingCount()).toBe(0))
    expect(server.entries.has('a')).toBe(true)
    expect(localIds()).toEqual(['a', 's'])
    expect(listener).toHaveBeenCalled()
  })

  it('reports malformed for a 2xx that is not an Entry[]', async () => {
    const server = installFakeServer()
    const repo = make({ reconcileOnLoad: false })
    server.respond = () => new Response('{"entries":[]}', { status: 200 })
    expect(await repo.testConnection()).toEqual({ kind: 'malformed' })
  })
})

describe('loopback-network permission', () => {
  it.each([
    ['granted', 'granted'],
    ['prompt', 'prompt'],
    ['denied', 'denied'],
    ['something-new', 'unsupported'],
  ])('maps %s to %s', async (state, expected) => {
    stubPermission(state)
    expect(await make({ reconcileOnLoad: false }).permission()).toBe(expected)
  })

  it('is unsupported when the name is unknown or the call throws', async () => {
    stubPermission(new TypeError('unknown name'))
    const repo = make({ reconcileOnLoad: false })
    expect(await repo.permission()).toBe('unsupported')
    vi.stubGlobal('navigator', {})
    expect(await repo.permission()).toBe('unsupported')
  })

  it('queries the loopback-network name', async () => {
    const query = stubPermission('granted')
    await make({ reconcileOnLoad: false }).permission()
    expect(query).toHaveBeenCalledWith({ name: 'loopback-network' })
  })

  it.each(['prompt', 'denied'])(
    'sends no request while %s; writes land locally and pending',
    async (state) => {
      stubPermission(state)
      const server = installFakeServer()
      localStorage.setItem(STORAGE_KEY, JSON.stringify([makeEntry('old')]))
      const repo = make()
      const listener = vi.fn()
      repo.onReconciled(listener)
      await repo.list()
      await repo.put(makeEntry('a'))
      await repo.remove('old')
      await repo.replaceAll([makeEntry('b')])
      await settle(repo)
      expect(server.calls).toEqual([])
      expect(listener).not.toHaveBeenCalled()
      expect(localIds()).toEqual(['b'])
      expect(repo.pendingCount()).toBeGreaterThan(0)
    },
  )

  it('lets testConnection through while prompting, with no timeout', async () => {
    vi.useFakeTimers()
    stubPermission('prompt')
    const server = installFakeServer()
    let release: (r: Response) => void = () => {}
    server.respond = () => new Promise<Response>((resolve) => (release = resolve))
    const repo = make({ reconcileOnLoad: false, timeoutMs: 1000 })
    let settled = false
    const result = repo.testConnection().then((r) => {
      settled = true
      return r
    })
    await vi.advanceTimersByTimeAsync(10 * 60 * 1000)
    expect(server.calls).toHaveLength(1)
    expect(settled).toBe(false)
    release(new Response('[]', { status: 200 }))
    expect(await result).toEqual({ kind: 'connected' })
  })

  it('times out a body that stalls after the prompt was answered', async () => {
    vi.useFakeTimers()
    stubPermission('prompt')
    const server = installFakeServer()
    server.respond = stalledBody
    const repo = make({ reconcileOnLoad: false, timeoutMs: 1000 })
    const result = repo.testConnection()
    await vi.advanceTimersByTimeAsync(5000)
    expect(await result).toEqual({ kind: 'unreachable' })
  })

  it('treats unsupported like granted', async () => {
    const server = installFakeServer()
    await make().reconcile()
    expect(server.calls.length).toBeGreaterThan(0)
  })
})
