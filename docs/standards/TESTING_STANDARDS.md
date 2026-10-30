# Boost Market — Testing Standards & Quality Handbook

**Author & Project Owner:** Muhammad Kabeer Ahmed  
**Governing Principle:** *Tests must verify business behavior and prevent regressions, not merely increase coverage numbers.*

---

## 1. The Testing Pyramid

Boost Market follows a disciplined 4-tier testing pyramid:

```text
                  ┌──────────────┐
                  │  E2E (10%)   │ Critical full-stack merchant journeys
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │Contract (20%)│ External API schema compliance (Meta, Paystack, AI)
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │ Integration  │ NestJS modules, repository transactions, Redis
                  │    (30%)     │
                  └──────┬───────┘
                         │
                  ┌──────▼───────┐
                  │  Unit (40%)  │ Pure domain logic, Value Objects, Money arithmetic
                  └──────────────┘
```

### 1. Unit Tests (40% of Suite)
- **Scope:** Pure functions, Value Objects, Entities, Domain Services, State Machines, and Validation Rules.
- **Invariants:**
  - Must execute in single-digit milliseconds.
  - Zero database I/O, zero network calls, zero file-system dependencies.
  - 100% deterministic: controlled clocks, fixed seeds.
- **Execution:** `npm run test:unit`

### 2. Integration Tests (30% of Suite)
- **Scope:** NestJS modules, configuration services, database repositories, and cache interaction.
- **Invariants:**
  - Verify interaction between application use cases and infrastructure adapters.
  - Verify database constraints, cascade rules, and transaction boundaries.
- **Execution:** `npm run test:integration`

### 3. Contract Tests (20% of Suite)
- **Scope:** External vendor adapters (Paystack, Flutterwave, Meta Graph API, Google Ads API, Gemini/OpenAI).
- **Invariants:**
  - **Never call live production APIs during automated tests.**
  - Test against recorded schema fixtures, WireMock mocks, or contract validators.
  - Verify that changes to internal adapters do not break vendor payload requirements.
- **Execution:** `npm run test:contract`

### 4. End-to-End (E2E) Tests (10% of Suite)
- **Scope:** Complete end-to-end user journeys (e.g., Merchant Registration $\rightarrow$ AI Campaign Draft $\rightarrow$ Paystack Checkout $\rightarrow$ Campaign Dispatch).
- **Invariants:**
  - Run against isolated test environments.
  - Focus exclusively on revenue-critical, business-vital paths.
- **Execution:** `npm run test:e2e`

---

## 2. Test-Driven Development (TDD) Workflow

For high-risk business logic (financial math, wallet balances, budget caps, state machines, authorization):

```text
┌──────────────┐     Write failing test describing desired behavior
│     RED      │ ──► (Test fails because feature does not exist yet)
└──────┬───────┘
       │
┌──────▼───────┐     Write minimum code necessary to make test pass
│    GREEN     │ ──► (Verify test passes without adding extra fluff)
└──────┬───────┘
       │
┌──────▼───────┐     Clean up code, extract helpers, optimize design
│   REFACTOR   │ ──► (All tests must stay green during refactoring)
└──────────────┘
```

*Note on Pragmatism:* TDD does not mean writing tests for trivial property getters or pure framework wiring. Apply TDD where business logic carries financial or contractual risk.

---

## 3. Behavior-Driven Development (BDD) & Given-When-Then

Tests must describe business behavior in clear, human-readable terms using the **Given-When-Then** narrative structure:

```typescript
describe("Campaign Budget Enforcement", () => {
  it("should reject spend when requested amount exceeds remaining budget", () => {
    // GIVEN a campaign with ₦50,000 budget and ₦40,000 already spent
    const campaign = new CampaignBuilder()
      .withBudget(50_000)
      .withSpent(40_000)
      .build();

    // WHEN attempting to allocate ₦15,000 to an ad set
    const result = campaign.allocateSpend(15_000);

    // THEN the transaction must fail with budget exceeded error
    assert.equal(result.isFailure, true);
    assert.match(result.getError(), /Budget exceeded/);
  });
});
```

---

## 4. Test Naming Conventions

Always use descriptive, behavior-oriented test names:
- **Rule:** `should <expected outcome> when <condition / input>`
- **Good:**
  - `should successfully validate standard development configuration`
  - `should fail fast if required production variables are missing`
  - `should advance time deterministically when advanceSeconds is invoked`
- **Bad:**
  - `test1`
  - `checkConfig`
  - `testBudget`

---

## 5. Test Organization & Directories

Tests are organized into structured directories according to their tier:

