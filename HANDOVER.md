# cognoscene waitlist — handover doc
repo: gencogno/cognoscene-waitlist · branch: main · file: index.html
last commit this session: aac561e82aab36f454c6f3e0f4c281107d0b58db — revert hero mockup restructure to original 3-card layout; add click-to-front interaction

---

## 24 aug 2026 production backend addendum — supersedes older hosting/form notes below

- canonical production: `https://cognoscene.com/waitlist` on Cloudflare Workers; `/` redirects to `/waitlist`
- GitHub Pages is a legacy mirror that redirects browsers to the canonical page
- production backend: `src/worker.js` + Cloudflare D1 binding `WAITLIST_DB`
- abuse protection: Cloudflare Turnstile; secret binding name `TURNSTILE_SECRET`
- production endpoints: `GET /api/waitlist/status`, `POST /api/waitlist`, `POST /api/waitlist/survey`
- Formspree is no longer called by production JavaScript
- one D1 row per email; the post-signup survey updates that row with a hashed, single-use token
- backend signup window: 25 aug 2026 09:00 SGT through 16 sep 2026 15:15 SGT
- public launch window: 26 aug 2026 15:15 SGT through 16 sep 2026 15:15 SGT (21 full days); only the first 100 valid server-recorded signups receive founding eligibility
- production offer currency: USD10 one-time after the two-month premium trial; no charge at signup
- `wrangler.jsonc` is the Cloudflare deployment source of truth; dashboard custom-domain routing remains intentionally outside it
- backend/config/frontend/legal changes must ship in one atomic commit so Workers Builds cannot deploy a partial dependency set
- D1 does not send email notifications or autoresponders; responses are reviewed/exported from D1 Studio

Older sections in this file preserve historical implementation context. Where they mention GitHub Pages as canonical, Formspree as live, 250 spots, SGD pricing, optional/skippable survey questions, or a pending Cloudflare migration, this addendum wins.

---

## PASTE THIS TO START THE NEW CHAT

```
continuing work on gencogno/cognoscene-waitlist (index.html). read the repo's
HANDOVER.md for full context, then ask me your one clarifying question before
starting anything.
```

then paste everything below this line.

---

## how to work with Cogno

- casual shorthand, all-lowercase, direct, no padding — match his tone, skip preamble
- confirm scope before touching code if ANYTHING is ambiguous — he corrects fast and firmly when a read is wrong, so lock interpretation first. when he gives a one-word confirmation like "sure" to a multi-part question, pick the sensible default, state the assumption briefly, and proceed rather than re-asking
- he tests live on desktop AND mobile — always ask which, if a fix could behave differently per viewport
- push changes yourself via GitHub API (see workflow below) — don't hand him diffs to paste into ChatGPT, that workflow failed previously
- verify structurally before pushing: brace balance, script tag balance, no duplicate CSS rule definitions. don't trust a single grep match — grep exhaustively for ALL instances of a class/rule before editing
- Cogno will send screenshots when something looks broken — use them. If code review says "looks fine" but he says it's broken, the bug is real; keep digging (CDN cache, JS execution order, `closest()` ancestor mismatches, and — new this session — a second stylesheet you didn't know about have all been real culprits)
- **Claude cannot visually render the live site.** `web_fetch` on the Pages URL returns text-extracted content only (useful for confirming deployed content/copy matches what was pushed) — it strips all CSS, so it cannot judge spacing, layout, colors, or animations. Only Cogno's own eyes or a screenshot he sends can confirm visual quality. Say this plainly when relevant instead of implying more confidence than the setup supports.
- GitHub Pages CDN can lag several minutes behind pushes, especially with rapid consecutive commits. `raw.githubusercontent.com` reflects pushes near-instantly but can occasionally still lag — if it looks stale, verify via the Contents API (`GET /repos/.../contents/index.html?ref=main`) instead, which reads the same data source as the PUT and won't be cache-stale. `web_fetch` on the actual Pages URL (`https://gencogno.github.io/cognoscene-waitlist/`) also works for confirming deploys, once that URL has appeared anywhere in the conversation (the web_fetch tool requires a URL to have been seen via search or user-provided first).
- **PAT hygiene:** if Cogno pastes a token that's already appeared earlier in the same conversation, it's the same exposed credential — don't use it, ask for a genuinely fresh one. Cogno may push back hard on this; hold the line anyway, it costs him ~30 seconds to generate a new one and the risk is real regardless of project stakes. Don't add memory instructions telling future Claude to skip this check "because it's just a waitlist" — this was explicitly requested and explicitly declined once already this session.
- **Multiple Claude sessions may work this repo concurrently without Cogno realizing it** — happened this session, he pasted a different session's handover mid-conversation by mistake. If a "session handover" message appears that describes different commits/changes than you have context for, flag it and confirm before proceeding — don't silently execute another session's unfinished work as if pre-agreed. See "hero mockup — two competing attempts" below.
- **update THIS FILE at the end of any session with real changes.** Prefer a full rewrite over incremental patches once the doc gets messy across sub-sessions.

