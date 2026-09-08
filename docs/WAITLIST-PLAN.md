# Cognoscene Waitlist Launch Plan

**Scope:** founding cohort only · email-only comms · Singapore-first signups.  
**Last updated:** 26 Aug 2026 (21-day public window aligned).
**Full spec (canonical):** `docs/agent-context/waitlist-launch-spec.md` in `gencogno/cognoscene-statics-roadmap`.

---

## Changelog

- 26 Aug 2026 — Moved the 21-day public window to 26 August 2026 at 15:15 SGT through 16 September 2026 at 15:15 SGT. The backend continues accepting from 25 August, for 22 days, 6 hours, and 15 minutes of actual availability.
- 25 Aug 2026 — Aligned the backend close time, founding terms, and production records to the 30-day public window from 26 August through 25 September 2026. The backend remains open from 25 August; only the first 100 receive founding eligibility.
- 24 Aug 2026 — Replaced Formspree with Cloudflare Worker + D1 + Turnstile. The general waitlist stays open while only the first 100 receive founding eligibility.
- 21 Aug 2026 — Formspree retained for the soft launch. Added the planned post-signup survey data contract and Cloudflare migration path; no Cloudflare endpoint is live yet.
- 15 Aug 2026 — ChatGPT reviewed founding offer + form; recommended one waitlist with platform-intent capture for Chrome / Mobile / Both. Mobile interest is **not yet implemented**. Founding offer remains pay-later.
- 14 Aug 2026 — distilled from statics roadmap `waitlist-launch-spec.md`. Telegram removed; email-only.
- 1 Aug 2026 — original spec authored (Cursor).

---

## 1. Offers (locked for founding cohort)

### Free (everyone at install)

- 1 tracked website
- Full 48h hold + 24h decision window on that site
- Dashboard blocked

### Premium lifetime (waitlist founding only)

- **us$10 · one-time · USD**
- Unlimited tracked sites
- Dashboard unlocked
- Same entitlement flag as premium: `userTier === 'premium'`
- Backend: `plan_type: lifetime` in Supabase (not in extension today)

### Founding offer positioning

Keep the current offer structure:

- 2 months premium free after install/activation during the founding beta;
- then US$10 one-time for lifetime premium;
- no payment at waitlist signup;
- first 100 waitlist signups receive the founding offer; the general waitlist remains open after that;
- accept general-waitlist signups from 25 Aug 2026 at 09:00 SGT until 16 Sep 2026 at 15:15 SGT.

The strategic intent is **experience first, pay later**. Do not add upfront payment to the waitlist without founder approval.

### Public pricing (post-founder window)

- Defer on Wix until founder window closes
- Direction: s$12/yr geo — **not part of this launch**

---

## 2. Pre-launch blockers (must be green before paid invites)

> Payment architecture: **server allowlist + Stripe Checkout Session** — see `stripe-webhook-spec.md`. Do **not** use a shareable public Payment Link.

| # | Blocker | Owner | Verify |
|---|---------|-------|--------|
| 1 | Stripe one-time us$10 product + Checkout Session via edge fn (not public link) | Daniella | Ineligible email → 403 |
| 2 | Webhook `checkout.session.completed` → `users.tier = premium`, `plan_type = lifetime` | Daniella | Pay → reopen extension → premium |
| 3 | Email match: Stripe email = Chrome Google account | Daniella | Mismatch fails gracefully + manual fix path |
| 4 | Extension `verifySubscription` reads server tier | Daniella | Not stuck on local `free` |
| 5 | Manual override runbook (receipt + email → flip tier) | Founder + Daniella | One test user |
| 6 | Waitlist form live + autoresponder | Founder | Submit test email |

**Do not open founding upsell until rows 1–4 pass in test mode.**

---

## 3. Form — Cloudflare production state

**Live in:** `index.html` · Worker entry point: `src/worker.js` · database: Cloudflare D1.

| Submission | Endpoint | Protection |
|---|---|---|
| Main waitlist signup | `POST /api/waitlist` | Turnstile + same-origin + server validation |
| Required post-signup survey | `POST /api/waitlist/survey` | Hashed one-time survey token |

### Current primary submission

| Field | Required |
|---|---|
| Email | Yes |
| Privacy + terms agreement | Yes |

The main signup succeeds before the survey opens. Once opened, the survey must be completed and submitted before its dialog can close.

### Live post-signup survey data contract

