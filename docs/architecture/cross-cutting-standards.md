# Boost Market — Cross-Cutting Architectural Standards

**Document Version:** 1.1.0  
**Status:** Approved Architecture Definition  
**Date:** November 2, 2026 (Updated from October 30, 2026)  
**Scope:** Monorepo-Wide Platform Standards (Applications, Packages, Workspaces)  
**Author & Architectural Governance:** Engineering Architecture Team  

---

## 1. Purpose and Scope

### 1.1 Purpose
This document establishes authoritative, platform-wide engineering standards for cross-cutting technical concerns across Boost Market. Cross-cutting concerns are capabilities, conventions, and constraints that transcend individual business capabilities, packages, and application layers. 

Without explicit cross-cutting standards, autonomous domain services and layered components naturally diverge, leading to fragmented error structures, inconsistent serialization, unmonitored failures, leaky abstractions, insecure data processing, and unpredictable operational behavior. This specification provides unambiguous rules that ensure high cohesion, architectural consistency, operational safety, and system-wide maintainability as the platform scales.

### 1.2 Monorepo Scope
These standards govern all software assets within the Boost Market monorepo:
- **Workspaces:** Bun workspace environment running on Node.js 22 LTS.
- **Frontend Applications:** Active Next.js 15 application (currently hosted at repository root; planned migration destination `apps/web`).
- **Backend Applications:** NestJS backend service and composition root (`apps/api`).
- **Shared Libraries & Packages:** Domain-neutral shared kernel (`packages/shared`), centralized configuration management (`packages/config`), and provider-neutral AI abstractions (`packages/ai`).
- **Future Bounded Contexts:** All future application modules, domain packages, infrastructure adapters, and background job runners.

### 1.3 Target Audience & Engineering Mindset
Every engineer, code reviewer, and AI coding assistant operating within this monorepo must adhere strictly to these standards. The fundamental governing rule of Boost Market applies universally:
$$\text{AI accelerates implementation; it never replaces architectural understanding, system design, or engineering rigor.}$$

---

## 2. Relationship to Existing Architecture Documents

This document complements and builds upon previously approved architecture specifications and Architecture Decision Records (ADRs). It does not duplicate or supersede their foundational definitions, but provides concrete rules for cross-cutting operational concerns:

| Document | Primary Focus | Relationship to Cross-Cutting Standards |
| :--- | :--- | :--- |
| **`docs/standards/DEVELOPMENT_STANDARDS.md`** | Baseline coding standards, TypeScript strictness, naming conventions, and AI anti-degradation rules. | Cross-cutting standards provide deep architectural implementation rules that realize the general principles outlined in the development standards. |
| **`docs/architecture/application-boundaries.md`** | System topology, monorepo workspaces, external integration boundaries, and business capability scoping. | Cross-cutting standards enforce uniform interaction protocols (API schemas, authentication, logging) across these defined boundaries. |
| **`docs/architecture/layered-architecture.md`** | Internal clean architecture layers (Presentation, Application, Domain, Infrastructure) and unidirectional data flow. | Defines how cross-cutting concerns (errors, validation, transactions) are distributed across internal layers without violating layer purity. |
| **`docs/architecture/dependency-direction-rules.md`** | Mathematical dependency rules, inward dependency direction, composition-root wiring, and forbidden imports. | Enforces that cross-cutting utilities (e.g., config, logging, shared kernel) do not introduce circular dependencies or inverted architectural arrows. |
| **`docs/architecture/shared-kernel-boundaries.md`** | Criteria for shared kernel qualification (`packages/shared`), dependency-light governance, and primitive evaluation. | Regulates which cross-cutting primitives (e.g., `Result<T, E>`) belong in the shared kernel versus capability-owned modules. |
| **`docs/adr/ADR-001` to `ADR-005`** | Modular architecture, AI governance, centralized config, testing strategy, and verification pipelines. | Cross-cutting standards operationalize the strategic decisions codified across ADR-001 through ADR-005. |

---

## 3. Error Handling Standards

### 3.1 What the Standard Requires
1. **Layer-Differentiated Error Classification:** Errors are classified into three distinct categories based on origin and semantic responsibility:
   - **Domain Errors:** Business rule violations and invalid state transitions (e.g., `InsufficientCampaignBudgetError`, `CampaignNotEligibleForActivationError`, `InvalidAudienceTargetingError`). These represent anticipated domain outcomes, not system defects.
   - **Application Errors:** Workflow, coordination, authorization, or resource existence failures (e.g., `CampaignNotFoundError`, `UnauthorizedTenantAccessError`, `ConcurrencyConflictError`).
   - **Infrastructure Errors:** Failures in external systems, I/O, networks, databases, or third-party gateways (e.g., `DatabaseConnectionTimeoutError`, `PaystackNetworkError`, `MetaGraphApiRateLimitError`).
2. **Explicit Result Pattern for Anticipated Domain & Application Outcomes:**
   - Anticipated business and application failures must be returned explicitly using the functional `Result<T, E>` primitive (`Result.ok(value)` or `Result.fail(error)`) from `@boost-market/shared`.
   - Function signatures must declare the failure type explicitly, making failure branches impossible for callers to ignore.
3. **Exception Handling for Truly Exceptional Failures:**
   - Throwing JavaScript `Error` objects (or framework-specific exceptions) is restricted to unexpected system failures, invariant corruptions, unrecoverable programmer errors (e.g., null pointers, missing configuration), or infrastructure failures where immediate execution abortion is required.
   - Raw HTTP exceptions (such as NestJS `HttpException`, `BadRequestException`) must never be instantiated or thrown inside the Domain or Application layers.
4. **Boundary Translation via Exception Filters:**
   - The Presentation layer (`apps/api`) owns NestJS global exception filters and use-case execution wrappers that intercept `Result.fail()` outcomes and unhandled exceptions, mapping them deterministically to standardized HTTP error payloads.
5. **Information Sanitization & Leakage Prevention:**
   - Public API error responses must never expose stack traces, database schema details, SQL statements, internal file paths, third-party vendor tokens, or raw upstream JSON errors.
   - Internal diagnostic details are logged on the server alongside a unique `correlationId`. The client receives only a safe, sanitized error message and the `correlationId` for support reference.
6. **Asynchronous & Background Error Handling:**
   - Background jobs, message consumers, and async workers must catch errors within their execution wrapper. Unhandled promise rejections are strictly prohibited.
   - Errors in asynchronous processing must determine retry behavior (transient vs. permanent) and transition jobs to failed or dead-letter states with structured failure metadata.

### 3.2 Why It Matters
Unstructured error handling leads to unhandled promise rejections, inconsistent API responses, server crashes, and critical security vulnerabilities through internal information leakage. Furthermore, throwing raw exceptions across Clean Architecture boundaries entangles pure business logic with transport-specific assumptions (e.g., HTTP status codes in domain entities).

### 3.3 Responsibility Ownership
- **Domain Layer:** Defines typed domain error classes or union types representing business rule failures. Returns `Result.fail()`. Completely unaware of HTTP or transport protocols.
- **Application Layer:** Handles use-case orchestration errors, maps infrastructure adapter failures into application-level `Result` values, and enforces authorization checks.
- **Infrastructure Layer:** Catches raw third-party SDK and database exceptions, wraps them into typed infrastructure errors (e.g., `PaymentGatewayTimeoutException`), and surfaces them to application ports.
- **Presentation Layer (`apps/api`):** Houses global NestJS Exception Filters (`AllExceptionsFilter`, `DomainErrorFilter`) that translate domain/application errors into HTTP status codes and standardized JSON envelopes.

### 3.4 Prohibited Practices
- **Forbidden:** Throwing NestJS `HttpException`, `NotFoundException`, or `@nestjs/common` classes inside `packages/shared`, Domain entities, or Application use cases.
- **Forbidden:** Using empty `catch` blocks (`catch (e) {}`) that swallow errors without logging or propagation.
- **Forbidden:** Returning raw database error strings (e.g., `PrismaClientKnownRequestError`) directly to the API client.
- **Forbidden:** Catching errors as `any` without type narrowing via `instanceof` or custom type guards.
- **Forbidden:** Forcing every module to inherit from a massive, single universal monolithic error enum.

### 3.5 Verification & Compliance
- **Static Analysis & Linting:** ESLint rules (`@typescript-eslint/no-throw-literal`, `no-empty`) and import-boundary linters forbidding `@nestjs/common` in Domain or Application files.
- **Unit Testing:** Tests verify that domain and use-case operations return `Result.fail()` containing expected error types when invalid operations are executed.
- **Integration Testing:** Tests verify that Presentation exception filters correctly map failed `Result` instances to standardized HTTP error envelopes without leaking sensitive properties.

---

## 4. Input Validation and Data Integrity

