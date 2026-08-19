export interface Entry {
  id: string
  date: string // yyyy-mm-dd
  /**
   * The activity type's id in the state config it was logged under. Absent on
   * entries logged before ids existed; those fall back to matching on `activity`.
   */
  activityId?: string
  /** Label snapshot, kept verbatim so a config change never rewrites history. */
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
