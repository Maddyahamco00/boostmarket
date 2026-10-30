# Contract Testing Strategy

This directory contains contract test suites for Boost Market's external integration adapters.

## Purpose of Contract Tests
Contract tests verify that our infrastructure adapters conform to external provider API schemas without making live, billable network requests during development.

## Target External Providers (Epics 7, 10, 17)
- **Paystack API:** Verifying payment initiation, charge authorization, and webhook signature verification schemas.
- **Flutterwave API:** Fallback payment contract verification.
- **Meta Graph API:** Verifying campaign creation, ad set targeting, and creative upload payload schemas.
- **Google Ads API:** Verifying keyword targeting, budget allocation, and reporting schemas.
- **AI Providers (Gemini / OpenAI):** Verifying provider-agnostic adapter outputs conform to `IAIProviderContract`.

## Execution Rules
1. **Never Call Live Production APIs:** Contract tests run against recorded WireMock fixtures or schema validators.
2. **Deterministic Responses:** Contract fixtures must be versioned alongside the code.
3. **Run Command:**
   ```bash
   npm run test:contract
   ```