### 4.1 What the Standard Requires
1. **Multi-Stage Validation Pipeline:** Data validation is executed across distinct architectural boundaries with clear division of responsibility:
   - **Boundary / Presentation Validation (Structural & Syntactic):** Validates payload shapes, data types, string lengths, regex patterns, email formats, and required fields before reaching the application layer. Handled via NestJS `ValidationPipe` with `class-validator` DTOs or Zod schemas.
   - **Application Validation (Contextual & Pre-conditional):** Validates capability-specific prerequisites and permissions (e.g., "Does the requested organization exist?", "Does the user possess the `CAMPAIGN_MANAGER` role?", "Is the campaign ID associated with the caller's tenant?").
   - **Domain Invariant Enforcement (Semantic & Business Rules):** Validates enterprise rules that must remain true across the entire lifecycle of an entity or value object (e.g., "A campaign daily budget cannot be negative", "Campaign end date must be chronologically after start date", "Ad headline must not exceed channel character limits").
2. **Value Object Validation:** Value Objects self-validate upon construction (using static factory methods returning `Result<ValueObject, DomainError>`). Once constructed, a Value Object is guaranteed to be immutable and semantically valid.
3. **External Provider & Webhook Validation:**
   - Inbound webhook payloads (e.g., Paystack, Meta, Google Ads) are treated as completely untrusted input.
   - Before JSON parsing or payload inspection, the raw HTTP request body must be cryptographically verified against the provider's signature header (e.g., HMAC-SHA512).
   - Once verified, the payload must be parsed and strictly validated against a defined schema before dispatching to application command handlers.
4. **Structural vs. Business Rule Validation Separation:**
   - *Structural Validation:* "Is `dailyBudgetInMinorUnits` an integer greater than 0?" $\rightarrow$ Validated at API boundary DTO.
   - *Business Rule Validation:* "Does the merchant's account have an active payment method capable of covering the budget?" $\rightarrow$ Validated in Application use case via domain ports.
   - Business rules must never be duplicated into controller DTO decorators.

### 4.2 Why It Matters
Failing to separate structural validation from business validation causes business logic to leak into controller annotations, leaving domain entities vulnerable to corruption when accessed via alternative entry points (CLI commands, queue workers, internal scripts). Additionally, processing unvalidated webhooks exposes the platform to spoofing and unauthorized credit allocation.

### 4.3 Responsibility Ownership
- **Presentation Layer:** Owns API Data Transfer Objects (DTOs), request body schemas, parameter decorators, and cryptographic webhook signature verification middleware.
- **Application Layer:** Owns Command and Query objects, pre-condition checks, and tenant isolation assertions.
- **Domain Layer:** Owns Entity and Value Object invariant validation within entity methods and Value Object factories.
- **Infrastructure Layer:** Owns raw request stream buffering for cryptographic HMAC verification and database schema constraint declarations (unique indexes, foreign keys).

### 4.4 Prohibited Practices
- **Forbidden:** Allowing unvalidated `req.body` or `any` to pass directly from a controller into an Application use case.
- **Forbidden:** Placing database lookups or network calls inside DTO validation decorators.
- **Forbidden:** Creating domain entities with public mutable setters that bypass invariant checks.
- **Forbidden:** Parsing webhook JSON bodies prior to verifying the raw payload cryptographic signature.

### 4.5 Verification & Compliance
- **API Tests:** Boundary tests submit missing, malformed, out-of-bounds, and malicious JSON bodies to endpoints, asserting strict HTTP 400 Bad Request responses with detailed field-level validation errors.
- **Unit Tests:** Direct unit tests on Value Object factories assert that invalid primitives return `Result.fail()` and never instantiate corrupt objects.
- **Security Tests:** Webhook endpoint tests submit invalid HMAC signatures and tampered payloads, asserting immediate rejection prior to any business processing.

---

## 5. API Contract Standards

### 5.1 What the Standard Requires
1. **Default Uniform Envelope Structure for Applicable JSON API Endpoints:** All standard public REST API JSON responses must follow a consistent, predictable schema distinguishing success from failure:
   - **Success Envelope:**
     ```json
     {
       "success": true,
       "data": { ... },
       "meta": {
         "timestamp": "2026-11-02T20:00:00.000Z",
         "correlationId": "req-8f4b2a1c-9e3d-4c7b-b5a1-0f2e8d7c6b5a"
       }
     }
     ```
   - **Error Envelope:**
     ```json
     {
       "success": false,
       "error": {
         "code": "CAMPAIGN_BUDGET_EXCEEDED",
         "message": "The specified daily budget exceeds your account limit.",
         "details": [
           {
             "field": "dailyBudgetInMinorUnits",
             "issue": "Must not exceed permitted threshold"
           }
         ]
       },
       "meta": {
         "timestamp": "2026-11-02T20:00:00.000Z",
         "correlationId": "req-8f4b2a1c-9e3d-4c7b-b5a1-0f2e8d7c6b5a"
       }
     }
     ```

2. **Documented Exceptions to the Standard Envelope:** The default `{ success, data/error, meta }` envelope applies to standard JSON API endpoints. The following explicit architectural exceptions are authorized:
   - **HTTP 204 No Content Responses:** Endpoints that signal successful completion without returning a payload (e.g., `DELETE /api/v1/campaigns/:id`, logout, or resource dissociations) must return an empty response body in strict compliance with RFC 9110.
   - **Streaming Responses (SSE & Chunked Transfer):** Real-time data streams, Server-Sent Events (SSE), chunked transfer encoding, and WebSocket feeds (e.g., live AI token generation, continuous agent reasoning traces, or live metric streams) emit discrete data frames or token chunks rather than a single terminal JSON envelope.
   - **File Downloads & Binary Streams:** Endpoints serving binary content (e.g., exported CSV campaign analytics, generated PDF receipts, audio/video assets) stream raw byte buffers with appropriate `Content-Type` headers (`text/csv`, `application/pdf`, `image/png`) and `Content-Disposition`.
   - **Inbound Webhook Acknowledgements:** Endpoints acknowledging third-party callbacks (Paystack, Meta Graph API, Google Ads) often require partner-specified minimal payloads (e.g., plain HTTP 200 with an empty body or `{ "status": "success" }`) to satisfy external partner contracts and avoid unnecessary webhook re-deliveries.
   - **Container Orchestrator Probes:** Lightweight container health probes (`/health`) that return minimal payloads to minimize CPU and serialization overhead during frequent orchestrator health checks.

3. **HTTP Status Code Conventions:** HTTP semantics must be strictly observed:
   - `200 OK`: Successful read or synchronous update operation returning a payload.
   - `201 Created`: Successful resource creation (includes `Location` header where appropriate).
   - `202 Accepted`: Asynchronous operation accepted for background processing (e.g., creative video rendering, ad distribution dispatch).
   - `204 No Content`: Successful operation with no response body.
   - `400 Bad Request`: Structural validation failure, malformed JSON, or missing required parameters.
   - `401 Unauthorized`: Authentication missing, expired, or invalid bearer token.
   - `403 Forbidden`: Authenticated caller lacks permission or tenant scope for the requested resource.
   - `404 Not Found`: Target resource does not exist.
   - `409 Conflict`: Concurrency conflict, unique constraint violation, or invalid state transition.
   - `422 Unprocessable Entity`: Syntactically valid request that violates semantic business rules.
   - `429 Too Many Requests`: Rate limit threshold exceeded (includes `Retry-After` header).
   - `500 Internal Server Error`: Unhandled server exception (internal details redacted).

4. **API Versioning Strategy:**
   - All public endpoints must be URI-versioned with the `/api/v1/` prefix.
   - Minor non-breaking additions (e.g., adding an optional response property) occur within the current version.
   - Breaking changes (renaming fields, changing types, altering mandatory parameters) require a new major version prefix (e.g., `/api/v2/`) and a documented deprecation schedule.

5. **Pagination Conventions:**
   - Standard paginated endpoints must support cursor-based pagination for high-volume or append-heavy datasets (e.g., analytics events, ad impressions, audit logs):
     - Parameters: `limit` (integer, max 100, default 20), `cursor` (opaque base64-encoded string).
     - Response `meta`: includes `hasNextPage` (boolean) and `nextCursor` (string or null).
   - Offset pagination (`page`, `pageSize`) is permitted only for low-cardinality, frequently jumped administration listings.

6. **Delineation from Current Implementation:**
   - *Current Reality:* The existing `apps/api` contains only a minimal health check endpoint (`/health`) returning plain JSON `{ status: "ok", timestamp: ..., environment: ... }`.
   - *Future Standard:* All future business endpoints must implement the uniform envelope, versioning, and status-code conventions defined here, respecting the documented exceptions above.

### 5.2 Why It Matters
Inconsistent API responses force frontend engineers and API consumers to write bespoke error-handling code for every endpoint. Predictable status codes, uniform envelopes, and cursor pagination enable robust frontend SDK generation, unified error toasts, and resilient UI state handling. Recognizing explicit exceptions (204, streaming, downloads, webhooks) prevents awkward workarounds that violate RFC standards or break vendor integrations.

