# Cognoscene Waitlist — Agent Handover

**Audience:** agents or devs working in this repo (`gencogno/cognoscene-waitlist`).  
**Author context:** founder `cogno` · Singapore · pre-revenue Chrome extension · pre-incorporation.  
**Last updated:** 26 Aug 2026 (21-day public window aligned).

**Extension repo (separate):** `gencogno/cognoscene-statics-roadmap` — do not confuse. Changes here do not require a `manifest.json` bump.  
**Master launch docs (extension repo):** `docs/agent-context/AGENT_HANDOVER.md` · `docs/agent-context/launch-sdd.md` · `docs/agent-context/waitlist-launch-spec.md` — those are the source of truth for GTM logic; `docs/WAITLIST-PLAN.md` in this repo is the distilled, waitlist-scoped version.

---

## 24 Aug production backend — supersedes historical form and hosting notes below

| Item | Current production contract |
|---|---|
| Canonical URL | `https://cognoscene.com/waitlist` |
| Host | Cloudflare Workers + static assets |
| Database | D1 binding `WAITLIST_DB` |
| Abuse protection | Turnstile secret binding `TURNSTILE_SECRET` |
| Signup | `POST /api/waitlist` |
| Required survey | `POST /api/waitlist/survey` using a hashed one-time token |
| Window | backend accepts from 25 Aug 2026 09:00 SGT; 21-day public window runs 26 Aug 2026 15:15 SGT → 16 Sep 2026 15:15 SGT |
| Eligibility | first 100 valid server-recorded signups only; general waitlist remains open through the full public window |
| Formspree | retired from production JavaScript; Git history only for rollback |

`wrangler.jsonc` is the deployment source of truth. Dependent Worker, frontend, configuration and legal changes must be committed atomically. D1 stores no raw IP address and does not send email notifications automatically.

Historical sections below remain useful for design provenance, but this section wins wherever they conflict on hosting, form fields, backend, currency, capacity or survey behavior.

---

## 1. Live site

| Item | Value |
|------|-------|
| URL | `https://gencogno.github.io/cognoscene-waitlist/` |
| Host | **GitHub Pages** — auto-deploy on push to `main` |
| Privacy | Repo is **public** — GitHub Pages (Netlify removed 14 Aug 2026) |
| Form backend | **Formspree** client POST — `FORMSPREE_FORM_ID` in `index.html` |
| Form fields | Email (required) · Platform (required: Chrome / Mobile / Both) · Legal consent (required) |

---

## 2. File structure

```
cognoscene-waitlist/
├── index.html              ← production site
├── css/
│   └── layers.css          ← layer-index, solution hero, waitlist form, and CTA styles
├── js/
│   └── waitlist-form.js    ← platform-intent + mobile caveat + Formspree payload enhancement
├── founding-terms.html     ← founding offer terms
├── privacy.html
├── terms.html
├── DEPLOY.md               ← GitHub Pages deploy + DNS guide
├── MOBILE.md               ← mobile layout decisions
├── assets/
├── mockups/
├── docs/
│   ├── HANDOVER.md
│   └── WAITLIST-PLAN.md
└── scripts/
```

---

## 3. Production site — current state (16 Aug 2026)

