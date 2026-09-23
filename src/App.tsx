import { useEffect, useState, type CSSProperties } from 'react'
import type { Field, Patient, ProcedureBenefit, View } from './domain/types'
import { StoreProvider, useStore, verifyPatient } from './domain/store'
import { BRAND_STORAGE_KEY, loadBrand, type BrandConfig } from './brand'

const NAV: { id: View; label: string; icon: string }[] = [
  { id: 'command', label: 'Dashboard', icon: '▦' },
  { id: 'patients', label: 'Patients', icon: '♧' },
  { id: 'verify', label: 'Insurance benefits', icon: '✦' },
  { id: 'claims', label: 'Claims', icon: '▤' },
  { id: 'ar', label: 'A/R operations', icon: '▥' },
  { id: 'exceptions', label: 'Exception queue', icon: '!' },
  { id: 'payments', label: 'Payments & ERA', icon: '◇' },
  { id: 'billing', label: 'Patient billing', icon: '$' },
  { id: 'architecture', label: 'System overview', icon: '⌘' },
]

function money(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
}

function formatValue(v: unknown): string {
  if (v == null || v === '') return '—'
  if (typeof v === 'boolean') return v ? 'yes' : 'no'
  if (Array.isArray(v)) {
    if (v.length && typeof v[0] === 'object' && v[0] && 'tooth' in v[0]) {
      return v.map((h) => `#${(h as { tooth: string; date: string }).tooth} ${(h as { tooth: string; date: string }).date}`).join('; ')
    }
    return v.join(', ')
  }
  return String(v)
}

function FieldCell<T>({ label, field }: { label: string; field: Field<T> | undefined }) {
  if (!field) return null
  const text = formatValue(field.value)
  const p = field.provenance
  return (
    <div className="field">
      <span className="k">{label}</span>
      <span className="v">{text}</span>
      {p ? (
        <span className="prov" title={p.rawValue}>
          {p.source} · {Math.round(p.confidence * 100)}% · {new Date(p.retrievedAt).toLocaleString()}
        </span>
      ) : (
        <span className="prov miss">no provenance</span>
      )}
    </div>
  )
}

function PatientName({ id }: { id: string }) {
  const { state } = useStore()
  const p = state.patients.find((x) => x.id === id)
  return <>{p ? `${p.firstName} ${p.lastName}` : id}</>
}

function AppShell() {
  const { state, dispatch } = useStore()
  const [brand, setBrand] = useState(loadBrand)
  const [showBrand, setShowBrand] = useState(false)

  useEffect(() => {
    document.title = `${brand.name} · ${brand.product}`
  }, [brand])

  function saveBrand(next: BrandConfig) {
    setBrand(next)
    localStorage.setItem(BRAND_STORAGE_KEY, JSON.stringify(next))
  }

  const activeLabel = NAV.find((item) => item.id === state.view)?.label ?? 'Dashboard'

  return (
    <div
      className="app-stage"
      style={{ '--brand': brand.primary, '--accent': brand.accent } as CSSProperties}
    >
      <div className="shell">
        <header className="topbar">
          <button className="brand-lockup" onClick={() => setShowBrand(true)} aria-label="Customize brand">
            <span className="brand-mark">{brand.logoMark.slice(0, 2).toUpperCase()}</span>
            <span>
              <strong>{brand.name}</strong>
              <small>{brand.product}</small>
            </span>
          </button>
          <nav className="workspace-nav" aria-label="Workspace">
            <button className="active">Revenue Operations</button>
            <button onClick={() => dispatch({ type: 'view', view: 'patients' })}>Patient Directory</button>
            <button onClick={() => dispatch({ type: 'view', view: 'verify' })}>Insurance</button>
            <button onClick={() => dispatch({ type: 'view', view: 'claims' })}>Clinical Billing</button>
          </nav>
          <div className="top-actions">
            <button title="Notifications">◌</button>
            <button className="user-avatar" title="Demo user">AK</button>
          </div>
        </header>
        <aside className="sidebar">
          <p className="practice-label">{brand.practiceType}</p>
          <nav aria-label="Primary">
          {NAV.map((n) => (
            <button key={n.id} className={state.view === n.id ? 'on' : ''} onClick={() => dispatch({ type: 'view', view: n.id })}>
              <span className="nav-icon">{n.icon}</span>
              <span>{n.label}</span>
            </button>
          ))}
          </nav>
          <div className="demo-badge">
            <span>●</span>
            <div><strong>Demo workspace</strong><small>Synthetic data only</small></div>
          </div>
        </aside>
        <main>
          <div className="content-heading">
            <div>
              <span className="breadcrumb">Workspace / {activeLabel}</span>
              <h1>{activeLabel}</h1>
            </div>
            <span className="live-pill"><i /> Systems operational</span>
          </div>
          {state.view === 'command' && <Command />}
          {state.view === 'patients' && <Patients />}
          {state.view === 'verify' && <Verify />}
          {state.view === 'claims' && <Claims />}
          {state.view === 'ar' && <Ar />}
          {state.view === 'exceptions' && <Exceptions />}
          {state.view === 'payments' && <Payments />}
          {state.view === 'billing' && <Billing />}
          {state.view === 'architecture' && <Architecture />}
        </main>
      </div>
      {showBrand ? <BrandPanel brand={brand} onSave={saveBrand} onClose={() => setShowBrand(false)} /> : null}
    </div>
  )
}

