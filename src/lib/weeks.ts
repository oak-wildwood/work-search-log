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
 * Start of the week containing this yyyy-mm-dd date string. `weekStartDay` is
 * 0 = Sunday, which is what most states use.
 */
export function weekStartDate(dateStr: string, weekStartDay = 0): Date {
  const d = new Date(`${dateStr}T00:00:00`)
  const offset = (d.getDay() - weekStartDay + 7) % 7
  d.setDate(d.getDate() - offset)
  return d
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
