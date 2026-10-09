import type { Entry, EntryDraft } from '../types'

/**
 * The fields Follow up copies: they identify the job, not the activity. Every
 * other field describes what the claimant did this time, so it starts blank.
 * Widening this list needs a new ADR (see ADR 0009, which amends ADR 0004).
 */
export const FOLLOW_UP_COPIED_FIELDS = [
  'employer',
  'jobType',
  'address',
  'phone',
  'contactName',
  'contract',
] as const satisfies readonly (keyof EntryDraft)[]

export type FollowUpCopiedField = (typeof FOLLOW_UP_COPIED_FIELDS)[number]

/** Whether an Entry offers Follow up: only one that names an employer. */
export function canFollowUp(entry: Entry): boolean {
  return entry.employer.trim() !== ''
}

/**
 * The link a follow-up on `source` stores: the Entry the chain started from, so
 * a follow-up on a follow-up still points at the original. When that original
 * has been deleted, `source` itself is the oldest Entry left for the job, so the
 * link points there rather than at an id nothing resolves to.
 */
export function followUpLinkTarget(source: Entry, entries: readonly Entry[]): string {
  const original = source.linkedTo
  return original && entries.some((entry) => entry.id === original) ? original : source.id
}

/** The job's own fields from `source`, and the link, for a new Entry's form. */
export function followUpFields(
  source: Entry,
  entries: readonly Entry[],
): Pick<EntryDraft, FollowUpCopiedField> & { linkedTo: string } {
  return {
    employer: source.employer,
    jobType: source.jobType,
    address: source.address,
    phone: source.phone,
    contactName: source.contactName,
    contract: source.contract ?? false,
    linkedTo: followUpLinkTarget(source, entries),
  }
}

/** How many Entries link to `id`, for the warning shown before deleting it. */
export function countLinkedTo(entries: readonly Entry[], id: string): number {
  return entries.filter((entry) => entry.linkedTo === id).length
}