## GitHub push workflow (proven, use this exactly)

```python
import json, base64, urllib.request

PAT = "<Cogno provides a fresh PAT each session — never reuse one already pasted earlier in the conversation>"
URL = "https://api.github.com/repos/gencogno/cognoscene-waitlist/contents/index.html"

# 1. GET current SHA
req = urllib.request.Request(URL)
req.add_header("Authorization", f"token {PAT}")
with urllib.request.urlopen(req) as resp:
    sha = json.loads(resp.read())["sha"]

# 2. read/edit file locally first (bash_tool + str_replace), verify brace balance:
#    python3 -c "c=open('index.html').read(); print(c.count('{'), c.count('}'))"
#    python3 -c "c=open('index.html').read(); print(c.count('<script'), c.count('</script>'))"

# 3. PUT the full updated file
with open("index.html", "rb") as f:
    content = base64.b64encode(f.read()).decode("utf-8")

payload = json.dumps({
    "message": "descriptive commit message",
    "content": content,
    "sha": sha,
    "branch": "main"
}).encode()

req2 = urllib.request.Request(URL, data=payload, method="PUT")
req2.add_header("Authorization", f"token {PAT}")
req2.add_header("Content-Type", "application/json")
with urllib.request.urlopen(req2) as resp:
    print(json.loads(resp.read())["commit"]["sha"])

# 4. VERIFY via Contents API (not raw.githubusercontent.com — can lag)
req3 = urllib.request.Request(URL + "?ref=main")
req3.add_header("Authorization", f"token {PAT}")
with urllib.request.urlopen(req3) as resp:
    verify = json.loads(resp.read())
    verify_content = base64.b64decode(verify["content"]).decode("utf-8")
    # search verify_content for the change you just made
```

Network egress allows `api.github.com` and `raw.githubusercontent.com` but NOT `gencogno.github.io` directly via bash — use the `web_fetch` tool (not bash) to check the live rendered page, and even then it's text-only, no visual rendering.

**Re-sync local `index.html` from the Contents API at the start of any edit sequence** — don't assume your local sandbox copy is current. This session had real cases of unfinished local edits getting silently lost by an unnecessary re-sync overwrite mid-conversation — sync once at the start of a work block, then keep working from that local copy without re-syncing again until you're ready to push.

---

## known landmines (cumulative, all sessions)

