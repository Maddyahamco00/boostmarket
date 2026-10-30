# ADR 001: Monorepo and Modular Clean Architecture

## Status
Accepted

## Date
2026-10-05

## Context
Boost Market is an agentic AI-powered advertising SaaS platform designed to scale to millions of businesses and operate reliably across decades.
The system encompasses multiple distinct responsibilities:
1. Web client (merchant onboarding, discovery portal, dashboard, campaign planning wizard).
2. Backend API & orchestration (business logic, state machines, job queues, webhook verification).
3. Core domain models (pure enterprise business rules, aggregates, entities, value objects).
4. AI provider abstractions (provider-agnostic contracts for OpenAI, Google Gemini, and future models).
5. External ad network adapters (Meta Graph API, Google Ads API).

We evaluated three architectural approaches:
- **Approach A: Multirepo (Separate Repositories)**: High operational overhead, contract drift between client and server, friction in shared domain model evolution.
- **Approach B: Tightly-Coupled Single Application**: Merging business domain logic directly into Next.js routes/pages. Leads to architectural decay, vendor lock-in, and framework coupling.
- **Approach C: Modular Monorepo with Clean/Hexagonal Architecture (Selected)**: Co-locates applications (`apps/`) and isolated packages (`packages/`) with strict dependency rules.

## Decision
We adopt a **Modular Monorepo** architecture structured as follows:
- `packages/shared-kernel`: Foundational abstractions (Result pattern, BaseEntity, ValueObject). Zero dependencies.
- `packages/domain`: Pure Domain-Driven Design (DDD) domain layer. Contains business invariants, entities, value objects, domain events, and state machines. **Strictly zero framework or external vendor dependencies**.
- `packages/ai-contracts`: Provider-agnostic interfaces (`IReasoningEngine`, `ICreativeGenerator`, `IVisionAnalyzer`). Business logic depends on these ports, while concrete adapters (Gemini, OpenAI) implement them.
- `packages/ad-contracts`: Advertising distribution ports (`IAdChannelProvider`) isolating Meta, Google, and future platforms behind strict contracts.
- `apps/web`: Next.js web application (presentation layer).
- `apps/api`: NestJS/Node.js API service (orchestration and application layer).

## Invariants & Dependency Rules
1. **The Dependency Rule:** Dependencies must point inward only.
   `Presentation / Apps` ➔ `Application / Orchestration` ➔ `Domain Core`.
2. **Domain Purity:** The domain package (`@boost/domain`) MUST NEVER import from React, Next.js, Prisma, Express, NestJS, or third-party AI/payment SDKs.
3. **Provider Agnosticism:** Core code interacts with AI capabilities via ports in `@boost/ai-contracts`. Swapping a vendor requires only a new adapter implementation, not domain modification.
4. **Deterministic Authority:** Financial, access control, and state machine transitions remain 100% deterministic and verified by backend rules. AI agents propose actions; deterministic software validates and commits them.

## Consequences
- **Positive:**
  - Single source of truth for all business rules and types across web, mobile, and backend.
  - Zero contract drift between frontend and backend.
  - High testability: domain logic can be tested in isolation with fast, mock-free unit tests.
  - Long-term maintainability: easily transition or add services without rewriting business models.
- **Trade-offs:**
  - Requires discipline in maintaining dependency boundaries and path aliases.
