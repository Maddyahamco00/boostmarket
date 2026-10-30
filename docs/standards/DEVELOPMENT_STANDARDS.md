# Boost Market — Engineering Development Standards

**Author & Project Owner:** Muhammad Kabeer Ahmed  
**Architectural Baseline:** Clean Architecture &bull; Hexagonal Ports &bull; Domain-Driven Design (DDD)  
**Governing Rule:** *AI should accelerate engineering, not replace engineering understanding.*

---

## 1. TypeScript Standards

1. **Strict Mode Mandate:**
   - `"strict": true`, `"noImplicitAny": true`, `"noImplicitOverride": true`, and `"noFallthroughCasesInSwitch": true` must remain enabled across all packages.
2. **Elimination of `any`:**
   - The use of `any` is strictly prohibited in application code.
   - For unknown incoming data (e.g., API payloads, webhooks, LLM outputs), use `unknown` and narrow the type using type guards or Zod schemas before consumption.
3. **Explicit Return Types:**
   - All exported functions, domain methods, and use cases must declare explicit return types.
4. **Interfaces vs. Types:**
   - Use `interface` for contracts, ports, and object shapes that may be extended or implemented.
   - Use `type` for unions, intersections, primitives, and mapped types.
5. **Immutability by Default:**
   - Value objects, DTOs, and event payloads must use `readonly` properties and `Object.freeze()` where runtime immutability is required.

---

## 2. Code Quality & Formatting

1. **Naming Conventions:**
   - **Files:** `kebab-case.extension` (e.g. `health.controller.ts`, `campaign.entity.ts`).
   - **Classes & Interfaces:** `PascalCase` (e.g. `HealthController`, `IAdChannelProvider`).
   - **Functions & Variables:** `camelCase` (e.g. `calculateTakeRate`, `dailyBudgetInKobo`).
   - **Constants & Enums:** `UPPER_SNAKE_CASE` (e.g. `DEFAULT_API_PORT`, `CampaignStatus.ACTIVE`).
2. **Import Organization:**
   - Standard node libraries first (`node:test`, `node:assert`).
   - External dependencies second (`@nestjs/common`, `lucide-react`).
   - Internal workspace packages third (`@boost-market/shared`, `@boost-market/config`).
   - Relative imports last (`./types`, `../dtos`).
3. **Dead Code & Unused Variables:**
   - Unused imports and variables are flagged by ESLint. Prefix intentionally unused parameters with an underscore (`_req`, `_ctx`).
4. **Deterministic Error Handling:**
   - Avoid throwing raw exceptions for anticipated business errors.
   - Use the functional `Result<T, E>` pattern (`Result.ok(...)`, `Result.fail(...)`) to make error handling visible in function signatures.

---

## 3. Project Structure & Architectural Layering

All future code must adhere to Clean Architecture with strict inward dependency flow:

$$\text{Presentation Layer} \longrightarrow \text{Application Layer} \longrightarrow \text{Domain Layer} \longleftarrow \text{Infrastructure Layer}$$

```text
┌────────────────────────────────────────────────────────────────────────┐
│ 1. PRESENTATION (apps/web, apps/api controllers)                      │
│    - Handles HTTP, request routing, serializing responses, UI.       │
│    - Zero domain calculations or database queries directly here.       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Invokes
┌───────────────────────────────────▼────────────────────────────────────┐
│ 2. APPLICATION (Use cases, orchestrators, command handlers)           │
│    - Orchestrates business workflows (e.g. CreateCampaignUseCase).     │
│    - Coordinates between repositories, AI agents, and ad adapters.     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Enforces
┌───────────────────────────────────▼────────────────────────────────────┐
│ 3. DOMAIN (Entities, Value Objects, Domain Events, State Machines)    │
│    - PURE enterprise rules.                                            │
│    - ZERO dependencies on React, Next.js, NestJS, Prisma, or AI SDKs. │
└───────────────────────────────────▲────────────────────────────────────┘
                                    │ Implements Ports
┌───────────────────────────────────┴────────────────────────────────────┐
│ 4. INFRASTRUCTURE (Adapters, Database, Redis, External APIs)          │
│    - Implements domain and application ports (e.g. Paystack, Meta).    │
│    - Changes in infrastructure never force changes to the domain.     │
└────────────────────────────────────────────────────────────────────────┘
```

**Rule:** An outer layer may depend on an inner layer. An inner layer must NEVER depend on an outer layer.

---

## 4. Backend Standards (NestJS)

1. **Thin Controllers:**
   - Controllers must only parse requests, invoke a use case or service, and return an HTTP response.
   - Controllers must never perform SQL queries, external API calls, or domain calculations.
2. **Services & Use Cases:**
   - Business use cases encapsulate transactional business operations.
   - Every usecase must validate caller authorization before executing.
3. **Replaceable Infrastructure:**
   - External integrations (Payments, Ad Platforms, AI providers) must be accessed via dependency injection through abstract Interfaces / Ports.
4. **Exception Filters & Validation Pipes:**
   - Global validation pipes sanitize and transform input using DTOs.
   - Standardized exception filters translate internal failures to predictable HTTP error bodies.

---

## 5. Frontend Standards (Next.js)

1. **Server Components by Default:**
   - Keep components as Server Components unless `'use client'` is strictly required for React state, hooks, or event listeners.
