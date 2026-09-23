import { PEDIATRIC_CDT } from './seed'
import type {
  Field,
  GeneralBenefits,
  Patient,
  ProcedureBenefit,
  Provenance,
  RetrievalSource,
  SealantDetermination,
  VerificationRecord,
} from './types'
import { RETRIEVAL_SOURCES } from './types'

function now() {
  return new Date().toISOString()
}

function field<T>(
  value: T,
  source: RetrievalSource,
  method: string,
  raw?: string,
  confidence = 0.94,
): Field<T> {
  const normalized = Array.isArray(value) ? value.join(', ') : String(value)
  const provenance: Provenance = {
    source,
    retrievedAt: now(),
    rawValue: raw ?? normalized,
    normalizedValue: normalized,
    confidence,
    method,
  }
  return { value, provenance }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms))
}

/** Layered retrieval: APIs first, then portal/RPA, documents, phone, human. Never LLM-guess coverage. */
export const SOURCE_HIERARCHY: RetrievalSource[] = [...RETRIEVAL_SOURCES]

type Attempt = VerificationRecord['attempts'][number]

function fail(source: RetrievalSource, note: string): Attempt {
  return { source, ok: false, note, at: now() }
}

function ok(source: RetrievalSource, note: string): Attempt {
  return { source, ok: true, note, at: now() }
}

function general(source: RetrievalSource, patient: Patient): GeneralBenefits {
  const plan = patient.insurance[0]
  const terminated = plan?.active.value === false
  const waiting = patient.id === 'pt-ethan'
  return {
    active: field(!terminated, source, 'eligibility status', terminated ? 'TERM' : 'ACTIVE'),
    effectiveDate: field(plan?.effectiveDate.value ?? 'unknown', source, 'plan dates'),
    terminationDate: field(plan?.terminationDate.value ?? null, source, 'plan dates'),
    individualDeductible: field(terminated ? 0 : 50, source, 'plan deductible'),
    familyDeductible: field(terminated ? 0 : 150, source, 'plan deductible'),
    remainingDeductible: field(terminated ? 0 : 25, source, 'YTD accumulator'),
    annualMax: field(terminated ? 0 : 1500, source, 'plan maximum'),
    remainingMax: field(terminated ? 0 : 1280, source, 'YTD accumulator'),
    preventivePct: field(terminated ? 0 : 100, source, 'class percent'),
    basicPct: field(terminated ? 0 : waiting ? 0 : 80, source, 'class percent'),
    majorPct: field(terminated ? 0 : waiting ? 0 : 50, source, 'class percent'),
    orthoCovered: field(!terminated && patient.age >= 0, source, 'ortho rider', 'YES'),
    orthoLifetimeMax: field(1500, source, 'ortho rider'),
    orthoRemaining: field(1500, source, 'ortho accumulator'),
    waitingPeriod: field(
      waiting ? 'Basic/major: 6 months from 2026-08-01 (until 2027-02-01)' : null,
      source,
      'waiting period table',
    ),
    network: field('PPO in-network (demo TIN)', source, 'network roster'),
    planType: field(plan?.payerId === 'delta_dental' ? 'PPO' : 'PPO / DHMO hybrid', source, 'plan type'),
    cob: field(
      patient.insurance.length > 1 ? 'Birthday rule — confirm primary vs secondary' : 'No other dental reported',
      source,
      'COB segment',
    ),
    ageLimitations: field('Dependent to age 26; sealants typically through age 15', source, 'age rules'),
  }
}

const PERCENTS: Record<string, number> = {
  D0120: 100,
  D0140: 100,
  D0150: 100,
  D0210: 100,
  D0220: 100,
  D0230: 100,
  D0272: 100,
  D0274: 100,
  D1120: 100,
  D1206: 100,
  D1351: 100,
  D1510: 80,
  D2391: 80,
  D2930: 50,
  D3220: 50,
  D7140: 80,
  D8080: 50,
}

