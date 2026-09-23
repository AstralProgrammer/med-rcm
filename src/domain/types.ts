export const RETRIEVAL_SOURCES = [
  'direct_payer',
  'clearinghouse',
  'vyne',
  'eligibility_api',
  'payer_website',
  'browser_rpa',
  'benefit_pdf',
  'phone_agent',
  'human',
] as const

export type RetrievalSource = (typeof RETRIEVAL_SOURCES)[number]

export type Provenance = {
  source: RetrievalSource
  retrievedAt: string
  rawValue: string
  normalizedValue: string
  confidence: number
  method: string
}

export type Field<T> = {
  value: T | null
  provenance: Provenance | null
}

export type PayerId = 'delta_dental' | 'premera' | 'regence'

export type Relationship = 'self' | 'child' | 'spouse' | 'other'

export type InsurancePlan = {
  payerId: PayerId
  payerName: string
  rank: 'primary' | 'secondary'
  memberId: Field<string>
  groupNumber: Field<string>
  employer: Field<string>
  subscriberName: Field<string>
  subscriberDob: Field<string>
  relationship: Field<Relationship>
  effectiveDate: Field<string>
  terminationDate: Field<string | null>
  active: Field<boolean>
  cardImageUrl: string | null
}

export type Patient = {
  id: string
  synthetic: true
  firstName: string
  lastName: string
  dob: string
  age: number
  appointmentAt: string
  contactPhone: string
  contactEmail: string
  insurance: InsurancePlan[]
  collectionStatus: 'complete' | 'incomplete' | 'requested'
  missingFields: string[]
}

export type LimitationKind = 'calendar_year' | 'rolling_months'

export type ProcedureBenefit = {
  cdt: string
  description: string
  covered: Field<boolean>
  percent: Field<number>
  deductibleApplies: Field<boolean>
  ageMin: Field<number | null>
  ageMax: Field<number | null>
  frequencyMonths: Field<number | null>
  limitationKind: Field<LimitationKind | null>
  toothLimitation: Field<string | null>
  replacementCovered: Field<boolean | null>
  downgrade: Field<string | null>
  alternateBenefit: Field<string | null>
  exclusion: Field<string | null>
  lastDateOfService: Field<string | null>
  priorHistory: Field<string | null>
  remainingAvailable: Field<boolean | null>
}

export type SealantDetermination = {
  eligible: Field<boolean>
  percent: Field<number>
  ageRestriction: Field<string>
  eligibleTeeth: Field<string[]>
  frequency: Field<string>
  replacementCovered: Field<boolean>
  previousHistory: Field<{ tooth: string; date: string }[]>
  currentlyEligibleTeeth: Field<string[]>
}

export type GeneralBenefits = {
  active: Field<boolean>
  effectiveDate: Field<string>
  terminationDate: Field<string | null>
  individualDeductible: Field<number>
  familyDeductible: Field<number>
  remainingDeductible: Field<number>
  annualMax: Field<number>
  remainingMax: Field<number>
  preventivePct: Field<number>
  basicPct: Field<number>
  majorPct: Field<number>
  orthoCovered: Field<boolean>
  orthoLifetimeMax: Field<number>
  orthoRemaining: Field<number>
  waitingPeriod: Field<string | null>
  network: Field<string>
  planType: Field<string>
  cob: Field<string>
  ageLimitations: Field<string>
}

export type VerificationRecord = {
  id: string
  patientId: string
  payerId: PayerId
  status: 'pending' | 'running' | 'complete' | 'needs_human'
  attempts: { source: RetrievalSource; ok: boolean; note: string; at: string }[]
  general: GeneralBenefits | null
  procedures: ProcedureBenefit[]
  sealants: SealantDetermination | null
  missing: string[]
  recommendedNextStep: string
  overallConfidence: number
}

export type ClaimStatus =
  | 'unbilled'
  | 'draft'
  | 'scrub_fail'
  | 'ready'
  | 'submitted'
  | 'acked'
  | 'rejected'
  | 'paid'
  | 'denied'
  | 'partial'

export type Claim = {
  id: string
  patientId: string
  payerId: PayerId
  procedures: { cdt: string; tooth?: string; fee: number }[]
  amount: number
  status: ClaimStatus
  submittedAt: string | null
  ackAt: string | null
  ageDays: number
  timelyFilingDaysLeft: number
  issues: string[]
  attachments: string[]
  denialReason: string | null
}

export type ExceptionKind = 'auto' | 'human'

export type ExceptionItem = {
  id: string
  kind: ExceptionKind
  patientId: string
  claimId: string | null
  amount: number
  problem: string
  recommendedAction: string
  evidence: string
  confidence: number
  deadline: string
  resolved: boolean
}

export type Payment = {
  id: string
  claimId: string
  eraAmount: number
  contractualAdj: number
  deductible: number
  coinsurance: number
  patientResp: number
  cashAmount: number | null
  posted: boolean
  discrepancy: string | null
}

export type PatientBill = {
  id: string
  patientId: string
  claimId: string
  amount: number
  confidence: number
  status: 'pending_approval' | 'approved' | 'rejected'
  summary: string
}

export type AuditEvent = {
  id: string
  at: string
  actor: 'system' | 'staff'
  entity: string
  action: string
  detail: string
}

export type View =
  | 'command'
  | 'patients'
  | 'verify'
  | 'claims'
  | 'ar'
  | 'exceptions'
  | 'payments'
  | 'billing'
  | 'architecture'
