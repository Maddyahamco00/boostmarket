# Boost Market — Shared-Kernel Boundaries & Domain Partitioning

**Document Version:** 1.1.0  
**Status:** Approved Architectural Baseline  
**Date:** 2026-10-30  
**Author:** Muhammad Kabeer Ahmed & Core Engineering Team  
**Governing Documents:**  
- [Application Boundaries (Macro-Architecture)](./application-boundaries.md)  
- [Internal Layered Architecture (Domain, Application, Infrastructure)](./layered-architecture.md)  
- [Dependency-Direction Rules](./dependency-direction-rules.md)  
- [ADR-001: Monorepo and Modular Clean Architecture](../adr/ADR-001-monorepo-modular-clean-architecture.md)  
- [ADR-002: Engineering Standards and AI Governance](../adr/ADR-002-engineering-standards-and-ai-governance.md)  
- [Development Standards](../standards/DEVELOPMENT_STANDARDS.md)

---

## 1. Purpose & Context

This document establishes the **strict architectural boundaries of the Shared Kernel** (`packages/shared` / `@boost-market/shared`) within the Boost Market monorepo. It explicitly defines:
1. What qualifies for admission into the Shared Kernel.
2. What must remain strictly owned by individual business capabilities (Campaigns, Payments, Identity, Advertising, AI).
3. The fundamental distinction between shared technical primitives and capability-owned business rules.
4. The governance model for introducing, modifying, or deprecating shared abstractions.
5. The diagnostic investigation of environment and test execution constraints.

Boost Market is an agentic AI advertising SaaS platform managed via **Bun workspaces** and running on **Node.js 22**. As the codebase evolves to support Nigerian merchants across complex workflows—such as multi-channel campaign planning, Gemini/OpenAI copy generation, Paystack/Flutterwave billing, and Meta/Google distribution—disciplined shared-kernel boundaries ensure that `packages/shared` never degenerates into a convenient dumping ground for common code.

---

## 2. The Shared Kernel in Domain-Driven Design (DDD)

### 2.1. Theoretical Definition in DDD

In Domain-Driven Design (DDD), Eric Evans defines the **Shared Kernel** as a subset of the domain model that multiple bounded contexts or teams explicitly agree to share:

> *"Designate some subset of the domain model that the two teams agree to share. Of course, this includes, along with this subset of the model, the subset of the code or of the database design associated with that part of the model. This explicitly shared stuff has special status, and shouldn't be changed without consultation with the other team."* — Eric Evans, *Domain-Driven Design*

In a modular monorepo like Boost Market, `packages/shared` serves as the foundational shared kernel. However, this architectural pattern carries significant risks if its boundaries are misunderstood.

### 2.2. The Core Risks of Mismanaged Sharing

1. **Monorepo-Wide Blast Radius:**  
   `packages/shared` sits at the very bottom of the dependency graph. Every application (`apps/api`, the Next.js frontend) and sibling package (`packages/config`, `packages/ai`) depends on it. Any breaking change, subtle bug, or performance degradation in `packages/shared` propagates instantly across the entire codebase.
2. **Artificial Semantic Coupling:**  
   Sharing a type between two capabilities creates coupling. If Capability A and Capability B share a model, any change required by Capability A forces Capability B to adapt, even if Capability B's business domain has not changed.
3. **The "Common Code" Anti-Pattern:**  
   Without strict boundaries, developers use the shared kernel to avoid making ownership decisions. It rapidly accumulates utility functions, half-baked helpers, mixed DTOs, and orphaned interfaces, destroying modularity.
4. **Sharing Types vs. Sharing Business Responsibility:**  
   Sharing a low-level type (such as `string` or a generic `Result<T, E>`) is purely technical. It does **not** grant permission to share domain business logic, validation rules, or state machines across capabilities.
5. **The Imperative for an Intentionally Small Kernel:**  
   A healthy Shared Kernel is **intentionally minimal**. The smaller the shared surface area, the greater the autonomy of individual business capabilities, and the lower the risk of cascading build breaks.

### 2.3. The Five Architectural Categories of Code