### 5.3 Responsibility Ownership
- **Presentation Layer (`apps/api`):** Owns controllers, response interceptors (`TransformInterceptor`), validation pipes, and route decorators defining the public contract.
- **Shared Package (`packages/shared`):** May define the generic TypeScript interfaces for public envelopes (`ApiResponse<T>`, `ApiErrorResponse`, `PaginationMeta`) if adopted across multiple consumer packages.

### 5.4 Prohibited Practices
- **Forbidden:** Returning HTTP 200 OK with `{ error: "something failed" }` inside the body.
- **Forbidden:** Returning arbitrary, un-enveloped raw JSON from standard business endpoints (outside of documented exceptions: 204, streams, binary downloads, webhook acks, health probes).
- **Forbidden:** Returning a response body with an HTTP 204 No Content status code.
- **Forbidden:** Introducing breaking schema changes to existing endpoints without introducing a new version route or deprecation warning.
- **Forbidden:** Hardcoding unconstrained database queries (`SELECT * FROM campaigns`) without pagination limits.

### 5.5 Verification & Compliance
- **Contract & API Integration Tests:** Supertest suites execute requests against controllers, verifying that status codes, envelope schemas, headers, and pagination structures strictly adhere to this specification.
- **OpenAPI / Swagger Generation:** Automated Swagger schema validation in CI ensures all endpoints document their request/response schemas, exceptions, and HTTP error codes.

---

## 6. Logging and Observability

### 6.1 What the Standard Requires
1. **Structured JSON Output:** All production log entries must be emitted as single-line, machine-readable JSON to standard output (`stdout` for info/warn/debug, `stderr` for error).
2. **Mandatory Log Schema:** Every log record must include:
   ```json
   {
     "timestamp": "2026-11-02T20:05:12.345Z",
     "level": "info",
     "message": "Campaign ad set published successfully",
     "context": "AdDistributionService",
     "correlationId": "req-8f4b2a1c-9e3d-4c7b-b5a1-0f2e8d7c6b5a",
     "tenantId": "org-992384",
     "userId": "usr-110293",
     "details": {
       "campaignId": "cmp-55021",
       "platform": "meta",
       "externalAdSetId": "act_882910394"
     }
   }
   ```
3. **Standardized Log Levels:**
   - `error`: Unhandled exceptions, component crashes, database connection loss, failed background jobs that exceeded retry limits, or financial reconciliation discrepancies.
   - `warn`: Recoverable operational anomalies (e.g., third-party rate limit approached, transient database retry triggered, deprecated API version invoked).
   - `info`: Milestone business and lifecycle events (e.g., application startup, user authentication, campaign status transition, payment captured).
   - `debug`: Diagnostic tracing details, cache hits/misses, detailed payload flow (enabled only in development and staging environments).
4. **Correlation & Request Tracking (`correlationId`):**
   - Every inbound HTTP request is assigned a unique `correlationId` (from the incoming `X-Correlation-ID` header if valid, or generated as a UUIDv4 by NestJS middleware).
   - The `correlationId` must be propagated across asynchronous execution contexts (via Node.js `AsyncLocalStorage`), outbound HTTP adapter calls, and message queue payloads.
5. **Strict Data Redaction Mandate (What Must NEVER Appear in Logs):**
   - **Absolute Redaction:** Passwords, password hashes, JWT secrets, encryption keys, and third-party API secret keys (`PAYSTACK_SECRET_KEY`, `META_ACCESS_TOKEN`, `GEMINI_API_KEY`).
   - **Financial Data:** Credit/debit card numbers (PAN), CVVs, bank account PINs, BVN, or customer banking login credentials.
   - **PII Protection:** Plaintext National Identification Numbers, unmasked phone numbers, or unmasked email addresses in non-debug production logs.
6. **Separation of Observability Pillars:**
   - **Logs:** Discrete, high-cardinality records of events with full context.
   - **Metrics:** Aggregated numeric time-series data (counter, gauge, histogram) tracking request rates, error rates, p95/p99 latency, and queue lag.
   - **Tracing:** Distributed request flow tracking across microservices, databases, and third-party gateways (planned OpenTelemetry spans).
7. **Current Implementation vs. Future Observability:**
   - *Current Reality:* Standard Node.js console logging without structured JSON formatters.
   - *Future Work:* Introduce a centralized, performant logger adapter (e.g., Pino) implementing the NestJS `LoggerService`, integrated with correlation ID middleware and OpenTelemetry collectors.

### 6.2 Why It Matters
Unstructured text logs are impossible to search, filter, or aggregate in modern log analytics platforms (Datadog, Elastic, CloudWatch). Redacting secrets protects user privacy and prevents catastrophic security breaches from log ingestion compromises. Correlation IDs allow engineers to trace a distributed failure across web frontend, API host, background worker, and external webhooks within seconds.

### 6.3 Responsibility Ownership
- **Infrastructure Layer (`apps/api`):** Configures the structured logger implementation, HTTP correlation middleware, and log masking interceptors.
- **Application Layer:** Logs business milestone transitions and catches use-case execution failures, attaching relevant business IDs (`campaignId`, `tenantId`).
- **Domain Layer:** Pure domain logic does not perform logging directly. Domain events capture occurrences, which are subsequently logged by application event handlers.

### 6.4 Prohibited Practices
- **Forbidden:** Using raw `console.log()` or `console.error()` directly in production application code.
- **Forbidden:** Logging full `req.body` or `req.headers` objects without passing through a sanitization/redaction mask.
- **Forbidden:** Logging credit card data, bank details, or bearer authorization tokens under any circumstances.
- **Forbidden:** Silent error handling without logging the failure context and stack trace at the `error` level.

### 6.5 Verification & Compliance
- **Automated Masking Tests:** Unit tests verify that logger interceptors automatically mask fields named `password`, `token`, `secret`, `authorization`, `creditCard`, and `apiKey`.
- **Log Linting:** CI lint rules detect and flag raw `console.log()` statements in `apps/api/src` and package code.

---

## 7. Security Standards

### 7.1 What the Standard Requires
1. **Authentication, Tokens, and Session Architecture:**
   - **Stateless Access Tokens vs. Stateful Session Governance:** JWT access tokens *may* be stateless to enable low-latency, decentralized authorization checks across services without requiring database lookups on every request. However, the architecture must **not** require every authentication or session mechanism to be strictly stateless.
   - **Refresh Token Rotation & Revocation:** Refresh tokens must be evaluated as stateful entities. Rotating refresh tokens on every issuance, tracking refresh token families, and maintaining database/Redis records allows immediate detection of token reuse, fraud prevention, and selective session invalidation.
   - **Revocation & Logout Strategy:** Because purely stateless JWT access tokens cannot be revoked before their expiration without an external mechanism, systems must evaluate explicit revocation and session management strategies:
     - Keeping access token lifespans very short (e.g., 5 to 15 minutes).
     - Maintaining a high-speed distributed revocation blocklist (e.g., Redis-backed revocation with TTL matching token expiry) for revoked tokens.
     - Utilizing user session version counters (e.g., `tokenVersion` on the User entity) to invalidate all issued tokens instantly upon password change or account compromise.
   - **Active Session Management:** Business capabilities requiring active device tracking, concurrent session caps, or administrator-initiated session termination require stateful session records. The architectural model must accommodate a hybrid design: stateless short-lived access tokens combined with stateful refresh/session management.
2. **Authorization & Least Privilege (RBAC + Tenant Isolation):**
   - Authorization is enforced authoritatively on the backend via NestJS Guards (`JwtAuthGuard`, `RolesGuard`, `TenantGuard`).
   - Multi-tenant data isolation is mandatory: every database query for merchant data must be explicitly scoped by `tenantId` (or `organizationId`). A user can never access or mutate data belonging to another tenant.
3. **Injection Prevention & Input Sanitization:**
   - **SQL Injection:** Prohibited through mandatory use of Prisma ORM parameterized queries. Raw SQL (`$queryRaw`) is restricted to optimized analytical queries and must use tagged template literals for safe parameterization.
   - **Cross-Site Scripting (XSS):** React/Next.js default JSX output escaping is enforced. User-supplied HTML (e.g., ad body previews) must be sanitized via DOMPurify before rendering if rich text is permitted.
   - **HTTP Headers & CORS:** Helmet middleware must configure secure HTTP response headers (Content-Security-Policy, X-Frame-Options: DENY, X-Content-Type-Options: nosniff). CORS is locked strictly to approved frontend origins.
4. **Secure Password Handling:**
   - Passwords must be hashed using Argon2id or bcrypt with an adaptive work factor (minimum 12 rounds for bcrypt).
   - Plaintext passwords must never be stored, logged, transmitted over unencrypted channels, or retained in memory longer than necessary for verification.
