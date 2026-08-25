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

## Brand system

Built to *Vedic City Branding Document 18.11.25*. The guidelines are explicit that
unapproved colours must not appear, so the stylesheet uses only these and shades of them:

| Hue | Hex | Role per the document |
|---|---|---|
| Vedic City Blue | `#ABDEE6` | **primary** — calm, balance, openness; backgrounds, highlights, accents |
| Warm Beige | `#F4EFEB` | neutral base for layouts and backdrops |
| Fresh Pistachio | `#EBE8C5` | supportive backgrounds, secondary highlights |
| Earth Pistachio | `#BEC8AE` | muted variant, secondary layering |
| Structured Brown | `#736357` | typography, outlines, grounding |
| Accent terracotta | `#BE724E` | the fill shown on the document's own hues page |

Type is **Outfit** throughout — the document names it the typeface for digital
applications. Hierarchy comes from weight (200–500), not from a second family.

`#736357` on `#F4EFEB` measures 4.71:1, so Structured Brown carries body text at AA.

**Two notes on the source document.** Page 23 states Structured Brown as `#736357`,
but the swatch beside it and the usage examples on page 25 render a terracotta —
sampled at `#BE724E`. Both are in the stylesheet: the stated hex for typography, as
written, and the sampled terracotta as an accent fill. Worth reconciling in the doc.
The other four hues match their stated values to within a bit.

The logo is never filtered. `assets/vc-logo-{brown,beige,blue}.svg` are recoloured by
`fill`, because the guidelines forbid shadows, gradients, outlines or effects on it.

## Sections

1. **Hero** — the communal-dinner film, muted/looping, with pointer + scroll parallax
2. **Marquee** — the six amenities as a running ribbon
3. **Chapter 03** — the positioning statement
4. **Amenities** — six cards, line icons that draw themselves in on entry
5. **Soulful Village Retreat** — the NA-approval badge and the fact table
6. **Master Plan** — the real GRAAMA blueprint render, with an interactive overlay.
   17 traced units — ten residential blocks plus the Park, Water Park, Clubhouse,
   High Street Retail, entry gate and both plazas. Hovering a unit (on the plan or in the
   side list) dims the rest, washes it in Vedic City Blue, traces its outline on and
   opens an info card with the plot count, size range and plot numbers.
   Zoom with + / &minus; or double-click, then drag to pan; every plot number and area is
   printed on the plan itself. Block polygons in `js/plan-units.js` are fitted to the
   plot labels detected in the render, so they sit on the real block boundaries;
   amenity zones are anchored to their text coordinates from the source PDF.
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

## Live

- **GitHub Pages** — https://bewdoo.github.io/graama-site/ (this repo, `main` branch, root)
- **Artifact** — https://claude.ai/code/artifact/986e3767-af6d-480f-ae2d-dc90e80d7eec (private until shared)

Pages redeploys on every push to `main`; it takes about a minute.

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
## The concept notice

Every published copy carries a fixed bar reading *"Independent design concept. Not
affiliated with, authorised by, or endorsed by Vedic City."* It lives in the source
(`.concept-note` in `index.html`, section 24 of `styles.css`), not in the build step,
so it cannot go missing from one deployment target and not another.

The page uses Vedic City's name, mark, photography and real phone numbers. On a public,
indexable URL that would otherwise read as their official site rather than as a concept.
If the client signs off on it, removing the `<div class="concept-note">` and the section-24
block is all it takes.
