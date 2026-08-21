# Graama — static site

A static, single-page site for **Graama**, the residential enclave within Vedic City
in North Goa. No build step, no dependencies — open `index.html` or serve the folder.

```bash
python3 -m http.server 4321 --directory graama-site
```

## Structure

```
graama-site/
├─ index.html          # the whole page
├─ css/styles.css      # design tokens + all styling
├─ js/main.js          # every interaction, vanilla, ~450 lines
└─ assets/             # photography, film, brand mark
```

## Palette

| Token | Hex | Role |
|---|---|---|
| Laterite | `#A4451F` | primary — buttons, accents, the investment band |
| Monsoon | `#23331F` | ground — hero, amenities, master plan, CTA |
| Field ochre | `#B8862A` | accent — numerals, progress, mandala |
| Limewash | `#EFE9DD` | paper — page background, text on dark |
| Ink | `#16120E` | text, footer |

Type: **Fraunces** (display, variable — SOFT 28 / WONK 1) and **Jost** (UI), both from
Google Fonts. Everything else is set in tokens at the top of `styles.css`.

## Sections

1. **Hero** — the communal-dinner film, muted/looping, with pointer + scroll parallax
2. **Marquee** — the six amenities as a running ribbon
3. **Chapter 03** — the positioning statement
4. **Amenities** — six cards, line icons that draw themselves in on entry
5. **Soulful Village Retreat** — the NA-approval badge and the fact table
6. **Master Plan** — an SVG plan generated in JS: eight radiating lanes, a perimeter
   road, a shared-landscape belt, and 80 hoverable parcels around the cultural green.
   Deterministic (seeded PRNG), so it draws the same every load.
7. **Pillars** — four cards on a horizontally-pinned track driven by scroll position
8. **Location** — the real animated map, warm-graded onto the palette, plus distances
9. **Growth corridor** — what's being built nearby, with count-up numerals
10. **Investment** — 25% / 24 months
11. **Activities** — a staggered six-tile photo grid
12. **CTA band** — a slowly rotating 24-petal mandala behind the closing line
13. **Enquiry form** + footer

## Animation

All motion is CSS transitions and `requestAnimationFrame` — no libraries. A single
rAF-throttled scroll bus (`onScroll`) feeds the nav, the progress bar, the hero
parallax and the pinned pillars, so there is one listener rather than six.

Every effect is disabled under `prefers-reduced-motion: reduce`, and both the
preloader and the count-up numerals carry timeout guards so a throttled or
backgrounded tab can never strand the page mid-animation.

## Assets

Photography, the two films and the Vedic City mark were taken from
`live-vedic.com/graama` and `live-vedic.com` — they are the client's own assets,
included here so the rebuild shows real content rather than placeholders. The MP4s
were re-muxed with `-movflags +faststart` so they stream and seek properly, and the
oversized JPEGs were re-encoded (`still-water.jpg` 925 KB → 268 KB).

Photographs carry a light shared grade — `saturate(.9) contrast(1.03)` plus a 10%
Monsoon `mix-blend-mode: color` wash — so a mixed-source set reads as one palette.

## Known gaps

- **The form is front-end only.** `#enquiryForm` validates three fields and swaps in a
  thank-you state; it posts nowhere. Wire it to an endpoint before going live.
- **Nav links** for Vedic Living / Praana / Soma point at `#story`. Those are separate
  projects on the real site and would need their own pages.
- **"Download Brochure"** has no file behind it.

## Publishing a shareable single file

`build-artifact.py` bundles the whole site into one self-contained HTML file at
`.build/graama-artifact.html` — every image, video and the logo inlined as a `data:`
URI, CSS and JS inlined, no external requests except Google Fonts.

```bash
python3 build-artifact.py
```

Three things it handles that a naive inliner does not:

- **Encoding.** The artifact host supplies its own `<head>`, so the bundle can't rely
  on one. All non-ASCII is escaped — `&#8377;` in HTML, `\uXXXX` in JS — which is why
  `₹3 Cr` survives rather than arriving as `â‚¹3 Cr`.
- **Weight.** The two MP4s are re-encoded smaller for the bundle (hero 1.5 MB → 376 KB)
  so the single file lands at 2.7 MB instead of ~7 MB after base64.
- **Attribution.** It injects a fixed concept notice stating the page is an independent
  design concept, unaffiliated with Vedic City, with an inactive form.

Published at: https://claude.ai/code/artifact/986e3767-af6d-480f-ae2d-dc90e80d7eec
(private until shared from the page's share menu). Re-run the build and republish the
same path to update that URL.
