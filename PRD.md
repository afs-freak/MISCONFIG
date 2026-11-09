# Product Requirements Document (PRD)

## 1. Product Information

**Product Name:** MISCONFIG

**Product Type:** Security Configuration Intelligence Platform

**Document Type:** Product Requirements Document

**Version:** 1.0

## 2. Product Overview

MISCONFIG is a platform designed to help developers and project teams identify potentially insecure configuration settings before deployment.

Users can organize work into projects, upload configuration files, run security scans, review findings, understand related risks, track remediation progress, and generate security reports.

The platform uses deterministic security rules for its primary detection process. Optional AI integration provides additional explanations and remediation advice.

## 3. Problem Statement

Applications and infrastructure depend on configuration files that control security-sensitive behavior.

Misconfigured settings can introduce risks such as:
- Credentials stored directly in configuration files.
- Debug mode enabled in deployment configurations.
- Permissive cross-origin policies.
- Privileged containers.
- Exposed database ports.
- Containers running with unnecessary root privileges.
- Excessive filesystem permissions.

These issues can be difficult to notice during routine development.

MISCONFIG aims to make these configuration risks easier to identify, understand, prioritize, and track.

## 4. Product Goals

1. Identify predefined security misconfiguration patterns.
2. Present findings with severity and file-level location.
3. Explain the potential impact of detected issues.
4. Correlate related findings into broader risk scenarios.
5. Provide practical remediation guidance.
6. Allow users to track remediation progress.
7. Preserve redacted scan evidence for review.
8. Generate downloadable security reports.
9. Provide optional AI-assisted explanations without replacing deterministic detection.

## 5. Target Users

### Primary Users

**Developers**
- Review application and infrastructure configuration.
- Identify insecure settings before deployment.
- Understand how to fix detected issues.

**Students and Learners**
- Learn about common configuration security weaknesses.
- Understand security findings and their impact.
- Practice reviewing remediation recommendations.

**Small Development Teams**
- Organize scans by project.
- Track unresolved security findings.
- Share or retain generated security reports.

## 6. Scope

### 6.1 In Scope

- User registration and authentication.
- Project creation and management.
- Configuration file uploads.
- ZIP archive uploads.
- Deterministic security pattern detection.
- Severity classification.
- File path and line number reporting.
- Redacted evidence storage.
- SHA-256 file hashing.
- Risk scenario correlation.
- Finding status management.
- Remediation history.
- Optional AI explanations and remediation advice.
- JSON and HTML report downloads.
- User profile settings.
- Dashboard statistics.

### 6.2 Out of Scope

The current version does not claim to provide:
- Complete vulnerability detection.
- Dynamic application security testing.
- Network penetration testing.
- Live cloud infrastructure assessment.
- Automatic deployment blocking.
- Automatic modification of uploaded configuration files.
- Guaranteed detection of every possible secret.
- Guaranteed remediation correctness from AI output.

## 7. Functional Requirements

### FR-01: User Registration

The system shall allow users to register with a name, email, and password.

The system shall validate input, normalize email addresses, hash passwords, and reject duplicate email addresses.

### FR-02: User Authentication

The system shall allow registered users to log in using email and password.

The system shall issue an eight-hour JWT after successful authentication and reject invalid or expired tokens.

### FR-03: Project Management

The system shall allow authenticated users to:
- Create projects.
- View their projects.
- Update project details.
- Delete projects.
- View project summaries.

Users must not access projects owned by other users.

### FR-04: Configuration Upload

The system shall accept supported configuration files and ZIP archives.

Supported formats include:
- Dockerfile and .dockerfile.
- YAML and YML.
- JSON.
- CONF and CONFIG.
- Terraform .tf.
- .env.example.

The system shall validate file types, file sizes, archive paths, archive nesting, and supported file contents.

Real .env files are not accepted as supported scan inputs.

### FR-05: Security Scanning

The system shall inspect uploaded configuration files as text.

It shall apply predefined deterministic rules and generate findings containing:
- Rule identifier.
- Finding title.
- Description.
- Severity.
- File path.
- Line number where available.
- Redacted evidence.
- Explanation.
- Remediation guidance.
- Confidence description.

The system shall not execute uploaded files.

### FR-06: Risk Scenario Detection

The system shall identify predefined combinations of findings within a single scan.

A scenario shall be generated only when all its required findings are present.

### FR-07: Evidence Management

The system shall calculate SHA-256 hashes for scanned files.

It shall store redacted evidence and observations in MongoDB and provide authenticated evidence retrieval and review-note updates.

### FR-08: Finding Management

The system shall allow users to:
- View findings.
- View individual finding details.
- Change finding status.
- Add an optional remediation note.

Supported statuses are OPEN, IN_PROGRESS, RESOLVED, and ACCEPTED_RISK.

The system shall maintain a remediation history for status changes.

### FR-09: AI Assistance

When an AI provider is configured, users shall be able to request explanations and remediation advice for existing findings.

The AI response shall be advisory and shall not change the scanner's findings or severity.

If the provider is not configured or unavailable, the system shall return an appropriate error response.

### FR-10: Report Generation