5. **Secret Management:**
   - Production secrets are provisioned via cloud secret managers (Google Secret Manager, AWS Secrets Manager) and injected as environment variables at runtime.
   - Client-accessible variables must carry the explicit `NEXT_PUBLIC_` prefix. Server-side secrets must never be prefixed with `NEXT_PUBLIC_`.
6. **Secure File Uploads (Creative Assets):**
   - User-uploaded files (images, videos for ad generation) must undergo multi-factor validation:
     - Extension whitelist (`.jpg`, `.png`, `.mp4`).
     - Content-Type / MIME type verification.
     - Magic-byte inspection (verifying actual file binary header).
     - Strict size limits enforced at gateway (e.g., max 10MB for images, 100MB for video).
   - Uploads are transferred directly to private Cloud Object Storage (GCS/S3) using pre-signed, short-lived upload URLs. Files are never stored on or executed from the API container filesystem.
7. **Rate Limiting & Abuse Prevention:**
   - Rate limiting is enforced at the Presentation layer (NestJS `ThrottlerModule` backed by memory in dev, Redis in production).
   - Tiered limits applied by IP for unauthenticated routes (e.g., login, password reset: 5 requests/minute) and by `tenantId` for authenticated API endpoints (e.g., 100 requests/minute).
8. **Cryptographic Webhook Verification:**
   - Inbound webhooks from payment gateways (Paystack) or ad platforms (Meta, Google) must verify HMAC signatures against configured webhook secrets before processing.
9. **Architectural Non-Compliance Notice:**
   - *Explicit Declaration:* Boost Market does not claim formal compliance with external certifications (such as PCI-DSS, SOC 2, HIPAA, or ISO 27001) at this stage. Security standards are implemented as foundational engineering defenses to protect merchant data and business integrity.

### 7.2 Why It Matters
A security breach in an agentic advertising platform can lead to unauthorized ad spend, stolen merchant funds, data extortion, and catastrophic loss of business trust. Strong tenant isolation guarantees that data leaks between competitors cannot occur even in the event of software bugs. Balancing stateless token validation with stateful session governance ensures performance without sacrificing the ability to terminate compromised sessions.

### 7.3 Responsibility Ownership
- **Presentation Layer:** Enforces authentication guards, tenant scoping extraction, rate limiting, CORS, Helmet headers, and webhook signature verification.
- **Application Layer:** Validates authorization permissions (can this user role perform this use case?) and passes `tenantId` to repository queries.
- **Infrastructure Layer:** Implements password hashing utilities, cryptographic signature validators, object storage adapters, session stores, and parameterized database queries.

### 7.4 Prohibited Practices
- **Forbidden:** Storing plaintext passwords, API keys, or JWT tokens in source code or repositories.
- **Forbidden:** Relying on indefinite, unrevocable long-lived stateless access tokens without an evaluated revocation or session management strategy.
- **Forbidden:** Querying tenant data without an explicit `where: { tenantId }` constraint.
- **Forbidden:** Concatenating unescaped user input into raw SQL strings.
- **Forbidden:** Permitting file uploads without binary magic-byte verification.
- **Forbidden:** Trusting client-supplied user roles or permissions without validating the cryptographic signature of the JWT on the server.

### 7.5 Verification & Compliance
- **Security Unit & Integration Tests:** Test suites attempt cross-tenant data access, verifying that requests with mismatched `tenantId` return HTTP 403 Forbidden.
- **Revocation Tests:** Tests verify that revoked refresh tokens or incremented `tokenVersion` values immediately reject subsequent requests.
- **Dependency Vulnerability Scanning:** CI audits all packages using `bun pm audit` or automated vulnerability scanners.
- **Penetration & Invariant Testing:** Automated tests verify that SQL injection payloads, XSS strings, and invalid HMAC signatures are safely rejected.

---

## 8. Configuration and Environment Management

### 8.1 What the Standard Requires
1. **Naming Conventions & Schema Grouping:**
   - Environment variables must use `UPPER_SNAKE_CASE` with clear domain prefixes:
     - `APP_`: Core application runtime configuration (`APP_ENV`, `APP_PORT`).
     - `DATABASE_`: Database connection parameters (`DATABASE_URL`, `DATABASE_MAX_CONNECTIONS`).
     - `REDIS_`: Cache and message broker connection (`REDIS_URL`).
     - `JWT_`: Authentication secrets and token lifespans (`JWT_ACCESS_SECRET`, `JWT_EXPIRES_IN`).
     - `PAYSTACK_`: Payment provider configuration (`PAYSTACK_SECRET_KEY`, `PAYSTACK_WEBHOOK_SECRET`).
     - `AI_`: LLM and agent provider credentials (`AI_GEMINI_API_KEY`, `AI_DEFAULT_MODEL`).
2. **Fail-Fast Startup Validation:**
   - Applications must validate all required environment variables at process initialization before opening network ports or accepting traffic.
   - As established in ADR-003 and implemented in `packages/config`, validation is performed via pure schema validators (using Zod) returning `Result<ServerConfig, ConfigValidationError>`.
   - If configuration validation fails, the application must log the exact missing/invalid variable names (without printing values) and terminate immediately with exit code 1.
3. **Environment Separation & Parity:**
   - The platform defines four discrete runtime environments (`Environment` type in `packages/shared`):
     - `development`: Local developer machines with local mocks and verbose logging.
     - `test`: Isolated in-memory or ephemeral test harness with deterministic seeds.
     - `staging`: Production-like environment connected to provider sandboxes (Paystack test mode, Meta test accounts).
     - `production`: Fully secured, horizontally scaled production infrastructure with real financial spend.
4. **Safe Defaults vs. Mandatory Secrets:**
   - Safe defaults are permitted exclusively for non-sensitive local development settings (e.g., `APP_PORT=4000`, `APP_ENV=development`).
   - Production secrets (`DATABASE_URL`, `JWT_ACCESS_SECRET`, third-party keys) must NEVER have fallback default values in code. Missing production secrets must trigger immediate startup termination.
5. **Architectural Access Boundaries:**
   - Direct access to `process.env` is strictly prohibited within Domain entities, Application use cases, and `packages/shared`.
   - `apps/api` access configuration exclusively through the injected, strongly-typed `ApiConfigService` provided by `packages/config`.
   - Frontend components access client configuration exclusively via the typed `PublicConfig` contract.

### 8.2 Why It Matters
Relying on unvalidated `process.env` lookups causes runtime crashes deep within application execution when an expected variable is missing. It also introduces severe security vulnerabilities where server secrets are inadvertently exposed to frontend client bundles.

### 8.3 Responsibility Ownership
- **`packages/config`:** Owns the single source of truth for configuration schemas, Zod validation logic, and strongly typed configuration interfaces (`ServerConfig`, `PublicConfig`).
- **`apps/api` Composition Root:** Invokes configuration validation during bootstrap (`main.ts`), binding the validated configuration into NestJS dependency injection.
- **Presentation, Application, Domain:** Consumes configuration exclusively via injected interfaces; zero direct environment coupling.

### 8.4 Prohibited Practices
- **Forbidden:** Accessing `process.env[KEY]` directly inside Domain entities, use cases, or shared libraries.
- **Forbidden:** Providing default fallback strings for production passwords, private keys, or API secrets.
- **Forbidden:** Committing `.env`, `.env.local`, or any file containing active credentials to version control.
- **Forbidden:** Exposing server-side secrets to the client application by omitting the server boundary check.

### 8.5 Verification & Compliance
- **Startup Integration Tests:** Test suites execute `ApiConfigService` with missing and malformed environment dictionaries, verifying that validation halts initialization with precise error diagnostics.
- **Lint Rules:** ESLint rules flag any usage of `process.env` outside of `packages/config/src` and application composition root entry points.

---

## 9. Database and Transaction Standards

### 9.1 What the Standard Requires
1. **Single-Database ACID Transaction Boundaries:**
   - Relational database transactions (managed via Prisma in PostgreSQL) are restricted strictly to local database persistence within the Infrastructure layer.
   - Transactions must be kept as short-lived as possible to prevent table locking, thread pool exhaustion, and connection starvation.
   - Long-running operations, file uploads, image transformations, and network I/O must NEVER occur inside an active database transaction.
2. **Repository Responsibilities & Aggregate Hydration:**
   - Repositories encapsulate all database access and ORM mapping.
   - Repositories retrieve raw database records and hydrate them into rich Domain Aggregates, enforcing encapsulation.
   - Application use cases interact solely with Domain Aggregates via Repository interfaces (outbound ports).
