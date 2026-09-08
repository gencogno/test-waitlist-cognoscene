# Cognoscene waitlist — deploy

**Canonical site:** [cognoscene.com/waitlist](https://cognoscene.com/waitlist)

Repo: **`gencogno/cognoscene-waitlist`** · production branch: **`main`**.

---

## Cloudflare production contract

Cloudflare Workers Builds deploys every push to `main` from the repository root.

| Setting | Value |
|---|---|
| Build command | `exit 0` |
| Deploy command | `npx wrangler deploy` |
| Version command | `npx wrangler versions upload` |
| Root directory | `/` |
| Worker | `cognoscene-waitlist` |
| Canonical route | `https://cognoscene.com/waitlist` |
| Root route | `https://cognoscene.com/` → `/waitlist` |

`wrangler.jsonc` is the deployment source of truth. Custom-domain routing remains managed in the Cloudflare dashboard; do not add Wrangler routes without reviewing the existing apex Worker custom domain.

GitHub Pages remains a legacy mirror and redirects browsers to the canonical Cloudflare page.

---

## Required Worker bindings

| Binding | Type | Value |
|---|---|---|
| `WAITLIST_DB` | D1 | `cognoscene-waitlist-db` |
| `TURNSTILE_SECRET` | encrypted secret | Turnstile widget secret; never commit its value |

The public Turnstile site key is present in `index.html`. The secret must exist in Cloudflare → Worker → Settings → Variables and Secrets.

---

## Waitlist backend

| Route | Method | Purpose |
|---|---|---|
| `/api/waitlist/status` | GET | Server-authoritative launch-window state |
| `/api/waitlist` | POST | Turnstile-verified signup and founding eligibility |
| `/api/waitlist/survey` | POST | One-time-token update of the signup row |
| `/admin` | GET | Access-protected read-only response dashboard |
| `/admin/api/submissions` | GET | Paginated response data for the dashboard |
| `/admin/api/export.csv` | GET | Full CSV export without survey-token hashes |

Launch window:

- opens: **25 Aug 2026 · 09:00 SGT**
- public launch: **26 Aug 2026 · 15:15 SGT**
- closes: **16 Sep 2026 · 15:15 SGT**
- the general waitlist remains open through the full 21-day public window
- only the first 100 valid server-recorded signups receive early access

The D1 schema is tracked in `schema.sql`. The production database also includes the later-added `referral_other` and `legal_agreed_at` columns.

Responses are viewed in Cloudflare → D1 SQL Database → `cognoscene-waitlist-db` → Console, or through the private dashboard after Access is enabled. D1 does not send notification or autoresponder emails.

### Private dashboard activation

The Worker serves admin routes only when all four runtime variables are configured:

| Variable | Value |
|---|---|
| `ADMIN_DASHBOARD_ENABLED` | `true` after Access is verified |
| `ADMIN_EMAIL` | `cognoscene@gmail.com` |
| `ACCESS_TEAM_DOMAIN` | `https://<team-name>.cloudflareaccess.com` |
| `ACCESS_AUD` | Access application audience tag |

Before enabling the Worker route:

1. Create a Cloudflare Access self-hosted application for `cognoscene.com/admin*`.
2. Add one Allow policy with the exact email `cognoscene@gmail.com`.
3. Use Cloudflare One-time PIN as the login method.
4. Confirm an unauthenticated private-window request receives the Access login screen.
5. Add the four runtime variables above and deploy them.
6. Confirm the approved email can load `/admin` and another email cannot.

The Worker verifies the Access JWT signature, issuer, audience, expiry and exact email before returning HTML, JSON or CSV. Direct `/admin.html` requests are protected by the same route and authentication checks. The dashboard has no mutation or deletion endpoints.

---

## Day-to-day workflow

1. Fetch the current GitHub file and blob SHA.
2. Use exact find/replace; stop on a source mismatch.
3. Keep dependent Worker, frontend and configuration changes in one atomic commit.
4. Push to `main` and watch the Cloudflare build.
5. Verify the canonical site, API status and D1 write path.
6. Verify GitHub Pages redirects to the canonical site.

Changes remain tentative until founder review.

---

## Form verification

Before distribution:

- [ ] status endpoint reports the expected launch state and timestamps
- [ ] invalid email is rejected server-side
- [ ] missing legal agreement is rejected server-side
- [ ] invalid or expired Turnstile token is rejected
- [ ] duplicate email does not create another row
- [ ] first accepted rows receive `founding_eligible = 1`
- [ ] a valid survey token updates the matching row once
- [ ] a reused or expired survey token is rejected
- [ ] campaign parameters and referrer hostname are stored when available
- [ ] desktop and actual mobile viewport flows complete
- [ ] first production rows are exported and checked

Formspree IDs remain available only as a manual rollback reference in Git history; production JavaScript must not submit to them.

---

## Videos

| File | Purpose |
|---|---|
| `assets/videos/demo.mp4` | Layer 2 rationalisation showcase |
| `assets/videos/observer-*.mp4` | Layer 1 observer slider |
| `assets/videos/growth-*.mp4` | Layer 3 growth slider |
| `assets/videos/VIDEO-MAP.md` | Clip-to-feature mapping |

Video optimization is a separate approved batch. Do not mix re-encoding with backend changes.

---

## Analytics and legal

- GA4 measurement ID `G-RJN8BXMBN3` remains active.
- `privacy.html`, `terms.html` and `founding-terms.html` describe the pre-incorporation launch.
- Cloudflare Workers, D1 and Turnstile are the waitlist infrastructure.
- No raw IP address is stored in D1.
- Counsel review remains recommended before paid advertising or payment collection.
