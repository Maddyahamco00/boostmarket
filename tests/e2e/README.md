# End-to-End (E2E) Testing Strategy

This directory contains End-to-End (E2E) test specifications for Boost Market's critical merchant journeys.

## Purpose of E2E Tests
E2E tests validate that the entire system functions cohesively across the frontend portal (`apps/web`), backend orchestration API (`apps/api`), database transactions, and background queues.

## Critical Future Journeys (To Be Tested in Future Epics)
1. **Merchant Onboarding Journey:**
   - Registration $\rightarrow$ Business Profile creation $\rightarrow$ Workspace verification.
2. **AI Campaign Generation Journey:**
   - Goal definition $\rightarrow$ Creative generation $\rightarrow$ Budget recommendation $\rightarrow$ Merchant approval.
3. **Campaign Execution & Payment Journey:**
   - Wallet funding / Paystack checkout $\rightarrow$ Ad dispatch $\rightarrow$ Real-time campaign observation $\rightarrow$ Budget containment.

## Invariants
- E2E tests represent approximately **10%** of total test coverage (apex of the Testing Pyramid).
- Tests must be deterministic and run against isolated staging/test environments.
- Run Command:
  ```bash
  npm run test:e2e
  ```
