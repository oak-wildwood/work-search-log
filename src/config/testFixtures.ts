import type { StateConfig } from './types'

export function makeTestStateConfig(overrides: Partial<StateConfig> = {}): StateConfig {
  return {
    code: 'TEST',
    agencyName: 'Test Agency',
    agencyShort: 'TA',
    weekStartDay: 0,
    requirementSource: 'letter',
    jurisdictionLabel: 'County',
    claimIdLabel: 'Claim number',
    hasOnlineLogging: false,
    activityTypes: [],
    contactMethods: [],
    resultOptions: [],
    siteOptions: [],
    requiredFields: [],
    duplicateEmployerCounts: true,
    retention: 'benefit_year',
    lastVerified: null,
    ...overrides,
  }
}
