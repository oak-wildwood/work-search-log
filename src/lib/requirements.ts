import type { Entry } from '../types'
import type {
  ActivityType,
  ExemptPeriod,
  RequirementEntry,
  RequirementSchedule,
  StateConfig,
} from '../config/types'
import { resolveActivity } from '../config'
import { toLocalISODate, type WeekGroup } from './weeks'

export type WeekOutcome = 'exempt' | 'met' | 'short' | 'unknown'

export interface WeekStatus {
  outcome: WeekOutcome
  exemptReason: string | null
  /** Entries logged in the week, before any caps. */
  logged: number
  /** Entries that count toward the total once per-week and per-claim caps are applied. */
  counted: number
  required: number | null
  employerContacts: number
  minEmployerContacts: number | null
  /** Human-readable warnings. Never blocking, never a compliance judgement. */
  notices: string[]
}

const EMPTY_SCHEDULE: RequirementSchedule = { requirements: [], exemptPeriods: [] }

/**
 * The requirement in force for a week: the most recent entry whose `effective`
 * date is on or before that week's start. Returns null when the claimant hasn't
 * recorded a requirement covering this week — that is a real state, not a reason
 * to presume a number.
 */
export function resolveRequirement(
  schedule: RequirementSchedule,
  weekStartISO: string,
): RequirementEntry | null {
  let found: RequirementEntry | null = null
  for (const entry of schedule.requirements ?? []) {
    if (entry.effective <= weekStartISO && (!found || entry.effective > found.effective)) {
      found = entry
    }
  }
  return found
}

/**
 * The exempt period covering any part of this week, if there is one. Overlap
 * rather than full containment: agencies grant these by week, and a partial
 * overlap should never leave the week reading as short.
 */
export function findExemptPeriod(
  schedule: RequirementSchedule,
  weekStartISO: string,
  weekEndISO: string,
): ExemptPeriod | null {
  for (const period of schedule.exemptPeriods ?? []) {
    if (period.start <= weekEndISO && period.end >= weekStartISO) return period
  }
  return null
}

function duplicateNotices(entries: Entry[]): string[] {
  const seen = new Map<string, string>()
  const flagged = new Map<string, string>()
  for (const entry of entries) {
    const employer = entry.employer?.trim()
    if (!employer) continue
    const key = `${employer.toLowerCase()}::${entry.jobType?.trim().toLowerCase() ?? ''}`
    if (seen.has(key)) flagged.set(key, seen.get(key) as string)
    else seen.set(key, employer)
  }
  return [...flagged.values()].map(
    (employer) =>
      `Logged more than once for ${employer} and the same job this week. Your state may not count the repeat.`,
  )
}

/**
 * Scores each week against the requirement in force for it. Weeks are walked
 * oldest-first so per-claim caps (a job-bank registration that counts once) are
 * consumed by the earliest week that used them.
 */
export function evaluateWeeks(
  groups: WeekGroup[],
  config: StateConfig,
  schedule: RequirementSchedule = EMPTY_SCHEDULE,
): Map<string, WeekStatus> {
  const ascending = [...groups].sort((a, b) => a.key.localeCompare(b.key))
  const claimUsage = new Map<string, number>()
  const statuses = new Map<string, WeekStatus>()

  for (const group of ascending) {
    const weekStartISO = group.key
    const weekEndISO = toLocalISODate(group.end)
    const requirement = resolveRequirement(schedule, weekStartISO)
    const exempt = findExemptPeriod(schedule, weekStartISO, weekEndISO)
    const notices: string[] = []

    // Tally by activity type. Entries whose activity isn't in this state's config
    // still count toward the total — an unrecognized activity must never erase a
    // record the claimant actually made.
    const byType = new Map<string, { activity: ActivityType; count: number }>()
    let unclassified = 0
    for (const entry of group.entries) {
      const activity = resolveActivity(config, entry)
      if (!activity) {
        unclassified += 1
        continue
      }
      const tally = byType.get(activity.id)
      if (tally) tally.count += 1
      else byType.set(activity.id, { activity, count: 1 })
    }

    let counted = unclassified
    let employerContacts = 0

    for (const [id, { activity, count }] of byType) {
      let effective = count

      if (activity.maxPerWeek !== undefined && effective > activity.maxPerWeek) {
        effective = activity.maxPerWeek
        notices.push(
          `"${activity.label}" counts at most ${activity.maxPerWeek} time(s) per week in ${config.agencyShort}'s rules.`,
        )
      }

      if (activity.maxPerClaim !== undefined) {
        const used = claimUsage.get(id) ?? 0
        const allowance = Math.max(0, activity.maxPerClaim - used)
        if (effective > allowance) {
          notices.push(
            `"${activity.label}" counts at most ${activity.maxPerClaim} time(s) per claim, and that has already been used.`,
          )
          effective = allowance
        }
        claimUsage.set(id, used + effective)
      }

      counted += effective
      if (activity.countsAs === 'employer_contact') employerContacts += effective
    }

    // Repeat-employer detection warns only. Whether a duplicate actually counts is
    // the agency's call, not this tool's, so nothing is subtracted from the total.
    if (!config.duplicateEmployerCounts) notices.push(...duplicateNotices(group.entries))

    const required = requirement?.total ?? null
    const minEmployerContacts = requirement?.minEmployerContacts ?? null

    let outcome: WeekOutcome
    if (exempt) {
      outcome = 'exempt'
    } else if (required === null) {
      outcome = 'unknown'
    } else if (
      counted >= required &&
      (minEmployerContacts === null || employerContacts >= minEmployerContacts)
    ) {
      outcome = 'met'
    } else {
      outcome = 'short'
    }

    statuses.set(group.key, {
      outcome,
      exemptReason: exempt?.reason ?? null,
      logged: group.entries.length,
      counted,
      required,
      employerContacts,
      minEmployerContacts,
      notices,
    })
  }

  return statuses
}

/**
 * The class name an outcome renders under. Lives here so the week summary and the
 * week list can't drift into disagreeing about what "short" looks like.
 */
export function outcomeClass(outcome: WeekOutcome | undefined): string {
  if (outcome === 'met') return 'ok'
  if (outcome === 'short') return 'warn'
  return 'neutral'
}