To prevent confusion, Boost Market categorizes code into five distinct tiers:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   FIVE CODE CATEGORIES IN BOOST MARKET                 │
├──────────────────────────┬──────────────────────┬──────────────────────┤
│ Category                 │ Definition           │ Boost Market Example │
├──────────────────────────┼──────────────────────┼──────────────────────┤
│ 1. Shared Technical      │ Domain-neutral, pure │ Result<T, E>,        │
│    Primitives            │ technical utilities  │ SystemStatus         │
├──────────────────────────┼──────────────────────┼──────────────────────┤
│ 2. Shared Domain         │ Universal domain     │ Currency code enum   │
│    Primitives            │ concepts without     │ (NGN, USD)           │
│                          │ capability logic     │                      │
├──────────────────────────┼──────────────────────┼──────────────────────┤
│ 3. Capability-Owned      │ Pure business rules, │ Campaign aggregate,  │
│    Domain Models         │ entities, invariants │ Payment entity       │
├──────────────────────────┼──────────────────────┼──────────────────────┤
│ 4. Application Contracts │ Outbound ports owned │ ICampaignRepository, │
│    (Ports)               │ by use cases         │ IPaymentGateway      │
├──────────────────────────┼──────────────────────┼──────────────────────┤
│ 5. Infrastructure        │ Technical drivers &  │ PrismaCampaignRepo,  │
│    Implementations       │ third-party adapters │ PaystackPaymentAdapt │
└──────────────────────────┴──────────────────────┴──────────────────────┘
```

**Rule:** `packages/shared` is reserved **exclusively for Category 1 and strictly vetted Category 2 abstractions**. Categories 3, 4, and 5 must **never** enter `packages/shared`.

---

## 3. Inventory and Evaluation of Current `packages/shared`

An inspection of [`packages/shared`](file:///c:/Users/DELL/Desktop/boostmarket/packages/shared) reveals three existing abstractions:

```text
packages/shared/
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts        # Barrel export
    ├── result.ts       # Result<T, E> pattern
    └── types.ts        # Environment & SystemStatus
