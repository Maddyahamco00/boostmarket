# Boost Market — Internal Layered Architecture (Domain, Application, Infrastructure)

**Document Version:** 1.0.0  
**Status:** Approved Architectural Baseline  
**Date:** 2026-10-30  
**Author:** Muhammad Kabeer Ahmed & Core Engineering Team  
**Governing Documents:**  
- [Application Boundaries (Macro-Architecture)](./application-boundaries.md)  
- [ADR-001: Monorepo and Modular Clean Architecture](../adr/ADR-001-monorepo-modular-clean-architecture.md)  
- [Development Standards](../standards/DEVELOPMENT_STANDARDS.md)

---

## 1. Purpose

This document defines the **internal architectural layers** of the Boost Market platform. While `docs/architecture/application-boundaries.md` established the macro-level boundaries between deployable applications (`apps/web`, `apps/api`) and shared packages (`packages/shared`, `packages/ai`, `packages/config`), this document governs the **internal structural layers** that organize code within those boundaries:

1. **The Domain Layer:** Pure enterprise business rules, entities, value objects, and domain invariants.
2. **The Application Layer:** Business use cases, workflow orchestrators, and inbound/outbound port definitions.
3. **The Infrastructure Layer:** Technical implementations of external ports (databases, external ad networks, AI SDKs, payment gateways, message queues).

The goal of this architecture is to ensure that Boost Market can scale to support complex AI agentic workflows, multi-channel advertising distribution (Meta, Google Ads), and high-volume local payments (Paystack, Flutterwave) without permitting any third-party framework, database, or vendor SDK to dictate, leak into, or constrain enterprise business logic.

---

## 2. Architectural Principles

The internal layering follows **Clean Architecture**, **Hexagonal Ports & Adapters**, and **Domain-Driven Design (DDD)** principles:

1. **The Inward Dependency Rule:**  
   Dependencies flow strictly inward:
   $$\text{Infrastructure Layer} \longrightarrow \text{Application Layer} \longrightarrow \text{Domain Layer}$$
   - The Domain Layer has **zero dependencies** on outer layers, frameworks, or libraries.
   - The Application Layer depends **only on the Domain Layer**.
   - The Infrastructure Layer depends on the Application and Domain Layers by implementing the abstract interfaces (ports) they declare.
2. **Separation of Concerns:**  
   - Business rules live in the Domain.
   - Workflow choreography lives in the Application.
   - Framework routing, database storage, and network communication live in the Infrastructure / Presentation tiers.
3. **Dependency Inversion Principle (DIP):**  
   High-level business policies do not depend on low-level technical details; both depend on abstractions. Application use cases declare what they need via TypeScript `interfaces` (ports). Infrastructure modules provide concrete classes that implement those interfaces.
4. **Deterministic Authority over AI Inference:**  
   Probabilistic AI models provide recommendations, generate creative variants, and propose bid adjustments. Deterministic domain code strictly validates, enforces invariants, and commits state transitions and financial debits.
5. **Pragmatic Evolution over Premature Complexity:**  
   Patterns such as Command Query Responsibility Segregation (CQRS) or Event Sourcing are reserved for specific performance bottlenecks rather than introduced as generic boilerplate.

---

## 3. Domain Layer

### 3.1. Core Responsibilities
The Domain Layer is the conceptual core of Boost Market. It represents pure business logic, enterprise models, and business calculations that would remain true even if the application were operated manually with paper ledgers.

The Domain Layer is responsible for:
- **Entities & Aggregates:** Maintaining identity, lifecycle transitions, and business invariants across related objects.
- **Value Objects:** Modeling immutable concepts defined entirely by their attributes with self-validating constructors.
- **Domain Services:** Encapsulating pure business calculations or operations involving multiple entities where no single entity is the sole owner.
- **Domain Events:** Recording significant business occurrences (`CampaignApprovedDomainEvent`, `BudgetExhaustedDomainEvent`) to decouple cross-domain side effects.
- **Domain Invariants:** Enforcing non-negotiable business rules at all times (e.g., "A campaign cannot be launched without an active budget and verified merchant profile").
- **Domain-Specific Errors & Results:** Emitting deterministic business outcomes using the `Result<T, DomainError>` pattern without throwing unhandled runtime exceptions.

