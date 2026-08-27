import type { Grievance } from '../domain/grievance'

export const demoGrievance: Grievance = {
  id: 'SHRAVANA-2026-00418', title: 'Streetlight has not been repaired', category: 'Civic infrastructure', department: 'Municipal Corporation',
  state: 'AWAITING_CITIZEN_CONFIRMATION', submittedAt: '2026-08-05', slaDueAt: '2026-08-26', location: 'Sector 17, Rohini, Delhi',
  summary: 'The streetlight outside Block C has remained off for three weeks, making the lane unsafe at night.'
}

export const dashboardMetrics = [
  ['Citizen-confirmed resolution', '78%', '+5.2% this quarter'], ['Average resolution time', '12.4 days', 'Across resolved grievances'],
  ['SLA breach rate', '8.6%', '-1.4% this quarter'], ['Reopen rate', '11.2%', 'Citizen outcomes only']
]
