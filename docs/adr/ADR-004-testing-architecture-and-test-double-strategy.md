# ADR 004: Testing Architecture and Test Double Strategy

## Status
Accepted

## Date
2026-10-06

## Context
As Boost Market evolves through AI-accelerated development across multiple epics (campaigns, AI reasoning, fintech payments, ad networks), a disorganized or brittle testing approach would lead to:
1. Slow, flaky test suites that depend on live internet connections or external paid APIs.
2. Over-mocked unit tests where tests pass but real code fails in production due to mocked-out domain logic.
3. Inconsistent test naming and test data creation, making tests difficult to understand and maintain.
4. AI generating superficial tests merely to satisfy code coverage numbers.

## Decision
We formally adopt:
1. **The 4-Tier Testing Pyramid:**
   - Unit Tests (40%), Integration Tests (30%), Contract Tests (20%), End-to-End Tests (10%).
2. **Native Tooling with Zero Extra Dependencies:**
   - Standardize on Node.js 22 native test runner (`node:test`, `node:assert/strict`) executed via `tsx --test`.
   - Avoid heavy test frameworks until browser DOM emulation is strictly required.
3. **Test Doubles Invariant:**
   - **Never mock pure domain entities or business logic.**
   - Use in-memory Fakes for repositories, Stubs for deterministic lookups, Mocks for external command dispatch, and Spies for observation.
4. **Deterministic Testing:**
   - Mandate controlled clocks (`TestClock`) and test data builders (`SystemStatusBuilder`, `TestEnvironmentBuilder`) for all time- and data-dependent tests.
5. **Zero External Billing Invariant:**
   - Automated test runs must NEVER initiate live network calls or billable requests to Paystack, Meta, Google Ads, or AI providers.
6. **AI Testing Governance:**
   - AI must verify behavioral outcomes and edge cases; weakening tests or writing circular assertions is strictly prohibited.

## Consequences
- **Positive:**
  - Test suites execute in under 1 second.
  - Zero flakiness from network latency or third-party outages.
  - Clear run commands for developers and future CI: `npm run test:unit`, `npm run test:integration`, `npm run test:contract`, `npm run test:e2e`.
- **Trade-offs:**
  - Requires writing and maintaining test data builders and contract fixtures rather than relying on ad-hoc mocks.