### 3.2. Boost Market Domain Concepts & Examples

| Concept Type | Domain Concept | Realistic Boost Market Responsibility & Invariants |
| :--- | :--- | :--- |
| **Aggregate Root** | `Campaign` | Governs campaign lifecycle (`DRAFT` $\rightarrow$ `PENDING_APPROVAL` $\rightarrow$ `APPROVED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED` $\rightarrow$ `PAUSED`). Ensures total allocated ad spend across ad sets equals total campaign budget. |
| **Entity** | `BusinessProfile` | Represents the verified Nigerian merchant identity, CAC registration number, operating vertical, and compliance status. |
| **Entity** | `Advertisement` | Represents an individual ad creative unit, linking copy variants, generated media assets, headline hooks, and target landing URL. |
| **Value Object** | `CampaignBudget` | Immutable currency representation (e.g., Nigerian Naira in kobo `NGN`). Enforces that daily spend $\ge$ platform minimum (e.g., ₦5,000/day) and total spend > daily spend. |
| **Value Object** | `AudienceTargeting` | Immutable geographical and demographic specifications (e.g., Lagos, Abuja, age 25–45, interest tags). |
| **Value Object** | `CampaignApproval` | Immutable record of who approved the campaign (Merchant User ID, timestamp, terms acceptance hash). |
| **Entity** | `Subscription` | Manages merchant SaaS tier (Starter, Growth, Agency), active billing cycles, and feature entitlement quotas. |
| **Domain Service** | `AdTakeRateCalculator` | Pure calculation service determining platform management fee markup (e.g., 5% platform fee + VAT) based on merchant tier. |

### 3.3. Strict Prohibitions
The Domain Layer **must never import or depend on**:
- NestJS decorators or modules (`@Injectable()`, `@Controller()`, `@nestjs/*`).
- Next.js or React runtime APIs (`'use client'`, `useEffect`, `next/navigation`).
- Prisma client or schema objects (`@prisma/client`, Prisma DMMF).
- Relational databases, SQL drivers, or ORM annotations (`pg`, `typeorm`, `drizzle`).
- In-memory data stores or cache clients (`ioredis`, Redis SDK).
- Third-party AI SDKs (`@google/genai`, `openai`, `anthropic`).
- Ad network APIs (`facebook-nodejs-business-sdk`, Google Ads API client).
- Payment provider SDKs (`paystack`, `stripe`).
- Global environment reading (`process.env`).

---

## 4. Application Layer

### 4.1. Core Responsibilities
The Application Layer choreographs business workflows. It directs domain entities to enforce rules, invokes infrastructure ports to fetch and save data, and manages transactional boundaries. It answers the question: *"What does the system do in response to a user or external trigger?"*

The Application Layer is responsible for:
- **Use Cases / Application Services:** Orchestrating discrete user interactions and business capabilities (e.g., `CreateCampaignUseCase`, `LaunchCampaignUseCase`).
- **Input DTOs & Validation Contracts:** Accepting strongly-typed command or query payloads from the presentation tier.
- **Port Interfaces (Dependency Inversion Boundaries):**
  - *Outbound Ports:* Interfaces defining requirements for repositories (`ICampaignRepository`), payment gateways (`IPaymentGateway`), ad distribution networks (`IAdChannelProvider`), and AI reasoning engines (`ICreativeGenerator`).
  - *Inbound Ports:* Interfaces exposing use case operations to controllers or CLI tasks.
- **Transaction & Workflow Coordination:** Coordinating database transactions across multiple entities (e.g., debiting merchant wallet and updating campaign status atomically).
- **Authorization Enforcement Coordination:** Validating that the acting user has permission to operate on the target aggregate before calling domain logic.
- **Dispatching Domain Events:** Publishing domain events to in-memory event buses or message queues after transactions commit.

### 4.2. Realistic Boost Market Use Case Examples

1. **`CreateBusinessProfileUseCase`:**  
   Receives business name, CAC number, and contact details; checks uniqueness via `IBusinessProfileRepository`; constructs `BusinessProfile` entity; persists and returns profile summary.