function BrandPanel({
  brand,
  onSave,
  onClose,
}: {
  brand: BrandConfig
  onSave: (brand: BrandConfig) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(brand)
  const set = (key: keyof BrandConfig, value: string) => setDraft((current) => ({ ...current, [key]: value }))
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="brand-panel" role="dialog" aria-modal="true" aria-labelledby="brand-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p className="eyebrow">White-label settings</p>
            <h2 id="brand-title">Customize workspace</h2>
          </div>
          <button className="close-button" onClick={onClose}>×</button>
        </header>
        <label>Organization<input value={draft.name} onChange={(event) => set('name', event.target.value)} /></label>
        <label>Product name<input value={draft.product} onChange={(event) => set('product', event.target.value)} /></label>
        <label>Logo initials<input maxLength={2} value={draft.logoMark} onChange={(event) => set('logoMark', event.target.value)} /></label>
        <label>Practice descriptor<input value={draft.practiceType} onChange={(event) => set('practiceType', event.target.value)} /></label>
        <div className="color-row">
          <label>Primary<input type="color" value={draft.primary} onChange={(event) => set('primary', event.target.value)} /></label>
          <label>Accent<input type="color" value={draft.accent} onChange={(event) => set('accent', event.target.value)} /></label>
        </div>
        <p className="muted">Saved in this browser. Production can load the same fields from each tenant record.</p>
        <div className="toolbar">
          <button onClick={onClose}>Cancel</button>
          <button className="primary" onClick={() => { onSave(draft); onClose() }}>Apply brand</button>
        </div>
      </section>
    </div>
  )
}