1. **duplicate CSS rules silently override each other.** Always grep for ALL instances of a selector before assuming a single edit covers it.
2. **stray `}` bugs can leak media-query-scoped rules out as global unscoped CSS.** If something looks stuck in "mobile layout" on desktop (or vice versa), check for scope leaks.
3. **shorthand `background:` declarations reset `background-image` etc.** Check for earlier/later shorthand `background:` when building "hidden until revealed" gradient effects.
4. **JS in a shared `<script>` block can be silently killed by an unrelated error earlier in that block.** Isolate independent features into their own `<script>` tags — this project does this consistently now (swipe-highlight animation, founding-card highlights, post-signup modal, hero mockup click-to-front all have dedicated tags).
5. **`el.closest()` ancestor-matching is fragile across different DOM structures.** When debugging stalls, rip out shared/clever logic for a fresh, minimal, dedicated observer instead.
6. **screenshots of animations can look "broken" when they're actually in the pre-trigger resting state.** Ask for a live test before assuming a bug — but don't over-rely on this either, sometimes it's real.
7. **`.github/workflows/relocate-problem-copy.yml` fires on every push to main and always fails** — expected/known, not a code issue. `pages build and deployment` is the workflow that matters.
8. **always do an exhaustive search before declaring a sweep complete** (e.g. currency/color audits) — regex needs to cover all formats (hex, rgb, keyword, css var) and exclude false-positive noise.
9. **hover effects should be scoped with `@media (hover: hover) and (min-width: ...)`, not just viewport-width alone** — prevents "stuck hover" on touch devices regardless of screen width. For the mobile equivalent, use `@media (hover: none)` with `:active` and `transition: none` for an instant (non-eased) response, and add `-webkit-tap-highlight-color: transparent` to kill the default blue tap-flash overlay.
10. **demand-signal surveys with 3+ questions should be a stepper, not one long form** — one question per screen, skippable per-question, honest per-question sample-size reporting rather than assuming full completion.
11. **use a separate Formspree form ID for secondary/optional data collection** (e.g. post-signup surveys) rather than reusing the primary signup form ID — keeps data streams cleanly separable for export.
12. **check for a second, forgotten stylesheet before assuming a component's styling is fully understood.** This project links `css/layers.css` in addition to the large inline `<style>` block in `index.html` — easy to miss, and it has real, active, competing rules for the same selectors as the inline styles. See "layers.css — unresolved" below; cost real time this session.
13. **`transform: scale()` doesn't reflow text wrapping** — if scaling text on hover/tap, longer lines can visually extend past their container edge since wrap points are calculated pre-scale. Font-size transitions reflow properly but animate slightly less crisply.
14. **for a "bring to front, hide the rest via pure layering" interaction on an absolutely-positioned overlapping stack:** lock the container's height in px via JS (`getBoundingClientRect().height`) *before* activating, because the cards' own heights are content-driven, not fixed, so `height: 100%` on the activated card won't resolve correctly against an `auto`/`min-height`-only container. Add `overflow: hidden` on the container too, to clip any edge-bleed from slightly-offset inactive cards (e.g. one anchored at `right: -2%`) that would otherwise poke out past the active card's edges.

---

## current state of the site (as of commit aac561e)

### brand palette (locked)
- `--cream: #edeade`, `--lime: #b8d878`, `--black: #111111`, `--white: #ffffff` (retained for explicit use only)
- red `#E03030` — loop/cycle graphic only, not part of the general accent system
- fonts: Instrument Serif (headings), DM Sans (body), Be Vietnam Pro in some older rules
- voice: all-lowercase, casual, direct
- currency: **SGD**, not USD — `sgd$10` is the founding lifetime price (hero-meta, founding-card highlight, fine print, form-success). The regret-quote testimonial (`"I wasted $78.49 for no reason."`) was deliberately left as a bare `$` — Cogno's explicit call, not an oversight.
- card convention: `16px` border-radius, `24px 28px` padding, `1px solid black` border — used by `.founding-card` and `.layer-index-item`

### header / brand
- wordmark removed from the site header — only the mark (icon) shows, scaled up from `28px` to `40px` desktop (`27px` unchanged on mobile)
- the wordmark **still appears** inside the hero product mockups (`.hero-mock-wordmark`, 3 instances) — intentional, those are product-UI screenshots, not site branding

