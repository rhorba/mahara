# Mahara — مهارة

**Les talents marocains. À portée de clic.**
_Morocco's skilled youth. On demand._

Mahara is a two-sided micro-gig marketplace connecting Morocco's 13.3% unemployed youth
with small businesses that need affordable, verified talent — built on HCP 2026 data.

---

## Quick Start (Development)

### Prerequisites
- Node.js >= 20, pnpm >= 9
- Docker + Docker Compose (for Postgres + pgvector)

### 1. Clone & install
```bash
git clone https://github.com/rhorba/mahara.git
cd mahara
pnpm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in: DATABASE_URL, AUTH_SECRET, GOOGLE_CLIENT_ID/SECRET, RESEND_API_KEY
```

### 3. Start Postgres (with pgvector)
```bash
docker compose up -d postgres
```

### 4. Run migrations + seed
```bash
pnpm db:migrate
pnpm db:seed   # loads demo talent + business profiles
```

### 5. Start the dev server
```bash
pnpm dev   # http://localhost:3000
```

**Demo talent:** yasmine@demo.mahara.ma / demo1234
**Demo business:** hassan@demo.mahara.ma / demo1234

---

## Architecture

```
mahara/
├── apps/
│   └── web/             Next.js 15 App Router
│       ├── (public)/    Gig browse + talent profiles (SSR, no auth)
│       ├── (talent)/    Talent dashboard
│       ├── (business)/  Business dashboard
│       └── (admin)/     Admin dashboard
├── packages/
│   ├── core/            Shared types, Money helpers, RBAC
│   ├── db/              Drizzle schema, migrations, RLS, seed
│   ├── matching/        pgvector embeddings + scoring
│   ├── payments/        Escrow state machine + payment adapter
│   ├── notifications/   In-app + Resend email
│   └── verification/    Skill verification workflow
├── docker-compose.yml
└── .env.example
```

Stack: Next.js 15, TypeScript strict, Tailwind v4, Drizzle ORM, PostgreSQL 16 + pgvector + RLS,
Auth.js v5 (Argon2id + Google OAuth), pg-boss, next-intl (FR/AR/EN), Resend, Cloudflare R2

---

## Security Model

- **Role isolation**: RLS scopes every private table to `user_id` or `role=admin`. Talent A structurally cannot read talent B's data.
- **RBAC**: roles (talent/business/admin) enforced server-side from JWT session.
- **Escrow**: DB-level state machine. No money moves without AuditLog in same transaction.
- **Money**: integer centimes (Money branded type). No floats anywhere.
- **No contact before commitment**: messaging locked until proposal accepted.

---

## Key Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start web dev server |
| `pnpm build` | Production build |
| `pnpm test` | Run Vitest suite |
| `pnpm lint` | Biome lint check |
| `pnpm db:generate` | Generate migration |
| `pnpm db:migrate` | Apply migrations |
| `pnpm db:seed` | Load demo data |

---

## Environment Variables

See .env.example. Required:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Postgres URL (app role, RLS-bound) |
| `AUTH_SECRET` | 32-byte random secret |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | Resend email API key |
| `R2_ACCESS_KEY` | Cloudflare R2 access key |
| `R2_SECRET_KEY` | Cloudflare R2 secret key |
| `R2_BUCKET` | R2 bucket name |
| `PAYMENT_GATEWAY` | `mock` (dev) or `cmi` (prod) |

---

v0.1 — Built with Claude Code · Powered by HCP 2026 data
