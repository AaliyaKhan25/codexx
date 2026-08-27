export type GrievanceState = 'DRAFT' | 'SUBMITTED' | 'ASSIGNED' | 'IN_REVIEW' | 'RESPONSE_RECEIVED' | 'AWAITING_CITIZEN_CONFIRMATION' | 'RESOLVED' | 'REOPENED' | 'ESCALATION_PENDING' | 'ESCALATED'

export type Grievance = {
  id: string; title: string; category: string; department: string; state: GrievanceState
  submittedAt: string; slaDueAt: string; location: string; summary: string
}

const transitions: Record<GrievanceState, GrievanceState[]> = {
  DRAFT: ['SUBMITTED'], SUBMITTED: ['ASSIGNED'], ASSIGNED: ['IN_REVIEW'], IN_REVIEW: ['RESPONSE_RECEIVED'],
  RESPONSE_RECEIVED: ['AWAITING_CITIZEN_CONFIRMATION'], AWAITING_CITIZEN_CONFIRMATION: ['RESOLVED', 'REOPENED'],
  RESOLVED: [], REOPENED: ['IN_REVIEW', 'ESCALATION_PENDING'], ESCALATION_PENDING: ['ESCALATED'], ESCALATED: ['IN_REVIEW']
}

export const canTransition = (from: GrievanceState, to: GrievanceState) => transitions[from].includes(to)
export const isSlaBreached = (grievance: Pick<Grievance, 'slaDueAt' | 'state'>, now = new Date()) =>
  new Date(grievance.slaDueAt) < now && !['RESOLVED', 'ESCALATED'].includes(grievance.state)
