import { describe, expect, it } from 'vitest'
import { canFollowUp, countLinkedTo, followUpFields, followUpLinkTarget } from './followUp'
import type { Entry } from '../types'

function entry(overrides: Partial<Entry> = {}): Entry {
  return {
    id: 'app',
    date: '2026-09-12',
    activityId: 'apply_online',
    activity: 'Applied online for a job',
    siteAppliedOn: 'LinkedIn',
    jobType: 'Frontend Engineer',
    employer: 'Acme Robotics',
    address: 'https://acme.example/jobs/1',
    phone: '555-201-4488',
    contactName: 'Priya Shah',
    contactMethod: 'Email',
    result: 'Application submitted',
    notes: 'Referred by a friend',
    contract: true,
    createdAt: '2026-09-12T00:00:00.000Z',
    updatedAt: '2026-09-12T00:00:00.000Z',
    ...overrides,
  }
}

describe('followUpFields', () => {
  it("copies only the job's own fields, and links to the source", () => {
    expect(followUpFields(entry())).toEqual({
      employer: 'Acme Robotics',
      jobType: 'Frontend Engineer',
      address: 'https://acme.example/jobs/1',
      phone: '555-201-4488',
      contactName: 'Priya Shah',
      contract: true,
      linkedTo: 'app',
    })
  })

  it('reads an entry that predates the contract flag as not contract', () => {
    const legacy = entry()
    delete legacy.contract
    expect(followUpFields(legacy).contract).toBe(false)
  })
})

describe('followUpLinkTarget', () => {
  it('links a follow-up on a follow-up to the original, never one level deeper', () => {
    expect(followUpLinkTarget(entry({ id: 'second', linkedTo: 'app' }))).toBe('app')
  })

  it('links to the entry itself when it is not linked', () => {
    expect(followUpLinkTarget(entry())).toBe('app')
  })
})

describe('canFollowUp', () => {
  it('is offered only on an entry that names an employer', () => {
    expect(canFollowUp(entry())).toBe(true)
    expect(canFollowUp(entry({ employer: '  ' }))).toBe(false)
  })
})

describe('countLinkedTo', () => {
  it('counts the entries that link to an id', () => {
    const entries = [
      entry(),
      entry({ id: 'f1', linkedTo: 'app' }),
      entry({ id: 'f2', linkedTo: 'app' }),
      entry({ id: 'other', linkedTo: 'elsewhere' }),
    ]
    expect(countLinkedTo(entries, 'app')).toBe(2)
    expect(countLinkedTo(entries, 'f1')).toBe(0)
  })
})