| Section | Status |
|---------|--------|
| Hero | Copy locked — lowercase, Buffer-style brand voice |
| Hero CTA | Text: `yeah, i need this!` — set directly in `index.html` HTML, not via CSS pseudo-element |
| Sticky mobile CTA | Text: `yeah, i need this!` — set directly in `index.html` HTML |
| Problem band | SVG loop diagram (1.25× scale) — see-you-buy-regret cards with hub chevrons; faint shadow on cards (no border) |
| Problem band last paragraph | `there's nothing to interrupt the urges when it hits you, leaving you prone to financially vulnerabilities & unnecessary purchase guilt.` |
| `solution-bridge` "3 layers" block | `layers-index-label` and `solution-bridge-sub` are centered and visually grouped as one intro block above the cards on mobile. Spacing: `layers-index-label` margin-bottom 4px, `solution-bridge-sub` margin-bottom 16px. |
| `solution-details` | 3-layer showcase with video lightbox and mobile swipe behavior |
| `solution-bridge` layers-index | Desktop: 3-column static index. Mobile: single column, cards 82% width, center-aligned text. Observer (card 1) and Growth (card 3) animate left→right (`layer-slide`, `alternate`). Rationalisation (card 2) animates right→left (`alternate-reverse`). |
| Layer gradient — spec | Approaching edge: opacity 0→1 (builds as card nears). At contact: opacity 1. Moving away: opacity 1→0 over 1s. |
| Layer gradient — implementation | Pure CSS keyframes (`layer-edge-right`, `layer-edge-left`) on a 4s `ease-in-out alternate` cycle, locked to `layer-slide` timing. No JS involved. `alternate` direction handles the away-fade automatically. |
| Layer gradient — card 1 (Observer) | `layer-edge-right` · `alternate` · lime radial at right edge |
| Layer gradient — card 2 (Rationalisation) | `layer-edge-left` · `alternate-reverse` · lime radial at left edge |
| Layer gradient — card 3 (Growth) | `layer-edge-right` · `alternate` · lime radial at right edge. Black background card — gradient is `var(--lime) 0%, transparent 42%` (no dark midstop). |
| Layer hero headings | `.step-title` increased by 25% from previous desktop/mobile sizes. |
| `solution-details` showcase videos | Mobile max-width current = 84.375%. |
| Video lightbox | Cross-layer navigation across all 5 clips; mobile swipe via Pointer Events; rounded video corners. |
| `founding-band` | Uses first 100 founding-offer spots / 21-day public-window framing. |
| OG/meta | Production canonical/OG URLs use GitHub Pages. |
| Founding terms | Canonical = `https://gencogno.github.io/cognoscene-waitlist/founding-terms.html`. |
| Form | Email + required Platform selector (Chrome / Mobile / Both) + required legal consent. Formspree POST includes `platform`. Old readiness checkbox removed. |
| Footer | Privacy + Terms linked |

### CTA copy — important implementation note

The hero CTA (`.btn-primary` in `.hero-cta-row`) and sticky mobile CTA (`.mobile-cta-bar a`) both display `yeah, i need this!`. This is set **directly in `index.html` HTML**. `layers.css` previously used a `font-size: 0` + `::after` pseudo-element hack to override the copy — that block has been removed. Do not reintroduce it. If copy changes are needed, edit `index.html` directly.

The form submit button (`#submitBtn`) and founding card CTA remain `join the waitlist` — do not change those.

### Founding offer — current strategic position

The founding offer remains:

- 2 months of premium free after install/activation during the founding beta;
- then US$10 one-time for lifetime premium;
- no payment at waitlist signup;
- 100 founding-offer spots;
- the general waitlist closes 21 days after public launch and does not close early when the founding-offer cap is reached.

This is intentional: the user can experience the product before paying. Do not convert the waitlist into an upfront-payment funnel without explicit founder approval.

### Mobile demand — now implemented as validation

The waitlist captures platform intent in one form:

- `chrome`
- `mobile`
- `both`

There is **not** a separate mobile waitlist. When `mobile` or `both` is selected, the form shows qualification copy. The selected platform is added to the Formspree payload as `platform`. The old `ready` field is removed from the payload.

---

## 4. Brand constants

| Token | Value |
|-------|-------|
| Cream | `#F5F0E8` |
| Lime | `#C8E88A` |
| Black | `#111111` |
| Typography | Be Vietnam Pro |
| Voice | all-lowercase, Buffer-style |
| Logo mark | `assets/cognoscene-mark.png` |
| Wordmark | `assets/cognoscene-wordmark.png` |

---

## 5. Agent scope + rules

- **Waitlist edits = this repo only.** Do not spill into the extension repo unless founder explicitly asks.
- **Do not bump `manifest.json`** — that lives in the extension repo; waitlist changes do not touch it.
- **Smallest diff only** — one ask = one surface. Do not touch adjacent sections, copy, or assets not named in the prompt.
- **Mobile-scoped by default** unless founder explicitly says desktop or both. Confirm scope when ambiguous.
- **Mockup-first for major layout changes** — use the mockup files before production when appropriate.
- **Comms channel: email only.** Telegram is retired.
- **No Telegram, no clinical/shopping-addiction language, no unsupported stats** in any copy or docs.
- **Do not use temporary Actions workflows as a routine editing mechanism.** Prefer direct repository file updates for small component files.
- Founder prefers focused CSS/JS files over repeatedly expanding the monolithic `index.html`.
- **CTA copy lives in `index.html` HTML directly** — do not use pseudo-element overrides in CSS.
- **Gradient control is CSS-only** — do not reintroduce JS polling (`getBoundingClientRect` rAF loops) for gradient opacity. All gradient animation is keyframe-driven and locked to `layer-slide` timing.

---

