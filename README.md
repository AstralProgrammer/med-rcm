# White-label Dental RCM

Light pediatric dental insurance RCM proof of concept. **All patients are synthetic.** It does not call real payers, store PHI, or send coverage questions to a consumer LLM.

Branding is tenant-configurable. Click the organization logo in the app to change its name, product label, logo initials, and primary/accent colors. Defaults live in `src/brand.ts`; the demo stores overrides in the browser.

Phase 1 is live: layered benefit retrieval with procedure-level tables and a structured **D1351 sealant** determination (answer, source, evidence, confidence, gaps, next step). Later phases appear as working worklists (claims, AR, exceptions, ERA posting, human-gated patient bills) so the command center can show the full cycle.

## Run locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`). Use **Benefits → Verify Maya Chen** for a direct Delta Dental-style 271 path, **Leo Park** for API misses then portal/RPA fallback, **Noah Wright** for incomplete intake, **Ava Singh** for a terminated plan.

## CI/CD

`.github/workflows/ci-cd.yml` runs on pull requests, pushes to `main`, and `workflow_dispatch`.

| Job | When | What |
|---|---|---|
| **Lint and build** | Every run | `npm ci`, `oxlint`, `npm run build` |
| **Deploy Vercel** | After CI | Preview on PRs, production on `main` (skipped if secrets are missing) |
| **Deploy GitHub Pages** | After CI on `main` | Static site at `https://<user>.github.io/dental-rcm/` |

Local equivalent: `npm run ci`

### Vercel secrets

Create a token at [vercel.com/account/tokens](https://vercel.com/account/tokens). Link once, then copy IDs from `.vercel/project.json`:

```bash
npx vercel login
npx vercel link
```

Add GitHub Actions secrets:

- `VERCEL_TOKEN`
- `VERCEL_ORG_ID` (`orgId`)
- `VERCEL_PROJECT_ID` (`projectId`)

Do **not** set `GITHUB_PAGES` in Vercel. `vercel.json` already sets Vite, `npm ci`, `dist`, and SPA rewrite. You can still import the repo at [vercel.com/new](https://vercel.com/new) or run `npx vercel` / `npx vercel --prod` locally; GitHub Actions deploys the same project when the secrets above are set.

### GitHub Pages

1. Repo named **`dental-rcm`** (or change `base` in `vite.config.ts`).
2. **Settings → Pages → Source: GitHub Actions**.
3. Push `main`. The Pages job needs `GITHUB_PAGES=true` so asset URLs use `/dental-rcm/`.

### Cloudflare Pages / Netlify

- **Build command:** `npm run build`
- **Output:** `dist`
- Do **not** set `GITHUB_PAGES`.
- `netlify.toml` rewrites the SPA to `index.html`.

## Production (not this demo)

Replace seed adapters with payer/clearinghouse APIs, a HIPAA-eligible host, Postgres, a credential vault, BAA-covered automation (not unmanaged browsers), PHI-safe logs, and human approval gates. Do not put PHI into unmanaged consumer AI tools.