3. **Database Migration Principles:**
   - All schema changes must be versioned, immutable, and applied via Prisma Migrate (`prisma migrate dev` / `prisma migrate deploy`).
   - Migrations must be forward-compatible and adhere to the **Expand and Contract** pattern for zero-downtime deployments:
     1. *Expand:* Add new columns/tables as nullable or with defaults without removing old columns.
     2. *Migrate Code:* Deploy application code that writes to both columns and reads from the new column.
     3. *Contract:* Remove the old column in a subsequent migration after all services are updated.
   - Destructive migrations (dropping tables, renaming columns in place) in production without prior data deprecation are prohibited.
4. **Idempotency & Concurrent Mutation Control:**
   - Mutating API endpoints and background handlers must accept an `idempotencyKey`.
   - Idempotency records are checked and locked inside the database transaction to prevent double-charging or duplicate resource creation.
   - Optimistic concurrency control (via version numbers or updated timestamps) must be utilized on aggregate roots to detect and reject conflicting concurrent writes.
5. **Handling of External Side Effects (The Distributed Fallacy):**
   - **CRITICAL ARCHITECTURAL PRINCIPLE:**
     $$\text{A local database transaction CANNOT make an external API call or message broker publish atomic.}$$
   - PostgreSQL cannot roll back a completed charge on Paystack or an ad campaign published to Meta Graph API if a subsequent database statement fails.
   - Therefore, coordinating external operations, database state, and background jobs requires:
     - **Explicit State Machines:** Campaigns and payments must have granular states (e.g., `PAYMENT_PENDING`, `PAYMENT_AUTHORIZED`, `PROVISIONING_FAILED`, `ACTIVE`).
     - **Transactional Outbox Pattern:** Outbound domain events, job dispatches, and external synchronization requests are written to an `outbox_events` table *within the same local database transaction* that updates domain state.
     - **Independent Outbox Relay:** A dedicated worker process reads outbox records and publishes them to the message broker/external provider with retry guarantees.
     - **Clarification:** The Transactional Outbox pattern guarantees *at-least-once message delivery* to brokers; it **does NOT make external HTTP calls atomic**.
     - **Reconciliation & Compensation:** Automated reconciliation cron jobs poll or reconcile state with external providers, executing compensating actions (e.g., refunding a charge, canceling an orphan ad set) if downstream processing fails permanently.

### 9.2 Why It Matters
Wrapping external network calls in database transactions causes connection pool exhaustion, leading to cascading service outages under load. Assuming distributed atomicity without idempotency, outbox publication, and reconciliation inevitably produces financial corruption, phantom charges, and orphaned advertising spend.

### 9.3 Responsibility Ownership
- **Infrastructure Layer:** Owns Prisma client instantiation, database transaction management, repository implementations, migration files, and outbox table persistence.
- **Application Layer:** Owns unit-of-work coordination, transactional boundaries around use cases, and outbox event dispatch.
- **Domain Layer:** Pure aggregate logic; completely unaware of transactions, Prisma, SQL, or outbox tables.

### 9.4 Prohibited Practices
- **Forbidden:** Executing an `await externalApi.charge()` call inside a `prisma.$transaction()` callback.
- **Forbidden:** Assuming that an external API call succeeded because the database transaction committed, or vice versa.
- **Forbidden:** Executing direct, untracked raw SQL schema modifications outside of the Prisma migration pipeline.
- **Forbidden:** Exposing Prisma database models directly to Presentation controllers or UI components.

### 9.5 Verification & Compliance
- **Transaction Audit Tests:** Integration tests verify that network mock delays inside repository methods do not hold open active database connections.
- **Failure Injection Tests:** Tests simulate network failures immediately following payment capture, asserting that reconciliation workers detect the discrepancy and transition the aggregate to an explicit recovery state.

---

## 10. Asynchronous Processing Standards

### 10.1 What the Standard Requires
1. **Initiation via Transactional Outbox or Message Publishing:**
   - Asynchronous background tasks (e.g., AI creative generation, ad campaign distribution, video rendering, analytics rollup) must be initiated asynchronously.
   - Operations that originate from user mutations must be enqueued via the Transactional Outbox table or published via domain event handlers, keeping user HTTP response times below 250ms.
2. **Separation of Business Logic and Queue Infrastructure:**
   - Application use cases decide *what* work needs to be performed by emitting domain events or application commands.
   - Queue infrastructure (e.g., BullMQ workers backed by Redis) is an infrastructure adapter responsible only for job transport, serialization, retry timing, and rate limiting.
   - Job processors must do nothing more than parse job data and invoke an Application use case.
3. **Mandatory Idempotency of Job Handlers:**
   - Every background job handler must be idempotent: executing the job multiple times with identical data must yield the identical outcome without duplicate side effects.
   - Handlers must inspect the target aggregate's current state before executing actions (e.g., "If campaign is already `ACTIVE`, skip publishing").
4. **Retry & Exponential Backoff Strategy:**
   - Failed jobs caused by transient errors (network hiccups, rate limits) must retry using exponential backoff with full randomized jitter:
     $$t_{\text{retry}} = \min(t_{\text{max}}, t_{\text{base}} \times 2^{\text{attempt}}) \pm \text{jitter}$$
   - Randomized jitter prevents the "thundering herd" problem from overwhelming downstream services upon recovery.
5. **Dead-Letter Queue (DLQ) & Permanent Failure Handling:**
   - Jobs that fail repeatedly and exhaust their configured maximum retry attempts (e.g., 5 attempts) must be transferred to a Dead-Letter Queue (DLQ).
   - DLQ transfers must trigger an alert and preserve the full execution failure trace, error payload, and job arguments.
   - Permanent business failures (e.g., "Invalid credit card token") must not be retried infinitely; they must fail fast and transition the job directly to terminal failure.
6. **Job Status & Observability:**
   - Background jobs must be tracked with explicit states: `QUEUED`, `PROCESSING`, `COMPLETED`, `FAILED`, `DEAD_LETTERED`.
   - The originating `correlationId` must be embedded in the job metadata and attached to the worker's execution log context.
7. **Current Reality vs. Target Infrastructure:**
   - *Current Reality:* Neither Redis nor BullMQ queue workers are implemented in the repository today.
   - *Architectural Standard:* When background processing is introduced in subsequent engineering tasks, it must adhere strictly to these outbox, idempotency, retry, and DLQ standards.

### 10.2 Why It Matters
Running long-running tasks (like multi-prompt AI creative generation or multi-channel ad publishing) within synchronous HTTP requests causes gateway timeouts (HTTP 504), frontend freezes, and connection drops. Uncontrolled retries without jitter and dead-letter queues can take down external partners and internal databases.

### 10.3 Responsibility Ownership
- **Infrastructure Layer:** Owns queue provider connection (Redis), worker process hosts, job serialization, and DLQ routing.
- **Application Layer:** Owns the command handler executed by the worker and orchestrates aggregate state updates.
- **Domain Layer:** Models the lifecycle states of the asynchronous entity (`Generating`, `Published`, `Failed`).

### 10.4 Prohibited Practices
- **Forbidden:** Triggering heavy background processing directly within an HTTP request thread without queueing.
- **Forbidden:** Writing non-idempotent job handlers that double-charge or create duplicate ad sets upon retry.
- **Forbidden:** Setting infinite retries without exponential backoff or dead-letter limits.
- **Forbidden:** Silently discarding failed jobs without routing them to a DLQ or recording diagnostic logs.

### 10.5 Verification & Compliance
- **Worker Idempotency Tests:** Integration tests execute a job processor twice consecutively with the identical payload, asserting that external side effects occur exactly once.
- **DLQ Routing Tests:** Tests simulate persistent downstream failures, asserting that jobs are correctly moved to the DLQ after exactly $N$ failed attempts.

---

## 11. External Provider Integration Standards

### 11.1 What the Standard Requires
1. **Outbound Ports & Provider-Neutral Contracts:**
   - External systems (Payment gateways, Meta Graph API, Google Ads API, Gemini AI) must be abstracted behind provider-neutral interfaces (outbound ports) defined and owned by the consuming Application capability (e.g., `IPaymentGateway`, `IAdDistributionChannel`, `IAIProviderContract`).
   - Domain and Application layers must interact strictly with these contracts, remaining completely agnostic of vendor-specific wire formats or SDKs.
2. **Provider Adapters in Infrastructure Layer:**
   - Concrete implementations of outbound ports reside exclusively in the Infrastructure layer (`infrastructure/adapters/*`).
   - Vendor SDKs (such as `@google/genai`, `axios`, or vendor client libraries) must be encapsulated entirely inside their respective infrastructure adapter.
