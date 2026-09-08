# Mobile view — plan & implementation notes

> **26 Aug 2026 production note:** the live site is now `https://cognoscene.com/waitlist` on Cloudflare Workers. The production forms use `POST /api/waitlist` and `POST /api/waitlist/survey`, backed by D1 and protected by Turnstile. Submissions remain open through the 21-day public window from 26 August 2026 at 3:15 PM SGT to 16 September 2026 at 3:15 PM SGT; the backend began accepting submissions on 25 August. Only the first 100 valid server-recorded signups receive early access. Historical Netlify, Formspree, 250-spot, and client-side gate notes below are retained only as design provenance and must not guide production changes.

**Site:** [cognoscenewaitlist.netlify.app](https://cognoscenewaitlist.netlify.app)  
**Primary file:** `index.html` (inline CSS + markup)  
**Breakpoint:** `@media (max-width: 760px)` — mobile rules live here only unless noted  
**Last updated:** 26 Aug 2026

---

## Goal

Mobile is not trying to match desktop conversion parity. Cognoscene is a **desktop Chrome extension**. On phone, the page job is:

> **Capture a qualified email now → user installs on laptop/desktop when their batch opens.**

Optimize for **desktop-Chrome-ready signups**, not raw signup volume.

---

## Current state (live on Netlify — commit `a294585` baseline)

Mobile CSS in `index.html` matches the **last deployed commit** (`a294585`). Desktop/local-only changes (waitlist gate, domain, historic offer copy, etc.) are **unchanged** — only the `@media (max-width: 760px)` block was reverted to Netlify.

| What mobile does today | Detail |
|------------------------|--------|
| Layout | Single column; hero visual first; stacked mock cards; problem icon row visible |
| Hero | Full copy visible (lead, chrome band, meta, all three mocks) |
| Form | Same fields as desktop; sticky CTA bar; `body.has-mobile-cta { padding-bottom: 76px }` |
| Not yet done | Funnel trim, copy reframe, app roadmap icon, form compression |

**Reverted (12 Aug 2026):** Phase A funnel trim attempted locally — reverted; full mobile page remains visible for copy pass.

---

## Target mobile information architecture

```
[fold]     logo · headline · offer line · primary CTA
           optional: single hold mock OR L2 demo poster
[screen 2] waitlist form (email + minimal consent)
[below]    collapsed “how it works” (L2 demo only by default)
[sticky]   “save my spot” → #waitlist
```

**Rule of thumb:** user should reach the email field within **≤2 scrolls** on a ~390px-wide phone.

---

## Planned changes

### Remove (mobile only)

| Element | Why | How |
|---------|-----|-----|
| Top marquee animation | Eats fold height; competes with headline | Static one-liner or hide in `@media` |
| Problem band (full) | Longest scroll block; emotional copy does not unlock mobile submit | Hide section or collapse to 1 sentence + quote |
| Solution bridge 3-layer cards | Duplicates how-band | Hide `.layers-index` + bridge subcopy on mobile |
| How-band layers 1 & 3 | Observer + growth sliders = scroll + data cost | Hide `.step-row` for L1/L3; keep L2 rationalisation |
| Founding card block | Duplicates form offer directly above form | Hide `.founding-band` on mobile; merge offer into form header |
| Autoplay below fold | Cellular performance + distraction | `preload="none"` + poster; tap-to-play |
| Hero mock stack (optional) | If L2 video/poster is hero proof | Hide `.hero-screenshot-stack` once demo is above form |

### Add (mobile only)

| Element | Why | Implementation hint |
|---------|-----|---------------------|
| Mobile hero reframe | Correct job-to-be-done | New `.hero-mobile-note` block, visible only in `@media` |
| Offer in first viewport | Currently hidden with `.hero-meta` | `.hero-offer-mobile` — historical founding-offer copy |
| Platform honesty line | Filter unqualified signups | One line near submit: *desktop chrome · laptop/desktop · not mobile safari* |
| Visible email label | NN/G: placeholders alone fail on mobile | Label above `#email` (can stay visually hidden on desktop) |
| Form offer header | Replaces hidden founding card | Short lines inside `.form-inner` above gate status |
| Video poster + tap-to-play | LCP / data savings | `poster` attr on L2 `<video>`; disable autoplay on mobile via JS or CSS |
| `scroll-margin-top` on `#waitlist` | Sticky CTA anchor should not clip headline | `#waitlist { scroll-margin-top: 72px; }` in mobile block |
| Optional hero email shortcut | Second entry to same form | Anchor-only is enough initially; inline field is phase 2 |

**Suggested mobile-only copy**

- Hero note: *save your spot — install on desktop chrome when your batch opens*
- Sticky CTA: *save my spot*
- Form sub: *first step: drop your email. we'll invite you in batches.*

### Change (mobile only — desktop untouched)

| Current | Mobile target |
|---------|---------------|
| Regret-led headline only | Keep headline; add offer + platform context below sub |
| Hidden `.chrome-band` | Remove hide rule; show **one** platform line at form only |
| Two required checkboxes | Investigate merging readiness + legal into one line (legal review first) |
| Full how-band copy | Accordion or collapsed sections; L2 open by default |
| Sticky bar label | “join the waitlist” → “save my spot” + offer microcopy |
| Gate status placement | Keep above form; consider mirroring spots/deadline in sticky bar (phase 2) |

---

## Mobile app roadmap — icon + popup (planned, not shipped)

**Purpose:** reassure mobile visitors that native apps are coming, without a clunky inline pill or hiding the desktop-Chrome reality.

### UX spec (mobile only, ≤760px)

| Item | Spec |
|------|------|
| **Trigger** | Small **info icon** (44×44px tap target) — not a full-width pill. Place inline beside form subline or gate status, right-aligned. |
| **Label** | Icon only by default; optional `aria-label`: *mobile apps roadmap* |
| **Interaction** | Tap icon → bottom sheet slides up (match existing lightbox transition language) |
| **Dismiss** | Backdrop tap, ×, “got it”, Escape |
| **Desktop** | Trigger + sheet hidden entirely (`display: none` outside `@media`) |

### Popup copy (draft)

**Title:** mobile apps are on the roadmap

**Body:** cognoscene is desktop chrome today. we're building native apps for **android** and **ios**, targeting **late 2027**. join the waitlist now — we'll email you when desktop beta opens, and you'll hear about mobile when it's ready. rest assured.

**Dismiss CTA:** got it

### Design notes (avoid clunky v1)

- Do **not** use a bordered pill with long text above the email field — reads as a second CTA and clutters the form.
- Prefer a single subtle `(i)` or phone-outline icon aligned to the form header row.
- Sheet should feel like reassurance, not a blocker — user can dismiss and continue signup immediately.
- Frame as **roadmap target**, not guaranteed ship date (*targeting late 2027*).

### Implementation checklist (when building)

1. Add `.mobile-only` trigger in `.form-inner` (or beside `#waitlistGateStatus`).
2. Add sheet markup near `#videoLightbox` (reuse backdrop + slide-up pattern).
3. CSS: base hidden; show trigger in `@media (max-width: 760px)` only.
4. JS: `matchMedia('(max-width: 760px)')` guard; focus trap on open; close on resize to desktop.
5. Do not show when `#formPanel` is hidden (waitlist closed / success) — or hide trigger with `.form-panel.is-hidden`.
6. Test: icon tappable at 320px; no desktop leakage at 1024px.

### Guardrails

- **One** reassurance surface — do not duplicate in hero + form + sticky bar.
- Does not replace platform honesty line near submit (desktop chrome today).
- Legal: roadmap language is aspirational; avoid “guaranteed by late 2027” in external ads until scoped.

---

## Build phases

| Phase | Scope | Risk |
|-------|-------|------|
| **A — Funnel trim** | Hide problem / founding / L1+L3 / layer index on mobile | Low — CSS only |
| **B — Reframe copy** | Add mobile-only HTML blocks + platform line at form + app roadmap icon | Low — additive HTML |
| **C — Form compression** | Visible label; optional single checkbox | Medium — legal review |
| **D — Video performance** | Posters, no autoplay below fold | Medium — test lightbox still works |
| **E — Instrumentation** | Device-segmented scroll + form events | Low — JS only |

Implement **A → B** first. Do not reorder desktop DOM unless using mobile-only duplicate blocks with `.desktop-only` / `.mobile-only` utility classes.

---

## What to take note of while changing

### Scope discipline

- **All layout/copy cuts go in `@media (max-width: 760px)`** or mobile-only HTML with `.mobile-only { display: none }` on desktop and reverse in mobile block.
- Do **not** change desktop band alignment: `.how-band`, `.form-band`, `.founding-band` negative-margin + `.wrap` pattern is load-bearing.
- Do **not** alter Formspree field names (`email`, `ready`, `legal_agreed`) without updating Formspree dashboard + `DEPLOY.md`.

### Product honesty

- Cognoscene does not run on mobile browsers. Say it **once**, near submit — not buried, not repeated in hero + form + footer.
- Mobile signup = **waitlist for desktop install**, not “use cognoscene on your phone.”

### Legal / form

- Two checkboxes exist for a reason (`ready` + `legal_agreed`). Confirm with privacy/terms before merging.
- If merged, update `privacy.html` references and Formspree field mapping in `index.html` script block.
- Keep `autocomplete="email"` and `type="email"` on the email field.

### Performance

- Three autoplay MP4s on mobile will hurt more than copy trims. Check file sizes in `assets/videos/` before deploy.
- Google Fonts + videos + marquee = fold delay. Consider `display=swap` (already on) and lazy video loading.
- Test on **Slow 3G** in Chrome DevTools, not just responsive width.

### Sticky CTA + footer

- `body.has-mobile-cta { padding-bottom: 76px }` on Netlify baseline (global rule).
- Do not re-add duplicate footer bottom padding on mobile.

### Waitlist gate

- `#waitlistGateStatus`, `#waitlistClosed`, `#formPanel` logic is shared. Mobile hides must not break closed-state or success-state visibility.
- `WAITLIST_DEADLINE`, `WAITLIST_SIGNUPS`, `WAITLIST_CAP` in script block — unchanged by mobile CSS.

### Accessibility

- Hidden sections must use `display: none` or `hidden` — not `visibility: hidden` with focusable children left tabbable.
- Tap targets: buttons, checkboxes, slider pills ≥ **44×44px** with **8px+** spacing.
- If accordion added later: use `<button aria-expanded>` + keyboard support.

### Analytics (not yet implemented)

Track by device category before next major cut:

| Event | Purpose |
|-------|---------|
| `scroll_25` / `scroll_50` / `scroll_75` | Where mobile users drop |
| `form_view` | Reached `#waitlist` |
| `form_start` | Focus on `#email` |
| `form_submit` / `form_error` | Completion vs validation fail |

Without this, further removals are guesswork.

---

## Files to touch (when implementing)

| File | Changes |
|------|---------|
| `index.html` | Mobile `@media` block, optional `.mobile-only` markup, form platform line, video attrs |
| `DEPLOY.md` | Form fields note if checkbox merge approved |
| `privacy.html` | Only if consent copy changes |
| `MOBILE.md` | Mark phases complete as shipped |

**Do not touch:** extension repo, `founding-terms.html` (unless offer wording changes), Netlify config.

---

## Test checklist (mobile)

1. Chrome DevTools → iPhone 14 (~390px) + Slow 3G.
2. First viewport: headline + offer + CTA visible without scroll.
3. Sticky bar visible; tap scrolls to form without clipping headline.
4. Form submits to Formspree with correct payload.
5. Gate closed state + success state still render.
6. L2 video / lightbox works after tap-to-play change.
7. No horizontal scroll at 320px and 390px.
8. Desktop at 1024px+ unchanged (visual spot-check hero, bands, form alignment).

---

## Success metrics

| Metric | Direction |
|--------|-----------|
| Mobile form-start → submit rate | Up |
| Mobile bounce before `#waitlist` | Down |
| Unqualified signups (no desktop Chrome) | Down — qualitative, from support/replies |
| Desktop conversion | Flat — must not regress |

---

## Changelog

| Date | Author | Note |
|------|--------|------|
| 12 Aug 2026 | Cursor | Initial mobile plan from Mode 2 research |
| 12 Aug 2026 | Cursor | Reverted experimental mobile CSS + clunky app pill to Netlify baseline (`a294585`); app roadmap icon spec added to plan only |
