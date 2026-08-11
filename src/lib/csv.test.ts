import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'
import type { Entry } from '../types'

function makeEntry(overrides: Partial<Entry>): Entry {
  return {
    id: '1',
    date: '2026-08-10',
    activity: 'Applied online for a job',
    siteAppliedOn: 'LinkedIn',
    jobType: 'Warehouse associate',
    employer: 'Acme Co',
    address: '',
    phone: '',
    contactName: '',
    contactMethod: '',
    result: 'Submitted application',
    notes: '',
    createdAt: '2026-08-10T00:00:00.000Z',
    updatedAt: '2026-08-10T00:00:00.000Z',
    ...overrides,
  }
}

describe('toCsv', () => {
  it('writes a header row followed by one row per entry', () => {
    const csv = toCsv([makeEntry({})])
    const lines = csv.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0]).toBe(
      'Date,Activity,Site Applied On,Job Type Sought,Employer,Address/Website,Phone,Contact Name,Contact Method,Result,Notes',
    )
  })

  it('escapes embedded quotes and commas', () => {
    const csv = toCsv([makeEntry({ notes: 'Called re: "warehouse, night shift" role' })])
    expect(csv).toContain('"Called re: ""warehouse, night shift"" role"')
  })

  it('sorts rows chronologically regardless of input order', () => {
    const csv = toCsv([
      makeEntry({ id: 'a', date: '2026-08-12', employer: 'Later Co' }),
      makeEntry({ id: 'b', date: '2026-08-05', employer: 'Earlier Co' }),
    ])
    const [, first, second] = csv.split('\n')
    expect(first).toContain('Earlier Co')
    expect(second).toContain('Later Co')
  })

  it('treats missing optional fields as empty strings, not "undefined"', () => {
    const csv = toCsv([makeEntry({ notes: '' })])
    expect(csv).not.toContain('undefined')
  })
})
