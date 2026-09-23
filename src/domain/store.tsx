import { createContext, useContext, useMemo, useReducer, type Dispatch, type ReactNode } from 'react'
import { runVerification } from './pipeline'
import {
  emptyVerifications,
  patients as seedPatients,
  seedBills,
  seedClaims,
  seedExceptions,
  seedPayments,
} from './seed'
import type {
  AuditEvent,
  Claim,
  ExceptionItem,
  Patient,
  PatientBill,
  Payment,
  RetrievalSource,
  VerificationRecord,
  View,
} from './types'

export type LiveAttempt = {
  patientId: string
  source: RetrievalSource
  log: VerificationRecord['attempts']
}

type State = {
  view: View
  selectedPatientId: string
  patients: Patient[]
  verifications: VerificationRecord[]
  claims: Claim[]
  exceptions: ExceptionItem[]
  payments: Payment[]
  bills: PatientBill[]
  audit: AuditEvent[]
  live: LiveAttempt | null
}

type Action =
  | { type: 'view'; view: View }
  | { type: 'select'; id: string }
  | { type: 'live'; live: LiveAttempt | null }
  | { type: 'verified'; rec: VerificationRecord }
  | { type: 'request-missing'; patientId: string }
  | { type: 'draft-claim'; claimId: string }
  | { type: 'submit-claim'; claimId: string }
  | { type: 'resolve-ex'; id: string }
  | { type: 'post-pay'; id: string }
  | { type: 'bill'; id: string; status: 'approved' | 'rejected' }

function audit(action: string, entity: string, detail: string): AuditEvent {
  return {
    id: `au-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    at: new Date().toISOString(),
    actor: 'system',
    entity,
    action,
    detail,
  }
}

const initial: State = {
  view: 'command',
  selectedPatientId: 'pt-maya',
  patients: seedPatients,
  verifications: emptyVerifications,
  claims: seedClaims,
  exceptions: seedExceptions,
  payments: seedPayments,
  bills: seedBills,
  audit: [
    audit('seed', 'system', 'Loaded synthetic POC cohort (no PHI)'),
  ],
  live: null,
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'view':
      return { ...state, view: action.view }
    case 'select':
      return { ...state, selectedPatientId: action.id }
    case 'live':
      return { ...state, live: action.live }
    case 'verified': {
      const verifications = [
        action.rec,
        ...state.verifications.filter((v) => v.patientId !== action.rec.patientId),
      ]
      const exceptions =
        action.rec.status === 'needs_human' || action.rec.missing.length
          ? [
              {
                id: `ex-vr-${action.rec.id}`,
                kind: 'human' as const,
                patientId: action.rec.patientId,
                claimId: null,
                amount: 0,
                problem: action.rec.missing.length
                  ? `Verification gaps: ${action.rec.missing.join(', ')}`
                  : 'Verification requires human',
                recommendedAction: action.rec.recommendedNextStep,
                evidence: action.rec.attempts.map((a) => `${a.source}: ${a.note}`).join(' | '),
                confidence: action.rec.overallConfidence,
                deadline: new Date().toISOString().slice(0, 10),
                resolved: false,
              },
              ...state.exceptions.filter((e) => e.id !== `ex-vr-${action.rec.id}`),
            ]
          : state.exceptions
      return {
        ...state,
        verifications,
        exceptions,
        live: null,
        audit: [audit('verify', action.rec.patientId, `${action.rec.status} conf ${action.rec.overallConfidence}`), ...state.audit],
      }
    }
    case 'request-missing': {
      const patients = state.patients.map((p) =>
        p.id === action.patientId
          ? { ...p, collectionStatus: 'requested' as const }
          : p,
      )
      return {
        ...state,
        patients,
        audit: [audit('outreach', action.patientId, 'Requested missing insurance via SMS/email (demo)'), ...state.audit],
      }
    }
    case 'draft-claim': {
      const claims = state.claims.map((c) =>
        c.id === action.claimId ? { ...c, status: 'ready' as const, issues: [] } : c,
      )
      return { ...state, claims, audit: [audit('claim.draft', action.claimId, 'Draft created / scrub passed (demo)'), ...state.audit] }
    }
    case 'submit-claim': {
      const claims = state.claims.map((c) =>
        c.id === action.claimId
          ? {
              ...c,
              status: 'acked' as const,
              submittedAt: new Date().toISOString(),
              ackAt: new Date().toISOString(),
            }
          : c,
      )
      return { ...state, claims, audit: [audit('claim.submit', action.claimId, '837D submitted; clearinghouse ACK (demo)'), ...state.audit] }
    }
    case 'resolve-ex': {
      const exceptions = state.exceptions.map((e) => (e.id === action.id ? { ...e, resolved: true } : e))
      return { ...state, exceptions, audit: [audit('exception', action.id, 'Staff resolved exception'), ...state.audit] }
    }
    case 'post-pay': {
      const payments = state.payments.map((p) => (p.id === action.id ? { ...p, posted: true } : p))
      const pay = state.payments.find((p) => p.id === action.id)
      const claims = state.claims.map((c) =>
        pay && c.id === pay.claimId ? { ...c, status: 'paid' as const } : c,
      )
      return { ...state, payments, claims, audit: [audit('posting', action.id, 'ERA matched cash; posted with adjustments'), ...state.audit] }
    }
    case 'bill': {
      const bills = state.bills.map((b) => (b.id === action.id ? { ...b, status: action.status } : b))
      return {
        ...state,
        bills,
        audit: [audit('billing', action.id, `Human ${action.status} patient bill`), ...state.audit],
      }
    }
    default:
      return state
  }
}

const Ctx = createContext<{ state: State; dispatch: Dispatch<Action> } | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial)
  const value = useMemo(() => ({ state, dispatch }), [state])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('store')
  return ctx
}

export async function verifyPatient(patient: Patient, dispatch: Dispatch<Action>) {
  const log: VerificationRecord['attempts'] = []
  dispatch({ type: 'live', live: { patientId: patient.id, source: 'direct_payer', log: [] } })
  const rec = await runVerification(patient, (attempt, running) => {
    log.push(attempt)
    dispatch({ type: 'live', live: { patientId: patient.id, source: running, log: [...log] } })
  })
  dispatch({ type: 'verified', rec })
  return rec
}
