export type IntakeResult = { category: string; department: string; missingFields: string[]; isInScope: boolean; reason?: string }

export function classifyIntake(text: string): IntakeResult {
  const normalized = text.toLowerCase()
  if (/rti|right to information/.test(normalized)) return { category: 'Information request', department: 'RTI portal', missingFields: [], isInScope: false, reason: 'RTI requests use the dedicated official RTI channel.' }
  if (/streetlight|road|drain|garbage/.test(normalized)) return { category: 'Civic infrastructure', department: 'Municipal Corporation', missingFields: ['Location', 'Date noticed'], isInScope: true }
  return { category: 'Needs review', department: 'Citizen service desk', missingFields: ['Location', 'Date noticed'], isInScope: true }
}
