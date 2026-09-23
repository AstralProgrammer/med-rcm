import { useEffect, useRef } from 'react'

type SwaggerBundle = (options: {
  url: string
  domNode: HTMLElement
  deepLinking: boolean
  docExpansion: string
  defaultModelsExpandDepth: number
  tryItOutEnabled: boolean
}) => { destroy?: () => void }

declare global {
  interface Window {
    SwaggerUIBundle?: SwaggerBundle
  }
}

const TOC = [
  { id: 'overview', label: 'Overview' },
  { id: 'structure', label: 'System structure' },
  { id: 'retrieval', label: 'Retrieval ladder' },
  { id: 'resources', label: 'Resources' },
  { id: 'phases', label: 'Phases' },
  { id: 'api', label: 'API reference' },
]

const SWAGGER_CSS = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui.css'
const SWAGGER_JS = 'https://unpkg.com/swagger-ui-dist@5.17.14/swagger-ui-bundle.js'

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)
    if (existing && window.SwaggerUIBundle) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.body.appendChild(script)
  })
}

export function Docs() {
  const swaggerRoot = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const host = swaggerRoot.current
    if (!host) return
    let cancelled = false
    let ui: { destroy?: () => void } | undefined

    if (!document.querySelector(`link[href="${SWAGGER_CSS}"]`)) {
      const css = document.createElement('link')
      css.rel = 'stylesheet'
      css.href = SWAGGER_CSS
      css.dataset.swaggerUi = 'true'
      document.head.appendChild(css)
    }

    void loadScript(SWAGGER_JS).then(() => {
      if (cancelled || !host || !window.SwaggerUIBundle) return
      ui = window.SwaggerUIBundle({
        url: `${import.meta.env.BASE_URL}openapi.yaml`,
        domNode: host,
        deepLinking: false,
        docExpansion: 'list',
        defaultModelsExpandDepth: 1,
        tryItOutEnabled: true,
      })
    })

    return () => {
      cancelled = true
      ui?.destroy?.()
      host.replaceChildren()
    }
  }, [])

  return (
    <div className="docs-layout">
      <nav className="docs-toc" aria-label="Docs">
        {TOC.map((item) => (
          <a key={item.id} href={`#${item.id}`}>
            {item.label}
          </a>
        ))}
        <a href={`${import.meta.env.BASE_URL}openapi.yaml`}>openapi.yaml</a>
      </nav>
      <div className="docs-body">
        <section id="overview" className="band">
          <h2>Overview</h2>
          <p>
            White-label pediatric dental RCM. The UI is a static SPA; the OpenAPI document is the production contract
            those screens will call. Demo data is synthetic. Coverage is never guessed by a model.
          </p>
        </section>
        <section id="structure" className="band">
          <h2>System structure</h2>
          <ol className="arch nested">
            <li>
              <strong>Experience</strong> — dashboard, intake, benefits, claims, A/R, exceptions, ERA, billing, docs.
            </li>
            <li>
              <strong>API</strong> — versioned REST under <code>/api/v1</code>. Auth, RBAC, and audit in production.
            </li>
            <li>
              <strong>Orchestration</strong> — verification worker walks the source ladder with retries and idempotency.
            </li>
            <li>
              <strong>Integrations</strong> — PMS, payer APIs, clearinghouse, Vyne, portals, bank. Each write includes
              provenance.
            </li>
            <li>
              <strong>Data</strong> — patients, plans, procedure benefits, claims, ERA, payments, bills, exceptions,
              audit.
            </li>
          </ol>
        </section>
        <section id="retrieval" className="band">
          <h2>Retrieval ladder</h2>
          <p>When a 271 is only class-level, fill remaining CDT fields from the next source. Stop per field on confidence.</p>
          <ol className="arch nested">
            <li>Direct payer API</li>
            <li>Clearinghouse</li>
            <li>Vyne</li>
            <li>Other eligibility APIs</li>
            <li>Payer website</li>
            <li>Browser automation / RPA</li>
            <li>Benefit PDFs</li>
            <li>Phone agent</li>
            <li>Human exception queue</li>
          </ol>
        </section>
        <section id="resources" className="band">
          <h2>Resources</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Resource</th>
                  <th>Path</th>
                  <th>UI</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Patients</td>
                  <td>
                    <code>/patients</code>
                  </td>
                  <td>Patients</td>
                </tr>
                <tr>
                  <td>Verifications</td>
                  <td>
                    <code>/verifications</code>
                  </td>
                  <td>Insurance benefits</td>
                </tr>
                <tr>
                  <td>Claims</td>
                  <td>
                    <code>/claims</code>
                  </td>
                  <td>Claims / A/R</td>
                </tr>
                <tr>
                  <td>Exceptions</td>
                  <td>
                    <code>/exceptions</code>
                  </td>
                  <td>Exception queue</td>
                </tr>
                <tr>
                  <td>Payments</td>
                  <td>
                    <code>/payments</code>
                  </td>
                  <td>Payments &amp; ERA</td>
                </tr>
                <tr>
                  <td>Bills</td>
                  <td>
                    <code>/bills</code>
                  </td>
                  <td>Patient billing</td>
                </tr>
                <tr>
                  <td>Audit</td>
                  <td>
                    <code>/audit</code>
                  </td>
                  <td>Dashboard</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
        <section id="phases" className="band">
          <h2>Phases</h2>
          <ol className="arch nested">
            <li>Insurance verification (this build)</li>
            <li>Claims, attachments, submission</li>
            <li>Follow-up, portals, denials</li>
            <li>ERA, posting, reconciliation</li>
            <li>Voice agents</li>
            <li>Patient billing with human gate</li>
          </ol>
        </section>
        <section id="api" className="band swagger-card">
          <h2>API reference</h2>
          <p className="muted">
            OpenAPI 3.0 · Swagger UI. Try it out targets <code>/api/v1</code> (not hosted on this static demo).
          </p>
          <div ref={swaggerRoot} className="swagger-host" />
        </section>
      </div>
    </div>
  )
}
