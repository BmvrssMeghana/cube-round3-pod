---
name: Canary Grotesk High-Contrast System
colors:
  surface: '#0f0f00'
  surface-dim: '#0f0f00'
  surface-bright: '#2d2e00'
  surface-container-lowest: '#000000'
  surface-container-low: '#141400'
  surface-container: '#1a1b00'
  surface-container-high: '#202100'
  surface-container-highest: '#272800'
  on-surface: '#fdfdb9'
  on-surface-variant: '#aeaf71'
  inverse-surface: '#fdfdb9'
  inverse-on-surface: '#575824'
  outline: '#777841'
  outline-variant: '#494a18'
  surface-tint: '#fff2aa'
  primary: '#fff2aa'
  primary-dim: '#eed600'
  on-primary: '#665b00'
  primary-container: '#fee400'
  on-primary-container: '#5c5200'
  inverse-primary: '#6b5f00'
  secondary: '#e6ea5a'
  secondary-dim: '#d8db4d'
  on-secondary: '#535500'
  secondary-container: '#606200'
  on-secondary-container: '#fcff75'
  tertiary: '#e1ff9e'
  tertiary-dim: '#bee568'
  on-tertiary: '#4a6400'
  tertiary-container: '#ccf474'
  on-tertiary-container: '#435b00'
  error: '#ff7351'
  error-dim: '#d53d18'
  on-error: '#450900'
  error-container: '#b92902'
  on-error-container: '#ffd2c8'
  primary-fixed: '#fee400'
  primary-fixed-dim: '#eed600'
  on-primary-fixed: '#484000'
  on-primary-fixed-variant: '#675c00'
  secondary-fixed: '#e6ea5a'
  secondary-fixed-dim: '#d8db4d'
  on-secondary-fixed: '#414200'
  on-secondary-fixed-variant: '#5d5f00'
  tertiary-fixed: '#ccf474'
  tertiary-fixed-dim: '#bee568'
  on-tertiary-fixed: '#344700'
  on-tertiary-fixed-variant: '#4b6600'
  background: '#0f0f00'
  on-background: '#fdfdb9'
  surface-variant: '#272800'
typography:
  display:
    fontFamily: Manrope
    fontSize: 80px
    fontWeight: '900'
    lineHeight: 84px
    letterSpacing: -0.04em
  display-mobile:
    fontFamily: Manrope
    fontSize: 44px
    fontWeight: '900'
    lineHeight: 48px
    letterSpacing: -0.035em
  headline-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '900'
    lineHeight: 54px
    letterSpacing: -0.035em
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '900'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-md:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '800'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-sm:
    fontFamily: Manrope
    fontSize: 22px
    fontWeight: '800'
    lineHeight: 28px
    letterSpacing: -0.025em
  metric-xl:
    fontFamily: Manrope
    fontSize: 56px
    fontWeight: '900'
    lineHeight: 60px
    letterSpacing: -0.04em
  body-lg:
    fontFamily: Poppins
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Poppins
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-sm:
    fontFamily: Poppins
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  label-mono:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.04em
  badge-caps:
    fontFamily: Manrope
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system delivers an electric, high-contrast, Swiss-modernist aesthetic rooted in unapologetic clarity and conversion focus. It merges heavy grotesque editorial impact with utilitarian digital product architecture. Built for decisive founders and performance-driven businesses, the personality is bold, authoritative, kinetic, and razor-sharp.

The mood combines the mechanical certainty of mid-century European typography with the relentless energy of high-voltage electric yellow (`#fee400`) set against deep olive-tinted neutral tones (`#797a42`). Visual noise, skeuomorphic gradients, and decorative fluff are eliminated in favor of structural clarity, confident type hierarchy, modular card containers, and hyper-legible metrics.

## Colors

The color palette centers around an aggressive tension between chromatic brilliance and vibrant dark foundations.

- **Primary Electric Yellow (`#fee400`):** The kinetic core. Used for full-bleed hero blocks, active category tiles, primary CTA pills, highlight underlines, and high-impact key performance indicators. Text placed on this color is strictly contrasting for uncompromising legibility.
- **Deep Neutral Canvas (`#797a42`):** The foundational dark base, providing a unique chromatic undertone that anchors background surfaces.
- **Card Charcoal & Accents:** Secondary (`#999c03`) and Tertiary (`#618206`) accents provide robust structural differentiation for modules, feature blocks, and secondary states.

## Typography

Typography establishes immediate hierarchy through strict typographic scale and severe weight contrasts, utilizing Manrope for headlines and labels with Poppins for readable body text.

