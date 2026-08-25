# Design System

Single source of truth: `app/brand.css` (~2,070 lines; `globals.css` only
imports it). Tailwind v4 CSS-first — **no tailwind.config.js**. Theme
utilities are exposed via the `@theme` block near the top (maps
`--color-background`, `--color-surface`, … so `bg-surface`,
`text-text-primary` etc. work).

## Direction

"Heritage luxe": warm ivory + antique gold + deep espresso, serif display
headings, layered soft shadows, hairline gold details, subtle film-grain.

## Core tokens (`:root` / `.dark` blocks)

| Token | Light | Dark | Use |
|---|---|---|---|
| `--background` | `#FBF9F6` ivory | `#14100C` warm charcoal | page bg |
| `--surface` | `#FFFFFF` | `#1E1812` | cards |
| `--surface-alt` | `#F4EFE7` | `#292118` | tinted sections/rows |
| `--text-primary` / `--ink` | `#291F17` espresso | `#F7F2EA` | headings/body |
| `--text-secondary` / `--muted` | `#6E635A` | `#B3A797` | secondary text |
| `--border` | `#E6DDD0` | `#39301F` | hairlines |
| `--primary` | `#3E2619` espresso | `#D8B57C` gold | primary buttons / active pills |
| `--accent` / `--accent-hover` | `#AE834D` / `#C29B62` | `#C89A57` / `#E1B86F` | icons, links |
| `--maroon` | `#6E0F1A` | `#B03346` | badges, process numbers |
| `--gold` / `--gold-dark` | `#B9894B` / `#8F6A35` | `#D8B57C` / `#E3C088` | stars, eyebrows, accents |
| `--accent-gradient` | 120° gold gradient | lighter variant | underlines, sheens |
| `--shadow-luxe-sm` / `--shadow-luxe` | layered warm shadows | darker | cards/CTAs |
| `--cream --blush --ivory` | decorative tints | dark equivalents | legacy sections |
| `--radius: 18px` (`rounded-luxury`) | | | buttons/cards |
| `--ease-out-soft/in-soft`, `--motion-fast/base/slow` | motion tokens | | all transitions |

Dark mode = `.dark` class via next-themes (`attribute="class"`), default light.
**Never hardcode hex in TSX** except intentional fixed-dark panels:
espresso panels use `bg-[#241B12]` (+ white/gold text) in BOTH themes — this is
the sanctioned exception (footer, support contact, size-guide CTA, launch
slider, active tabs).

## Signature utility classes (brand.css)

| Class | Where used |
|---|---|
| `.font-display` | Cormorant Garamond headings |
| `.eyebrow` | small-caps gold label above headings (uses `--gold-dark`) |
| `.section-shell` | page width container (`min(100% - 3rem, 84rem)`) |
| `.primary-button` | espresso gradient + **shine sweep** on hover (`::after`); dark mode = gold gradient |
| `.secondary-button` | gilded glass pill |
| `.danger-button` `.whatsapp-button` | destructive / WhatsApp green |
| `.glass-panel` `.premium-card` | frosted card w/ gold border-on-hover lift |
| `.icon-medallion` | 44px gold-ringed icon circle (trust banner, policy cards, review avatars) |
| `.nav-link` | center-out gold underline (desktop navbar) |
| `.status-pill` | admin/order chips |
| `.field`, `.field-label` | inputs (focus ring gold) |
| `.home-hero` + hero-* | homepage hero layers/grid/vignette/poster frame |
| `.runway-grid/.runway-card(-N)` | 5-col 3D runway row |
| `.category-depth-card`, `.category-preview-image(-N)` | category stack cards |
| `.product-card-3d`, `.product-card-float` | PDP-adjacent card hover rig |
| `.closing-cta` | final CTA panel w/ orbit ring |
| `.site-footer` | espresso footer + top gold hairline (`::before`) |
| `.mobile-drawer` | slide-down keyframe for portaled nav drawer |
| `.footer-contact-row`, `.measurement-figure/.dummy-*/.measure-*` | footer rows; size-guide mannequin diagram |
| `[data-reveal]` + `html.js-reveal` | scroll-reveal (IntersectionObserver via `components/ScrollReveal.tsx`) |
| `.animate-fade-up`, `.stagger-children`, `.page-enter`, dialog keyframes | entry animations |
| `body::after` noise SVG overlay | film grain (multiply/overlay) |

## Component conventions

- Section header pattern: `.eyebrow` → `font-display` heading (3xl–6xl) →
  optional rule `<div className="h-px bg-accent/25" />`.
- Buttons keep ALL-CAPS micro-labels (0.72rem, tracking 0.14em).
- Cards: `rounded-2xl`–`[1.75rem]`, `border-border bg-surface`,
  hover `-translate-y` + `border-accent/60` + luxe shadow.
- Espresso dark panels: `bg-[#241B12] text-white`, accents `#D8B57C`
  literals (both themes).
- Reduced motion: global `prefers-reduced-motion` kill-switch at file end.

## Known pitfalls

- Unlayered brand.css rules beat Tailwind utilities — override with `!`
  prefix or edit brand.css instead of fighting specificity.
- `tailwindcss-animate` is NOT installed; classes like `animate-in` are dead.
  Use existing keyframes or add to brand.css.
- Print styles hide `header.fixed/sticky`, `footer.border-t`, and style
  `.print-page` for invoices/packing slips.