3. **Configurable, Operation-Specific Timeouts & Failure Boundaries:**
   - Outbound HTTP requests must never execute with unbounded or hardcoded monolithic timeouts. Timeouts must be **configurable** (via configuration schemas or options) and tailored to the specific operational profile and provider SLA:
     - **Interactive Operations (Fast User Experience):** Operations requiring immediate user feedback (e.g., balance inquiries, coupon validation) require tight timeouts (illustrative baseline: 3–5 seconds) to fail fast and maintain responsiveness.
     - **Financial & Payment Transactions:** Payment capture and authorization requests require timeouts aligned with provider SLAs and idempotency requirements (illustrative baseline: 5–10 seconds).
     - **Diverse AI Operations:** AI operations vary fundamentally by workload; applying a single universal timeout is strictly prohibited:
       - *Streaming LLM Completions:* Fast time-to-first-token timeout (illustrative baseline: 5–10 seconds), paired with an open stream-completion window as long as tokens arrive continuously.
       - *Single-Turn Text Prompt Generation:* Moderate timeout (illustrative baseline: 15–30 seconds).
       - *Multimodal Asset Generation (Images, Audio, Video Rendering):* Heavy computational tasks that can take 30 to 120+ seconds. Rather than holding open synchronous HTTP sockets, these operations should utilize asynchronous polling, provider webhooks, or background queue jobs.
       - *Agentic Multi-Step Reasoning:* Multi-turn workflows requiring milestone checkpoints and background job execution.
   - **Cancellation & Deadline Propagation:** All outbound calls must support cancellation tokens (Node.js `AbortController` / `AbortSignal`). If an incoming client request drops or times out, the cancellation signal must propagate to abort the outbound third-party request, preventing wasted compute and provider token spend.
   - **Coordination with Retries:** Timeout configurations must account for retries with exponential backoff so that cumulative retry delays do not exceed the overarching use-case deadline.
4. **Selective Retry Rules:**
   - Adapters must only retry requests that are safe to retry:
     - **Retryable:** Network timeouts, connection resets, HTTP 502/503/504 Bad Gateway / Service Unavailable, and HTTP 429 Rate Limit (respecting `Retry-After`).
     - **Non-Retryable:** HTTP 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 422 Unprocessable Entity.
   - Retries on mutating operations must supply provider-supported idempotency keys.
5. **Circuit Breakers for External Dependencies:**
   - High-volume external adapters should incorporate a circuit breaker pattern (e.g., Cockatiel / Opossum):
     - When external failure rates exceed 50% over a 30-second window, the circuit opens, failing fast immediately without making network calls.
     - After a cooldown period, the circuit enters half-open state, allowing limited canary requests to verify provider recovery.
6. **Vendor Error Translation:**
   - Adapters must catch vendor-specific exceptions, parse provider error codes, and map them into standardized domain or application `Result` errors:
     - Meta error code `190` (Invalid OAuth Access Token) $\rightarrow$ `AdAccountAuthorizationExpiredError`.
     - Paystack status `"insufficient_funds"` $\rightarrow$ `PaymentDeclinedInsufficientFundsError`.
   - Raw Axios or SDK errors must never escape the adapter boundary into the Application layer.
7. **Safe Parsing of External Responses:**
   - All external API responses are treated as untrusted data. Adapters must validate response schemas (using Zod or type guards) before returning domain-compliant data structures to the application.

### 11.2 Why It Matters
Coupling business logic directly to external vendor SDKs creates vendor lock-in, makes unit testing impossible without live network access, and leaves the platform vulnerable to cascading failures when an external provider experiences outages or alters their API format. Rigid timeouts either break long-running AI creative tasks or freeze user interfaces during provider degradation.

### 11.3 Responsibility Ownership
- **Application Layer:** Owns the provider-neutral outbound port interfaces.
- **Infrastructure Layer:** Owns the concrete provider adapter, SDK instantiation, network timeouts, circuit breakers, and vendor error mapping.
- **Domain Layer:** Pure business rules; strictly zero knowledge of external providers or SDKs.

### 11.4 Prohibited Practices
- **Forbidden:** Importing vendor SDKs (`@google/genai`, `stripe`, `facebook-nodejs-business-sdk`) inside Domain entities, use cases, or `packages/shared`.
- **Forbidden:** Applying a single rigid, hardcoded timeout constant across all external operations regardless of operational latency or streaming characteristics.
- **Forbidden:** Making outbound network calls without an explicit timeout or cancellation signal.
- **Forbidden:** Letting raw HTTP network errors or third-party status codes bubble up to API controllers.
- **Forbidden:** Implementing production provider integrations without automated test doubles (mocks/stubs) for CI testing.

### 11.5 Verification & Compliance
- **Contract & Adapter Tests:** Integration tests use mock servers (e.g., MSW, Nock) to simulate provider responses, verifying timeouts, circuit breaking, cancellation handling, and accurate error translation.
- **Dependency Linting:** Automated dependency graph analysis confirms that vendor SDKs are only imported inside infrastructure adapter packages.

---

## 12. Money, Currency and Time Standards

### 12.1 What the Standard Requires
1. **Integer Minor Units & Currency-Specific ISO 4217 Rules:**
   - All monetary amounts must be stored, computed, and transferred as **integer minor units** using JavaScript `bigint` or safe integer representation.
   - **Currency-Specific Decimal Precision:** The platform must **not** assume that all currencies have two decimal places. Minor-unit decimal precision is governed strictly by ISO 4217 currency specifications:
     - *Zero Decimal Places (Exponent 0, 1 unit = 1 minor unit):* Currencies such as JPY (Japanese Yen), KRW (South Korean Won), UGX (Ugandan Shilling), and VND (Vietnamese Dong). In JPY, 100 Yen is represented as `100` integer units.
     - *Two Decimal Places (Exponent 2, 1 unit = 100 minor units):* Currencies such as NGN (Nigerian Naira - kobo), USD (US Dollar - cents), EUR (Euro - cents), and GBP (British Pound - pence). In NGN, 100.00 Naira is represented as `10000` kobo.
     - *Three Decimal Places (Exponent 3, 1 unit = 1000 minor units):* Currencies such as BHD (Bahraini Dinar), KWD (Kuwaiti Dinar), OMR (Omani Rial), and TND (Tunisian Dinar). In KWD, 1.000 Dinar is represented as `1000` fils.
