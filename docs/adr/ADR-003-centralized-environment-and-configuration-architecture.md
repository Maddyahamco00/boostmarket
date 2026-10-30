# ADR 003: Centralized Environment & Configuration Architecture

## Status
Accepted

## Date
2026-10-06

## Context
Boost Market integrates multiple complex external subsystems: PostgreSQL, Redis, Google Gemini, OpenAI, Paystack, Flutterwave, Meta Graph API, Google Ads API, object storage, and observability pipelines.

Without strict configuration governance, systems face critical failure modes:
1. **Secret Leakage:** Server credentials inadvertently bundled into client JavaScript bundles via improper environment variable naming.
2. **Delayed Runtime Crashes:** Applications starting with missing or malformed configuration, crashing mid-transaction minutes or hours later when accessing an undefined variable.
3. **Configuration Drift:** Inconsistent naming and ad-hoc parsing across micro-services and libraries.
4. **Log Poisoning:** Configuration validation errors accidentally printing plaintext passwords or private keys in logs.

## Decision
We establish a centralized, typed configuration architecture governed by the following rules:

1. **Strict Separation of Public Configuration vs. Sensitive Secrets:**
   - **Public:** Only variables explicitly safe for user browser inspection use the `NEXT_PUBLIC_` prefix (e.g. `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY`).
   - **Secrets:** All server credentials (database connection strings, private API keys, payment secret keys) must NEVER use `NEXT_PUBLIC_` and are completely inaccessible to browser bundles.
2. **Centralized Schema-Based Validation (`@boost-market/config`):**
   - Application code must never access raw `process.env` directly.
   - All environment variables are validated at startup through pure schema validator functions returning typed `Result<ServerConfig, ConfigValidationError>`.
3. **Fail-Fast Invariant:**
   - In `production`, missing critical variables (`DATABASE_URL`, `JWT_SECRET`) halts the process immediately before the application binds to its network port.
4. **Sanitized Error Output:**
   - Validation failure messages identify the failing variable key and validation rule, but NEVER print the actual raw value of a secret.
5. **Provider-Agnostic Boundaries:**
   - AI, Payment, and Advertising configurations are isolated behind modular, typed interfaces. Activating or swapping a provider requires no changes to core business code.

## Consequences
- **Positive:**
  - Zero risk of backend secrets leaking into client bundles.
  - Predictable, typed access across all NestJS services via `ApiConfigService`.
  - Comprehensive unit test coverage verifying error handling and redaction.
  - Immediate, clear error diagnostics during deployment misconfigurations.
- **Trade-offs:**
  - Introducing a new environment variable requires updating `.env.example`, `config.types.ts`, and `env.validator.ts`.