2. **Separation of Presentation & Business Logic:**
   - UI components focus strictly on rendering and user interaction.
   - Complex state transitions and data transformations belong in dedicated custom hooks or shared utility functions.
3. **The 3 Mandatory States:**
   - Every asynchronous or data-dependent view must provide explicit:
     1. **Loading State** (Skeleton or spinner)
     2. **Error State** (Actionable message with retry)
     3. **Empty State** (Clear prompt encouraging action)
4. **Centralized API Communication:**
   - Never write raw inline `fetch()` URLs throughout UI files. Use typed API client functions located in `services/api`.

---

## 6. Environment Configuration

1. **Zero Committed Secrets:**
   - `.env`, `.env.local`, and `.env.production` are strictly ignored by Git.
2. **Authoritative `.env.example`:**
   - Whenever an environment variable is introduced, it must be documented immediately in `.env.example` with comments explaining its format and purpose.
3. **Startup Validation:**
   - Applications must fail fast at startup if critical variables (`DATABASE_URL`, `API_PORT`) are missing or malformed.
4. **Environment Differentiation:**
   - Clearly delineate between `development`, `test`, and `production` behavior. Never execute live ad spend or real payment charges in test/dev modes.

---

## 7. Testing Standards (The Testing Pyramid)

```text
       ▲
      / \        E2E Tests (10%)
     /   \       Critical full-stack merchant journeys
    /-----\      
   /       \     Contract Tests (20%)
  /         \    Meta Graph API, Paystack webhooks, AI response schemas
 /-----------\   
/             \  Integration Tests (30%)
/               \ NestJS modules, database repositories, state transitions
/-----------------\
/                   \ Unit Tests (40%)
/                     \ Pure domain logic, Value Objects, Money arithmetic, Haversine math
-----------------------
```

1. **Unit Tests:** Fast, isolated, zero I/O. Must execute in milliseconds.
2. **Integration Tests:** Verify module boundaries, repository transactions, and service orchestration.
3. **Contract Tests:** Ensure third-party API adapters respect external vendor schemas using mocks/fixtures.
4. **End-to-End Tests:** Verify end-to-end execution of core merchant journeys.

---

## 8. Git Standards

1. **Conventional Commits:**
   - Format: `<type>(<scope>): <short description>`
   - Types:
     - `feat`: New feature or capability
     - `fix`: Bug fix
     - `refactor`: Code change that neither fixes a bug nor adds a feature
     - `docs`: Documentation updates or ADRs
     - `test`: Adding or updating tests
     - `chore`: Tooling, dependency, or configuration updates
   - Example: `feat(api): initialize health check controller`
2. **Branch Naming:**
   - `feature/<epic-id>-<description>` (e.g. `feature/epic-0-workspace-standards`)
   - `fix/<issue-id>-<description>` (e.g. `fix/api-port-conflict`)
3. **Pull Request & Commit Hygiene:**
   - Never commit build artifacts (`dist/`, `.next/`), dependencies (`node_modules/`), or OS files (`.DS_Store`).
   - Every PR or milestone commit must compile with zero errors and pass all tests.

---

## 9. Security Baseline

1. **Zero-Trust Input Validation:**
   - All input from external actors (users, webhooks, query parameters) must be validated before processing.
2. **Backend-Authoritative Authorization:**
   - Never rely on the frontend to protect operations or hide buttons. The backend must enforce tenant isolation and role permissions on every request.
3. **Deterministic Financial Authority:**
   - LLMs can recommend ad budgets, but actual money calculations, fee markups, and wallet deductions are calculated deterministically by pure backend functions.
4. **Log Sanitization:**
   - Never print sensitive credentials, API keys, passwords, or full credit card numbers to application logs.

---

## 10. AI-Assisted Development Rules (The 10 Anti-Degradation Rules)

To protect Boost Market's architecture during AI pair-programming:

1. **No Unjustified Dependencies:** AI must never install third-party npm packages without explaining why standard libraries are insufficient and receiving user approval.
2. **Architectural Decisions First:** AI must explain architectural tradeoffs and subtask designs before writing implementation code.
3. **No Test Bypassing:** AI must never delete, bypass, or mock out failing assertions to force a passing test run.
4. **No Disabling Tooling:** AI must never disable compiler options (`strict: false`, `@ts-ignore`), lint rules, or typechecks to mask errors.
5. **No Layer Leaks:** AI must never place database queries in controllers or React components, and never import vendor SDKs into `@boost-market/domain`.
6. **Mandatory Code Review & Teaching:** For every subtask, AI must explain what the code does, why it exists, and what edge cases were handled.
7. **Behavior Over Numbers:** Tests must verify real business scenarios and edge cases, not just inflate code coverage metrics.
8. **Extra Scrutiny for Security:** Authentication, payments, and external ad spend require deep security audit before merging.
9. **Deterministic Financial & Auth Logic:** Financial balances and access control must remain 100% deterministic code; they must never be left to probabilistic LLM inference.
10. **The Mandatory Workflow:**
    $$\text{Inspect} \longrightarrow \text{Understand} \longrightarrow \text{Decide} \longrightarrow \text{Design} \longrightarrow \text{Test} \longrightarrow \text{Implement} \longrightarrow \text{Review} \longrightarrow \text{Explain} \longrightarrow \text{STOP}$$
    The AI must stop and wait for Muhammad's explicit confirmation after every subtask.