- **Display & Headings:** Set in ultra-heavy weights (`font-weight: 800-900`) with tight tracking (`-0.03em` to `-0.04em`). Headings command the viewport, frequently rendered in uppercase or deliberate lowercase blocks that mimic architectural signage. Key conceptual words within headlines use inline underline treatments or reverse-color pill highlights.
- **Body & Interface:** Clean geometric neutrality using medium and regular cuts of Poppins. Text line heights are calibrated for rapid scannability against dark surfaces, preventing reader fatigue.
- **Technical & Metric Layer:** Numeric counters and data points utilize tight tabular numerals (`font-feature-settings: 'tnum' on, 'zero' on`). Timestamps, index markers (e.g., `01`, `CHAPTER 02`), platform tags, and architecture references leverage the Manrope font family for mechanical precision.

## Layout & Spacing

The layout philosophy follows a precise modular grid system built upon multi-column divisional blocks (1, 2, 4, 6, or 12 columns). Modules sit cleanly side-by-side with crisp geometric gaps.

- **Outer Margins:** 2rem (32px) on desktop, scaling to 1rem (16px) on mobile viewports.
- **Section Breaks:** Generous macro-spacing (80px to 140px vertical rhythm) isolates distinct structural chapters (e.g., case studies, deliverables, technical tiers).
- **Responsive Adaptations:**
  - **Desktop (≥ 1024px):** Strict multi-column cards, sticky index bars, asymmetric split-screen feature locks (e.g., solid yellow left-block alongside charcoal telemetry cards).
  - **Tablet (768px – 1023px):** 2-column uniform cards; gutters compress to 1rem.
  - **Mobile (< 768px):** Stacks down to a single-column sequence. Metrics switch from horizontal lockups to stacked 2x2 grids. Sticky navigation collapses into a floating bottom pill or top minimalist app-bar.

## Elevation & Depth

Visual hierarchy does not rely on soft, diffuse drop shadows. Depth is achieved via **tonal planar surfaces and high-contrast bounding lines**:

- **Ground Level:** `#797a42` deep background.
- **Structural Card Plane:** `#999c03` with a sharp hairline border.
- **Accented Focus Plane:** Full-bleed `#fee400` card fills or high-contrast white bounding boxes that push selected content forward without any blur-radius blur.
- **Hairline Ghost Borders:** Sub-elements, pill badges, and input elements use low-opacity light strokes to hold shape without competing with the primary content.
- **Zero Ambience:** No drop shadows are permitted on standard cards or dialogs, preserving the stark modernist screenprint quality.

## Shapes

The design system maintains a calculated duality in its shape language:
- **Card Containers & Modules:** Moderately rounded corners (`rounded-lg` at 1rem / 16px, or `rounded-md` at 0.5rem / 8px) ensure a compact, clean industrial boundary.
- **Interactive Controls & Chips:** Fully pill-shaped (`border-radius: 9999px`) for buttons, search tokens, category tags, and sub-navigation links. This contrasts sharp rectilinear grids with smooth interactive touchpoints.
- **Checkboxes & Segment Boxes:** Crisp squares with minimal 4px radii, reinforcing the system's structural discipline.

## Components

### Buttons
- **Primary Action:** Fully rounded pill (`rounded-full`), filled with `#fee400`, containing ultra-bold Manrope text. Hover state shifts slightly toward warm amber with a smooth 150ms micro-scale transition (`scale: 1.02`).
- **Secondary Dark:** Fully rounded pill, surface `#999c03`, text `#ffffff`, hairline border. Hover state brightens background.
- **Text Link CTA:** Inline bold text accompanied by a terminal arrow (`→`), underlined with a persistent 2px `#fee400` rule.

### Chips & Badges
- **Status / Category Pill:** Pill-shaped, minimal height (24px–28px), with `0.75rem` horizontal padding. Typeset in `label-mono` or uppercase `badge-caps`. Inactive state uses semi-transparent dark charcoal with white text; active state inverts to `#fee400` background with text.
- **Number Badges:** Circular or pill-shaped, monospaced tabular numerals indicating index items or count tallies (`01`, `02`, `12 PAGES`).

### Metric Blocks & Cards
- **Stat Module:** Solid `#999c03` card with border. Features massive `metric-xl` typography (`300+`, `4+`, `36`) stacked above uppercase `0.75rem` muted gray label strings.
- **Inverted Hero Block:** High-voltage card drenched in `#fee400` with solid typography and sharp graphical callout arrows in the top-right corner.

### Form Inputs
- **Text Inputs:** Pill-shaped or 12px rounded rects. Dark field background, surrounded by structural borders. Placeholder text in muted tones. On focus, the stroke becomes a crisp `1px solid #fee400` with zero diffuse glow.

### Lists & Navigation Bars
- **Navigation Bar:** Floating dark pill or structured edge-to-edge black bar with hairline bottom border. Features monospaced category tags, high-contrast brand mark, and a terminal yellow action pill.
- **Chapter Index Rows:** Edge-to-edge list dividers featuring monospaced index numbers (`01`, `02`), bold uppercase titles, and right-aligned metadata tags.