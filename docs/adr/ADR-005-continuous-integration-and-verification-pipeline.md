# ADR 005: Continuous Integration and Verification Pipeline

## Status
Accepted

## Date
2026-10-29

## Context
Across Subtasks 0.1.1.2 through 0.1.1.5, we established strict TypeScript compiler guards, flat ESLint standards, a 4-tier testing pyramid, and fail-fast configuration architecture.

To prevent regressions, we require an automated Continuous Integration (CI) gate. Furthermore, we must establish a single, canonical, reproducible package manager and lockfile strategy.

Inspection of the repository revealed:
- `bun.lock` (text-based lockfile v2) already exists in the repository root tracking 1,054 dependencies.
- `bun install --frozen-lockfile` executes in ~130ms and installs dependencies with zero mutation.
- In contrast, running `npm install --package-lock-only` triggers an upstream bug in npm's arborist tree resolver (`TypeError: Cannot read properties of null (reading 'edgesOut')`) due to complex peer dependency resolution between Next.js 15, React 19, and NestJS 12.
- Maintaining two competing lockfiles would create drift and sync failures.

## Decision

1. **Authoritative Package Manager & Lockfile:**
   - **Bun** (`v1.4.4`) is established as the canonical package manager for dependency resolution and lockfile management.
   - `bun.lock` is the single authoritative source of truth for dependencies.
   - CI executes `bun install --frozen-lockfile` using the official `oven-sh/setup-bun@v2` action, guaranteeing 100% frozen, reproducible dependency trees.

2. **Application Execution Runtime:**
   - Node.js `22.x` (LTS) remains the canonical application execution runtime for running tests, compilers, NestJS, and Next.js.
   - CI provisions both Node.js 22 and Bun 1.4.4.

3. **Unified Local Verification Command (`npm run verify` / `bun run verify`):**
   - Chains the four established quality gates in sequence:
     $$\text{typecheck} \longrightarrow \text{lint} \longrightarrow \text{test} \longrightarrow \text{build}$$
   - Fails fast on the first error and returns a non-zero exit code.
   - Allows developers to reproduce CI locally with 100% parity before committing.

4. **Standardization on GitHub Actions (`.github/workflows/ci.yml`):**
   - Uses GitHub Actions as the native CI platform.
   - Runs on all pull requests and pushes targeting `main`.

5. **Zero Production Secrets in CI:**
   - The CI pipeline executes tests against in-memory fixtures and builds production artifacts with zero requirement for external production credentials.

## Alternatives Considered & Rejected

1. **Forcing `npm install` and generating `package-lock.json`:**
   - *Rejected:* Fails due to upstream npm arborist resolver bug with React 19 and Nest 12 peer dependencies. Would introduce unresolvable dependency conflicts.
2. **Dual-Lockfile Policy (`bun.lock` + `package-lock.json`):**
   - *Rejected:* Dual lockfiles inevitably drift out of sync, causing "works on machine A (bun), breaks on machine B (npm)" failures.
3. **Multi-Node Version Matrix (Node 20 + Node 22):**
   - *Rejected:* Adds duplicate runner minutes without architectural need. Boost Market targets modern Node 22 container environments.

## Consequences
- **Positive:**
  - `bun install --frozen-lockfile` runs in milliseconds, making CI builds exceptionally fast.
  - Exactly one lockfile (`bun.lock`) is maintained as the source of truth.
  - Automated gatekeeper blocks broken code from entering the `main` branch.
  - Developers have a single command (`npm run verify`) to ensure full compliance before pushing.
- **Trade-offs:**
  - CI workflow requires setting up Bun alongside Node.js.
