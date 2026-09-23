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

## Free hosting

The app is a static Vite build (`dist/`). Pick one:

### GitHub Pages (included workflow)

1. Create a GitHub repo named **`dental-rcm`** (the workflow sets `base` to `/dental-rcm/`). If the repo name differs, change `base` in `vite.config.ts` to match.
2. Push `main`.
3. Repo **Settings → Pages → Source: GitHub Actions**.
4. The workflow `.github/workflows/pages.yml` builds and publishes. Site: `https://<user>.github.io/dental-rcm/`.

### Cloudflare Pages / Netlify / Vercel (free tiers)

- **Build command:** `npm run build`
- **Output:** `dist`
- Do **not** set `GITHUB_PAGES` (keeps `base: /`).
- `netlify.toml` and `vercel.json` already rewrite the SPA to `index.html`.

## Production (not this demo)

Replace seed adapters with payer/clearinghouse APIs, a HIPAA-eligible host, Postgres, a credential vault, BAA-covered automation (not unmanaged browsers), PHI-safe logs, and human approval gates. Do not put PHI into unmanaged consumer AI tools.
