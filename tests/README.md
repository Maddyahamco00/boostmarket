# Boost Market Testing Suite

This directory contains automated test suites for the Boost Market platform.

## Test Directory Structure
```text
tests/
├── helpers/                    # Shared test utilities
│   ├── test-clock.ts           # Deterministic IClock implementation
│   └── test-builders.ts        # Test data builders
├── unit/                       # Unit tests (*.test.ts)
├── integration/                # Integration tests (*.integration.test.ts)
├── contract/                   # Contract tests (*.contract.test.ts)
├── e2e/                        # End-to-end user journeys (*.e2e.test.ts)
├── sanity.test.ts              # System baseline sanity tests
├── config.test.ts              # Configuration validation tests
└── README.md                   # This runbook
```

## Available Test Commands
| Command | Target | Description |
| :--- | :--- | :--- |
| `npm test` | All tests | Runs complete test suite across all tiers |
| `npm run test:unit` | Unit tier | Runs fast isolated unit tests and sanity checks |
| `npm run test:integration` | Integration tier | Runs module and configuration integration tests |
| `npm run test:contract` | Contract tier | Runs external provider contract compliance tests |
| `npm run test:e2e` | E2E tier | Runs full-stack critical merchant user journeys |

## Standards Reference
See [TESTING_STANDARDS.md](../docs/standards/TESTING_STANDARDS.md) and [ADR-004](../docs/adr/ADR-004-testing-architecture-and-test-double-strategy.md).
