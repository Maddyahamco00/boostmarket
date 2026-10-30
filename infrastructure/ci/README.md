# Continuous Integration (CI) Pipeline

This directory documents the automated quality and verification pipeline for the Boost Market monorepo.

## CI Workflow Overview
- **Workflow File:** `.github/workflows/ci.yml`
- **Triggers:**
  - Pull requests targeting `main`
  - Direct pushes to `main`
- **Package Manager:** Bun `v1.4.4`
- **Authoritative Lockfile:** `bun.lock` (text-based lockfile v2)
- **Installation Method:** `bun install --frozen-lockfile` (100% reproducible, zero-mutation install)
- **Application Runtime:** Node.js `22.x` (LTS) on `ubuntu-latest`
- **Secrets Policy:** Zero production credentials or secrets are used in CI. Unit tests mock external boundaries, and build steps compile production bundles cleanly.

## Verification Gates (In Order)
When CI executes, it runs `npm run verify` (or `bun run verify`), which executes four deterministic quality gates in sequence:

1. **Typecheck (`npm run typecheck`):**
   - Invokes TypeScript compiler (`tsc --noEmit`) across all workspace packages and apps.
   - Fails on any type mismatches, missing properties, or unhandled nullability.
2. **Linting (`npm run lint`):**
   - Invokes ESLint 9 using flat configuration (`eslint.config.mjs`).
   - Fails on unused variables, syntax errors, or unhandled promise rejections.
3. **Automated Tests (`npm test`):**
   - Runs native Node.js 22 test runner across all test tiers (`tests/**/*.test.ts`).
   - Fails if any assertion fails or an unhandled exception occurs.
4. **Production Build (`npm run build`):**
   - Compiles NestJS API (`apps/api`) via `tsc -p apps/api/tsconfig.json`.
   - Compiles Next.js Web app (`apps/web`) via `next build`.
   - Fails if bundling, page compilation, or build-time assets are invalid.

## Reproducing CI Locally
Developers must run the exact same verification pipeline locally before submitting a pull request:

```bash
bun install --frozen-lockfile
npm run verify
```

If any gate fails, the command stops immediately and outputs the specific error with a non-zero exit code.
