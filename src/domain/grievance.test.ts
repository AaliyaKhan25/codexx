import { describe, expect, it } from 'vitest'
import { canTransition, isSlaBreached } from './grievance'

describe('grievance workflow', () => {
  it('only permits configured state transitions', () => {
    expect(canTransition('AWAITING_CITIZEN_CONFIRMATION', 'REOPENED')).toBe(true)
    expect(canTransition('RESOLVED', 'REOPENED')).toBe(false)
  })
  it('does not consider resolved grievances overdue', () => {
    expect(isSlaBreached({ slaDueAt: '2020-01-01', state: 'RESOLVED' })).toBe(false)
  })
})