```text
tests/
├── helpers/                    # Shared test doubles, clocks, builders
│   ├── test-clock.ts           # Deterministic IClock implementation
│   └── test-builders.ts        # Test data builders
├── unit/                       # Unit tests (*.test.ts)
├── integration/                # Integration tests (*.integration.test.ts)
├── contract/                   # Contract tests (*.contract.test.ts)
├── e2e/                        # End-to-end tests (*.e2e.test.ts)
├── sanity.test.ts              # System baseline sanity
├── config.test.ts              # Configuration validation tests
└── README.md                   # Quick reference runbook
```

---

## 6. Test Data Strategy: Builders & Factories

Avoid copying large, hardcoded JSON objects across tests. Use **Test Data Builders**:
- **Default Sensible Values:** Builders pre-populate valid defaults.
- **Fluent Overrides:** Tests only specify the exact fields relevant to the behavior being asserted (`withStatus()`, `withUptime()`, `withBudget()`).
- **Immutability:** Builders return frozen objects (`Object.freeze()`) to prevent shared state contamination.

---

## 7. Test Doubles: Mocks vs. Fakes vs. Stubs vs. Spies

| Test Double | Purpose | When to Use in Boost Market |
| :--- | :--- | :--- |
| **Fake** | Working in-memory implementation of an interface. | **Preferred for Repositories:** `InMemoryCampaignRepository`, `InMemoryMerchantRepository`. |
| **Stub** | Pre-programmed canned answers to queries. | For deterministic lookups: stubbing exchange rates, geo-IP lookups. |
| **Mock** | Object verifying expected method calls and parameters. | For external command boundaries: verifying that Paystack or Meta adapter was invoked once. |
| **Spy** | Wrapper recording execution history without altering behavior. | For observing internal event dispatch or telemetry calls. |

*Golden Rule:* **Never mock internal domain logic.** Real domain entities and value objects must be used in unit tests. Reserve test doubles for external network, disk, or clock boundaries.

---

## 8. Deterministic Testing Rules

A test that passes 99% of the time and fails 1% of the time is worse than a broken test.
1. **No Real-World Clock Dependency:** Use `TestClock` to set and advance time. Never use `new Date()` directly in domain time logic.
2. **No Random Number Generators:** Seed all pseudo-random generators or pass deterministic IDs.
3. **No External Network Dependencies:** All unit and integration tests must execute offline without internet access.
4. **No Shared Mutable State:** Clean up databases or reset in-memory state before each test (`beforeEach`).

---

## 9. Future Database Testing Strategy

1. **Unit Tier:** Use in-memory repository fakes (`InMemoryRepository`). Zero database setup needed.
2. **Integration Tier:**
   - In local development & CI: Run an ephemeral PostgreSQL container via Docker.
   - Run migrations before test suites.
   - Wrap each test transaction in a database rollback, or truncate test tables between runs.
   - **Never connect to a live staging or production database during tests.**

---

## 10. External API Testing Strategy

1. **AI Providers (Gemini / OpenAI):**
   - Unit tests use the `mock` AI provider (`AI_DEFAULT_PROVIDER="mock"`).
   - Contract tests verify prompt rendering and schema parsing against recorded JSON fixtures.
2. **Payment Providers (Paystack / Flutterwave):**
   - Webhook signature validation tested against mock payloads and HMAC keys.
   - Charge initialization tested using stubbed HTTP adapters.
3. **Advertising Platforms (Meta / Google Ads):**
   - Ad creation payloads tested against offline Meta Graph API response fixtures.

---

## 11. AI-Assisted Code Testing Rules

When AI assists in developing features:
1. **AI Must Not Bypass Tests:** AI is strictly forbidden from deleting, commenting out, or weakening assertions to make a test pass.
2. **AI Must Not Write Circular Tests:** Tests must verify business outcomes, not mirror the private implementation details of a class.
3. **No Meaningless Coverage Padding:** AI must not write 50 trivial tests for simple getters while ignoring edge cases.
4. **Investigation Over Masking:** If a test fails, AI must diagnose the root cause rather than tweaking test parameters to fit the bug.
5. **Mandatory Edge Case Verification:** AI-generated financial, billing, or access-control logic must include boundary and failure tests (negative testing).

---

## 12. Coverage Philosophy: Risk-Based Over Vanity

- **Meaningful Coverage:** We prioritize high branch coverage on core domain logic, money calculations, and security gates.
- **Vanity Numbers Rejected:** We do not mandate an arbitrary global percentage (e.g. 100%) that incentivizes writing low-value tests for generated code or UI templates.
- **Quality Metric:** A test suite is high-quality when refactoring internal implementation details breaks zero tests, but changing a business rule breaks exactly the expected tests.
