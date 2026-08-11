export interface Entry {
  id: string
  date: string // yyyy-mm-dd
  activity: string
  siteAppliedOn: string
  jobType: string
  employer: string
  address: string
  phone: string
  contactName: string
  contactMethod: string
  result: string
  notes: string
  createdAt: string
  updatedAt: string
}

export type EntryDraft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>

export const SITE_OPTIONS = [
  'WorkSource WA (worksourcewa.com)',
  'WorkInTexas.com',
  'LinkedIn',
] as const

export const ACTIVITY_OPTIONS = [
  'Applied online for a job',
  'Applied in person for a job',
  'Registered with a workforce center or job board',
  'Searched job listings online',
  'Followed up on a job contact',
  'Registered with private employment agency',
  'Mailed application or résumé',
  'Attended job fair / networking event',
  'Attended employment workshop',
  'Interview with employer',
  'Other reemployment activity',
] as const

export const RESULT_OPTIONS = [
  'Submitted application',
  'Sent résumé',
  'Interviewed',
  'Hired',
  'Not hired',
  'No reply yet',
  'Other',
] as const

export const CONTACT_METHOD_OPTIONS = [
  'In person',
  'Phone',
  'Email',
  'Fax',
  'Online / website',
  'Mail',
] as const