2. **`GenerateAdvertisementCreativeUseCase`:**  
   Receives campaign objectives and audience parameters; invokes `ICreativeGenerator` port (implemented by Gemini/OpenAI adapter); parses candidate headlines and copy; passes results to domain for compliance checking.
3. **`CreateCampaignUseCase`:**  
   Validates merchant eligibility; instantiates `Campaign` aggregate root in `DRAFT` status; associates ad creatives; commits to `ICampaignRepository`.
4. **`ApproveCampaignUseCase`:**  
   Enforces merchant review checklist; verifies explicit terms agreement; updates aggregate state to `APPROVED`.
5. **`LaunchCampaignUseCase`:**  
   Coordinates campaign deployment: verifies funded wallet via `IPaymentGateway`, transitions `Campaign` aggregate to `ACTIVE`, invokes `IAdChannelProvider` (Meta/Google), and updates external campaign IDs.
6. **`ProcessPaymentWebhookUseCase`:**  
   Receives validated webhook event from Paystack adapter; credits merchant balance in wallet aggregate; unlocks campaigns pending payment.

### 4.3. Pragmatic Evolution & Architectural Complexity
- **Use Cases vs. Full CQRS:**  
  For current and near-term operations, simple Use Cases returning `Result<T, E>` provide clear, maintainable orchestration without the overhead of maintaining separate read/write data models, MediatR-style message buses, or eventual consistency pipelines.
- **When CQRS Becomes Useful:**  
  CQRS should be introduced selectively only when read workloads (e.g., merchant analytics dashboards displaying real-time aggregated impressions across thousands of ads) require specialized denormalized read models distinct from the transactional aggregate tables.

---

## 5. Infrastructure Layer

### 5.1. Core Responsibilities
The Infrastructure Layer contains all concrete implementations of technical mechanisms. It bridges the pure interfaces declared by the Application Layer with real databases, third-party network APIs, filesystem storage, and hardware clocks.

The Infrastructure Layer is responsible for:
- **Database Repositories & Adapters:** Implementing persistence ports using Prisma and PostgreSQL (e.g., `PrismaCampaignRepository`, `PrismaBusinessProfileRepository`).
- **External AI Provider Adapters:** Implementing `ICreativeGenerator` and `IReasoningEngine` using official SDKs (e.g., `GeminiCreativeAdapter` using `@google/genai`, `OpenAICreativeAdapter`).
- **Advertising Platform Adapters:** Implementing `IAdChannelProvider` by calling Meta Graph API and Google Ads REST APIs (e.g., `MetaMarketingAdapter`, `GoogleAdsAdapter`).
- **Payment Gateway Adapters:** Implementing `IPaymentGateway` using Paystack API (e.g., `PaystackPaymentAdapter`).
- **Messaging & Notifications:** Implementing SMS (`TermiiSMSAdapter`), WhatsApp, and transactional email (`SendGridEmailAdapter`).
- **Background Jobs & Message Queues:** Managing asynchronous worker execution, retry policies, and scheduled cron jobs (e.g., Redis / BullMQ adapters).
- **Environment & Secret Configuration:** Reading environment variables safely via `@boost-market/config`.

