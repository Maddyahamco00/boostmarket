# Boost Market — Agentic AI Advertising SaaS Platform

**Project Owner:** Muhammad Kabeer Ahmed  
**Target Market:** Nigerian businesses, with international expansion in mind  
**Development Horizon:** 12–18 months  
**Status:** Active Foundation Engineering (Epic 0: Product Foundation & Engineering Architecture)

---

## 1. What Boost Market Is

Boost Market is an agentic AI-powered advertising orchestration platform designed to simplify digital advertising for businesses. Instead of requiring a business owner to master complex ad platforms (Meta, Facebook, Instagram, Google Ads, YouTube), Boost Market acts as an intelligent intermediary and campaign orchestrator.

### The Product Operating Loop
$$\text{Understand} \longrightarrow \text{Plan} \longrightarrow \text{Create} \longrightarrow \text{Execute} \longrightarrow \text{Observe} \longrightarrow \text{Analyze} \longrightarrow \text{Optimize} \longrightarrow \text{Repeat}$$

---

## 2. Project & Monorepo Structure

Boost Market uses a **Modular Monorepo** managed via workspaces with Bun as the authoritative package manager and Node.js 22 as the application execution runtime:

```text
boost-market/
├── .github/
│   └── workflows/
│       └── ci.yml              # GitHub Actions CI workflow (Bun + Node 22)
├── apps/
│   ├── web/                    # Next.js 15 frontend application (Port 3000)
│   └── api/                    # NestJS 11 backend orchestration API (Port 3001)
├── packages/
│   ├── shared/                 # Common primitives, Result<T, E> error types, SystemStatus
│   ├── ai/                     # Provider-agnostic AI contracts & interfaces
│   └── config/                 # Centralized configuration schema, types, and validators
├── docs/
│   ├── adr/                    # Architecture Decision Records (ADR-001 through ADR-005)
│   └── standards/              # DEVELOPMENT_STANDARDS.md & TESTING_STANDARDS.md
├── infrastructure/             # CI documentation, deployment manifests
├── tests/                      # Structured testing pyramid (helpers, unit, integration, contract, e2e)
├── .nvmrc                      # Canonical Node.js runtime version (22)
├── bun.lock                    # Authoritative dependency lockfile
├── tsconfig.base.json          # Shared strict TypeScript compiler configuration
├── tsconfig.json               # Root workspace path mappings
├── package.json                # Root workspace configuration and unified scripts
└── README.md                   # System documentation and operational guide
```

---

## 3. Continuous Integration & Quality Gates

Boost Market enforces automated quality gates via GitHub Actions (`.github/workflows/ci.yml`) on every pull request and push to `main`.

### The Unified Verification Gate
Before committing or creating a pull request, developers run:

```bash
bun install --frozen-lockfile
npm run verify
```

This single command executes the four core verification gates in deterministic order:
1. `npm run typecheck`: Validates strict TypeScript compilation (`tsc --noEmit`).
2. `npm run lint`: Enforces code standards and unused code checks via ESLint.
3. `npm test`: Runs the automated test suite (19 unit & integration tests) in Node.js 22.
4. `npm run build`: Compiles production bundles for both NestJS (`apps/api`) and Next.js (`apps/web`).

---

## 4. Development & Build Commands

From the root directory:

| Task | Command | Description |
| :--- | :--- | :--- |
| **Reproducible Install** | `bun install --frozen-lockfile` | Installs dependencies strictly from `bun.lock` with zero drift |
| **Unified Verification** | `npm run verify` | Runs Typecheck $\rightarrow$ Lint $\rightarrow$ Test $\rightarrow$ Build (matches CI) |
| **All Tests** | `npm test` | Runs complete automated test suite |
| **Unit Tests** | `npm run test:unit` | Runs fast unit test tier |
| **Integration Tests** | `npm run test:integration` | Runs integration test tier |
| **Start Web App** | `npm run dev:web` | Runs the Next.js development server on `http://localhost:3000` |
| **Start API App** | `npm run dev:api` | Runs the NestJS API server on `http://localhost:3001` via `tsx` |
| **Full Build** | `npm run build` | Compiles both API (`apps/api`) and Web (`apps/web`) production bundles |
| **Build API** | `npm run build:api` | Compiles NestJS TypeScript sources to `apps/api/dist` |
| **Build Web** | `npm run build:web` | Compiles Next.js optimized production bundle |
| **Typecheck** | `npm run typecheck` | Verifies strict TypeScript compliance across all packages |
| **Lint** | `npm run lint` | Runs ESLint across the codebase |

---

## 5. Architectural Decision Records (ADRs)

1. **[ADR-001: Modular Monorepo & Clean Architecture](docs/adr/ADR-001-monorepo-modular-clean-architecture.md)**
2. **[ADR-002: Engineering Standards & AI Governance Framework](docs/adr/ADR-002-engineering-standards-and-ai-governance.md)**
3. **[ADR-003: Centralized Environment & Configuration Architecture](docs/adr/ADR-003-centralized-environment-and-configuration-architecture.md)**
4. **[ADR-004: Testing Architecture & Test Double Strategy](docs/adr/ADR-004-testing-architecture-and-test-double-strategy.md)**
5. **[ADR-005: Continuous Integration & Verification Pipeline](docs/adr/ADR-005-continuous-integration-and-verification-pipeline.md)**
