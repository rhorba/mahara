---
name: deployment
description: Deployment verification. Trigger on: "deploy", "Vercel", "docker compose up", "release", "production".
---

# Deployment — Mahara

## Vercel + Managed DB Checklist
- [ ] `vercel --prod` passes; worker deployed separately (Railway/Render/container)
- [ ] Managed Postgres (Neon/Supabase) with pgvector enabled + RLS migrations applied
- [ ] TWO DB roles configured: migration owner + RLS-bound app role
- [ ] Env vars set: DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT/SECRET, RESEND_API_KEY, R2_*, PAYMENT_*
- [ ] All routes 200; auth-required routes 401 without session; role-denied routes 403
- [ ] pg-boss worker running (gig.alerts.sweep active, escrow.sweep active)
- [ ] Payment gateway: mock in staging, CMI in production
- [ ] R2 bucket public URL accessible; upload size limit enforced (5MB)

## Self-Host Checklist (Docker Compose)
```bash
git clone <repo> && cd mahara
cp .env.example .env   # fill in AUTH_SECRET, DB passwords, R2 keys
docker compose up -d
docker compose exec web pnpm db:migrate
docker compose exec web pnpm db:seed
```
- [ ] pgvector extension loaded (postgres starts with `shared_preload_libraries=vector`)
- [ ] Worker healthy; gig alert sweep runs nightly
- [ ] HTTPS via Caddy auto-cert

## Sprint End Gate
- [ ] `pnpm build` zero TS errors · `pnpm test` all green · `pnpm lint` clean
- [ ] No hardcoded secrets; gitleaks passes
- [ ] Role isolation tests green
- [ ] Escrow state machine tests green
- [ ] `.env.example` complete