### 5.2. Realistic Boost Market Infrastructure Examples

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        INFRASTRUCTURE ADAPTERS                         │
├─────────────────────────┬──────────────────────┬───────────────────────┤
│ Concrete Adapter        │ Application Port     │ External Technology   │
├─────────────────────────┼──────────────────────┼───────────────────────┤
│ PrismaCampaignRepo      │ ICampaignRepository  │ Prisma ORM / Postgres │
│ GeminiCreativeAdapter   │ ICreativeGenerator   │ @google/genai SDK     │
│ MetaMarketingAdapter    │ IAdChannelProvider   │ Meta Marketing API    │
│ GoogleAdsAdapter        │ IAdChannelProvider   │ Google Ads REST API   │
│ PaystackPaymentAdapter  │ IPaymentGateway      │ Paystack REST API     │
│ BullMQJobQueueAdapter   │ IJobQueue            │ Redis / BullMQ        │
│ TermiiNotificationAdapter│ INotificationService │ Termii SMS API        │
└─────────────────────────┴──────────────────────┴───────────────────────┘
```

---

## 6. Layered Architecture & Dependency Flow Diagram

```mermaid
graph TD
    classDef presentation fill:#1E293B,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC;
    classDef application fill:#0F172A,stroke:#818CF8,stroke-width:2px,color:#F8FAFC;
    classDef domain fill:#064E3B,stroke:#34D399,stroke-width:2px,color:#F8FAFC;
    classDef infrastructure fill:#312E81,stroke:#C084FC,stroke-width:2px,color:#F8FAFC;
    classDef external fill:#18181B,stroke:#94A3B8,stroke-width:1px,stroke-dasharray: 3 3,color:#E2E8F0;

    subgraph PRESENTATION ["Presentation Tier (apps/web, apps/api host)"]
        WEB["Next.js Web Frontend<br/>(Merchant Dashboard & Wizards)"]:::presentation
        CTRL["NestJS HTTP Controllers<br/>(Routing, Validation, DTO Serialization)"]:::presentation
    end

    subgraph APPLICATION ["Application Layer (Use Cases & Ports)"]
        UC["Use Cases & Application Services<br/>• CreateCampaignUseCase<br/>• LaunchCampaignUseCase<br/>• GenerateCreativeUseCase"]:::application
        PORTS["Outbound Port Interfaces<br/>• ICampaignRepository<br/>• IPaymentGateway<br/>• IAdChannelProvider<br/>• ICreativeGenerator"]:::application
    end

    subgraph DOMAIN ["Domain Layer (Pure Business Rules)"]
        ENTITIES["Entities & Aggregates<br/>• Campaign (Aggregate Root)<br/>• BusinessProfile<br/>• Advertisement"]:::domain
        VO["Value Objects<br/>• CampaignBudget (NGN kobo)<br/>• AudienceTargeting<br/>• CampaignApproval"]:::domain
        RULES["Invariants & Pure Domain Services<br/>• AdTakeRateCalculator<br/>• Result<T, DomainError>"]:::domain
    end

    subgraph INFRASTRUCTURE ["Infrastructure Layer (Technical Adapters)"]
        REPO_IMPL["Prisma Repositories<br/>(PrismaCampaignRepository)"]:::infrastructure
        AI_IMPL["AI Provider Adapters<br/>(GeminiCreativeAdapter)"]:::infrastructure
        AD_IMPL["Ad Network Adapters<br/>(MetaAdsAdapter, GoogleAdsAdapter)"]:::infrastructure
        PAY_IMPL["Payment Adapters<br/>(PaystackPaymentAdapter)"]:::infrastructure
    end

    subgraph EXTERNAL ["External Cloud Services & Drivers"]
        PG[("PostgreSQL Database")]:::external
        GEMINI["Google Gemini API"]:::external
        META["Meta Marketing API"]:::external
        PAYSTACK["Paystack API"]:::external
    end

    %% Flow of Calls and Inversions
    WEB -->|"HTTP REST Request"| CTRL
    CTRL -->|"Invokes Command"| UC
    UC -->|"Executes Domain Rules"| ENTITIES
    ENTITIES -->|"Enforces Invariants"| VO
    ENTITIES -->|"Uses"| RULES

    UC -->|"Calls Outbound Port"| PORTS
    REPO_IMPL -.->|"Implements"| PORTS
    AI_IMPL -.->|"Implements"| PORTS
    AD_IMPL -.->|"Implements"| PORTS
    PAY_IMPL -.->|"Implements"| PORTS

    REPO_IMPL -->|"SQL / Prisma Client"| PG
    AI_IMPL -->|"HTTPS / @google/genai"| GEMINI
    AD_IMPL -->|"HTTPS / Graph API"| META
    PAY_IMPL -->|"HTTPS / Webhook"| PAYSTACK
