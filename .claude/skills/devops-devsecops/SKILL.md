---
name: devops-devsecops
description: CI/CD, Docker, worker, secrets scanning. Trigger on: "docker", "CI", "GitHub Actions", "worker", "env", "Vercel", "secrets", "gitleaks".
---

# DevOps / DevSecOps — Mahara

## Docker Compose

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: mahara
      POSTGRES_USER: ${POSTGRES_OWNER_USER}
      POSTGRES_PASSWORD: ${POSTGRES_OWNER_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./packages/db/init:/docker-entrypoint-initdb.d
    command: -c 'shared_preload_libraries=vector'    # pgvector

  web:
    build: { context: ., args: { NEXT_OUTPUT: standalone } }
    depends_on: { postgres: { condition: service_healthy } }
    environment:
      DATABASE_URL: ${DATABASE_URL}
      AUTH_SECRET: ${AUTH_SECRET}
      GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}
      GOOGLE_CLIENT_SECRET: ${GOOGLE_CLIENT_SECRET}
      RESEND_API_KEY: ${RESEND_API_KEY}
      R2_ACCESS_KEY: ${R2_ACCESS_KEY}
      R2_SECRET_KEY: ${R2_SECRET_KEY}
      R2_BUCKET: ${R2_BUCKET}
      PAYMENT_GATEWAY: ${PAYMENT_GATEWAY}         # 'mock' | 'cmi'
      CMI_MERCHANT_ID: ${CMI_MERCHANT_ID}
    labels:
      caddy: ${APP_DOMAIN}
      caddy.reverse_proxy: "{{upstreams 3000}}"

  worker:
    build: { context: ., dockerfile: Dockerfile.worker }
    depends_on: { postgres: { condition: service_healthy } }
    environment:
      DATABASE_URL: ${DATABASE_URL}
      RESEND_API_KEY: ${RESEND_API_KEY}

  caddy:
    image: lucaslorentz/caddy-docker-proxy:ci-alpine
    ports: ["80:80", "443:443"]
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - caddy_data:/data

volumes: { postgres_data:, caddy_data: }
```

## .env.example

```bash
# DB — app role (RLS-bound)
DATABASE_URL=postgresql://mahara_app:changeme@localhost:5432/mahara
POSTGRES_OWNER_USER=mahara_owner
POSTGRES_OWNER_PASSWORD=changeme
# Auth
AUTH_SECRET=generate-with-openssl-rand-hex-32
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
# Email
RESEND_API_KEY=re_your_key
EMAIL_FROM=noreply@mahara.ma
# Storage
R2_ACCESS_KEY=your-r2-key
R2_SECRET_KEY=your-r2-secret
R2_BUCKET=mahara-uploads
R2_PUBLIC_URL=https://cdn.mahara.ma
# Payments
PAYMENT_GATEWAY=mock         # change to 'cmi' in production
CMI_MERCHANT_ID=
CMI_SECRET_KEY=
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_DOMAIN=localhost
```

## GitHub Actions CI

```yaml
name: CI
on: [push, pull_request]
jobs:
  ci:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: pgvector/pgvector:pg16
        env: { POSTGRES_PASSWORD: test, POSTGRES_DB: mahara_test }
        ports: ["5432:5432"]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm db:migrate
      - run: pnpm test --coverage
      - run: pnpm build
      - uses: gitleaks/gitleaks-action@v2
```

Note: Use `pgvector/pgvector:pg16` image (not plain postgres:16) so pgvector extension is available in CI.