```

### 3.1. Detailed Evaluation of Existing Primitives

| Abstraction | Source File | Purpose | Domain Neutral? | External Deps? | Production Consumers | Test Consumers | Status & Architectural Governance |
| :--- | :--- | :--- | :---: | :---: | :---: | :---: | :--- |
| **`Result<T, E>`** | [`result.ts`](file:///c:/Users/DELL/Desktop/boostmarket/packages/shared/src/result.ts) | Functional Either pattern for deterministic, type-safe error handling without throwing runtime exceptions. | **Yes** (100% technical) | **None** (Pure TS) | **1** (`packages/config`) | `tests/sanity.test.ts` | **Retained under Justified Architectural Exception.** Retained as a foundational monorepo-wide building block. Tests are not counted as independent production consumers. |
| **`SystemStatus`** | [`types.ts`](file:///c:/Users/DELL/Desktop/boostmarket/packages/shared/src/types.ts) | Structural contract for system operational health (`healthy`, `degraded`, `unhealthy`). | **Yes** (Operational telemetry) | **None** (Pure TS) | **2** (`apps/api`, `app/page.tsx`) | `tests/helpers/test-builders.ts` | **Approved to Remain.** Satisfies normal admission rule ($\ge 2$ independent production consumers across server and web). |
| **`Environment`** | [`types.ts`](file:///c:/Users/DELL/Desktop/boostmarket/packages/shared/src/types.ts) | Union type for execution environments (`development`, `staging`, `production`, `test`). | **Yes** (Runtime metadata) | **None** (Pure TS) | **0** (None) | **0** (None) | **Flagged for Reconsideration.** Currently unconsumed. Redundant with `AppEnvironment` in `packages/config`. Retained without modification per strict task scope. |

### 3.2. Detailed Analysis of Consumers

#### 1. `Result<T, E>`: Production vs. Test vs. Future Usage
* **Existing Production Consumers (1):**  
  - [`packages/config/src/env.validator.ts`](file:///c:/Users/DELL/Desktop/boostmarket/packages/config/src/env.validator.ts#L1): Uses `Result<ServerConfig, ConfigValidationError>` to represent environment validation outcomes deterministically.
* **Test Consumers (Not Counted as Production Consumers):**  
  - [`tests/sanity.test.ts`](file:///c:/Users/DELL/Desktop/boostmarket/tests/sanity.test.ts#L3): Verifies basic `Result.ok()` and `Result.fail()` mechanics.
  - *Architectural Invariant:* Tests verify code; they do not count as independent production consumers when evaluating the two-consumer admission rule.
* **Documented Architectural Exception:**  
  Although `Result<T, E>` currently has only one production consumer in the incomplete workspace, it is retained under an explicit, documented architectural exception. It serves as the approved, monorepo-wide functional error pattern mandated by ADR-001 and clean architecture.
* **Planned Future Usage (Prospective):**  
  - In Task 0.1.3, domain entities (`Campaign`, `BusinessProfile`) will return `Result<T, DomainError>`.
  - Application use cases (`LaunchCampaignUseCase`) will return `Result<DTO, ApplicationError>`.

#### 2. `SystemStatus`: Verified Multi-Consumer Primitive
* **Existing Production Consumers (2):**  
  - [`apps/api/src/health.controller.ts`](file:///c:/Users/DELL/Desktop/boostmarket/apps/api/src/health.controller.ts#L2): Exposes server health over GET `/health`.
  - [`app/page.tsx`](file:///c:/Users/DELL/Desktop/boostmarket/app/page.tsx#L20): Renders live system health badge in the root Next.js dashboard.
* **Test Consumers:**  
  - [`tests/helpers/test-builders.ts`](file:///c:/Users/DELL/Desktop/boostmarket/tests/helpers/test-builders.ts#L1): Constructs mock `SystemStatus` objects for unit testing.
* **Status:** Fully satisfies the normal admission criterion ($\ge 2$ independent production consumers).

#### 3. `Environment`: Unconsumed Primitive Analysis
* **Existing Production Consumers (0):** None.
* **Existing Test Consumers (0):** None.
* **Actual Current Usage:** Completely unconsumed across the monorepo.
* **Redundancy Finding:** [`packages/config/src/config.types.ts`](file:///c:/Users/DELL/Desktop/boostmarket/packages/config/src/config.types.ts#L8) declares its own `AppEnvironment` type (`"development" | "test" | "production"`), bypassing `Environment` from `packages/shared`.
* **Planned Future Usage:** Originally envisioned in ADR-001 as a universal runtime environment indicator.
* **Architectural Recommendation:** Because it fails the two-production-consumer rule and is currently dead code, `Environment` should be formally reconsidered in a future task: either migrated into `packages/config` or adopted by `packages/config` to replace `AppEnvironment`. Per strict subtask restrictions, it is retained without modification in this task.

---

## 4. Admission Criteria for the Shared Kernel

To prevent `packages/shared` from accumulating unvetted or capability-specific code, an abstraction must satisfy either the **Normal Admission Rule** or a **Justified Architectural Exception**, along with all technical invariants:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   SHARED-KERNEL ADMISSION CRITERIA                     │
├────────────────────────────────────────────────────────────────────────┤
│ 1. Consumer Requirement:                                               │
│    • NORMAL RULE: At least TWO independent production consumers.       │
│    • OR JUSTIFIED EXCEPTION: A foundational, domain-neutral            │
│      architectural building block (e.g., Result<T, E>) approved        │
│      by architecture standards.                                        │
│    • NOTE: Test suites do NOT count as independent production consumers│
├────────────────────────────────────────────────────────────────────────┤
│ 2. Semantic Stability: Proven, stable interface; low churn.            │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Domain Neutrality: Zero capability-specific business rules.         │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Zero External Dependencies: 100% pure TypeScript; no npm packages.  │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Blast-Radius Assessment: Changes will not cascade breaking edits.   │
├────────────────────────────────────────────────────────────────────────┤
│ 6. Behavior-Oriented Test Policy: Public contracts & edge cases        │
│    verified; diagnostic coverage evidence utilized.                    │
└────────────────────────────────────────────────────────────────────────┘
```

### Detailed Criteria

1. **The Normal Multi-Consumer Rule:**  
   The abstraction must be actively required by at least **two independent production consumers** in different workspace applications or packages (e.g., consumed by both `apps/api` and the web frontend, or by `packages/config` and future domain packages). *Tests do not count as independent production consumers.*
