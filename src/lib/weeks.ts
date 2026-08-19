import type { Entry } from '../types'

export interface WeekGroup {
  key: string
  start: Date
  end: Date
  entries: Entry[]
}

/** Local (not UTC) yyyy-mm-dd, so this never shifts a date across timezones. */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Parses a stored yyyy-mm-dd back to a Date at local midnight. The explicit time
 * is what keeps `new Date('2026-08-11')` from being read as UTC and landing on
 * the previous day west of Greenwich.
 */
export function parseLocalISO(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00`)
}

/** How a date is written wherever a claimant reads one, on screen and in print. */
export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Same, for a stored yyyy-mm-dd. */
export function formatISODate(dateStr: string): string {
  return formatDate(parseLocalISO(dateStr))
}

/**
 * Start of the week containing this yyyy-mm-dd date string. `weekStartDay` is
 * 0 = Sunday, which is what most states use.
 */
export function weekStartDate(dateStr: string, weekStartDay = 0): Date {
  const d = parseLocalISO(dateStr)
  const offset = (d.getDay() - weekStartDay + 7) % 7
  d.setDate(d.getDate() - offset)
  return d
}

/**
 * Key of the week containing today, under a given state's calendar.
 *
 * Lives here rather than in each component because it is a coupling point, not a
 * display value: preferences writes a requirement's `effective` date with it and
 * the header and summary read it back, so all three have to agree exactly.
 */
export function currentWeekKey(weekStartDay = 0): string {
  return toLocalISODate(weekStartDate(toLocalISODate(new Date()), weekStartDay))
}

export function groupByWeek(entries: Entry[], weekStartDay = 0): WeekGroup[] {
  const groups = new Map<string, WeekGroup>()

  for (const entry of entries) {
    const start = weekStartDate(entry.date, weekStartDay)
    const key = toLocalISODate(start)
    let group = groups.get(key)
    if (!group) {
      const end = new Date(start)
      end.setDate(end.getDate() + 6)
      group = { key, start, end, entries: [] }
      groups.set(key, group)
    }
    group.entries.push(entry)
  }

  for (const group of groups.values()) {
    group.entries.sort((a, b) => b.date.localeCompare(a.date))
  }

  return [...groups.values()].sort((a, b) => b.key.localeCompare(a.key))
}