function Command() {
  const { state, dispatch } = useStore()
  const verified = state.verifications.filter((v) => v.status === 'complete').length
  const openEx = state.exceptions.filter((e) => !e.resolved)
  const ar = state.claims.filter((c) => !['paid', 'unbilled'].includes(c.status))
  const arAmt = ar.reduce((s, c) => s + c.amount, 0)
  const reviewAmt = state.claims.filter((c) => c.status === 'denied' || c.status === 'scrub_fail').reduce((s, c) => s + c.amount, 0)
  const followAmt = state.claims.filter((c) => c.status === 'submitted' || c.status === 'acked').reduce((s, c) => s + c.amount, 0)
  const bills = state.bills.filter((b) => b.status === 'pending_approval')
  const readyPatients = state.patients.filter((patient) =>
    patient.collectionStatus === 'complete' && patient.insurance[0]?.active.value !== false
  ).length
  const cleanRate = Math.round((readyPatients / state.patients.length) * 100)
  return (
    <>
      <header className="page">
        <div>
          <h2>Good afternoon, Alex</h2>
          <p>Here is today’s revenue cycle performance and priority work.</p>
        </div>
        <button
          className="primary"
          onClick={() => {
            dispatch({ type: 'view', view: 'verify' })
          }}
        >
          Run verification
        </button>
      </header>
      <div className="stats dashboard-stats">
        <Stat icon="▣" tone="green" n={state.patients.length} l="Appointments reviewed" meta="+12% from yesterday" />
        <Stat icon="✦" tone="blue" n={verified || 4} l="Plans verified" meta="92% automation rate" />
        <Stat icon="◇" tone="gold" n={money(arAmt)} l="Outstanding insurance" meta={`${money(followAmt)} processing`} />
        <Stat icon="!" tone="rose" n={openEx.length} l="Priority exceptions" meta={`${money(reviewAmt)} needs review`} />
      </div>
      <div className="dashboard-grid">
        <section className="band operations-card">
          <div className="section-heading">
            <div><h2>Insurance operations</h2><p>Today’s verification readiness</p></div>
            <button onClick={() => dispatch({ type: 'view', view: 'exceptions' })}>View queue ↗</button>
          </div>
          <div className="operations-body">
            <div className="donut" style={{ '--value': `${cleanRate * 3.6}deg` } as CSSProperties}>
              <div><strong>{cleanRate}%</strong><span>clean rate</span></div>
            </div>
            <ul className="health-list">
              <li><i className="green" /><span><strong>{readyPatients} Ready</strong><small>Complete & active</small></span><b>{readyPatients}</b></li>
              <li><i className="yellow" /><span><strong>Needs review</strong><small>Missing subscriber details</small></span><b>1</b></li>
              <li><i className="red" /><span><strong>Inactive</strong><small>Coverage terminated</small></span><b>1</b></li>
            </ul>
          </div>
          <div className="insight-box"><span>✦</span><p><strong>Automation insight</strong> Verify Noah’s missing subscriber details before tomorrow to keep the clean rate above 80%.</p></div>
        </section>
        <section className="band cash-card">
          <div className="section-heading">
            <div><h2>Revenue flow</h2><p>Current claim value by stage</p></div>
            <span className="period-pill">This month</span>
          </div>
          <div className="flow-row"><span>Processing normally</span><strong>{money(followAmt)}</strong></div>
          <div className="progress"><i style={{ width: '72%' }} /></div>
          <div className="flow-row"><span>Staff review</span><strong>{money(reviewAmt)}</strong></div>
          <div className="progress coral"><i style={{ width: '41%' }} /></div>
          <div className="flow-row"><span>Payments received</span><strong>{money(state.payments.reduce((sum, p) => sum + p.eraAmount, 0))}</strong></div>
          <div className="progress purple"><i style={{ width: '58%' }} /></div>
          <div className="mini-summary">
            <div><strong>{state.claims.length}</strong><span>Claims</span></div>
            <div><strong>{bills.length}</strong><span>Bills to approve</span></div>
            <div><strong>0</strong><span>Filing risks</span></div>
          </div>
        </section>
        <section className="band action-card">
          <div className="section-heading"><div><h2>Action center</h2><p>Highest-value work first</p></div></div>
          {openEx.slice(0, 3).map((item) => (
            <button className="action-row" key={item.id} onClick={() => dispatch({ type: 'view', view: 'exceptions' })}>
              <span className={`action-dot ${item.kind}`} />
              <span><strong>{item.problem}</strong><small><PatientName id={item.patientId} /> · due {item.deadline}</small></span>
              <b>{item.amount ? money(item.amount) : 'Review'} →</b>
            </button>
          ))}
        </section>
        <section className="band audit-card">
          <div className="section-heading"><div><h2>Recent activity</h2><p>System audit trail</p></div></div>
          <ul className="audit">
            {state.audit.slice(0, 5).map((a) => (
              <li key={a.id}><span className="audit-icon">✓</span><span>{a.detail}<small>{a.action} · {a.entity}</small></span><time>{a.at.slice(11, 16)}</time></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}

function Stat({ n, l, icon, tone = 'blue', meta }: { n: number | string; l: string; icon?: string; tone?: string; meta?: string }) {
  return (
    <article className="stat">
      {icon ? <span className={`stat-icon ${tone}`}>{icon}</span> : null}
      <div>
        <span>{l}</span>
        <strong>{n}</strong>
        {meta ? <small>{meta}</small> : null}
      </div>
    </article>
  )
}

function Patients() {
  const { state, dispatch } = useStore()
  return (
    <>
      <header className="page">
        <div>
          <h1>Insurance intake</h1>
          <p>Collect, validate, normalize. Staff only when the record cannot be completed automatically.</p>
        </div>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Age</th>
              <th>Visit</th>
              <th>Primary payer</th>
              <th>Member ID</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.patients.map((p) => {
              const plan = p.insurance[0]
              return (
                <tr key={p.id}>
                  <td>
                    {p.firstName} {p.lastName}
                    {p.insurance.length > 1 ? <span className="tag warn">COB</span> : null}
                  </td>
                  <td>{p.age}</td>
                  <td>{p.appointmentAt.slice(0, 16).replace('T', ' ')}</td>
                  <td>{plan?.payerName}</td>
                  <td>{plan?.memberId.value ?? '—'}</td>
                  <td>
                    <span className={`tag ${p.collectionStatus === 'complete' ? 'ok' : p.collectionStatus === 'requested' ? 'warn' : 'bad'}`}>
                      {p.collectionStatus}
                    </span>
                    {plan?.active.value === false ? <span className="tag bad">terminated</span> : null}
                  </td>
                  <td className="row-actions">
                    {p.missingFields.length ? (
                      <button onClick={() => dispatch({ type: 'request-missing', patientId: p.id })}>Request missing</button>
                    ) : null}
                    <button
                      onClick={() => {
                        dispatch({ type: 'select', id: p.id })
                        dispatch({ type: 'view', view: 'verify' })
                      }}
                    >
                      Verify
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <PatientDetail />
    </>
  )
}

function PatientDetail() {
  const { state } = useStore()
  const p = state.patients.find((x) => x.id === state.selectedPatientId)
  if (!p) return null
  return (
    <section className="band">
      <h2>
        Record · {p.firstName} {p.lastName} <span className="muted">SYNTHETIC</span>
      </h2>
      {p.insurance.map((ins) => (
        <div key={ins.rank + ins.payerId} className="card-grid">
          <p className="card-title">
            {ins.rank} · {ins.payerName}
          </p>
          <FieldCell label="Carrier" field={{ value: ins.payerName, provenance: ins.memberId.provenance }} />
          <FieldCell label="Member ID" field={ins.memberId} />
          <FieldCell label="Group" field={ins.groupNumber} />
          <FieldCell label="Employer" field={ins.employer} />
          <FieldCell label="Subscriber" field={ins.subscriberName} />
          <FieldCell label="Subscriber DOB" field={ins.subscriberDob} />
          <FieldCell label="Relationship" field={ins.relationship} />
          <FieldCell label="Effective" field={ins.effectiveDate} />
          <FieldCell label="Termination" field={ins.terminationDate} />
          <FieldCell label="Active" field={ins.active} />
        </div>
      ))}
      {p.missingFields.length ? <p className="callout">Missing: {p.missingFields.join(', ')}. Outreach queued in exception list.</p> : null}
    </section>
  )
}

function Verify() {
  const { state, dispatch } = useStore()
  const p = state.patients.find((x) => x.id === state.selectedPatientId)!
  const rec = state.verifications.find((v) => v.patientId === p.id)
  const [busy, setBusy] = useState(false)
  const [cdtFilter, setCdtFilter] = useState('D1351')

  async function run(patient: Patient) {
    setBusy(true)
    dispatch({ type: 'select', id: patient.id })
    await verifyPatient(patient, dispatch)
    setBusy(false)
  }

  const rows: ProcedureBenefit[] =
    rec?.procedures.filter((r) => (cdtFilter ? r.cdt.includes(cdtFilter) || r.description.toLowerCase().includes(cdtFilter.toLowerCase()) : true)) ?? []

  return (
    <>
      <header className="page">
        <div>
          <h1>Procedure-level benefits</h1>
          <p>Direct payer → clearinghouse → Vyne → eligibility API → portal → RPA → PDF → phone → human. Coverage is never guessed by a model.</p>
        </div>
      </header>
      <div className="chip-row">
        {state.patients.map((pt) => (
          <button
            key={pt.id}
            className={pt.id === p.id ? 'chip on' : 'chip'}
            onClick={() => dispatch({ type: 'select', id: pt.id })}
          >
            {pt.firstName} {pt.lastName}
          </button>
        ))}
      </div>
      <div className="toolbar">
        <button className="primary" disabled={busy} onClick={() => void run(p)}>
          {busy ? 'Retrieving…' : `Verify ${p.firstName} (${p.insurance[0]?.payerName})`}
        </button>
        <button
          disabled={busy}
          onClick={() => {
            void (async () => {
              setBusy(true)
              for (const pt of state.patients) await verifyPatient(pt, dispatch)
              setBusy(false)
            })()
          }}
        >
          Verify cohort
        </button>
      </div>
      {state.live && state.live.patientId === p.id ? (
        <ol className="pipeline">
          {state.live.log.map((a, i) => (
            <li key={i} className={a.ok ? 'ok' : 'fail'}>
              <strong>{a.source}</strong> {a.ok ? 'hit' : 'miss'} — {a.note}
            </li>
          ))}
          {busy ? (
            <li className="run">
              querying <strong>{state.live.source}</strong>
            </li>
          ) : null}
        </ol>
      ) : null}
      {rec ? (
        <>
          <section className="band">
            <h2>Result</h2>
            <p>
              Status <strong>{rec.status}</strong> · confidence {Math.round(rec.overallConfidence * 100)}% · next:{' '}
              {rec.recommendedNextStep}
            </p>
            {rec.missing.length ? <p className="callout">Missing: {rec.missing.join(', ')}</p> : null}
          </section>
          {rec.general ? (
            <section className="band">
              <h2>General benefits</h2>
              <div className="card-grid">
                <FieldCell label="Active" field={rec.general.active} />
                <FieldCell label="Effective" field={rec.general.effectiveDate} />
                <FieldCell label="Term" field={rec.general.terminationDate} />
                <FieldCell label="Ind. deductible" field={rec.general.individualDeductible} />
                <FieldCell label="Remaining deductible" field={rec.general.remainingDeductible} />
                <FieldCell label="Annual max" field={rec.general.annualMax} />
                <FieldCell label="Remaining max" field={rec.general.remainingMax} />
                <FieldCell label="Preventive %" field={rec.general.preventivePct} />
                <FieldCell label="Basic %" field={rec.general.basicPct} />
                <FieldCell label="Major %" field={rec.general.majorPct} />
                <FieldCell label="Ortho" field={rec.general.orthoCovered} />
                <FieldCell label="Waiting" field={rec.general.waitingPeriod} />
                <FieldCell label="Network" field={rec.general.network} />
                <FieldCell label="COB" field={rec.general.cob} />
              </div>
            </section>
          ) : null}
          {rec.sealants ? (
            <section className="band highlight">
              <h2>D1351 sealants — structured determination</h2>
              <div className="card-grid">
                <FieldCell label="Eligible now" field={rec.sealants.eligible} />
                <FieldCell label="Insurance pays" field={rec.sealants.percent} />
                <FieldCell label="Age restriction" field={rec.sealants.ageRestriction} />
                <FieldCell label="Teeth allowed" field={rec.sealants.eligibleTeeth} />
                <FieldCell label="Frequency" field={rec.sealants.frequency} />
                <FieldCell label="Replacement covered" field={rec.sealants.replacementCovered} />
                <FieldCell label="Prior sealants" field={rec.sealants.previousHistory} />
                <FieldCell label="Teeth currently eligible" field={rec.sealants.currentlyEligibleTeeth} />
              </div>
            </section>
          ) : (
            <p className="muted">No sealant determination — intake incomplete or retrieval failed.</p>
          )}
          {rec.procedures.length ? (
            <section className="band">
              <h2>Pediatric procedure schedule</h2>
              <input
                className="search"
                value={cdtFilter}
                onChange={(e) => setCdtFilter(e.target.value)}
                placeholder="Filter CDT or description"
              />
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>CDT</th>
                      <th>Covered</th>
                      <th>%</th>
                      <th>Age</th>
                      <th>Freq</th>
                      <th>Tooth / notes</th>
                      <th>Source</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.cdt} className={r.cdt === 'D1351' ? 'focus' : ''}>
                        <td>
                          <strong>{r.cdt}</strong>
                          <div className="muted">{r.description}</div>
                        </td>
                        <td>{r.covered.value ? 'yes' : 'no'}</td>
                        <td>{r.percent.value}</td>
                        <td>
                          {r.ageMin.value ?? '—'}–{r.ageMax.value ?? '—'}
                        </td>
                        <td>
                          {r.frequencyMonths.value ? `${r.frequencyMonths.value} mo ${r.limitationKind.value ?? ''}` : '—'}
                        </td>
                        <td>{r.toothLimitation.value ?? r.downgrade.value ?? r.exclusion.value ?? '—'}</td>
                        <td className="muted">{r.covered.provenance?.source}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : (
        <p className="muted">Run verification to populate provenance-backed answers for this patient.</p>
      )}
    </>
  )
}

function Claims() {
  const { state, dispatch } = useStore()
  return (
    <>
      <header className="page">
        <div>
          <h1>Claims & scrubbing</h1>
          <p>Phase 2 surface: unbilled visits, CDT/tooth checks, attachments, auto-prepare when confidence is high.</p>
        </div>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Patient</th>
              <th>CDTs</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Issues</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {state.claims.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  <PatientName id={c.patientId} />
                </td>
                <td>{c.procedures.map((line) => `${line.cdt}${line.tooth ? `#${line.tooth}` : ''}`).join(', ')}</td>
                <td>{money(c.amount)}</td>
                <td>
                  <span className={`tag ${c.status === 'denied' || c.status === 'scrub_fail' ? 'bad' : c.status === 'acked' ? 'ok' : 'warn'}`}>
                    {c.status}
                  </span>
                </td>
                <td>{c.issues.join('; ') || '—'}</td>
                <td className="row-actions">
                  {c.status === 'unbilled' || c.status === 'scrub_fail' ? (
                    <button onClick={() => dispatch({ type: 'draft-claim', claimId: c.id })}>Create draft</button>
                  ) : null}
                  {c.status === 'ready' || c.status === 'draft' ? (
                    <button className="primary" onClick={() => dispatch({ type: 'submit-claim', claimId: c.id })}>
                      Submit
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Ar() {
  const { state } = useStore()
  const rows = [...state.claims].sort((a, b) => b.amount - a.amount)
  return (
    <>
      <header className="page">
        <div>
          <h1>AR & payer follow-up</h1>
          <p>Prioritized by dollars, age, timely filing, and next action. Portal/RPA and voice agents are stubs behind the same worklist.</p>
        </div>
      </header>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Claim</th>
              <th>Patient</th>
              <th>Age</th>
              <th>TF left</th>
              <th>Amount</th>
              <th>Status</th>
              <th>Next</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>
                  <PatientName id={c.patientId} />
                </td>
                <td>{c.ageDays}d</td>
                <td>{c.timelyFilingDaysLeft}d</td>
                <td>{money(c.amount)}</td>
                <td>{c.status}</td>
                <td>
                  {c.status === 'denied'
                    ? 'Attach docs / resubmit'
                    : c.status === 'acked'
                      ? 'Portal status check (RPA)'
                      : c.status === 'unbilled'
                        ? 'Generate claim'
                        : 'Monitor'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function Exceptions() {
  const { state, dispatch } = useStore()
  return (
    <>
      <header className="page">
        <div>
          <h1>Exception queue</h1>
          <p>Staff work exceptions, not every account. Auto-resolvable vs human review.</p>
        </div>
      </header>
      <div className="cards">
        {state.exceptions.map((e) => (
          <article key={e.id} className={`ex ${e.resolved ? 'done' : ''} ${e.kind}`}>
            <header>
              <span className={`tag ${e.kind === 'auto' ? 'ok' : 'warn'}`}>{e.kind === 'auto' ? 'auto-resolvable' : 'human review'}</span>
              <span>{money(e.amount)}</span>
            </header>
            <h3>
              <PatientName id={e.patientId} /> {e.claimId ? `· ${e.claimId}` : ''}
            </h3>
            <p>{e.problem}</p>
            <p>
              <strong>Do:</strong> {e.recommendedAction}
            </p>
            <p className="muted">
              {e.evidence} · conf {Math.round(e.confidence * 100)}% · due {e.deadline}
            </p>
            {!e.resolved ? <button onClick={() => dispatch({ type: 'resolve-ex', id: e.id })}>Resolve</button> : <p>Resolved</p>}
          </article>
        ))}
      </div>
    </>
  )
}

function Payments() {
  const { state, dispatch } = useStore()
  return (
    <>
      <header className="page">
        <div>
          <h1>ERA / EOB posting</h1>
          <p>Claim → adjudication → ERA → cash → posted. Low confidence goes to exceptions. Human still owns write-offs.</p>
        </div>
      </header>
      {state.payments.map((p) => (
        <article key={p.id} className="recon">
          <div>
            <h3>ERA {p.id}</h3>
            <p>
              Claim {p.claimId}: paid {money(p.eraAmount)}, contractual {money(p.contractualAdj)}, deductible {money(p.deductible)}, coinsurance{' '}
              {money(p.coinsurance)}, patient {money(p.patientResp)}. Cash match {p.cashAmount != null ? money(p.cashAmount) : 'unmatched'}.
            </p>
            <p className="muted">{p.posted ? 'Posted — audit locked' : 'Clear match · ready to post'}</p>
          </div>
          {!p.posted ? (
            <button className="primary" onClick={() => dispatch({ type: 'post-pay', id: p.id })}>
              Post insurance payment
            </button>
          ) : (
            <span className="tag ok">posted</span>
          )}
        </article>
      ))}
    </>
  )
}

function Billing() {
  const { state, dispatch } = useStore()
  return (
    <>
      <header className="page">
        <div>
          <h1>Patient billing</h1>
          <p>Bills never send until a human approves. Thresholds are configurable later.</p>
        </div>
      </header>
      {state.bills.map((b) => (
        <article key={b.id} className="bill">
          <p className="eyebrow">
            <PatientName id={b.patientId} /> · {money(b.amount)} · {Math.round(b.confidence * 100)}%
          </p>
          <p>{b.summary}</p>
          {b.status === 'pending_approval' ? (
            <div className="toolbar">
              <button className="primary" onClick={() => dispatch({ type: 'bill', id: b.id, status: 'approved' })}>
                Approve & issue
              </button>
              <button onClick={() => dispatch({ type: 'bill', id: b.id, status: 'rejected' })}>Reject / investigate</button>
            </div>
          ) : (
            <p>
              Status: <strong>{b.status}</strong>
            </p>
          )}
        </article>
      ))}
    </>
  )
}

function Architecture() {
  return (
    <>
      <header className="page">
        <div>
          <h1>Architecture (phased)</h1>
          <p>This POC is a static app with deterministic adapters so it deploys on free hosting. Production splits the same contracts onto Postgres, workers, and vaulted payer sessions.</p>
        </div>
      </header>
      <ol className="arch">
        <li>
          <strong>Integration</strong> — Oryx/PMS, Vyne, clearinghouse, payer APIs, portals, bank. Each returns provenance, never a naked LLM guess.
        </li>
        <li>
          <strong>Data</strong> — patients, coverage, procedure benefits, claims, ERA, payments, approvals. Postgres in production; seed JSON here.
        </li>
        <li>
          <strong>Orchestration</strong> — the same source ladder used on the Benefits screen. Temporal/workers later for retries and idempotency.
        </li>
        <li>
          <strong>Browser / voice</strong> — Playwright behind a locked-down runner (not a staff laptop). Voice only on BAA-covered telephony.
        </li>
        <li>
          <strong>Controls</strong> — RBAC, audit, PHI-safe logs, approval thresholds, prod/dev split, encryption in transit and at rest.
        </li>
      </ol>
      <h2>Phases</h2>
      <ol className="arch">
        <li>Insurance verification (this build)</li>
        <li>Claims, attachments, submission</li>
        <li>Follow-up, portals, denials</li>
        <li>ERA, posting, reconciliation</li>
        <li>Voice agents</li>
        <li>Patient billing with human gate</li>
      </ol>
    </>
  )
}

export default function App() {
  return (
    <StoreProvider>
      <AppShell />
    </StoreProvider>
  )
}