```

---

## 7. Examples of Appropriate vs. Inappropriate Code Placement

### Scenario 1: Minimum Daily Ad Spend Validation
* **Rule:** An advertising campaign must allocate at least ₦5,000 per day.
* ❌ **Inappropriate Placement:**
  - In a Next.js React component form handler (`apps/web`): Client can easily bypass validation via curl or Postman.
  - In a NestJS controller or DTO pipe (`apps/api`): Ties business rules to HTTP framework; if campaigns are created via background jobs or cron scripts, validation is missed.
  - In a PostgreSQL check constraint (`infrastructure`): Database errors are unhelpful, hard to unit-test, and too late in the lifecycle.
* ✅ **Appropriate Placement:**
  - Inside the `CampaignBudget` Value Object in the **Domain Layer**. The Value Object constructor throws a domain validation error or returns `Result.fail(DomainErrors.BudgetBelowMinimum)` whenever instantiated with a value below the invariant threshold.

### Scenario 2: Generating Creative Copy Variants Using Gemini
* **Rule:** Merchant requests 3 AI-generated ad headline variations based on a campaign prompt.
* ❌ **Inappropriate Placement:**
  - Inside the `Advertisement` entity (`domain`): Pollutes the pure domain model with third-party SDK dependencies (`@google/genai`) and network I/O.
  - Inside a NestJS controller (`presentation`): Controller now handles prompt engineering, retries, vendor exceptions, and serialization.
* ✅ **Appropriate Placement:**
  - **Application Layer:** `GenerateAdvertisementCreativeUseCase` accepts prompt parameters and invokes the `ICreativeGenerator` port.
  - **Infrastructure Layer:** `GeminiCreativeAdapter` implements `ICreativeGenerator`, calls `@google/genai`, parses the structured JSON response, and returns domain-compatible DTOs.

### Scenario 3: Deducting Campaign Budget from Merchant Wallet
* **Rule:** When a campaign launches, the required budget must be debited from the merchant's prepaid balance or pre-authorized via payment gateway.
* ❌ **Inappropriate Placement:**
  - Directly in `PrismaCampaignRepository`: Repositories only persist and retrieve aggregates; they do not coordinate financial deductions or payment gateway handshakes.
* ✅ **Appropriate Placement:**
  - **Application Layer:** `LaunchCampaignUseCase` opens a transaction boundary, queries the wallet aggregate, invokes `IPaymentGateway` to verify or capture funds, invokes `campaign.launch()`, and calls `campaignRepository.save()`.

---

## 8. Realistic Execution Flow: Launching an Advertising Campaign

This walkthrough illustrates the exact sequence and responsibilities of each layer when a Nigerian business owner clicks **"Launch Campaign"** in the Boost Market portal.

```text
[Browser / Merchant UI]
       │
       │ 1. POST /api/v1/campaigns/cmp_123/launch (Bearer JWT)
       ▼
[Presentation Tier: NestJS Controller]
       │
       │ 2. Authenticates JWT, extracts TenantId & UserId.
       │    Invokes LaunchCampaignUseCase.execute({ campaignId, merchantId })
       ▼
[Application Layer: LaunchCampaignUseCase]
       │
       │ 3. Fetches Campaign aggregate via ICampaignRepository outbound port.
       │    Verifies caller owns the campaign aggregate.
       ▼
[Domain Layer: Campaign Aggregate Root]
       │
       │ 4. Executes campaign.launch(currentClockTime).
       │    Validates Domain Invariants:
       │    - Status must currently be APPROVED (cannot launch DRAFT).
       │    - Budget must be valid and funded.
       │    - End date must be in the future.
       │    - Ad creatives must be approved and non-empty.
       │    Returns Result.ok() and emits CampaignLaunchedDomainEvent.
       ▼
[Application Layer: LaunchCampaignUseCase]
       │
       │ 5. Coordinates Outbound Infrastructure Ports:
       │    a. IPaymentGateway.lockFunds(campaign.budget) ──> verifies balance
       │    b. ICampaignRepository.save(campaign) ──> commits state change
       │    c. IJobQueue.dispatch("DISTRIBUTE_CAMPAIGN_TO_AD_NETWORKS", payload)
       ▼
[Infrastructure Layer: Asynchronous Job Worker]
       │
       │ 6. Background worker consumes job:
       │    - Invokes MetaMarketingAdapter (IAdChannelProvider) via Graph API.
       │    - Invokes GoogleAdsAdapter (IAdChannelProvider) via REST API.
       │    - Stores external platform Campaign IDs (meta_campaign_id, etc.).
       ▼
