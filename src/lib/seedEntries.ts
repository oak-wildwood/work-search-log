import type { Entry } from '../types'
import { toLocalISODate } from './weeks'

function daysAgo(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toLocalISODate(d)
}

type SeedDraft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>
type RequiredFields = Pick<SeedDraft, 'date' | 'activityId' | 'activity'>

const BLANK_FIELDS: Omit<SeedDraft, keyof RequiredFields> = {
  siteAppliedOn: '',
  jobType: '',
  employer: '',
  address: '',
  phone: '',
  contactName: '',
  contactMethod: '',
  result: '',
  notes: '',
}

/** Fills in every field a seed entry doesn't bother setting, so each entry below only lists what varies. */
function draft(fields: RequiredFields & Partial<SeedDraft>): SeedDraft {
  return { ...BLANK_FIELDS, ...fields }
}

/**
 * Sample entries for local dev only (see useEntries.ts) — otherwise there's no
 * way to see week grouping, requirement scoring, or search actually working
 * without logging a pile of entries by hand every time storage is cleared.
 * Dates are relative to today so the spread across weeks stays realistic no
 * matter when `npm run dev` is started. A few names (Acme Robotics, Frontend
 * Developer) repeat on purpose across different weeks so search navigation
 * has more than one match to step through.
 */
export function createSeedEntries(): Entry[] {
  const now = new Date().toISOString()
  const drafts: SeedDraft[] = [
    draft({
      date: daysAgo(0),
      activityId: 'apply_online',
      activity: 'Applied online for a job',
      siteAppliedOn: 'LinkedIn',
      jobType: 'Frontend Developer',
      employer: 'Acme Robotics',
      result: 'Submitted application',
      notes: 'Referred by a former coworker, mentioned it in the cover letter.',
    }),
    draft({
      date: daysAgo(1),
      activityId: 'search_listings',
      activity: 'Searched job listings online',
      siteAppliedOn: 'Indeed',
      notes: 'Filtered for remote frontend roles, saved four to apply to later.',
    }),
    draft({
      date: daysAgo(3),
      activityId: 'apply_online',
      activity: 'Applied online for a job',
      siteAppliedOn: 'Company website',
      jobType: 'Frontend Developer',
      employer: 'TechNova Systems',
      result: 'No reply yet',
    }),
    draft({
      date: daysAgo(4),
      activityId: 'interview',
      activity: 'Interview with employer',
      employer: 'Acme Robotics',
      address: '400 Harbor Way, Suite 220, Springfield',
      phone: '555-201-4488',
      contactName: 'Priya Shah',
      contactMethod: 'Phone',
      result: 'Interviewed',
      notes: 'First-round phone screen, thirty minutes, discussed the frontend take-home.',
    }),
    draft({
      date: daysAgo(5),
      activityId: 'follow_up',
      activity: 'Followed up on a job contact',
      employer: 'TechNova Systems',
      contactName: 'Marcus Lee',
      contactMethod: 'Email',
      result: 'No reply yet',
      notes: 'Sent a follow-up email checking on application status.',
    }),
    draft({
      date: daysAgo(9),
      activityId: 'apply_person',
      activity: 'Applied in person for a job',
      jobType: 'Warehouse Associate',
      employer: 'Riverbend Logistics',
      address: '12 Dockside Ave, Springfield',
      result: 'Submitted application',
    }),
    draft({
      date: daysAgo(10),
      activityId: 'job_fair',
      activity: 'Attended job fair / networking event',
      notes:
        'Downtown Springfield job fair, talked to six recruiters including Riverbend Logistics.',
    }),
    draft({
      date: daysAgo(14),
      activityId: 'apply_online',
      activity: 'Applied online for a job',
      siteAppliedOn: 'ZipRecruiter',
      jobType: 'Frontend Developer',
      employer: 'BlueGate Software',
      result: 'Sent résumé',
    }),
    draft({
      date: daysAgo(16),
      activityId: 'workshop',
      activity: 'Attended employment workshop',
      notes: 'Resume workshop at the workforce center, revised the summary section.',
    }),
    draft({
      date: daysAgo(20),
      activityId: 'apply_online',
      activity: 'Applied online for a job',
      siteAppliedOn: 'State workforce agency job board',
      jobType: 'QA Engineer',
      employer: 'Acme Robotics',
      result: 'Not hired',
      notes: "Applied to a different opening after the first didn't move forward.",
    }),
  ]

  return drafts.map((seedDraft, i) => ({
    ...seedDraft,
    id: `seed-${i}`,
    createdAt: now,
    updatedAt: now,
  }))
}