function procedures(source: RetrievalSource, patient: Patient): ProcedureBenefit[] {
  const terminated = patient.insurance[0]?.active.value === false
  const waiting = patient.id === 'pt-ethan'
  return PEDIATRIC_CDT.map((row) => {
    const preventive = ['D0120', 'D0140', 'D0150', 'D0210', 'D0220', 'D0230', 'D0272', 'D0274', 'D1120', 'D1206', 'D1351']
    const blocked = terminated || (waiting && !preventive.includes(row.cdt))
    const pct = blocked ? 0 : PERCENTS[row.cdt] ?? 50
    const freq =
      row.cdt === 'D0120' || row.cdt === 'D1120' || row.cdt === 'D1206'
        ? 6
        : row.cdt === 'D0272' || row.cdt === 'D0274'
          ? 12
          : row.cdt === 'D1351'
            ? 36
            : row.cdt === 'D0210'
              ? 60
              : null
    return {
      cdt: row.cdt,
      description: row.description,
      covered: field(!blocked && pct > 0, source, 'procedure schedule'),
      percent: field(pct, source, 'procedure schedule'),
      deductibleApplies: field(!preventive.includes(row.cdt), source, 'deductible class'),
      ageMin: field(row.cdt === 'D1351' ? 5 : null, source, 'age rule'),
      ageMax: field(row.cdt === 'D1351' ? 15 : row.cdt === 'D1120' ? 13 : null, source, 'age rule'),
      frequencyMonths: field(freq, source, 'frequency limitation'),
      limitationKind: field(
        freq ? (row.cdt === 'D1351' ? 'rolling_months' : 'calendar_year') : null,
        source,
        'limitation type',
      ),
      toothLimitation: field(
        row.cdt === 'D1351' ? 'Permanent molars 2,3,14,15,18,19,30,31 (occlusal)' : null,
        source,
        'tooth limitation',
      ),
      replacementCovered: field(row.cdt === 'D1351' ? false : null, source, 'replacement rule'),
      downgrade: field(
        row.cdt === 'D2391' ? 'May downgrade to amalgam alternate benefit' : null,
        source,
        'alternate benefit',
      ),
      alternateBenefit: field(
        row.cdt === 'D2391' ? 'Pay as D2140 if posterior composite excluded' : null,
        source,
        'alternate benefit',
      ),
      exclusion: field(row.cdt === 'D8080' && patient.age < 8 ? 'Ortho often not payable under age 8' : null, source, 'exclusions'),
      lastDateOfService: field(
        patient.id === 'pt-maya' && row.cdt === 'D1351' ? '2024-03-18' : null,
        source,
        'claim history',
      ),
      priorHistory: field(
        patient.id === 'pt-maya' && row.cdt === 'D1351' ? 'Sealants #3 (2024-03-18), #14 (2024-03-18)' : null,
        source,
        'claim history',
      ),
      remainingAvailable: field(
        row.cdt === 'D1351' ? patient.id !== 'pt-ava' : !blocked,
        source,
        'frequency remaining',
      ),
    }
  })
}

function sealants(source: RetrievalSource, patient: Patient, method: string): SealantDetermination {
  const terminated = patient.insurance[0]?.active.value === false
  const ageOk = patient.age >= 5 && patient.age <= 15
  const history =
    patient.id === 'pt-maya'
      ? [
          { tooth: '3', date: '2024-03-18' },
          { tooth: '14', date: '2024-03-18' },
        ]
      : []
  const all = ['3', '14', '19', '30']
  const used = new Set(history.map((h) => h.tooth))
  const current = terminated || !ageOk ? [] : all.filter((t) => !used.has(t))
  return {
    eligible: field(!terminated && ageOk && current.length > 0, source, method, undefined, 0.91),
    percent: field(terminated ? 0 : 100, source, method),
    ageRestriction: field('Covered ages 5–15 on permanent molars', source, method),
    eligibleTeeth: field(['2', '3', '14', '15', '18', '19', '30', '31'], source, method),
    frequency: field('Once per tooth per 36 rolling months; replacements not covered', source, method),
    replacementCovered: field(false, source, method),
    previousHistory: field(history, source, method, history.map((h) => `#${h.tooth} ${h.date}`).join('; ') || 'none'),
    currentlyEligibleTeeth: field(current, source, method, current.join(',') || 'none'),
  }
}