2. **Justified Architectural Exception:**  
   An abstraction may enter the shared kernel with fewer than two existing production consumers **only if** it represents a formally documented, foundational, domain-neutral architectural building block (e.g., `Result<T, E>`) mandated by monorepo-wide architectural standards prior to the full implementation of downstream consumers. *Convenience for a single consumer is strictly disqualified.*
3. **Proven Semantic Stability:**  
   The candidate abstraction must represent a mature, stable concept whose interface is not subject to frequent product changes. Volatile or rapidly evolving schemas are disqualified.
4. **Domain Neutrality:**  
   The abstraction must not embody business logic, operational workflows, or regulatory rules belonging naturally to a specific capability (e.g., campaign budget rules, payment fee calculations, CAC registration formats).
5. **Zero Framework & Vendor Dependencies:**  
   The abstraction must be written in **100% pure TypeScript**. It must never import NestJS, Next.js, React, Prisma, Redis, `@google/genai`, Paystack, or any external npm runtime dependency.
6. **Clear Blast-Radius Assessment:**  
   The author must document that a future change to the abstraction will not force breaking changes across unrelated bounded contexts.
7. **Behavior-Oriented Testing Policy (Meaningful Behavior over Arbitrary Percentages):**  
   The abstraction must be accompanied by comprehensive behavioral unit tests in `tests/`:
   - Tests must verify observable public contracts, behavioral guarantees, and invariants.
   - Tests must exercise critical edge cases, boundary values, and failure paths (e.g., asserting that `Result.getValue()` throws when invoked on a failure result).
   - Code coverage reports must be used as **diagnostic evidence** to discover blind spots, not as a dogmatic, universal 100% line-coverage admission metric.
   - *Rationale:* Chasing arbitrary 100% coverage numbers encourages shallow tests that assert trivial properties (such as simple getters) while providing false confidence. Meaningful tests verify contract integrity and failure resilience without creating maintenance drag.

---

## 5. Exclusion Criteria: What Must Remain Capability-Owned

The table below documents specific concepts that **must never be admitted to `packages/shared`**, identifying their rightful architectural owners.

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                   CAPABILITY-OWNED EXCLUSIONS (FORBIDDEN IN SHARED)                    │
├────────────────────┬──────────────────────────────────┬────────────────────────────────┤
│ Capability         │ Prohibited Concepts              │ Rightful Architectural Owner   │
├────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Campaign           │ Campaign entity, aggregate root, │ Campaign Domain & Application   │
│ Management         │ lifecycle states (DRAFT->ACTIVE),│ modules in apps/api            │
│                    │ budget validation, ICampaignRepo │ (future @boost-market/domain)  │
├────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Payments &         │ Payment entity, wallet balance,  │ Billing & Payment capability   │
│ Billing            │ Paystack/Flutterwave webhooks,   │ in apps/api                    │
│                    │ refund rules, IPaymentGateway    │                                │
├────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Identity &         │ Merchant profile, CAC validation,│ Identity & Merchant capability │
│ Access             │ JWT claims, user roles, RBAC,    │ in apps/api                    │
│                    │ IBusinessProfileRepository       │                                │
├────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Advertising        │ Meta/Google ad channel ports,    │ Ad Distribution capability     │
│ Distribution       │ audience targeting schemas,      │ in apps/api                    │
│                    │ IAdChannelProvider               │                                │
├────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ AI Creative        │ ICreativeGenerator, prompt text, │ Dedicated packages/ai          │
│ & Reasoning        │ provider routing policies,       │ contracts & api AI adapters    │
│                    │ token usage telemetry            │                                │
├────────────────────┼──────────────────────────────────┼────────────────────────────────┤
│ Infrastructure     │ PrismaClient, Redis caches,      │ Infrastructure Layer &         │
│ & Persistence      │ BullMQ queues, database queries, │ concrete adapters in apps/api  │
│                    │ HTTP clients (Axios, Fetch)      │                                │
└────────────────────┴──────────────────────────────────┴────────────────────────────────┘
```

---

## 6. Shared Types Versus Shared Business Rules

A critical failure mode in monorepo development is confusing **shared data types** with **shared business rules**.

### 6.1. The Fallacy of Structural Similarity
Two business concepts may share identical underlying TypeScript types (e.g., `string`, `number`, or an enum with similar labels), yet represent completely different business invariants:

* **Example: `CampaignStatus` vs. `PaymentStatus`:**
  - Both might contain a state labeled `PENDING` (`LAUNCH_PENDING` vs. `PAYMENT_PENDING`).
  - Merging them into a single `SharedStatus` in `packages/shared` is a severe architectural flaw:
    - A campaign's `PENDING` state reflects ad review and budget scheduling invariants.
    - A payment's `PENDING` state reflects banking rails, webhook verifications, and settlement latency.
    - Coupling them means any change to the payment lifecycle risks breaking the campaign state machine.
* **Example: Generic Identifiers vs. Domain Aggregate IDs:**
  - A generic type alias `export type EntityId = string;` is a harmless technical primitive.
  - A strongly-typed `CampaignId` branded type with domain-specific formatting (e.g., `cmp_[a-zA-Z0-9]{16}`) embodies business rules and belongs strictly in the Campaign domain.

### 6.2. The Money Representation Case Study

Consider the representation of financial amounts in Nigerian Naira (NGN):

```text
[Pure Technical Shared Primitive]
packages/shared:
  export interface MoneyAmount {
    readonly amountInKobo: bigint;
    readonly currency: "NGN";
  }