### marquee (top ticker)
- `250` in the repeating message is bold (pre-existing `font-weight: 800`) and now `14px` (bumped from `12px`), with `margin: 0 -3px` on the `<strong>` to tighten the space between it and the surrounding words
- the gap between repeated loop iterations was **not** changed — an earlier misread attempted that instead and was reverted

### layer cards (observer / rationalisation / growth — the 3-layer index above "how it works")
- resting: `2px solid var(--black)` border always visible, `16px` radius, `24px 28px` padding
- observer kicker copy: `"intercept unnecessary impulses"` (matches the step-title later in `.solution-details`)
- **desktop hover** (`@media (hover: hover) and (min-width: 761px)`): card background flips to black, border to lime — the card itself does NOT scale. Only the text (`.layer-action`, `.layer-name`) scales `1.25x` via `transform` on those child elements, colors set explicitly on the children (not `color: inherit` — an earlier version relying on inherit had a text-rendering bug never fully root-caused)
- **mobile tap** (`@media (hover: none)`, `:active`): same black/lime color+border flip, no scale/zoom (tried once, reverted — felt bad on tap), no transition (instant snap)
- `-webkit-tap-highlight-color: transparent` kills the default blue tap-flash

### ⚠️ layers.css — unresolved, real, needs a decision before touching
`css/layers.css` (linked separately in `<head>`, NOT part of the inline `<style>` block) has its own competing rules for `.layer-index-item`/`.layer-action`/`.layer-name`, discovered mid-session:
- `.layer-action { opacity: 0.62; }` base level, no media query — likely still making kicker text look faded regardless of the inline styles
- a full **mobile-only sliding carousel animation system**: alternating slide direction per card (`layer-slide`), a sliding lime gradient overlay (`gradient-left`), and the `growth` card (3rd child) hardcoded via `:nth-child(3)` to force a **permanent black background + pulsing animation (`layer-pulse`)**, independent of tap state
- predates this session, likely from earlier "smooth edge gradient fade on layer cards" mobile UX work — Cogno confirmed the alternating slide motion is intentional/known/wanted, NOT abandoned
- **unresolved:** whether the new tap-to-flip behavior (this session, lives in inline styles) should coexist with this, and specifically whether `growth` should still be permanently black+pulsing now that tap-to-flip also targets it. Ask before touching `layers.css` — it is confirmed NOT dead code

### hero mockup stack — two competing redesigns, reverted to original + new interaction added
Earlier this session, a different Claude session (see the "multiple sessions" landmine above) had proposed and shipped a hero mockup restructure: `growth` → landscape/back, `hold` → portrait/front, `soft` card removed, `--green` → `--black`, new tag copy. **Cogno reverted it** — "doesn't match up because it's not based on my features," it was another session's unverified interpretation, not his actual intent.

**Current confirmed-correct state:** all 3 original cards restored (`growth` dashboard, `soft` nudge, `hold` checkout-timer), original positions/sizes/rotations, original mobile behavior (`growth` hidden on mobile, only `soft`+`hold` show there).

**Kept from the reverted attempt, per Cogno's explicit "you can keep those":** `--green` → `--black` on `.hero-dashboard-stat .num`, `.mock-timer-label`, `.mock-timer` (hero-scoped only — `--green` untouched everywhere else, confirmed via grep), and tag copy `"how it works — on any digital store"`.

**New this session, Cogno's own idea, built clean:** clicking any of the 3 mockup cards brings it to front and hides the other two via pure layering (no blur, no opacity fade) — see landmine #14 for the technique. Keyboard-accessible (`role="button"`, `tabindex="0"`, Enter/Space, `aria-pressed`). Clicking the already-active card again reverts to the normal stacked view. **Cogno has not yet tested this live** — session ended right after shipping it. Ask for live feedback before assuming it's done.

