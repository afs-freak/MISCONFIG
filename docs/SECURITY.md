# Security notes and operational limits

- Enforce TLS at the reverse proxy and set `WEB_ORIGIN` to the exact deployed client origin.
- Generate a unique random `JWT_SECRET` (32+ characters); rotate it to invalidate sessions.
- Keep provider credentials in server environment/secret management. Never add them to client variables.
- Upload only sanitized examples. `.env` is not accepted; `.env.example` is supported. Redaction is heuristic and cannot promise secret detection.
- Uploaded files are never executed. YAML aliases and JSON syntax are bounded/validated. ZIP extraction checks path traversal, entry count, depth and expanded sizes before reading entry data.
- The archive library parses the in-memory ZIP central directory. The compressed upload cap keeps this request bounded, but production should additionally isolate archive parsing and use streaming extraction with decompression-ratio limits.
- The scanner uses explicit textual patterns; it does not resolve aliases, interpolate variables, or evaluate the final deployment environment. Findings require human review.
- JWTs are held in localStorage for this demo. A production deployment should prefer secure, HttpOnly, SameSite cookies, add CSRF protection as appropriate, configure CSP, and review XSS risk.
- AI output is advisory, schema validated, and cannot modify deterministic results. The API sends only rule metadata, redacted evidence, and remediation text.
- For multi-store writes, a failed Mongo insert triggers compensating deletion of the PostgreSQL scan. A hard process crash between writes can still leave an incomplete record; reconcile by checking completed PostgreSQL scans for matching Mongo evidence before production use.
