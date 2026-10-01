import type { Entry } from '../types'

const HEADERS = [
  'Date',
  'Activity',
  'Site Applied On',
  'Job Type Sought',
  'Employer',
  'Address/Website',
  'Phone',
  'Contact Name',
  'Contact Method',
  'Result',
  'Notes',
  'Contract',
]

function escapeCsvField(value: string): string {
  return `"${(value ?? '').replace(/"/g, '""')}"`
}

export function toCsv(entries: Entry[]): string {
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) =>
      [
        e.date,
        e.activity,
        e.siteAppliedOn,
        e.jobType,
        e.employer,
        e.address,
        e.phone,
        e.contactName,
        e.contactMethod,
        e.result,
        e.notes,
        e.contract ? 'Yes' : '',
      ]
        .map(escapeCsvField)
        .join(','),
    )
  return [HEADERS.join(','), ...rows].join('\n')
}
