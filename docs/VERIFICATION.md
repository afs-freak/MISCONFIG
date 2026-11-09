# Verification record

Run from the repository root after `npm ci`.

## Completed in this workspace

- `npm ci --no-audit --no-fund` — passed; installed 513 packages from the lockfile.
- `npx prisma format` — passed.
- `npx prisma validate` — passed.
- `npm run build` — passed; Prisma client generated, API TypeScript compiled, Vite production build completed.
- `npm test` — passed: 18 tests passed, 2 database integration tests skipped by default.
- Scanner tests cover explicit findings, credential redaction, comments, and positive/negative correlation requirements.
- HTTP tests cover health, authentication requirement, malformed request handling, unsupported uploads, absolute ZIP paths, and oversized extracted files.
- AI adapter tests validate mocked provider responses and reject invalid structured output.
- Frontend tests cover API envelopes/errors and new/existing/resolved/reintroduced scan comparisons.

## Blocked by local database services

- `docker compose up -d` — could not start services: Docker CLI could not connect to `dockerDesktopLinuxEngine` (`npipe:////./pipe/dockerDesktopLinuxEngine`).
- `npx prisma migrate deploy` — attempted with the configured local Postgres URL; schema engine could not connect because Postgres was not running.
- MongoDB connection — attempted with a 2-second timeout; both `localhost:27017` IPv6 and IPv4 connections were refused.
- The relational JOIN integration test and MongoDB CRUD integration test therefore remain skipped. Run them against disposable local databases with `RUN_DB_TESTS=true` and `RUN_MONGO_TESTS=true` respectively.

## Not exercised against live external services

- Registration/login and ownership isolation require PostgreSQL.
- Complete scan persistence, cross-database compensation, report downloads, and MongoDB evidence CRUD require both databases.
- Provider requests require an OpenAI or Gemini key. AI schema validation was tested with mocked provider responses; no provider key is included.

These are environment limitations, not passing integration results. Start Docker Desktop (or point `.env` to available PostgreSQL and MongoDB instances), run migrations, then execute the gated integration tests to complete the acceptance checks. In PowerShell, use `$env:RUN_DB_TESTS='true'; npm test` for the SQL test and `$env:RUN_MONGO_TESTS='true'; npm test` for MongoDB CRUD.
