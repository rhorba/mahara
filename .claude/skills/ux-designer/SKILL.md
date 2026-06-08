---
name: ux-designer
description: UX flows and wireframes. Mobile-first. Trigger on: "user flow", "wireframe", "UX", "screen design", "navigation", or before new page/feature work.
---

# UX Designer — Mahara

## UX Principles (CLAUDE.md §10)
1. Onboard in under 2 minutes
2. Trust is the product — verification + escrow always visible
3. Morocco-first — local cities, MAD, cultural context
4. No contact before commitment
5. Mobile-first for talent
6. Money is sacred — escrow state always visible
7. RTL is equal

## Landing Page Wireframe
```
┌───────────────────────────────────────────────────────────┐
│  mahara.ma                    [Je suis un talent] [Je recrute] │
│─────────────────────────────────────────────────────────── │
│  Les talents marocains.                                    │
│  À portée de clic.                                         │
│  [Parcourir les missions]  [Publier une mission]           │
│─────────────────────────────────────────────────────────── │
│  13.3% chômage jeunes · 22.7% taux d'activité (HCP 2026)  │
│  5,000 talents · 500 entreprises · 2,400 MAD moy/mois      │
│─────────────────────────────────────────────────────────── │
│  [Design] [Dev] [Marketing] [Data] [Contenu]               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐                   │
│  │ Gig card │ │ Gig card │ │ Gig card │                   │
│  └──────────┘ └──────────┘ └──────────┘                   │
└───────────────────────────────────────────────────────────┘
```

## Talent Onboarding Flow (< 2 minutes)
```
Email + password → Choose role: "Talent" → 
  Name + city (required) → 
  Top 3 skills (tag picker) → 
  Portfolio link (optional) → 
  Profile live ✓ (can add more later)
```

## Gig Application Flow
```
Browse (no auth) → Tap gig → See detail + match score (if logged in) → 
  [Candidater] → 200-char cover note (optional) → Proposal sent ✓
Business: sees proposals ranked by match score → Accepts one → 
  Escrow funded → Messaging unlocked → Work begins
```

## Post-Gig Flow
```
Business marks "Terminé" → Both receive review request → 
  Talent reviews business (1-5 stars + comment) → 
  Business reviews talent (1-5 stars + comment) →
  Escrow releases → Talent payout initiated ✓
```

## Empty States
- No gigs found: "Aucune mission dans cette catégorie. [Voir toutes les missions]"
- No proposals yet: "Soyez parmi les premiers à candidater."
- Business: no gigs posted: "Publiez votre première mission. [+ Publier]"

## Handoff Points
- **→ UI Designer**: wireframes for visual layer
- **→ Frontend Dev**: flows + screen specs