[Presentation Tier: Response]
       │
       │ 7. Returns HTTP 200 OK { success: true, status: "LAUNCHING" } to merchant.
```

### Critical Architectural Nuances in this Flow:
1. **Deterministic Authority over AI Recommendations:**  
   If an AI optimization agent had previously suggested *"Increase daily budget by 20% to capture weekend shopper traffic,"* that suggestion was merely a candidate proposal. The campaign cannot launch or spend money until the merchant explicitly reviewed and approved that budget in the domain model. AI inference is strictly advisory; deterministic software commits the transaction.
2. **Synchronous Coordination vs. Asynchronous Infrastructure:**  
   The HTTP request **does not wait** for Meta or Google to review and accept the ad creative over external HTTP networks. The campaign aggregate is atomically transitioned to `ACTIVE` (or `SUBMITTED`) and committed locally. Distribution to external ad networks is queued via a background job worker (`IJobQueue`), ensuring transient third-party API latency or downtime never blocks user responses or leaves local transactions in an indeterminate state.

---

## 9. Junior Engineer Technical Defense Guide

*How to defend this layered architecture in technical reviews, interviews, or PR debates:*

1. **Question:** *"Why can't I just inject the Prisma client directly into my NestJS controller to fetch and update the campaign quickly?"*  
   **Defense:** "If we put Prisma queries in controllers, our business rules become scattered across HTTP handlers. When we later need to launch campaigns from a background worker, a scheduled cron task, or a webhook, we would have to duplicate that logic. Furthermore, we wouldn't be able to unit-test our campaign validation rules without spinning up a live PostgreSQL database."

2. **Question:** *"Why do we need an `ICampaignRepository` interface when we know we are using Prisma and PostgreSQL?"*  
   **Defense:** "The `ICampaignRepository` port lets the Application Layer state *what* persistence operations it requires without caring *how* Prisma achieves them. This allows us to run lightning-fast unit tests using in-memory repository doubles without touching a database, and protects our core codebase if Prisma changes its API or if we swap storage engines."

3. **Question:** *"Why can't the `Campaign` domain entity call the Gemini API directly to validate ad copy?"*  
   **Defense:** "Domain entities must remain pure, deterministic TypeScript objects with zero network I/O. If an entity calls an external network API, unit tests become slow, flaky, and dependent on API keys, network availability, and third-party rate limits. Instead, the Application Layer calls the AI port, collects the generated text, and passes it into the domain entity as a simple, testable string value."

---

## 10. Current Implementation State vs. Future Considerations

### 10.1. Current Workspace Reality
As inspected during Subtask 0.1.2.2:
- **Domain Layer:** The pure `Result<T, E>` pattern and foundational status primitives (`SystemStatus`, `Environment`) are established in `packages/shared`. Enterprise business aggregates (`Campaign`, `BusinessProfile`) do not yet exist in code and are scheduled for implementation in Task 0.1.3.
- **Application Layer:** AI port abstractions (`IAIProviderContract`, `AIModelMetadata`) are defined in `packages/ai`. Application use cases have not yet been instantiated.
- **Infrastructure Layer:** Configuration validation (`packages/config`) and basic NestJS application hosting (`apps/api`) are operational. Concrete adapters for Prisma, Meta, and Paystack are architectural targets, not existing implementations.

### 10.2. Future Considerations
1. **Repository & Package Structure:**  
   Task 0.1.3 will introduce `@boost-market/domain` (or dedicated domain modules) to house the pure enterprise entities and value objects defined in this document.
2. **Background Job Queues:**  
   External ad platform communication and heavy creative generation should be executed via asynchronous workers (e.g., BullMQ with Redis), keeping HTTP response times under 200ms for merchant operations.
3. **Event Bus Implementation:**  
   As domain events proliferate (`CampaignLaunchedDomainEvent`, `AdFlaggedDomainEvent`), an internal in-memory event emitter should be formalized in the Application Layer to decouple notification dispatches from core aggregate state commits.