export async function runVerification(
  patient: Patient,
  onAttempt: (attempt: Attempt, running: RetrievalSource) => void,
): Promise<VerificationRecord> {
  const attempts: Attempt[] = []
  const plan = patient.insurance.find((p) => p.rank === 'primary')
  const incomplete = !plan?.memberId.value || patient.collectionStatus === 'incomplete'

  if (incomplete) {
    const a = fail('direct_payer', 'Missing member ID / group — cannot query payer')
    attempts.push(a)
    onAttempt(a, 'human')
    await sleep(280)
    return {
      id: `vr-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      payerId: plan?.payerId ?? 'delta_dental',
      status: 'needs_human',
      attempts,
      general: null,
      procedures: [],
      sealants: null,
      missing: patient.missingFields,
      recommendedNextStep: 'Request insurance card images and subscriber DOB from parent, then retry eligibility.',
      overallConfidence: 0,
    }
  }

  const path: { source: RetrievalSource; succeeds: boolean; note: string }[] =
    patient.id === 'pt-leo'
      ? [
          { source: 'direct_payer', succeeds: false, note: 'Premera dental API: 270 timeout' },
          { source: 'clearinghouse', succeeds: false, note: 'DentalXChange: no procedure-level 271' },
          { source: 'vyne', succeeds: false, note: 'Vyne eligibility: class percents only' },
          { source: 'eligibility_api', succeeds: false, note: 'Stedi/Availity demo: member found, no D1351 teeth' },
          { source: 'payer_website', succeeds: false, note: 'Portal login MFA required' },
          { source: 'browser_rpa', succeeds: true, note: 'Playwright session: benefits PDF parsed for D1351' },
        ]
      : patient.id === 'pt-ava'
        ? [{ source: 'direct_payer', succeeds: true, note: 'Premera 271: coverage terminated 2026-06-30' }]
        : [{ source: 'direct_payer', succeeds: true, note: `${plan?.payerName} 271: procedure-level schedule returned` }]

  let winner: RetrievalSource | null = null
  for (const step of path) {
    await sleep(320)
    const att = step.succeeds ? ok(step.source, step.note) : fail(step.source, step.note)
    attempts.push(att)
    onAttempt(att, step.source)
    if (step.succeeds) {
      winner = step.source
      break
    }
  }

  if (!winner) {
    return {
      id: `vr-${patient.id}-${Date.now()}`,
      patientId: patient.id,
      payerId: plan!.payerId,
      status: 'needs_human',
      attempts,
      general: null,
      procedures: [],
      sealants: null,
      missing: ['procedure-level benefits'],
      recommendedNextStep: 'Escalate to phone agent script, then human exception queue.',
      overallConfidence: 0.2,
    }
  }

  const method = winner === 'browser_rpa' ? 'portal RPA + benefit PDF extract' : 'payer 271 / fee schedule'
  const rec: VerificationRecord = {
    id: `vr-${patient.id}-${Date.now()}`,
    patientId: patient.id,
    payerId: plan!.payerId,
    status: 'complete',
    attempts,
    general: general(winner, patient),
    procedures: procedures(winner, patient),
    sealants: sealants(winner, patient, method),
    missing: patient.insurance.length > 1 ? ['COB primary confirmation'] : [],
    recommendedNextStep: patient.insurance.length > 1
      ? 'Human review of birthday-rule COB before quoting family.'
      : winner === 'browser_rpa'
        ? 'Cache portal extract; schedule API retry next week.'
        : 'Quote visit using procedure table. No staff action.',
    overallConfidence: winner === 'browser_rpa' ? 0.82 : 0.95,
  }

  if (patient.id === 'pt-ava') {
    rec.recommendedNextStep = 'Notify parent: plan terminated. Collect new coverage or self-pay estimate.'
    rec.overallConfidence = 0.98
  }

  return rec
}