| Stage | Field | Notes |
|---|---|---|
| Signup | `email`, `legal_agreed`, acquisition fields | Keep the visible main form lean |
| Survey | `country_code` | All countries; Singapore, Malaysia, United States and United Kingdom pinned first |
| Survey | `referral_source`, `referral_community`, `referral_other` | Written detail appears for community or other |
| Survey | `expansion_interests` | Other desktop browser extensions / mobile app / Chrome is enough |
| Survey | `desktop_browsers` or `mobile_apps` | Conditional multiple choice; mobile means Google Play and Apple App Store |

Do not create a separate mobile waitlist. This survey measures interest in future web-platform variants without presenting them as committed products.

### Storage and eligibility

Each accepted email creates one `waitlist_submissions` row. The post-signup survey updates that row rather than creating a second submission.

- D1 unique email matching prevents duplicate rows.
- Server time determines signup order.
- One atomic insert assigns `founding_eligible = 1` only while fewer than 100 eligible records exist.
- Signups after the first 100 remain on the general waitlist until the 21-day public window closes.
- Survey answers do not affect eligibility.

### Security and operations

- Turnstile is verified server-side on the main signup only.
- The raw survey token is returned once; D1 stores only its SHA-256 hash.
- Survey tokens expire after 24 hours and cannot update a completed survey.
- No raw IP address is stored in D1.
- Campaign parameters and referring hostname are recorded when available.
- Responses are reviewed or exported from the D1 dashboard.
- Formspree remains only as a manual rollback reference in Git history.

Transactional invite emails are a separate delivery decision. Do not assume D1 or a Worker sends them automatically.

### Future email confirmation copy

> you're on the cognoscene waitlist. we'll contact you when your batch opens. founding offer: us$10 once for lifetime premium — details when you get install access. no charge today.

---

## 4. Launch sequence (T-0 → T+21)

### Phase A — Waitlist open (T-0)

- [ ] Form live, success state and D1 row tested
- [ ] Community post: what cognoscene is + waitlist link
- [ ] Internal tracker sheet ready (see §7)
- [ ] **No install link mass-dropped yet** unless build is QA'd

### Phase B — Batch 1 invite (T+0 to T+3)

**Audience:** first `[20–50]` waitlist emails (or all if <50).

**Email — install**

```
your cognoscene beta slot is open.

install: [LINK]
start free — 1 site, full hold works.

try a real checkout on a site you track, then reply here (or note bugs).
```

- [ ] Send only to people who said Chrome desktop = yes (or warn if no)
- [ ] Log: invited_at, install_confirmed (y/n)

### Phase C — Use free (T+3 to T+7)

- [ ] No payment link in this phase
- [ ] Light check-in email (see §5 message 3)
- [ ] Support: install issues, hold not firing, which sites

**Success signal before upsell:** user completes ≥1 checkout hold OR explicitly asks for 2nd site / dashboard.

### Phase D — Founding upsell (T+5 to T+14, or on wall hit)

**Trigger:** user hits 1-site cap, clicks dashboard, or asks to upgrade.

```
founding member offer (waitlist only):

us$10 · pay once · lifetime premium
→ unlimited tracked sites
→ dashboard unlocked

pay with the same email as in the extension:
open the extension → settings → upgrade to founding member (waitlist only).

reopen extension after pay. if still free, send receipt + email here.

founding eligibility is limited to the first 100 accepted signups.
```

- [ ] Track: upgrade_sent, paid, unlocked (y/n)

### Phase E — General waitlist close (T+21)

- [ ] Disable founding checkout (edge fn / Stripe product) when window closes
- [ ] Site copy: waitlist closed / thank you (or "batch 2 waitlist" if continuing)
- [ ] Email: founding window closed; thank early users
- [ ] Export metrics (§7) → decide batch 2 or public pricing

---

## 5. Email message index

| # | When | Purpose |
|---|------|---------|
| 1 | Signup confirm | Set expectations, mention us$10 later |
| 2 | Batch invite | Install link, free tier |
| 3 | Day 3–5 check-in | Did they hit checkout hold? |
| 4 | Wall / upgrade | Founding upgrade via extension (not raw Stripe link) |
| 5 | Paid but stuck | Email match + manual fix |
| 6 | Day 7 nudge | Soft reminder + link |

Comms channel: **email only** (no Telegram).

### Copy blocks (paste-ready)

**1 · Signup confirm**

```
hey — you're on the cognoscene waitlist.

we're testing a chrome extension that adds a pause before checkout on shopping sites you choose.

founding members (waitlist only): us$10 once · lifetime access. you'll get the install link when your batch opens — no charge today.
```

