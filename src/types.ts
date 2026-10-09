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
  /**
   * The claimant's own funnel-tracking flag for contract roles. Not part of what
   * an agency asks for, so it is never printed or counted. Absent on entries
   * logged before it existed, which read as "not contract".
   */
  contract?: boolean
  /**
   * The id of the Entry this one concerns the same job as, set by Follow up and
   * never changed after. Always the Entry a chain started from. Absent on
   * unlinked entries; may point at a deleted Entry, which reads as unlinked.
   */
  linkedTo?: string
  createdAt: string
  updatedAt: string
}

export type EntryDraft = Omit<Entry, 'id' | 'createdAt' | 'updatedAt'>
