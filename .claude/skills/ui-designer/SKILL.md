---
name: ui-designer
description: >
  Visual design, design tokens, green/gold palette, RTL. Trigger on: "design tokens",
  "colors", "typography", "visual design", "CSS variables", "theme", or styling work.
---

# UI Designer — Mahara

## Design Direction
**Concept**: Warm, trustworthy, Moroccan-native. Not cold fintech, not generic freelance beige.
Forest green (trust, growth) + amber gold (craftsmanship, value) on clean white.

## Design Tokens (Tailwind v4 — apps/web/src/app/globals.css)

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&family=DM+Sans:wght@400;500&family=Noto+Kufi+Arabic:wght@400;500;600&display=swap');

@theme {
  --color-primary:      oklch(0.25 0.08 155);   /* deep forest green #1B4332 */
  --color-primary-mid:  oklch(0.38 0.10 155);   /* #2D6A4F */
  --color-primary-fg:   oklch(0.98 0 0);
  --color-accent:       oklch(0.72 0.14 75);    /* amber gold #D4A017 */
  --color-accent-light: oklch(0.82 0.14 80);    /* #F0C040 */
  --color-bg:           oklch(0.99 0 0);
  --color-surface:      oklch(1.00 0 0);
  --color-border:       oklch(0.92 0.005 240);
  --color-foreground:   oklch(0.15 0.02 240);
  --color-muted:        oklch(0.55 0.01 240);
  /* Semantic — escrow/trust status */
  --color-ok:           oklch(0.55 0.15 150);   /* funded/released */
  --color-danger:       oklch(0.52 0.20 25);    /* disputed/urgent */
  --color-warn:         oklch(0.72 0.14 75);    /* pending */
  /* Typography */
  --font-display: "Sora", system-ui, sans-serif;
  --font-body:    "DM Sans", system-ui, sans-serif;
  --font-arabic:  "Noto Kufi Arabic", "Tahoma", sans-serif;
  --radius-card: 0.875rem;
}
```

## Component Specs
- **Match score badge**: pill with color by score range (green/amber/gray), number prominent
- **Talent card**: avatar circle, name, top 3 skill tags, verification badge, star rating, availability dot
- **Gig card**: category color left border, title, company, budget (right-aligned), skills pills, "Urgent" red badge
- **Escrow status**: always visible in gig detail header with state-appropriate color + icon
- **Trust signals**: verification check, "Escrow protected" lock icon, response rate bar

## Mobile-first
All components designed at 375px first. Cards are full-width on mobile, grid on desktop.
CTA buttons are full-width on mobile.

## Handoff Points
- **← UX Designer**: wireframes to apply visual layer
- **→ Frontend Dev / Mobile Dev**: tokens + component class specs
