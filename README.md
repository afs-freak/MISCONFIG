# MISCONFIG

MISCONFIG is a security configuration intelligence platform. Find the weakness. Understand the risk. Fix it before deployment.

The application is a TypeScript modular monolith: React/Vite client, Express API, PostgreSQL source of truth through Prisma, and MongoDB for scan evidence. Deterministic rules scan configuration text without executing uploads. Correlation rules link findings only when all required finding IDs exist in the same scan.

## Requirements

- Node.js 20 or newer and npm 10 or newer
- Docker Desktop (for local PostgreSQL and MongoDB)
- Optional: an OpenAI or Gemini API key for advisory explanations

## Run locally

1. Copy `.env.example` to `.env` with `Copy-Item .env.example .env` and set a unique `JWT_SECRET` with at least 32 characters.
2. Start services: `docker compose up -d`.
3. Install dependencies: `npm install` (the packages live at the repository root so Windows does not need workspace symlink support).
4. Generate Prisma client: `npm run db:generate`.
5. Apply the initial schema: `npm run db:migrate`.
6. Start the client and API: `npm run dev`.
7. Open `http://localhost:5173`. The API listens on `http://localhost:4000`.

Set `OPENAI_API_KEY` or `GEMINI_API_KEY` on the API server and choose `AI_PROVIDER` to enable optional advisory output. Without a provider key, deterministic scanning remains available and the UI explains that AI is not configured.

## Commands

- `npm run dev` — run API and client
- `npm run build` — build shared types, API, and client
- `npm test` — run API engine and client tests
- `npx prisma migrate dev` — apply development migrations
- `npx prisma studio` — inspect relational records
- `docker compose down` — stop local services (data volumes remain)

## Scan behavior and limits

Upload supported config files or a ZIP no larger than the per-file limit. A request accepts at most 25 upload files; ZIPs are limited to 100 entries, depth 8, 20 MB expanded total, and 2 MB per extracted file. Supported files include Dockerfile, YAML, JSON, Nginx config, Terraform/HCL, and `.env.example`. Real `.env` files are rejected. Files are parsed/inspected as text and never executed. Evidence is redacted before persistence; MongoDB stores a SHA-256 digest and redacted observations, not raw source contents.

Rules detect explicit patterns. They are not a substitute for deployment context, network testing, secret rotation, or a full infrastructure review. Correlation rules are deterministic and require every listed rule finding in one scan.

## Persistence strategy

PostgreSQL is authoritative for users, projects, scans, findings, scenarios, remediation history, and report metadata. MongoDB holds flexible per-file evidence. A scan writes relational scan/findings/scenarios first in a transaction, then writes evidence. The API only returns a completed scan after both stores succeed. If the evidence write fails, it removes the Mongo evidence and deletes the PostgreSQL scan tree; the request returns an error. This compensating cleanup is deliberately simple for local deployment. Production deployments should add a durable outbox/reconciliation worker to recover from process termination between the two stores.

## Security notes

Passwords use bcrypt. API resources are scoped by authenticated user on every query. JWT bearer tokens expire after eight hours and the client keeps them in localStorage; use HTTPS, a strict CSP, and consider secure same-site cookies for production. API keys stay on the server. Upload limits, extension checks, YAML/JSON parsing, ZIP path checks, and evidence redaction are enforced on the API. Do not upload real secrets: redaction is best effort and cannot guarantee recognition of every secret format.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/SECURITY.md](docs/SECURITY.md), [docs/API.md](docs/API.md), [docs/ACADEMIC_COVERAGE.md](docs/ACADEMIC_COVERAGE.md), and [docs/VERIFICATION.md](docs/VERIFICATION.md) for the checks actually completed and the local service checks still needed.