The system shall allow users to create report records in JSON or HTML format.

Users shall be able to download reports containing project information, scan findings, severity, file locations, remediation guidance, and risk scenarios.

### FR-11: Dashboard

The system shall provide an overview of:
- Total projects.
- Total scans.
- Open findings.
- Critical and high-severity findings.
- Risk scenarios.
- Finding severity distribution.
- Recent scans.

### FR-12: Profile and Settings

The system shall provide authenticated access to application settings and allow users to update their profile name and email address.

## 8. Non-Functional Requirements

### NFR-01: Security

- Passwords must be hashed before storage.
- Protected endpoints must require authentication.
- Database queries must enforce user ownership.
- AI API keys must remain server-side.
- Uploaded files must not be executed.
- Evidence must be redacted before persistence.
- Security headers and API rate limiting must be enabled.

### NFR-02: Input Validation

- Request bodies must be validated.
- Upload limits must be enforced.
- ZIP paths must be checked for traversal attempts.
- YAML and JSON syntax must be validated.
- Invalid requests must receive meaningful error responses.

### NFR-03: Data Integrity

- PostgreSQL shall be the authoritative relational data store.
- Findings and risk scenarios shall be persisted transactionally.
- MongoDB evidence shall be linked using scan identifiers.
- Evidence persistence failure shall trigger compensating cleanup.

### NFR-04: Maintainability

- The application shall use TypeScript.
- Application responsibilities shall be organized into logical modules.
- Database access shall use Prisma and Mongoose.
- Environment-specific configuration shall be kept outside source code.

### NFR-05: Usability

- Findings shall display severity and file-level locations.
- Remediation guidance shall be understandable.
- Dashboard information shall provide a clear overview.
- Users shall be able to track finding status.

### NFR-06: Reliability

- Invalid uploads shall be rejected.
- API errors shall use consistent response structures.
- Failed scan persistence shall not be reported as a completed scan.
- Optional AI failures shall not change deterministic scanner results.

## 9. Upload Constraints

| Constraint | Current Limit |
|---|---|
| Uploaded files per request | 25 |
| Individual upload size | Configured by MAX_UPLOAD_MB |
| ZIP entries | 100 |
| ZIP nesting depth | 8 |
| Expanded ZIP size | 20 MB |
| Individual extracted file | 2 MB |
| JSON request body | 1 MB |
| API request rate | 120 requests per minute |

## 10. Severity Classification

| Severity | Meaning |
|---|---|
| CRITICAL | A potentially serious security exposure requiring urgent review |
| HIGH | A significant configuration weakness requiring attention |
| MEDIUM | A security weakness that should be reviewed and corrected |
| LOW | A lower-impact issue |
| INFO | Informational observation |

The severity of a finding is assigned by its matching scanner rule.

## 11. Acceptance Criteria

| ID | Acceptance Criteria |
|---|---|
| AC-01 | A user can register with valid details and log in. |
| AC-02 | Invalid credentials and expired tokens are rejected. |
| AC-03 | A user can create and manage their own projects. |
| AC-04 | Unsupported or invalid uploads are rejected. |
| AC-05 | Supported configuration files can be scanned. |
| AC-06 | Matching security patterns produce findings with file locations. |
| AC-07 | Findings include severity and remediation guidance. |
| AC-08 | Related findings produce the configured risk scenarios. |
| AC-09 | Evidence is stored with SHA-256 hashes and redacted observations. |
| AC-10 | Finding status changes create remediation history. |
| AC-11 | Optional AI advice does not modify deterministic findings. |
| AC-12 | JSON and HTML reports can be downloaded. |
| AC-13 | Users cannot access another user's protected resources. |
| AC-14 | Failed evidence persistence does not result in a completed scan. |

## 12. Success Measures

The product can be evaluated using:
- Correct detection of the implemented security patterns.
- Correct severity assignment for configured rules.
- Correct correlation of predefined risk scenarios.
- Successful validation and rejection of invalid uploads.
- Correct user ownership enforcement.
- Successful evidence persistence and retrieval.
- Successful finding status tracking.
- Successful report generation and download.

## 13. Assumptions and Dependencies

- Users provide supported configuration files.
- PostgreSQL and MongoDB are available for local operation.
- Node.js 20 or newer and npm 10 or newer are installed.
- Docker Desktop is used to run local database services.
- AI assistance requires a valid provider API key.
- Network access is available when using an external AI provider.

## 14. Future Enhancements

Potential future improvements include:
- Additional configuration security rules.
- Deeper format-aware configuration analysis.
- More comprehensive secret detection.
- Background scan processing for larger workloads.
- Durable outbox and reconciliation mechanisms.
- Role-based team access.
- Continuous integration pipeline integration.
- Cloud configuration assessment.
- Improved report customization.
- Additional audit and monitoring capabilities.

## 15. Product Limitations

MISCONFIG is a pattern-based configuration security review tool. Its results depend on implemented detection rules and supported input formats.

It does not replace professional security assessment, deployment testing, network security review, or secret rotation.

AI-generated explanations are advisory and should be reviewed before being used in production decisions.
