# Indrajit Sasmal — Portfolio

Personal portfolio site for Indrajit Sasmal, Product Designer. Hand-built, single-page
sites with case studies, a physics-based hero animation, custom cursor, and a parallax
footer reveal.

## Structure
- `index.html` — home page (hero, work, about, design principles, footer)
- `my-work.html` — full "designed & delivered" work listing
- `hireflow-ai-case-study.html` — HireFlow case study
- `<slug>.html` — 10 detailed case studies (e.g. `zbrain-one.html`, `fme-cash-app.html`)
- `ui-ux-product.html` — embedded equation animation
- image/asset files all live at the repo root (case-study assets are slug-prefixed, e.g. `fme-cash-app-item-details.png`)

## Running locally
It's static HTML/CSS/JS — just serve the folder:

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

Some effects (scroll restore, clipboard) behave best over http rather than opening the
file directly.

## Deploying (GitHub Pages)
Push to GitHub, then in the repo: Settings → Pages → Source: `main` branch, `/root`.
`index.html` loads automatically at the site root.