2. **Strict Prohibition of Floating-Point Financial Math:**
   - Floating-point arithmetic (`number` IEEE 754) must NEVER be used for financial calculations:
     $$\text{Violation Example: } 0.1 + 0.2 = 0.30000000000000004$$
   - Currency division, fee calculations, budget allocations, and tax markups must use integer arithmetic with explicit rounding policies (e.g., Banker's Rounding or Half-Up) explicitly specified in the domain rules.
3. **Explicit Currency Representation (`Money` Value Object):**
   - Monetary values must never exist as bare, isolated numbers. Every monetary value must be encapsulated within a `Money` Value Object pairing the amount with its ISO 4217 three-letter currency code and scale:
     ```typescript
     interface MoneyProps {
       readonly amountInMinorUnits: bigint;
       readonly currency: "NGN" | "USD" | "GBP" | "EUR" | "JPY" | "KWD";
     }
     ```
   - Arithmetic operations between differing currencies without an explicit exchange rate conversion step are strictly forbidden at the type level.
4. **Serialization of `bigint` across JSON Boundaries:**
   - **The BigInt JSON Limitation:** JavaScript's native `BigInt` primitive is **not directly serializable** by standard `JSON.stringify()`. Invoking `JSON.stringify({ amount: 10000n })` throws an uncaught `TypeError: Do not know how to serialize a BigInt`.
   - **Explicit Boundary Serialization:** When `Money` objects cross presentation and network boundaries (REST API responses, WebSockets, event logs, message queue payloads), the `amountInMinorUnits` must be explicitly serialized:
     - Preferred pattern: Serialize minor units as a string representation (e.g., `"10000"`) or as a structured object `{ "amount": "10000", "currency": "NGN", "scale": 2 }`.
     - In NestJS controllers, use explicit DTO transformer decorators (e.g., `@Transform(({ value }) => value.toString())`) or custom JSON serializers.
     - Deserialization at the API boundary must parse and validate incoming strings back into `bigint` instances.
5. **Timezone-Aware Date and Time Handling:**
   - **Storage & Ingestion:** All timestamps must be generated, processed, and stored in **Coordinated Universal Time (UTC)**.
   - **Database Columns:** PostgreSQL columns must use `timestamptz` (timestamp with time zone), ensuring unambiguous point-in-time serialization.
   - **API Representation:** Timestamps in API payloads must be serialized as ISO 8601 strings with explicit UTC indicators (e.g., `2026-11-02T20:15:00.000Z`).
6. **Presentation Timezone Conversion:**
   - Timestamps are converted from UTC to the merchant's local timezone (e.g., `Africa/Lagos`) strictly at the Presentation layer (web UI or localized report generator).
   - The platform must not assume all merchants operate in a single timezone or currency. Tenant configuration stores the merchant's preferred timezone (IANA time zone database identifier, e.g., `"Africa/Lagos"`) and currency.
7. **No Arbitrary Financial Policies:**
   - This architectural standard defines technical representations and arithmetic safety. It does not invent platform prices, minimum ad spend limits, exchange rates, or fee structures. Business rules remain the exclusive domain of future product capability specifications.

### 12.2 Why It Matters
Floating-point rounding errors in financial transactions cause balance discrepancies, failed reconciliations, accounting audit failures, and legal liabilities. Assuming every currency has 2 decimal places corrupts financial ledgers in zero-decimal or three-decimal jurisdictions. Failing to explicitly handle `bigint` JSON serialization causes unexpected runtime server crashes during serialization.

### 12.3 Responsibility Ownership
- **Domain Layer:** Owns the `Money` Value Object, currency precision rules, financial rounding logic, and temporal domain constraints.
- **Infrastructure Layer:** Owns database column mapping (storing amounts as PostgreSQL `BIGINT` and timestamps as `TIMESTAMPTZ`).
- **Presentation Layer:** Owns `bigint` string serialization across HTTP/JSON boundaries, currency formatting (e.g., `Intl.NumberFormat` converting kobo to "₦100.00"), and timezone conversion for localized UI rendering.

### 12.4 Prohibited Practices
- **Forbidden:** Storing monetary values as floating-point numbers (`FLOAT`, `DOUBLE`, JavaScript `number` without minor-unit scaling) in the database.
- **Forbidden:** Assuming all currencies have two decimal places or hardcoding a 100x multiplier across all currencies.
- **Forbidden:** Passing un-serialized native `bigint` instances directly into `JSON.stringify()` or HTTP response payloads without boundary string transformation.
- **Forbidden:** Storing local timestamps without timezone offsets or UTC normalization.
- **Forbidden:** Adding or subtracting money values of different currencies without explicit exchange rate conversion.
- **Forbidden:** Performing financial calculations inside frontend UI components.

### 12.5 Verification & Compliance
- **Domain Arithmetic Unit Tests:** Comprehensive test suites verify that financial calculations, platform fee deductions, and budget pacing handle boundary values, non-divisible numbers, zero-decimal currencies (JPY), and three-decimal currencies (KWD) with zero floating-point drift.
- **JSON Serialization Tests:** Controller and DTO tests verify that endpoints returning monetary values serialize `bigint` fields to strings safely without throwing `TypeError`.
- **Schema Validation Tests:** Database migrations are inspected to confirm all monetary columns are typed as `BIGINT` and temporal columns as `TIMESTAMPTZ`.

---

## 13. Testing Standards

### 13.1 What the Standard Requires
1. **The Boost Market Testing Pyramid (Planning Targets):** Testing is structured across four distinct tiers with defined boundaries:
   ```text
          ▲
         / \        E2E Tests (~10%)
        /   \       Critical merchant journeys (signup, ad creation, checkout)
       /-----\      
      /       \     Contract Tests (~20%)
     /         \    Vendor schemas (Paystack webhooks, Meta API, AI response schemas)
    /-----------\   
   /             \  Integration Tests (~30%)
  /               \ NestJS modules, database repositories, state transitions
 /-----------------\
/                   \ Unit Tests (~40%)
/                     \ Pure domain logic, Value Objects, Money arithmetic, validators
-----------------------
   ```
   - **Planning Distribution vs. Quality Gates:** The 40/30/20/10 distribution represents **approximate conceptual planning targets and architectural guideline allocations, not mandatory quotas, rigid numerical thresholds, or automated CI gates**. Engineering judgment determines test distribution based on module risk.
2. **Behavior-Oriented Testing Philosophy:**
   - Tests must verify observable behavior, public contracts, and business outcomes rather than internal implementation details.
   - Tests must verify critical edge cases, boundary conditions, and negative/failure paths (e.g., expired tokens, declined cards, network timeouts), not just happy paths.
3. **Rejection of Dogmatic 100% Coverage Quotas:**
   - Code coverage metrics serve as *diagnostic evidence* to identify untested critical paths, not as an arbitrary bureaucratic quality gate.
   - Enforcing a dogmatic 100% line coverage quota leads to low-value tests that assert trivial boilerplate, brittle tests coupled to implementation details, and false confidence. Meaningful behavioral assertion is paramount.
4. **Controlled Test Doubles for External Dependencies:**
   - Live external network calls (Paystack, Meta, Google, Gemini) in unit and integration test suites are strictly prohibited.
   - Tests must utilize controlled in-memory test doubles (fakes, stubs, mocks) implementing the application outbound ports, as mandated by ADR-004.
5. **Deterministic & Isolated Test Execution:**
   - Tests must be completely deterministic: passing or failing independently of execution order, time of day, or geographical location.
   - Ephemeral test databases or transactional rollbacks must ensure test isolation without data pollution between test runs.
6. **Testing Foundation & Test Runner Consistency:**
   - The established, active test execution foundation for this monorepo is **`tsx --test`** (Node.js native test runner via `tsx`), as configured in the root `package.json` scripts:
     - `npm test`: Runs all tests via `tsx --test 'tests/**/*.test.ts'`.
     - `npm run test:unit`: Runs unit test suites via `tsx --test`.
     - `npm run test:integration`: Runs integration test suites via `tsx --test`.
     - `npm run test:contract`: Runs contract test suites via `tsx --test`.
     - `npm run test:e2e`: Runs end-to-end test suites via `tsx --test`.
   - **Migration Policy:** Do **not** replace `tsx --test` with `bun test` without a separately evaluated, benchmarked, and approved migration plan. While Bun workspaces manage package dependencies, test execution foundation stability must be preserved.

### 13.2 Why It Matters
Flaky, slow, or brittle test suites paralyze engineering velocity. Testing implementation details prevents refactoring, while relying on live external networks causes intermittent CI failures and accidental spend on external provider sandboxes. Arbitrary quotas waste engineering hours writing tests for getters and types rather than verifying edge cases.

### 13.3 Responsibility Ownership
- **Domain Tests:** Unit tests verify entities, value objects, domain events, and state machine transitions in isolation (pure in-memory, zero I/O, sub-millisecond execution).
- **Application Tests:** Integration tests verify use-case orchestration with repository and gateway test doubles.
- **Infrastructure Tests:** Adapter tests verify database queries against a test database and external contract mappings using recorded fixtures.
- **Presentation Tests:** API tests verify HTTP routing, status codes, DTO validation, and exception filtering via Supertest.

### 13.4 Prohibited Practices
- **Forbidden:** Making live HTTP requests to external third-party APIs during automated test execution.
- **Forbidden:** Writing assertions that verify private method execution or internal class state instead of public outcomes.
- **Forbidden:** Disabling failing tests or deleting assertions simply to achieve a passing test run.
- **Forbidden:** Replacing the active `tsx --test` runner without an approved migration ADR.
- **Forbidden:** Enforcing dogmatic 100% line coverage quotas as a blocking CI merge gate.

### 13.5 Verification & Compliance
- **Automated Test Execution:** When executable code is modified, verification scripts run the test suites (`npm test` / `npm run test:unit`).
- **Test Double Verification:** Contract tests periodically run against provider sandbox environments to ensure recorded fixtures and mock schemas remain synchronized with upstream vendor APIs.

---

## 14. Documentation and Architecture Decision Records (ADR) Standards

### 14.1 What the Standard Requires
1. **Mandatory Triggers for Architecture Decision Records (ADRs):**
   An ADR must be authored whenever a technical decision meets any of the following criteria:
   - Introducing a new external framework, persistence store, message broker, or third-party dependency.
   - Modifying architectural layer boundaries, dependency-direction rules, or shared-kernel qualification criteria.
   - Introducing a new communication paradigm (e.g., switching from REST to gRPC or GraphQL).
   - Altering the fundamental security, authentication, or multi-tenancy model.
   - Restructuring monorepo workspaces or replacing the active test runner.
2. **Standard ADR Document Structure:**
   Every ADR must reside in `docs/adr/` named `ADR-XXX-<kebab-case-title>.md` and follow the established standard format:
   - **Title & Metadata:** ADR Number, Title, Status (Proposed, Accepted, Deprecated, Superseded), Date, Author.
   - **Context:** The technical problem, business drivers, constraints, and forces at play.
   - **Decision:** The chosen architectural approach, explicitly stating what will and will not be done.
   - **Consequences:** Balanced analysis of positive outcomes, trade-offs, risks, and operational impacts.
3. **Living Documentation & Synchronization:**
   - Architecture documentation is treated as production code. When architectural patterns evolve, corresponding documents (`application-boundaries.md`, `layered-architecture.md`, `cross-cutting-standards.md`) must be updated in the same pull request.
   - Deprecated decisions must be marked `Superseded` with an explicit pointer to the superseding ADR.
4. **Verifiable Evidence & Separation of Verification Claims:**
   - **Strict Separation of Documentation Validation vs. Code Execution Verification:** Documentation validation (confirming structural completeness, consistency across architectural specifications, and absence of logical contradictions) must be explicitly distinguished from executable code verification (compilation, automated tests, linting runs).
   - Any claim in documentation, commit messages, or pull requests that a feature, test suite, or standard is "implemented" or "verified" must be backed by verifiable evidence:
     - *Documentation Validation Evidence:* Existing markdown files, verified headings, cross-document alignment, and repository diffs.
     - *Code Execution Verification Evidence:* Terminal command logs showing zero exit codes, passing test runner assertions, and compiler output.
   - Theoretical designs, unmerged branches, or planned future work must be explicitly identified as such; they must never be documented as accomplished facts.
   - Do **not** claim that verification commands (such as `bun run verify` or `npm test`) passed during documentation-only tasks unless those commands were actually executed and produced passing logs.

### 14.2 Why It Matters
Without documented rationale, engineering teams succumb to architectural drift, repeatedly re-litigating settled decisions or making uninformed changes that violate foundational design principles. Falsely conflating documentation validation with executable test runs creates a false sense of security and undermines trust in the engineering process.

### 14.3 Responsibility Ownership
- **Engineering Architecture Team / Lead Engineers:** Authors and reviews ADRs, ensuring compliance with strategic business goals and Clean Architecture.
- **All Engineers:** Keeps component documentation and OpenAPI schemas synchronized with code changes during daily development.

### 14.4 Prohibited Practices
- **Forbidden:** Introducing major architectural changes or new libraries without an approved ADR.
- **Forbidden:** Documenting a feature or standard as "complete" or "passed" without verifiable execution evidence.
- **Forbidden:** Claiming automated test suites or CI verification commands ran when they were not executed.
- **Forbidden:** Deleting or rewriting historical ADRs to hide past decisions; historical records must be formally superseded.

### 14.5 Verification & Compliance
- **Architectural Pull Request Reviews:** PRs introducing significant architectural changes or dependencies are blocked until a corresponding ADR is provided and approved.
- **Documentation Audits:** Periodic peer reviews cross-reference architecture markdown documents against the actual codebase to identify and remediate documentation drift.

---

## 15. Enforcement and Review

### 15.1 Multi-Layered Enforcement Architecture
Cross-cutting standards are enforced through an automated, multi-tiered verification pipeline designed to catch deviations at the earliest possible stage:

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. LOCAL DEVELOPMENT & PRE-COMMIT                                      │
│    - TypeScript Compiler (tsc) with strict configuration               │
│    - ESLint rules forbidding layer leaks & raw process.env             │
│    - Prettier automated code formatting                                │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Pre-Push / Pull Request
┌───────────────────────────────────▼────────────────────────────────────┐
│ 2. CONTINUOUS INTEGRATION (CI) QUALITY GATES (Code Changes)            │
│    - Workspace compilation: tsc --noEmit                              │
│    - Automated linting: eslint .                                       │
│    - Automated test runner: tsx --test (Unit, Integration, Contract)   │
│    - Dependency vulnerability audit                                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Peer Review
┌───────────────────────────────────▼────────────────────────────────────┐
│ 3. CODE REVIEW & ARCHITECTURAL CHECKLIST                               │
│    - Human and AI peer review verifying adherence to standards         │
│    - Verification against explicit review questions                    │
└────────────────────────────────────────────────────────────────────────┘
```

### 15.2 Code Review Checklist for Engineers and Reviewers
During code review, every pull request must be evaluated against the following mandatory cross-cutting verification questions:
1. **Error Handling:** Are anticipated business failures returned explicitly via `Result<T, E>`? Are domain entities free of HTTP-specific exception imports?
2. **Validation:** Is structural validation isolated to DTOs and semantic invariant validation isolated to Domain Entities/Value Objects?
3. **API Contracts:** Does the response adhere to the default `{ success, data/error, meta }` envelope, or does it fall under a documented exception (204, streaming, download, webhook ack)?
4. **Observability:** Are logs structured as JSON with `correlationId` attached? Are all secrets, tokens, and PII strictly redacted?
5. **Security:** Is every database query scoped by `tenantId`? Are all inputs parameterized? Is password hashing performed with Argon2/bcrypt? Does session architecture account for revocation?
6. **Configuration:** Is configuration accessed strictly through `ApiConfigService` without raw `process.env` calls?
7. **Database & Outbox:** Are database transactions kept short and free of external network calls? Is asynchronous work dispatched via the outbox pattern?
8. **External Providers:** Are external integrations abstracted behind consumer-owned interfaces? Are timeouts configurable and operation-specific?
9. **Money & Time:** Are monetary values stored as integer minor units (`bigint`) with ISO 4217 currency codes? Is `bigint` JSON serialization handled explicitly? Are timestamps UTC `timestamptz`?
10. **Testing & Honesty:** Do tests verify observable behavior rather than implementation details? Are documentation checks clearly separated from code execution verification?

---

## 16. Current Implementation Status and Future Work

To ensure complete transparency and prevent assumption of unbuilt architecture, the following matrix delineates the current implementation status of each cross-cutting domain within the Boost Market monorepo:

| Domain | Current Implementation Status (November 2026) | Future Implementation Roadmap |
| :--- | :--- | :--- |
| **Monorepo Topology** | Active Next.js frontend at repository root; `apps/web` is an empty package placeholder; `apps/api` is NestJS backend host. | Complete migration of root frontend into `apps/web`; harmonize workspace dependencies. |
| **Error Handling** | Functional `Result<T, E>` primitive implemented in `packages/shared`. Minimal error handling in `apps/api`. | Implement NestJS global exception filters (`AllExceptionsFilter`, `DomainErrorFilter`) and standardized API error mappers. |
| **Input Validation** | Zod validation implemented for environment variables in `packages/config`. | Implement NestJS global `ValidationPipe` with `class-validator` / Zod DTOs for business controllers and HMAC webhook middleware. |
| **API Contracts** | Minimal `/health` endpoint returning plain JSON diagnostic payload. | Implement uniform response interceptor (`TransformInterceptor`), `/api/v1/` route prefixing, documented exceptions (204, streaming), and cursor pagination. |
| **Logging & Observability** | Standard unformatted Node.js console logs. | Integrate structured JSON logger (e.g. Pino) implementing NestJS `LoggerService`, request correlation middleware, and OpenTelemetry. |
| **Security Standards** | Security baseline principles defined in `DEVELOPMENT_STANDARDS.md`. | Implement JWT authentication guards, stateful refresh/session revocation, tenant isolation filters, Helmet headers, rate limiting, and password hashing. |
| **Configuration** | Centralized `packages/config` with Zod startup validation and `ApiConfigService` as defined in ADR-003. | Expand configuration schema as new service integrations (Redis, Meta, Paystack) are introduced in subsequent tasks. |
| **Database & Outbox** | PostgreSQL and Prisma configured in architecture documentation. | Author initial Prisma schema, migrations, repository adapters, and `outbox_events` table with relay worker. |
| **Async Processing** | Background job principles defined in architecture documentation. | Implement BullMQ queue adapters backed by Redis, job processor wrappers, exponential backoff, and Dead-Letter Queue (DLQ). |
| **External Providers** | Provider-neutral contracts defined for AI models (`IAIProviderContract` in `packages/ai`). | Implement concrete infrastructure adapters for Gemini AI, Paystack payments, and Meta Graph API with configurable, operation-specific timeouts and circuit breakers. |
| **Money, Currency, Time** | Architectural standards defined in this document. | Implement immutable `Money` Value Object in domain layer with ISO 4217 precision rules, `bigint` minor units, explicit JSON serialization, and UTC timestamp utilities. |
| **Testing Architecture** | Active test runner configured as **`tsx --test`** in root `package.json`. ADR-004 testing strategy established. Workspace currently lacks `node_modules` and `bun` executable on local host. | Maintain `tsx --test` foundation. Separate evaluation and approved ADR required before any future migration to native `bun test`. |
| **ADR & Documentation** | ADR-001 through ADR-005 accepted; core architecture documents established in `docs/architecture/`. | Maintain ADR workflow for all future structural, infrastructure, and capability decisions. |

> [!NOTE]
> **Subtask Verification Notice:** During this architecture definition subtask, documentation structure, internal consistency, and alignment across the five foundational architecture documents were verified. No executable tests, build steps, or CI verification scripts (`bun run verify`) were executed, in strict accordance with the documentation-only scope of this task.

---

## 17. Conclusion & Architectural Summary

The standards defined in this document establish the operational backbone of Boost Market. By decoupling internal domain logic from transport protocols, enforcing fail-fast configuration validation, maintaining strict tenant data isolation, modeling money and time safely across global currencies, supporting flexible session governance, configuring granular external timeouts, and respecting the existing test runner foundation, these cross-cutting standards ensure that Boost Market remains resilient, secure, and maintainable as it evolves into an enterprise-grade agentic advertising platform.