```

* **What May Be Shared:** The technical representation of an integer monetary unit (e.g., `bigint` representing kobo to prevent floating-point rounding errors).
* **What Must NEVER Be Shared:**
  - *Campaign Budget Rules:* "A campaign must allocate at least the platform daily minimum." This rule belongs strictly in `CampaignBudget` inside the Campaign domain.
  - *Payment Gateway Rules:* "Paystack transactions incur a 1.5% fee capped at ₦2,000." This rule belongs strictly in the Payment infrastructure adapter.
  - *Merchant Subscription Rules:* "Starter tier allows up to ₦500,000 monthly ad spend." This rule belongs strictly in the Subscription domain.

**Rule:** `packages/shared` may host the immutable currency data structure; it must **never** host business policies governing how that money is earned, capped, spent, or debited.

---

## 7. Shared-Kernel Dependency Rules

`packages/shared` occupies the root tier of the monorepo's Directed Acyclic Graph (DAG).

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   PACKAGES/SHARED DEPENDENCY RESTRICTIONS              │
├───────────────────────────────────┬────────────────────────────────────┤
│ Permitted Dependencies            │ Strictly Forbidden Dependencies    │
├───────────────────────────────────┼────────────────────────────────────┤
│ • Pure TypeScript Standard Library│ • apps/api (NestJS Orchestrator)   │
│ • No external npm dependencies    │ • apps/web & root frontend (Next)  │
│                                   │ • packages/ai & packages/config    │
│                                   │ • @prisma/client & database drivers│
│                                   │ • Redis, BullMQ, Message brokers   │
│                                   │ • @google/genai, OpenAI SDKs       │
│                                   │ • Paystack, Flutterwave SDKs       │
│                                   │ • Meta Graph API, Google Ads SDKs  │
│                                   │ • tests/ & test doubles/builders   │
└───────────────────────────────────┴────────────────────────────────────┘
```

---

## 8. Ownership and Governance Model

### 8.1. The Shared Abstraction Proposal Lifecycle

```mermaid
flowchart LR
    A["Need Identified in Capability"] --> B{"Meets Admission Criteria?"}
    B -- "Normal: >=2 Prod Consumers" --> D["Draft in packages/shared"]
    B -- "Architectural Exception" --> D
    B -- "Single Consumer / Convenience" --> C["Keep Capability-Owned"]
    D --> E["Add Behavioral Tests & Edge Cases"]
    E --> F["Review Blast Radius & Commit"]
```

1. **Identification:** An engineer identifies a common utility or contract across capabilities.
2. **Admission Verification:** The candidate is checked against Section 4:
   - Does it have $\ge 2$ genuine production consumers?
   - If not, does it qualify under a justified, approved architectural exception? (Tests do not count as production consumers).
   - Is it domain-neutral?
   - Does it have zero external dependencies?
3. **Rejection of Convenience:** "Convenience for one module" is unconditionally rejected.
4. **Behavior-Oriented Testing:** Tests must cover failure paths and edge cases, using coverage reports diagnostically rather than aiming for dogmatic 100% metrics.
5. **Atomic Monorepo Updates:** Breaking changes must update all monorepo consumers in the **same atomic pull request**, verified via the CI verification gate.

