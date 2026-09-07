# Cognoscene Test website — product-demo handover

## Scope and rules

- Work only in this repository: `gencogno/test-waitlist-cognoscene`, branch `main`.
- Test URL: `https://gencogno.github.io/test-waitlist-cognoscene/#demo`.
- Production is separate and must not be edited: `https://cognoscene.com/waitlist`.
- Read `index.html`, check the current SHA, preserve unrelated work, test desktop and mobile, then push only after verifying.
- Product framing: conscious friction before a purchase; friction, not restriction; preserve agency. Avoid clinical, shame-based, causal, or unsupported population claims.

## Batch 1 — complete and live (reversible)

Product-demo work is live on Test. Latest relevant published commit: `dbf60c1` (`Move demo timestamps into player`).

### Player

- Video: `assets/videos/product-demo-waitlist-v2.mp4`, 1280×800, 209.557 seconds.
- Video poster: `assets/product-demo-thumbnail.png`.
- The website player shell already owns the black rounded border. The poster intentionally has **no inner border**.
- The poster contains: Cognoscene mark only (no wordmark), `product demo`, `3 layers. / 3 minutes.`, `notice. pause. grow.`, and three labelled signifiers.
- Source/editable assets:
  - `assets/product-demo-thumbnail.svg`
  - `assets/icons/icon-observer.svg`
  - `assets/icons/icon-rationalisation.svg`
  - `assets/icons/icon-prudency.svg`
- Canva copy: https://www.canva.com/d/MP5DgZrJRrVlzam

### Chapters

Clickable chapter controls sit inside the player frame, above native controls, after playback begins:

| Label | Timestamp |
| --- | --- |
| intro | 0:00 |
| observer | 0:21 |
| rationalisation | 1:17 |
| prudency | 2:03 |
| join the beta | 3:03 |

They seek the native video, start playback, highlight the active chapter, and handle slow metadata loading. Live seeking was verified.

### Open Batch 1 decision

The founder may still change this presentation. Keep timestamps as website controls, not text baked into the MP4.

### Local-only item

- `assets/product-demo-poster-v2.png` is an unused experimental image. It is intentionally untracked and must not be staged unless the founder asks.

## Batch 2 — product-section title and supporting copy

Intent: give the demo context before playback. The current demo section is intentionally video-first and has no title/supporting copy.

Recommended pending copy (not yet implemented):

```text
product demo
see conscious friction in action.
see how cognoscene introduces deliberate pauses while leaving every purchase decision with you.
```

Typography: Times New Roman display title with `letter-spacing: -0.05em`; supporting copy in Be Vietnam Pro. Keep desktop and mobile layouts separate and keep all text within safe borders.

## Batch 3 — duration and timed CTA

Not implemented. Add only after founder approval of exact wording and behaviour.

Candidate requirements:

- Show the truthful duration (`3 min 30 sec`, rounded from 209.557 seconds) near the player or chapter rail.
- Add a lightweight CTA only near/after the final CTA segment, not a disruptive overlay during the demo.
- CTA should link to `#waitlist`; do not autoplay, trap playback, or block native controls.

## Batch 4 — analytics and transcript

Not implemented. Define before coding:

- Consent and privacy boundaries before collecting watch/seek events.
- Minimal events: player started, chapter selected, 25/50/75/100% watched, final CTA clicked.
- Do not collect email addresses, browsing activity, retailer context, or raw video interaction data unnecessarily.
- Transcript should be an accessible disclosure below the video, not captions baked into the poster. Use only the exact spoken wording from the source video.

## Solution bridge + solution details — founder is considering removal/shortening

These currently appear **after the problem/proof sections and after the full product demo**. They may now duplicate the new thumbnail and full demo.

### Current solution bridge (`#solution`)

- Eyebrow: `the solution · cognoscene`
- Core claim: `pause shopping impulses using designed friction.`
- Three navigation cards:
  1. `observer` — `intercept unnecessary impulses`
  2. `rationalisation` — `48 hours to decide if its a waste`
  3. `growth` — `impulse-driven to prudence`
- Cards link to the detailed sections below.

### Current solution details

1. **Observer**: browsing nudges and two video clips.
2. **Rationalisation**: 48-hour checkout hold and one video clip.
3. **Growth**: dashboard/identity framing and two video clips.

### Decision recommendation

The full product demo already shows the same three layers. Best simplification is likely:

1. remove the solution bridge navigation cards;
2. retain a much shorter three-layer summary only if visitors need orientation before the demo; and
3. remove or collapse the detailed sections unless their clips provide evidence the full demo does not.

Do not remove either block without the founder explicitly choosing the desired page flow. If shortening, preserve IDs (`#observer`, `#rationalisation`, `#growth`) or update all internal links and demo chapter assumptions.

## Suggested first prompt for a new ChatGPT

```text
Work in Mode 3.5 on Cognoscene's Test waitlist repository only. Read NEXT-CHAT-HANDOVER.md and current index.html before editing. Preserve the live Batch 1 video work. Help me decide whether to remove or compress the solution bridge and solution-details blocks before implementing Batches 2–4. Do not touch production, do not stage assets unrelated to the requested change, and verify desktop/mobile plus the live Test deployment before saying anything is live.
```
