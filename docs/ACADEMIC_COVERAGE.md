# Academic coverage and viva guide

The examples below are used by the application; they are not standalone teaching snippets. Line numbers can move as code changes, so use the referenced symbol names in the named source files.

| # | Topic | Source | Implementation and demonstration | Verification |
|---|---|---|---|---|
| 1 | LLM API integration | `apps/api/src/providers/ai.ts`, `apps/api/src/server.ts` (`POST /api/ai/explain`) | Selects OpenAI or Gemini from server environment and sends minimal redacted finding data. Explain a finding after configuring a key. | Without a key, endpoint returns 503 and deterministic scanning still works. |
| 2 | Prompt engineering | `apps/api/src/providers/ai.ts` (`buildPrompt`) | Versioned instruction requests beginner language and limits the model to redacted facts. | Inspect the prompt; confirm source content is never included. |
| 3 | Structured outputs | `apps/api/src/providers/ai.ts` (`validateProviderResponse`) | Provider JSON schema modes plus Zod response validation reject malformed responses. | Mock/alter provider output and observe schema/JSON failure in `ai.test.ts`. |
| 4 | Correct HTTP status codes | `apps/api/src/server.ts` | Auth, creation, deletion, upload, AI setup, validation and missing-resource paths use HTTP statuses. | Exercise API using `curl` and inspect status codes in `docs/API.md`. |
| 5 | Middleware | `apps/api/src/server.ts` (`auth`, global error handler) | Helmet, CORS, rate limiting, authentication and centralized error middleware are composed before feature routes. | Request a protected endpoint without a bearer token. |
| 6 | Problem modeling | `apps/api/src/scanner/engine.ts` | Rules model observable weakness patterns; `correlate` models multi-finding risks separately. | Scan one unsafe config and then a config with both relationship prerequisites. |
| 7 | RESTful endpoint design | `apps/api/src/server.ts` | Resource paths are used for users' projects, scans, findings, scenarios and reports. | Follow route table in `docs/API.md`. |
| 8 | Server-side error handling | `apps/api/src/server.ts` (final middleware) | Zod, Multer and unexpected failures become consistent JSON envelopes; unexpected details stay in server logs. | Submit invalid body and malformed/oversized upload. |
| 9 | System design basics | `docs/ARCHITECTURE.md` | One API process with clear scanner, persistence and provider boundaries; PostgreSQL is authoritative. | Explain the diagram and scan persistence ordering. |
| 10 | Environment variables and secrets | `.env.example`, `apps/api/src/config.ts` | Validates runtime settings; provider keys never enter the client bundle. | Start with missing/short JWT secret and observe fail-fast validation. |
| 11 | Git workflow | repository `.gitignore`, Git history | Repository initialized, generated artifacts and `.env` ignored. | `git status --short --branch`; make a feature commit in a normal workflow. |
| 12 | Async API fetching | `apps/web/src/services/api.ts` | Typed `api<T>` wraps fetch, bearer token, JSON envelope and errors. | Observe dashboard and project views load asynchronously from the API. |
| 13 | Client routing | `apps/web/src/App.tsx` (`Routes`, `Guard`) | React Router maps all app views and checks token presence before rendering. Server ownership checks remain authoritative. | Navigate project → scan → finding → risk → compare. |
| 14 | JavaScript async/await | `apps/api/src/server.ts` | Database queries and API route work use async functions and awaited operations. | Follow registration or scan endpoint request flow. |
| 15 | JavaScript closures | `apps/web/src/App.tsx` (`DebouncedInput`) | Search retains timer state inside a debounced setter closure. | Type quickly in finding search and observe delayed filtering. |
| 16 | JavaScript event loop | `apps/web/src/App.tsx` and `apps/web/src/services/api.ts` | React effects schedule fetch promises; microtask promise continuations update state after browser networking callbacks. | In DevTools, log before `api()`, then in `.then()`; synchronous log appears first, resolved continuation later. |
| 17 | JavaScript hoisting | `apps/api/src/server.ts` (`escapeHtml`) | Function declaration is callable in the earlier report route before its textual declaration. | Read report handler and then declaration lower in the module. |
| 18 | Promises vs callbacks | `apps/api/src/server.ts` report download | Prisma/provider work uses promises; HTML report bytes use Node `Readable.pipe` and stream error callback. | Download HTML and trace stream completion/error events. |
| 19 | React component composition | `apps/web/src/App.tsx` | Shared `Shell`, `PageHead`, `Metric`, `FindingRow`, and empty/error components compose feature pages. | Compare how `FindingRow` appears in scan, finding and scenario views. |
| 20 | React `useEffect` | `apps/web/src/App.tsx` | Dashboard, project, scan, and settings views fetch when their route IDs mount/change. | Navigate between scan IDs and inspect request timing. |
| 21 | React `useState` | `apps/web/src/App.tsx` | Local state controls authenticated profile, scan results, loading errors, filters, and AI output. | Change finding status and observe state update after API response. |
| 22 | MongoDB CRUD | `apps/api/src/database/index.ts`, `apps/api/src/server.ts` evidence routes | `insertMany` creates, `find` reads, `findOneAndUpdate` annotates, `deleteMany` compensates/deletes evidence. | Complete a scan, read evidence, annotate a file, then delete its project. |
| 23 | MongoDB schema modeling | `apps/api/src/database/index.ts` (`EvidenceSchema`) | Evidence has required scan/path/hash fields, timestamps, index and unique scan/path constraint. | Inspect schema and Mongo indexes. |
| 24 | PostgreSQL relational schema with PK/FK | `prisma/schema.prisma` | Users/projects/scans/findings/scenarios/reports use PKs, relations, cascade behavior, and indexes. | Generate Prisma client and inspect Prisma Studio. |
| 25 | SQL JOINs | `apps/api/src/modules/projects.repository.ts` (`projectSummaryWithJoin`) | A parameterized `LEFT JOIN` query joins projects, scans, and findings while enforcing owner ID in SQL. | Enable `RUN_DB_TESTS=true` against a disposable migrated database and run API tests; `projects.repository.test.ts` inserts fixtures and checks counts and owner isolation. |

Scan identity and comparison are implemented in `apps/web/src/features/compare.ts`; `compare.test.ts` verifies new, existing, resolved, and reintroduced outcomes and path separator normalization.

## Viva walkthrough

1. Register, create a project, and upload a sanitized Compose YAML containing a published database port plus a sample secret-shaped value.
2. Show the findings and their redacted evidence. Explain that explicit deterministic patterns drive each rule.
3. Open the correlated scenario and point to its two finding IDs. Remove either pattern and rescan to show the relationship disappears.
4. Change a finding status and inspect its remediation history in Prisma Studio.
5. Compare scans, then download JSON and HTML reports.
6. Explain PostgreSQL authority, MongoDB evidence, and compensation on evidence-store failure.
7. Configure an AI provider only if available; show advisory output and explain why it cannot change findings.

## Implementation note

The debounce closure helper is part of the finding search path. Event-loop and Promise/callback examples are described with observable application operations. Keep this guide aligned with source changes when the application evolves.