---

## 9. Concrete Examples of Good vs. Bad Sharing

### Example 1: `Result<T, E>` Pattern
* **Proposed Abstraction:** Functional Either/Result type for deterministic error handling.
* **Placement:** `packages/shared`.
* **Verdict:** ✅ **Good Sharing (Justified Architectural Exception).**
* **Reasoning:** 100% domain-neutral, zero dependencies, universal utility across config, domain, application, and infrastructure layers.
* **Consequence of Incorrect Placement:** If each capability wrote its own error wrapper, error handling across use cases would be fragmented and incompatible.

### Example 2: `CampaignStatus` Enum
* **Proposed Abstraction:** Enum representing campaign lifecycle (`DRAFT`, `APPROVED`, `LAUNCH_PENDING`, `ACTIVE`, `PAUSED`, `COMPLETED`).
* **Placement:** `packages/shared`.
* **Verdict:** ❌ **Bad Sharing.** Belongs in Campaign capability (`apps/api/src/campaign/domain/`).
* **Reasoning:** Campaign status represents explicit business invariants and domain state transitions. It is not domain-neutral.
* **Consequence of Incorrect Placement:** Leaks campaign lifecycle mechanics into unrelated modules (billing, identity). Any campaign state change ripples through unrelated packages.

### Example 3: `PaymentStatus` Enum
* **Proposed Abstraction:** Enum representing payment transaction states (`INITIALIZED`, `FUNDS_HELD`, `CAPTURED`, `FAILED`, `REFUNDED`).
* **Placement:** `packages/shared`.
* **Verdict:** ❌ **Bad Sharing.** Belongs in Payment capability (`apps/api/src/billing/domain/`).
* **Reasoning:** Financial state transitions must be strictly protected within the payment bounded context.
* **Consequence of Incorrect Placement:** Non-payment modules might attempt to inspect or manipulate transaction lifecycles directly, violating financial integrity.

### Example 4: `Money` Value Object vs. Campaign Budget Invariants
* **Proposed Abstraction:** A class representing monetary currency (`NGN`, `kobo: bigint`) along with platform daily minimum spend checks.
* **Placement:** `packages/shared`.
* **Verdict:** ❌ **Bad Sharing.**
* **Reasoning:** The pure immutable data structure (`amountInKobo`, `currency`) could be shared, but the *budget rules* (minimum daily spend, spend $\le$ total budget) belong strictly in `CampaignBudget` in the Campaign capability.
* **Consequence of Incorrect Placement:** Hardcodes advertising budget policies into a generic monetary type, forcing billing or payroll modules to carry ad spend rules.

### Example 5: Generic Entity Identifier Primitive (`EntityId`)
* **Proposed Abstraction:** `type EntityId = string;` with UUID validation.
* **Placement:** `packages/shared`.
* **Verdict:** ✅ **Good Sharing.**
* **Reasoning:** Pure structural format helper without business semantics.
* **Consequence of Incorrect Placement:** Duplicated string format regexes across every module.

### Example 6: `ICampaignRepository` Interface
* **Proposed Abstraction:** Outbound persistence port for saving and loading campaigns.
* **Placement:** `packages/shared`.
* **Verdict:** ❌ **Bad Sharing.** Belongs in Campaign application capability (`apps/api/src/campaign/application/ports/`).
* **Reasoning:** Interfaces are consumer-driven contracts owned by the specific use case that requires them.
* **Consequence of Incorrect Placement:** Turns `packages/shared` into an interface dump and obscures capability boundaries.

### Example 7: `IAIProviderContract`
* **Proposed Abstraction:** Interface defining provider-neutral AI model metadata and availability checks.
* **Placement:** `packages/shared`.
* **Verdict:** ❌ **Bad Sharing.** Belongs in `packages/ai` (`@boost-market/ai`).
* **Reasoning:** While provider-neutral, it represents a specialized capability domain (AI orchestration). It should not pollute the universal shared kernel.
* **Consequence of Incorrect Placement:** Couples non-AI consumers to AI-specific abstractions.

---

## 10. Existing Implementation Findings & Diagnostic Investigations

