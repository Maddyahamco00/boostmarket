# ADR 002: Engineering Standards and AI Governance Framework

## Status
Accepted

## Date
2026-10-05

## Context
Boost Market is built as a commercial-grade, multi-decade SaaS platform where engineering is heavily accelerated through AI pair programming.
AI-assisted software development presents a specific failure mode: rapid generation of unstructured code that gradually erodes Clean Architecture boundaries, leaks business logic into presentation layers, disables type-checking to hide build errors, and compromises security and financial consistency.

To prevent architectural degradation, Boost Market requires an explicit, immutable governance contract that binds all future engineering work.

## Decision
We formally adopt:
1. **Clean Architecture Layering Invariant:**
   - Presentation (Next.js / Controllers) $\rightarrow$ Application (Use cases) $\rightarrow$ Domain (Core rules) $\leftarrow$ Infrastructure (Adapters).
   - Core domain logic has strictly zero dependencies on external frameworks or vendors.
2. **TypeScript & Quality Invariants:**
   - Strict mode enabled across all packages.
   - Elimination of `any` in favor of `unknown` with runtime schema validation.
   - Flat ESLint configuration enforcing unused code detection.
3. **Deterministic Financial & Security Authority:**
   - AI models and agents can analyze, summarize, recommend, and draft content.
   - Deterministic backend services hold 100% authoritative control over money calculations, payment transitions, authorization, database mutations, and external ad spend.
4. **The 10 AI Governance Rules:**
   - Zero unjustified dependencies.
   - Explanation before implementation.
   - No disabling tests, linting, or compiler strictness.
   - Mandatory human review and stop-and-verify workflow for Muhammad Kabeer Ahmed.

## Consequences
- **Positive:**
  - Preserves system architecture integrity as hundreds of tasks and epics are developed.
  - Ensures Muhammad deeply understands every architectural decision and code pattern.
  - Guarantees financial and transactional safety in the production platform.
- **Trade-offs:**
  - Requires disciplined review after every subtask rather than rushing ahead.