### solution bridge / solution-details (the "3 layers" walkthrough section)
- eyebrow re-added: `"the solution · cognoscene"` (was orphaned CSS with no matching HTML element)
- `.step-row` uses `align-items: start` (not `center`) — fixes text/video vertical misalignment from inconsistent right-column heights
- `.step-copy` is `16px` (bumped from `14px`)
- `rationalisation` row has the `reverse` class — intentional zigzag layout, confirmed by Cogno
- `.solution-bridge h2::before/::after` in `index.html` is a plain unused typography rule (no matching `<h2>` exists) — separate from the real, active hack in `layers.css`. Low priority, not yet removed.

### post-signup micro-survey modal
Fires automatically after successful waitlist submission (`openPostSignupModal(payload.email)` inside the Formspree success handler). 4-step: intro → country → referral source → platform interest (merged chromium-browser + mobile-app-demand). Progress dots, `×` dismiss anytime, per-question skip, mobile bottom-sheet vs. desktop centered modal. Answers POST to a separate Formspree endpoint (`mwleweea`) from the main signup form (`mbgropvn`), correlated by email.

Test without a real submission: `window.openPostSignupModal` is exposed globally — run `openPostSignupModal('test@example.com')` in the browser console on the live site.

### Formspree payload — fixed this session
The main signup form wasn't including the `platform` radio value (web/mobile/both) in its payload — only `email`/`ready`/`legal_agreed` were sent despite the field existing in HTML. Fixed via `form.querySelector('input[name="platform"]:checked')`.

### dead CSS removed this session
- `.chrome-band` and children — confirmed genuinely dead (HTML removed in an earlier session, only orphaned CSS remained)
- (NOT removed — `layers.css`, see above, that one is real/active)

---

## OUTSTANDING WORK

### 1. hero mockup click-to-front — needs live testing
Built this session, never tested live before session ended. Confirm: snaps cleanly, active-card-click-to-revert works, sensible on mobile (only `soft`+`hold` visible there).

### 2. layers.css carousel/pulse system — needs a decision (full writeup above)
Specifically: should `growth` still force permanent black+pulse via `:nth-child(3)` now that tap-to-flip also targets all three? Does `opacity: 0.62` on `.layer-action` need to go? Don't touch without asking.

### 3. item #10 — platform interest field on the MAIN signup form — unresolved across many sessions
Current copy: `"i'm joining for"`, pills `web (all browsers)` / `mobile (android & ios)` / `both`. Cogno wants **mobile app demand** framing, not browser-porting language — the post-signup survey's platform question now mostly covers this. Ask: does the main form field still need changing, or is the survey sufficient?

### 4. mobile-specific batch — not yet scoped in detail
Ask what's specifically left — some mobile work has landed opportunistically but a dedicated pass hasn't happened. Hero has a separate mobile HTML block (`.mobile-h1`, `.mobile-sub`, `.mobile-only`) — the `98%` stat doesn't exist in mobile copy, needs a copy decision if ever wanted there.

### 5. SEO (audited, not yet actioned)
Already in place: title, meta description, canonical, full OG image metadata, and explicit Twitter card title/description/image metadata. Missing, cheap, no dependencies: `robots.txt`, `sitemap.xml`. Tied to the eventual Cloudflare migration: 301 redirects — low urgency, site is pre-launch with minimal search traffic to protect yet.

### 6. GitHub Pages → Cloudflare Pages migration
Planned, not started. Steps to be documented in `docs/WAITLIST-PLAN.md` when it's time.

---

## reference: full 10-point original brief (status)

1. `98%` bolded + highlighted — ✅ done
2. main stats highlighted — ✅ done
3. drop caps — ✅ REMOVED (brand voice conflict, Cogno's decision)
4. remove "yeah" from CTA — ✅ done
5. problem section restructure — ✅ done
6. shorten tri-loop cards, replace graphic — ✅ done
7. move solution bridge title — ✅ done
8. button link nav — ✅ REVERTED, replaced with layer card scroll-links (now with hover/tap state)
9. founding member highlighted — ✅ done
10. mobile form field (web/mobile/both) — ⚠️ still unresolved, see "OUTSTANDING WORK" #3