## 6. Key constraints (do not violate)

1. Never add a Telegram field or reference back.
2. Never add a public Stripe payment link — founding checkout is gated via edge function + allowlist.
3. Never describe Cognoscene as Pte Ltd (pre-incorporation).
4. Never use retired SVG logo placeholders — PNG assets only.
5. No emojis in commits, docs, or code comments.

---

## 7. Related docs (extension repo)

| Doc | Path in `cognoscene-statics-roadmap` |
|-----|---------------------------------------|
| Master handover | `docs/agent-context/AGENT_HANDOVER.md` |
| Master launch SDD | `docs/agent-context/launch-sdd.md` |
| Waitlist launch spec (full) | `docs/agent-context/waitlist-launch-spec.md` |
| Stripe webhook spec | `docs/agent-context/stripe-webhook-spec.md` |

---

## 8. Commit log

### ChatGPT session — 15–16 Aug 2026

| Commit | Change |
|--------|--------|
| `1c11d9d` | Extracted layer-index CSS into `css/layers.css` |
| `9aa19d7` | Wired layer styling refactor into production CSS structure |
| `2916dd8` | Reversed Rationalisation gradient direction |
| `a62479a` | Synced Rationalisation gradient with card movement |
| `2101de9` | Increased layer hero headings by 25% |
| `63e4353` | Added pendulum-style gradient opacity keyframes |
| `d586577` | Synced gradient pendulum timing with card movement |
| `706441d` | Corrected `founding-terms.html` canonical from Netlify to GitHub Pages |
| `92b7ec5` | Centered kicker + gradient endpoint attempt |
| `2212a31` | Centered / enlarged solution hero and highlighted `friction.` in lime |
| `5015cd2` | Added `js/waitlist-form.js` for platform intent and mobile qualification |
| `190f41e` | Added waitlist platform/caveat styling to `css/layers.css` |
| `dc5142c` | Removed duplicate ChatGPT handover; consolidated into `docs/HANDOVER.md` |
| `1cc5f4f` | Simplified all layer gradients into shared right-edge behavior synchronized with card movement |

**Historical note:** Earlier ChatGPT gradient workflow commits (`02b56b6`, `e0619a2`, `1606c56`, `178958d`, `3df847b`, `c91920b`, `a7bf572`, `ae738e8`, `2ae875c`, `d39e7b7`, `2261a21`) are superseded experiments. Do not reconstruct current behavior from them.

### Claude session — 16 Aug 2026

| Commit | Change |
|--------|--------|
| `aaaec8a` | Problem copy, 3-layers centering, gradient fade, CTA copy (multi-change pass) |
| `0ddcae0` | `layers.css`: 3-layers mobile centering + redundant CTA hack removed |
| `ccc85f1` | `waitlist-form.js`: replaced JS gradient polling with CSS keyframe approach |
| `ef9ce13` | `layers.css`: removed redundant CTA `font-size: 0` / `::after` block |
| `be0d3d0` | `layers.css`: corrected gradient keyframes to 0→1 approach / alternate handles away fade |
| `6e5fc75` | `layers.css`: growth card gradient simplified — lime to transparent, no dark midstop |

---

## 9. Current founder preferences

- Prefer **small, isolated changes**.
- Reduce conversion friction wherever possible.
- Keep the founding offer pay-later model.
- Mobile should be validated through demand capture before being treated as a committed product promise.
- Preserve the `platform` field — platform interest is strategically valuable for pre-seed fundraising.
- Keep one waitlist / one backend.
- Keep lowercase / Buffer-style brand voice.
- Add a **Next steps** section after substantive recommendations.
- Gradient must follow motion geometry — CSS keyframes locked to card animation, not JS polling.
- Growth card (black bg) uses lime gradient, no dark midstop.
- CTA copy set in HTML directly, not overridden via CSS pseudo-elements.

---

## 10. Known outstanding items

1. `layerSlide` animation uses `margin-left` instead of `transform` — causes layout reflow. Flagged for fix; do not address unless explicitly asked.
2. Plausible analytics config in `index.html` is empty — no events firing.
3. `WAITLIST_SIGNUPS` is hardcoded — requires manual update to reflect real signup count.
4. GitHub Pages CDN cache lag is permanent workflow constraint — hard refresh after every push, allow 2–5 min for propagation.
5. Gradient timing on approach is linear across the full 4s travel — no hold at center. If founder wants gradient to appear only in the final 1s of approach, keyframes need a flat 0% zone added at 0%–75% before the rise.