### 10.1. Current Workspace Reality
1. **Purity of Current `packages/shared`:**  
   [`packages/shared`](file:///c:/Users/DELL/Desktop/boostmarket/packages/shared) contains only `Result<T, E>`, `SystemStatus`, and `Environment`. It has **zero dependencies** in its `package.json` and zero external imports in its TypeScript files.
2. **Current Consumer Status:**
   - `SystemStatus`: 2 production consumers (`apps/api/src/health.controller.ts`, `app/page.tsx`). Fully compliant with normal admission criteria.
   - `Result<T, E>`: 1 production consumer (`packages/config/src/env.validator.ts`), 1 test consumer (`tests/sanity.test.ts`). Retained under a documented architectural exception as a foundational primitive.
   - `Environment`: 0 production consumers, 0 test consumers. Currently unconsumed and duplicates `AppEnvironment` in `packages/config`. Flagged for architectural reconsideration.
3. **Misplaced Items / Concerns:**  
   - No code in `packages/shared` is currently misplaced.
   - Historical documentation in ADR-001 referenced `packages/shared-kernel` and `packages/domain`. The monorepo layout adopted during Task 0.1.1 formalized this as `packages/shared`.
4. **Distinction of Consumers:**  
   - *Actual Production Consumers:* `packages/config`, `apps/api`, `app/page.tsx`.
   - *Test Consumers (Not Counted as Production Consumers):* `tests/sanity.test.ts`, `tests/helpers/test-builders.ts`.
   - *Planned Future Consumers:* Upcoming domain entities (`Campaign`, `BusinessProfile`) in Task 0.1.3 will consume `Result<T, E>`.

### 10.2. Investigation of Test Execution Failure

During Subtask 0.1.2.4, test execution attempts failed with non-zero exit codes. An investigation of the environment and repository logs yielded the following verified findings:

1. **Failure 1 — `npm test` exited with code 1:**  
   *Log Evidence:* `'tsx' is not recognized as an internal or external command, operable program or batch file.`  
   *Root Cause:* In `package.json`, `"test": "tsx --test 'tests/**/*.test.ts'"`. The repository root does not contain an installed `node_modules/` directory (`Test-Path c:\Users\DELL\Desktop\boostmarket\node_modules` returned `False`). Because dependencies have not been installed in this local directory, the local `tsx` binary does not exist on PATH.
2. **Failure 2 — `bun run test` exited with code 1:**  
   *Log Evidence:* `bun : The term 'bun' is not recognized as the name of a cmdlet, function, script file, or operable program.`  
   *Root Cause:* `bun` is not installed on this Windows host environment (or is not present on the system `PATH`), causing PowerShell to throw a `CommandNotFoundException`.
3. **Failure 3 — `npx tsx` cancelled:**  
   *Log Evidence:* Process remained active indefinitely with empty log output until manually cancelled.  
   *Root Cause:* In the absence of a local `node_modules` installation, `npx` attempted to download `tsx` from the registry and blocked waiting for interactive terminal confirmation (`Need to install the following packages: tsx. Ok to proceed? (y)`). Because background tasks run non-interactively without stdin, the command hung indefinitely.
4. **Conclusion:**  
   The test failures were entirely environmental—caused by missing `node_modules/` in the local workspace and the absence of `bun` on PATH. They were completely unrelated to the documentation files. Per strict task boundaries, dependencies were not installed, manifests were not modified, and tests remain unexecuted in this environment. **No claim is made that automated tests passed.**

---

## 11. Junior Engineer Technical Defense Guide

*How to defend shared-kernel boundaries in code reviews and PR discussions:*

1. **Question:** *"Why can't I put `CampaignStatus` in `packages/shared` so the Next.js frontend can import it to display the campaign status badge?"*  
   **Defense:** "`CampaignStatus` represents the internal lifecycle of the Campaign aggregate in the domain layer. The frontend should display whatever status string or public DTO the API returns in its response payload. If we share the internal domain enum across packages, any future refactor of campaign state transitions could break the frontend build."

2. **Question:** *"Both Campaign and Payment deal with money in Naira, why not put all money and fee calculation rules in `packages/shared`?"*  
   **Defense:** "While both deal with Naira, their business rules are completely different. The Campaign domain cares about daily minimum budgets and spend pacing. The Payment domain cares about gateway processing fees, VAT, and charge authorization. Putting business rules into `packages/shared` couples unrelated financial concerns."

3. **Question:** *"Why shouldn't I create an `ApiClient` or `fetchWrapper` in `packages/shared` to make HTTP calls easier for both frontend and backend?"*  
   **Defense:** "`packages/shared` must remain 100% pure TypeScript with zero I/O and zero network dependencies. An HTTP client introduces fetch semantics, environment variable reading, and browser/Node runtime differences. Frontend API calling belongs in frontend services (`lib/api.ts`), while backend HTTP calling belongs in infrastructure adapters."

4. **Question:** *"Isn't putting common code in `packages/shared` faster and more DRY?"*  
   **Defense:** "Premature sharing is far more expensive than duplication. DRY (Don't Repeat Yourself) refers to the duplication of *knowledge and business policy*, not mechanical code syntax. Sharing code between two unrelated capabilities introduces coupling. As Sandi Metz famously noted, 'Duplication is far cheaper than the wrong abstraction.'"

---

## 12. Mermaid Diagram: Shared Kernel & Capability Ownership Map

```mermaid
graph TD
    classDef shared fill:#065F46,stroke:#10B981,stroke-width:2px,color:#F8FAFC;
    classDef capability fill:#1E1B4B,stroke:#818CF8,stroke-width:2px,color:#F8FAFC;
    classDef forbidden fill:#450A0A,stroke:#EF4444,stroke-width:2px,stroke-dasharray: 4 4,color:#FCA5A5;
    classDef app fill:#0F172A,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC;

    subgraph SHARED_KERNEL ["packages/shared (@boost-market/shared)"]
        RESULT["Result&lt;T, E&gt;<br/>(Functional Error Handling)<br/>[Justified Architectural Exception]"]:::shared
        STATUS["SystemStatus<br/>(Health Telemetry)<br/>[&gt;=2 Prod Consumers]"]:::shared
        ENV["Environment<br/>(Runtime Descriptor)<br/>[0 Prod Consumers - Reconsider]"]:::shared
    end

    subgraph CAMPAIGN_CAPABILITY ["Campaign Capability (Capability-Owned)"]
        CAMP_AGG["Campaign Aggregate<br/>• Budget Validation<br/>• State Machine"]:::capability
        CAMP_PORT["ICampaignRepository<br/>(Outbound Port)"]:::capability
    end

    subgraph PAYMENT_CAPABILITY ["Payment Capability (Capability-Owned)"]
        PAY_AGG["Payment Entity<br/>• Transaction Ledger<br/>• Webhook Invariants"]:::capability
        PAY_PORT["IPaymentGateway<br/>(Outbound Port)"]:::capability
    end

    subgraph AI_CONTRACTS ["packages/ai (@boost-market/ai)"]
        AI_PORT["IAIProviderContract<br/>• AIModelMetadata"]:::capability
    end

    subgraph CONSUMERS ["Deployable Applications"]
        API["apps/api (NestJS Server)"]:::app
        WEB["Next.js Frontend (Root app/)"]:::app
    end

    %% Allowed Imports (Toward Shared Kernel)
    CAMPAIGN_CAPABILITY -->|"Uses Result Pattern"| RESULT
    PAYMENT_CAPABILITY -->|"Uses Result Pattern"| RESULT
    AI_CONTRACTS -->|"Uses Result Pattern"| RESULT
    CONSUMERS -->|"Imports Telemetry"| STATUS
    CONSUMERS -->|"Imports Primitives"| RESULT

    %% Forbidden Leakage into Shared Kernel
    CAMP_AGG x-.-x|"FORBIDDEN: Domain Leaking to Shared"| SHARED_KERNEL
    PAY_AGG x-.-x|"FORBIDDEN: Financial Rules in Shared"| SHARED_KERNEL
    CAMP_PORT x-.-x|"FORBIDDEN: Port Dumping in Shared"| SHARED_KERNEL
    PAY_PORT x-.-x|"FORBIDDEN: Port Dumping in Shared"| SHARED_KERNEL
    AI_PORT x-.-x|"FORBIDDEN: AI Semantics in Shared"| SHARED_KERNEL
```
