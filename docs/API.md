# API outline

All successful JSON APIs use `{ "data": ... }`; failures use `{ "error": { "message": ..., "details": [...] } }`. Protected resources require `Authorization: Bearer <token>`. Ownership is checked in database queries.

| Method and route | Purpose |
|---|---|
| `POST /api/auth/register`, `/login` | Create account or start session |
| `GET /api/auth/me` | Read current profile |
| `GET/POST /api/projects` | List or create projects |
| `GET/PATCH/DELETE /api/projects/:projectId` | Project detail and management |
| `POST /api/projects/:projectId/scans` | Multipart field `files`, bounded configuration scan |
| `GET /api/projects/:projectId/scans` | Project history |
| `GET /api/scans/:scanId` | Scan, findings, scenarios and reports |
| `GET /api/scans/:scanId/findings` | Scan findings |
| `GET/PATCH /api/findings/:findingId` | Finding read / status update (`PATCH /status`) |
| `GET /api/scans/:scanId/scenarios`, `GET /api/scenarios/:scenarioId` | Risk relationships |
| `GET/PATCH /api/scans/:scanId/evidence` | Read evidence / annotate a file at `/evidence/:path` |
| `POST /api/ai/explain` | Advisory explanation for `{ "findingId": "..." }` |
| `POST /api/ai/remediate` | Advisory safer alternatives and impact for `{ "findingId": "..." }` |
| `GET/POST /api/scans/:scanId/reports` | List/create JSON or HTML report metadata |
| `GET /api/reports/:reportId`, `/download` | Report metadata or attachment |
| `GET /api/settings` | Provider availability and upload/session settings |
| `PATCH /api/settings/profile` | Update the signed-in user's name or email |

Common statuses: 200 read/update, 201 create, 204 delete, 400 malformed request, 401 missing/invalid login, 404 absent or unowned object, 413 upload too large, 422 unsupported/invalid configuration, 429 rate limited, 500 unexpected failure, 503 AI key missing.