**4 · Upgrade (wall)**

```
founding member offer (waitlist only):

us$10 · pay once · lifetime premium
→ unlimited tracked sites
→ dashboard unlocked

pay with the same email you use in the extension:
open the extension → settings → upgrade to founding member.

after payment, reopen the extension. if it still says free, send your receipt + email here.

founding eligibility is limited to the first 100 accepted signups.
```

---

## 6. When to open batch 2

- Webhook unlock ≥95% without manual fix **and**
- Hold fires on target sites (shein / uniqlo / etc.) **and**
- Founder has NS-capacity for email support

---

## 7. Tracker sheet (columns)

| email | signed_up | platform | batch | invited | installed | 1st_hold | dropped | upgrade_sent | paid | unlocked | notes |
|-------|-----------|----------|-------|---------|-----------|----------|---------|--------------|------|----------|-------|

`platform` should use: `chrome`, `mobile`, or `both` once the recommended form field is implemented. Until then, leave blank rather than inferring.

**Primary beta metrics**

1. Hold → drop rate (among users who triggered hold)
2. Upgrade sent → paid → unlocked (funnel integrity)
3. Platform mix (chrome vs mobile vs both) once platform intent is live
4. Bypass / urgente usage (secondary)

---

## 8. Risks & mitigations

| Risk | Mitigation |
|------|------------|
| Pay doesn't unlock | Webhook before paid wave; manual flip runbook |
| Email mismatch | Wix + Stripe both say "same email" |
| Lifetime ARPU collapse | Cap spots; never reopen silently |
| Support overload | Batch size limit; pin FAQ in autoresponder |
| Mobile demand pollutes desktop funnel | Keep one waitlist but segment by platform intent; do not create a separate duplicate funnel |
| Mobile overpromise | Use “exploring mobile” language, not “coming soon” |

---

## 9. Open decisions (founder fill)

- [x] Founding cap: `100` — only founding-offer eligibility closes; the general waitlist remains open.
- [x] Window: `25 Aug 2026 09:00 SGT` → `16 Sep 2026 15:15 SGT`
- [ ] Batch 1 size: `___`
- [ ] Install delivery: unpacked zip vs private link vs CWS unlisted
- [ ] Add platform-intent field: Chrome / Mobile / Both
- [ ] Add mobile-interest CTA near form

---

## 10. Agent / dev notes

- Do not add a second `userTier` value for lifetime in v1 — use `premium` + server `plan_type`.
- The founding checkout edge function is not yet deployed — do not open upsell until it is.
- Cloudflare Worker + D1 is the production form backend; Formspree is not called by live JavaScript.
- `https://cognoscene.com/waitlist` is canonical. GitHub Pages is a redirecting legacy mirror.

---

## 11. ChatGPT commit log — 15 Aug 2026

These commits were made by the **ChatGPT GitHub session**. Other agents may have made additional commits before or after them.

| Commit | UTC | Change |
|---|---|---|
| `02b56b6` | 13:54 | Initial layer-index gradient fix |
| `e0619a2` | 13:54 | Improve layer-index gradient |
| `1606c56` | 13:56 | Reverse Rationalisation gradient pathway (workflow attempt; superseded) |
| `178958d` / `3df847b` | 13:57 | Darken Growth gradient (superseded by component CSS) |
| `c91920b` / `a7bf572` | 13:59 | Gradient direction attempts (superseded) |
| `ae738e8` / `2ae875c` / `d39e7b7` | 14:01–14:03 | Gradient direction/timing attempts; earlier workflow attempts superseded |
| `2261a21` | 14:09 | Removed failed temporary gradient workflow |
| `1c11d9d` | 14:15 | Extracted layer-index CSS into `css/layers.css` |
| `9aa19d7` | 14:28 | Wired layer styling refactor into production CSS structure |
| `2916dd8` | 14:32 | Reversed Rationalisation gradient direction |
| `a62479a` | 14:34 | Synced Rationalisation gradient with card movement |
| `2101de9` | 14:36 | Increased layer hero headings by 25% |
| `63e4353` | 14:38 | Added pendulum-style gradient opacity keyframes |
| `d586577` | 14:42 | Synced gradient pendulum timing with card movement |
| `706441d` | 14:45 | Corrected founding-terms canonical from Netlify to GitHub Pages |
| `92b7ec5` | 14:48 | Aligned gradient pendulum to both card endpoints; centered layer kicker |

Earlier failed/superseded workflow commits are retained in Git history for auditability but should not be treated as current production logic.
