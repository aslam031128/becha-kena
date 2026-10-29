# AI Agent Operations Manual: Becha-Kena Backend

> **Target Audience:** Autonomous AI Coding Agents (Claude, GPT, Gemini, Cursor, Cline, Windsurf, Antigravity) and Senior Backend Engineers.  
> **Project:** Becha-Kena — Bangladesh's First NID-Verified C2C Resale Marketplace.  
> **Repository Path:** `e:/becha-kena`  
> **Status:** Backend-First Specification & Implementation Phase.

---

## 1. Executive Mission & Agent Identity

You are operating as a **Principal Backend Architect & Security Engineer** tasked with implementing, maintaining, and testing the production backend for **Becha-Kena**.

### Primary Directives
1. **Zero Hallucination Policy:** Every collection name, field name, enum value, HTTP route, status code, error code, and business rule is already canonical. Never invent alternatives; pull directly from the specification documents.
2. **Zero Placeholder Code:** Never produce `// TODO: implement later`, stubbed return values (e.g., `return null;`), or partial implementations unless implementing an intentional mock provider interface. Write complete, production-grade, strictly typed code.
3. **Backend-First Discipline:** Build, test, and harden the entire API, database schemas, WebSocket layer, background queues, and security vaults before any frontend code is initiated.
4. **All-English Constraint:** All code, comments, JSDoc, logging statements, error messages, and git commit messages must be written in **100% standard English**.

---

## 2. Specification Taxonomy & Source of Truth

When executing any task, always reference the corresponding project document. If conflicts arise, follow the hierarchy of authority below:

```
┌────────────────────────────────────────────────────────┐
│                   Hierarchy of Truth                   │
├────────────────────────────────────────────────────────┤
│ 1. database-schema.md & api-spec.md (Exact Contracts)  │
│ 2. database.md (Indexes, Transactions, Mongoose Rules) │
│ 3. architecture.md (System Boundaries, Layers, Queues) │
│ 4. PRD.md (Business Logic, Fraud Policies, Workflows)  │
│ 5. prompt.md (Execution Roadmap & Implementation Order)│
│ 6. dfd.md (Data Flow Visualizations & State Transitions│
└────────────────────────────────────────────────────────┘
```

### Document Quick Reference
* **[`PRD.md`](file:///e:/becha-kena/PRD.md):** High-level functional requirements, user personas, KYC requirements, fraud prevention rules, offer negotiation limits (max 3 rounds), and bilateral review rules.
* **[`architecture.md`](file:///e:/becha-kena/architecture.md):** 4-layer monolith design, provider abstractions (SMS, KYC, S3, FCM), Redis caching strategies, Socket.io clustering, and BullMQ queues.
* **[`database.md`](file:///e:/becha-kena/database.md):** Complete database strategy, ACID multi-document transaction workflows, Mongoose plugin configs, and collection relationship diagrams.
* **[`database-schema.md`](file:///e:/becha-kena/database-schema.md):** Exact table-by-table schema definitions for all 12 collections with field types, required flags, defaults, constraints, and descriptions.
* **[`api-spec.md`](file:///e:/becha-kena/api-spec.md):** Complete REST API contracts, HTTP methods, route paths, query/body/response schemas, error response envelopes, and WebSocket event payloads.
* **[`dfd.md`](file:///e:/becha-kena/dfd.md):** Level 0, Level 1, and Level 2 Data Flow Diagrams detailing user journeys, KYC verification loops, offer negotiations, and deal closures.
* **[`prompt.md`](file:///e:/becha-kena/prompt.md):** Step-by-step 14-phase implementation guide (Phase 0 to Phase 13) designed for sequential AI execution.

---

## 3. Core Architectural Invariants & Hard Guardrails

### 3.1 Strict 4-Layer Separation (Clean Monolith)
Code must strictly respect architectural boundaries. Never leak concerns across layers:

```
[ HTTP Request / WS Event ]
           │
           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 1: Transport (Express Router / Socket.io Handler) │
│ - routes/*.routes.ts, controllers/*.controller.ts       │
│ - Accepts input, unpacks parameters, formats HTTP/WS res│
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 2: Validation & Guardrails (Zod + Middlewares)    │
│ - middlewares/validate.ts, middlewares/auth.ts          │
│ - Validates DTOs, verifies JWT, checks RBAC roles       │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 3: Domain Service (Business Logic)                │
│ - services/*.service.ts                                 │
│ - Pure business rules, MongoDB sessions, transactions,  │
│   Redis cache invalidation, BullMQ job dispatch         │
│ - NEVER touches Express `req` or `res` objects          │
└──────────────────────────┬──────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│ Layer 4: Data Access & Infrastructure                   │
│ - models/*.model.ts, config/database.ts, redis.ts       │
│ - Mongoose models, native drivers, external S3/KMS APIs │
└─────────────────────────────────────────────────────────┘
```

### 3.2 Zero-Trust NID & PII Security
* **No Plaintext NID:** The citizen's National ID number must NEVER be stored in plaintext anywhere in MongoDB, Redis, logs, or API responses.
* **Lookup / Collision Check:** Store only the salted HMAC-SHA256 hex string (`nidHash`) in the `users` and `nid_blacklists` collections.
  $$\text{nidHash} = \text{HMAC-SHA256}(\text{SALT}, \text{rawNidNumber})$$
* **Legal Vault Storage:** If verified NID data (name, DOB, photo vector) must be retained for legal compliance, it must be encrypted using AES-256-GCM envelope encryption (`encryptedNidData`) before persisting.
* **Log Sanitization:** Winston loggers and Morgan HTTP interceptors must redact `phone`, `password`, `nid`, `token`, `otp`, and `authorization` headers.

### 3.3 Transactional Safety & Concurrency
* **ACID Transactions:** Every operation that changes listing ownership, status (`active` $\rightarrow$ `under_offer` $\rightarrow$ `sold`), accepts an offer, or finalizes a deal MUST run within a MongoDB multi-document transaction using `session.withTransaction()`.
* **Double-Selling Prevention:** Use atomic updates with condition guards:
  ```typescript
  const updatedListing = await Listing.findOneAndUpdate(
    { _id: listingId, status: ListingStatus.ACTIVE },
    { $set: { status: ListingStatus.UNDER_OFFER } },
    { session, new: true }
  );
  if (!updatedListing) {
    throw new ConflictError("Listing is no longer active or already sold.");
  }
  ```

### 3.4 Strict TypeScript Standards
* `"strict": true` and `"noImplicitAny": true` in `tsconfig.json`.
* **Zero `any`:** Disallow the use of `any` or loose casts like `as unknown as Type`.
* **Zod-Inferred DTOs:** All request body, query, and param interfaces must be derived from Zod schemas:
  ```typescript
  export const CreateListingSchema = z.object({ ... });
  export type CreateListingDTO = z.infer<typeof CreateListingSchema>;
  ```
* **Typed Express Requests:** Extend `Express.Request` to include authenticated user context:
  ```typescript
  export interface AuthenticatedUser {
    userId: string;
    phone: string;
    role: 'citizen' | 'moderator' | 'super_admin';
    isNidVerified: boolean;
    isFrozen: boolean;
  }
  ```

---

## 4. Canonical Technology Stack

| Component | Library / Tool | Target Version | Configuration Notes |
|---|---|---|---|
| **Runtime** | Node.js | `>= 20.x LTS` | Native `fetch`, crypto, ESM |
| **Language** | TypeScript | `^5.x` | Target `ES2022`, module `NodeNext` |
| **Web Framework** | Express.js | `^4.19` or `^5.x` | JSON parser with 10MB limit |
| **Database** | MongoDB Atlas / Mongoose | `^8.x` | Replica set required for transactions |
| **In-Memory Cache** | ioredis | `^5.x` | Connection pooling, retry backoff |
| **Job Queue** | BullMQ | `^5.x` | Backed by Redis, automatic stalled checks |
| **Real-time Server**| Socket.io | `^4.7` | `@socket.io/redis-adapter` for clustering |
| **Schema Validation**| Zod | `^3.23` | Parse error formatting helper |
| **Password Hashing**| Argon2 | `^0.40` | Memory cost 65536, time cost 3 |
| **Storage** | AWS S3 Client | `@aws-sdk/client-s3` | Presigned URL generation for uploads |
| **Logging** | Winston + Morgan | Latest | JSON format in production, console in dev |
| **Testing** | Jest + Supertest | `^29.x` | `mongodb-memory-server` for integration |

---

## 5. File System & Directory Architecture

Every source file must be placed in its exact canonical location under `src/`:

```
src/
├── app.ts                         # Express application setup & middleware mounts
├── server.ts                      # Server bootstrap (HTTP + Socket.io + DB connect)
├── config/
│   ├── env.ts                     # Zod-parsed environment variables
│   ├── database.ts                # MongoDB connection lifecycle & event hooks
│   ├── redis.ts                   # ioredis client singleton
│   └── s3.ts                      # AWS S3 client & bucket config
├── constants/
│   ├── enums.ts                   # All shared enums (Roles, Statuses, Categories)
│   ├── errorCodes.ts              # Domain error code string literals
│   └── regex.ts                   # Phone regex, NID regex, ObjectID regex
├── errors/
│   ├── AppError.ts                # Base domain error class
│   ├── BadRequestError.ts         # 400 Bad Request
│   ├── UnauthorizedError.ts       # 401 Unauthorized
│   ├── ForbiddenError.ts          # 403 Forbidden
│   ├── NotFoundError.ts           # 404 Not Found
│   ├── ConflictError.ts           # 409 Conflict
│   ├── ValidationError.ts         # 422 Unprocessable Entity (Zod)
│   ├── RateLimitError.ts          # 429 Too Many Requests
│   └── LockedError.ts             # 423 Locked (Device limit exceeded)
├── middlewares/
│   ├── auth.ts                    # JWT token extraction & verification
│   ├── rbac.ts                    # requireRole, requireVerifiedCitizen, requireActiveAccount
│   ├── validate.ts                # Express middleware factory for Zod schemas
│   ├── rateLimiter.ts             # Redis-backed rate limiting presets
│   └── errorHandler.ts            # Centralized Express error handler
├── models/                        # All 12 Mongoose Schema Definitions
│   ├── user.model.ts              # Store D1: Citizens & Staff
│   ├── listing.model.ts           # Store D2: Classified Listings
│   ├── conversation.model.ts      # Store D3: Chat Channels
│   ├── message.model.ts           # Store D4: Chat Messages
│   ├── offer.model.ts             # Store D5: Negotiation Offers
│   ├── deal.model.ts              # Store D6: Closed Escrow/Deals
│   ├── review.model.ts            # Store D7: Bilateral Ratings
│   ├── favorite.model.ts          # Store D8: Saved Listings
│   ├── report.model.ts            # Store D9: Abuse/Scam Reports
│   ├── dispute.model.ts           # Store D10: Formal GD Disputes
│   ├── phoneRevealAudit.model.ts  # Store D11: Contact Audits
│   └── nidBlacklist.model.ts      # Store D12: Banned NID & Phones
├── controllers/                   # Thin controllers handling HTTP transport
│   ├── auth.controller.ts
│   ├── user.controller.ts
│   ├── kyc.controller.ts
│   ├── listing.controller.ts
│   ├── favorite.controller.ts
│   ├── chat.controller.ts
│   ├── offer.controller.ts
│   ├── deal.controller.ts
│   ├── review.controller.ts
│   ├── report.controller.ts
│   ├── dispute.controller.ts
│   ├── upload.controller.ts
│   └── admin.controller.ts
├── services/                      # Pure business logic services
│   ├── auth.service.ts
│   ├── user.service.ts
│   ├── kyc.service.ts
│   ├── listing.service.ts
│   ├── favorite.service.ts
│   ├── chat.service.ts
│   ├── offer.service.ts
│   ├── deal.service.ts
│   ├── review.service.ts
│   ├── report.service.ts
│   ├── dispute.service.ts
│   └── admin.service.ts
├── routes/                        # Express route definitions
│   ├── index.ts                   # Aggregator router (`/api/v1`)
│   ├── auth.routes.ts
│   ├── user.routes.ts
│   ├── kyc.routes.ts
│   ├── listing.routes.ts
│   ├── favorite.routes.ts
│   ├── chat.routes.ts
│   ├── offer.routes.ts
│   ├── deal.routes.ts
│   ├── review.routes.ts
│   ├── report.routes.ts
│   ├── dispute.routes.ts
│   ├── upload.routes.ts
│   └── admin.routes.ts
├── validations/                   # Zod schemas per domain
│   ├── auth.validation.ts
│   ├── kyc.validation.ts
│   ├── listing.validation.ts
│   ├── chat.validation.ts
│   ├── offer.validation.ts
│   ├── deal.validation.ts
│   ├── review.validation.ts
│   ├── dispute.validation.ts
│   └── admin.validation.ts
├── queues/                        # BullMQ queues and workers
│   ├── offerExpiration.queue.ts
│   ├── offerExpiration.worker.ts
│   ├── priceDropAlert.queue.ts
│   ├── priceDropAlert.worker.ts
│   ├── listingLifecycle.queue.ts
│   └── listingLifecycle.worker.ts
├── sockets/                       # Socket.io real-time layer
│   ├── socketServer.ts            # Server init & Redis adapter attachment
│   ├── socketAuth.ts              # Handshake JWT authentication middleware
│   └── handlers/
│       ├── chat.handler.ts        # Messaging & typing events
│       └── deal.handler.ts        # Deal & offer update events
└── utils/                         # Reusable helpers & provider clients
    ├── response.ts                # Standard API response envelope builders
    ├── logger.ts                  # Winston logger instance
    ├── crypto.ts                  # HMAC-SHA256, AES-256-GCM, Argon2 utilities
    ├── otp.ts                     # Secure 6-digit OTP generator & Redis store
    └── providers/                 # Pluggable vendor clients (with Dev Mocks)
        ├── sms.provider.ts        # AlphaSMS / Twilio / DevMock
        ├── kyc.provider.ts        # Porichoy / DevMock
        └── storage.provider.ts    # S3 / MinIO / LocalMock
```

---

## 6. Canonical Code Templates & Implementation Patterns

To ensure consistent code quality across multiple AI sessions, follow these exact patterns:

### 6.1 Standard API Response Envelope
Every controller response must be sent using the standard envelope builders in `src/utils/response.ts`:

```typescript
// Success Format (200, 201)
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "totalPages": 8
  } // optional pagination
}

// Error Format (4xx, 5xx)
{
  "success": false,
  "error": {
    "code": "OFFER_LIMIT_EXCEEDED",
    "message": "Maximum of 3 negotiation rounds reached for this listing.",
    "details": [ ... ] // optional validation array
  }
}
```

### 6.2 Controller Pattern (Thin Transport Layer)
Controllers must only unpack parameters, invoke the service, and format the response:

```typescript
// src/controllers/listing.controller.ts
import { Request, Response, NextFunction } from 'express';
import { listingService } from '../services/listing.service.js';
import { sendSuccess } from '../utils/response.js';
import { CreateListingDTO } from '../validations/listing.validation.js';

export class ListingController {
  async createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = req.user!.userId;
      const dto = req.body as CreateListingDTO;
      const listing = await listingService.createListing(sellerId, dto);
      sendSuccess(res, listing, 201);
    } catch (error) {
      next(error);
    }
  }
}

export const listingController = new ListingController();
```

### 6.3 Domain Service Pattern with MongoDB Transaction
Services handle domain logic, multi-document ACID transactions, and error propagation:

```typescript
// src/services/deal.service.ts
import mongoose from 'mongoose';
import { Deal, DealStatus } from '../models/deal.model.js';
import { Listing, ListingStatus } from '../models/listing.model.js';
import { Offer, OfferStatus } from '../models/offer.model.js';
import { ConflictError, NotFoundError } from '../errors/index.js';
import { socketServer } from '../sockets/socketServer.js';

export class DealService {
  async acceptOfferAndCloseDeal(offerId: string, sellerId: string): Promise<any> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const offer = await Offer.findById(offerId).session(session);
      if (!offer) throw new NotFoundError("Offer not found.");
      if (offer.status !== OfferStatus.PENDING) {
        throw new ConflictError("Offer is no longer pending.");
      }

      // 1. Lock the listing atomically
      const listing = await Listing.findOneAndUpdate(
        { _id: offer.listingId, sellerId, status: ListingStatus.ACTIVE },
        { $set: { status: ListingStatus.UNDER_OFFER } },
        { session, new: true }
      );
      if (!listing) {
        throw new ConflictError("Listing is unavailable or not owned by seller.");
      }

      // 2. Accept offer & reject other pending offers
      offer.status = OfferStatus.ACCEPTED;
      await offer.save({ session });

      await Offer.updateMany(
        { listingId: listing._id, _id: { $ne: offer._id }, status: OfferStatus.PENDING },
        { $set: { status: OfferStatus.DECLINED } },
        { session }
      );

      // 3. Create Deal Record
      const deal = await Deal.create([{
        listingId: listing._id,
        buyerId: offer.buyerId,
        sellerId: listing.sellerId,
        agreedPrice: offer.amount,
        status: DealStatus.PENDING_MEETUP,
        meetingLocation: listing.location.address
      }], { session });

      await session.commitTransaction();

      // 4. Post-transaction notifications
      socketServer.to(`deal:${deal[0]._id}`).emit("deal_status_updated", deal[0]);
      return deal[0];
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }
}

export const dealService = new DealService();
```

### 6.4 Mongoose Model Definition Pattern
Models must specify strict types, timestamps, validation, and compound indexes:

```typescript
// src/models/favorite.model.ts
import { Schema, model, Document, Types } from 'mongoose';

export interface IFavorite extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  listingId: Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<IFavorite>({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  listingId: {
    type: Schema.Types.ObjectId,
    ref: 'Listing',
    required: true,
    index: true
  }
}, {
  timestamps: { createdAt: true, updatedAt: false },
  versionKey: false
});

// Enforce unique user-listing pairing
FavoriteSchema.index({ userId: 1, listingId: 1 }, { unique: true });

export const Favorite = model<IFavorite>('Favorite', FavoriteSchema);
```

### 6.5 Zod Validation Middleware Pattern
```typescript
// src/middlewares/validate.ts
import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ValidationError } from '../errors/ValidationError.js';

export const validate = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params
      });
      req.body = parsed.body ?? req.body;
      req.query = parsed.query ?? req.query;
      req.params = parsed.params ?? req.params;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const issues = error.errors.map(err => ({
          field: err.path.join('.').replace(/^(body|query|params)\./, ''),
          message: err.message
        }));
        next(new ValidationError("Request validation failed", issues));
      } else {
        next(error);
      }
    }
  };
};
```

---

## 7. Master Implementation Roadmap (Phases 0 to 13)

When instructed to build the project, follow this exact sequential progression. Complete each phase fully and verify compilation before moving forward:

```
[Phase 0: Tooling & Setup]
          │
          ▼
[Phase 1: Core Foundation (Config, DB, Redis, Errors)]
          │
          ▼
[Phase 2: Database Layer (All 12 Mongoose Models & Indexes)]
          │
          ▼
[Phase 3: Cryptography & Security Layer (HMAC, KMS, Argon2)]
          │
          ▼
[Phase 4: Middleware Pipeline (Auth, RBAC, Rate Limiter, Errors)]
          │
          ▼
[Phase 5: Auth & Session Module (OTP, Device Lock, JWT Rotation)]
          │
          ▼
[Phase 6: KYC & Identity Engine (Porichoy, Face Match, Vault)]
          │
          ▼
[Phase 7: Listings & Search Engine (CRUD, S3 Presigned, Geo-spatial)]
          │
          ▼
[Phase 8: Real-Time Chat & Socket.io (Redis Adapter, Handshake)]
          │
          ▼
[Phase 9: Offers & Atomic Deal Engine (3-Round Limit, Transactions)]
          │
          ▼
[Phase 10: Ratings, Reviews & Trust System (Bilateral Reviews)]
          │
          ▼
[Phase 11: Moderation, Reports & Admin Dashboard (Dual-Approval Ban)]
          │
          ▼
[Phase 12: Background Queues & Workers (BullMQ Expirations & Alerts)]
          │
          ▼
[Phase 13: End-to-End Integration Tests & Security Hardening]
```

### Phase Details & Verification Milestones

#### Phase 0: Project Scaffolding
* Initialize `package.json` with `"type": "module"`.
* Configure `tsconfig.json` with strict mode, `NodeNext` resolution, and `src` $\rightarrow$ `dist` build path.
* Set up `.env.example` with all configuration keys specified in `api-spec.md`.

#### Phase 1: Core Foundation & Singletons
* `src/config/env.ts`: Zod schema validating all environment variables at startup.
* `src/config/database.ts`: Resilient MongoDB Atlas connector with reconnect listeners.
* `src/config/redis.ts`: ioredis client singleton with backoff retry strategy.
* `src/utils/logger.ts`: Winston logger instance with log rotation.
* `src/errors/`: Standard domain errors (`AppError`, `NotFoundError`, `ConflictError`, `RateLimitError`).

#### Phase 2: Mongoose Data Models (12 Collections)
* Implement all 12 models matching [`database-schema.md`](file:///e:/becha-kena/database-schema.md) exactly:
  1. `User` (Store D1)
  2. `Listing` (Store D2)
  3. `Conversation` (Store D3)
  4. `Message` (Store D4)
  5. `Offer` (Store D5)
  6. `Deal` (Store D6)
  7. `Review` (Store D7)
  8. `Favorite` (Store D8)
  9. `Report` (Store D9)
  10. `Dispute` (Store D10)
  11. `PhoneRevealAudit` (Store D11)
  12. `NidBlacklist` (Store D12)
* Ensure all compound indexes and 2dsphere indexes are defined on schemas.

#### Phase 3: Cryptography & Security Utilities
* Salted HMAC-SHA256 generator for NID hashing.
* AES-256-GCM envelope encryption and decryption helper for `encryptedNidData`.
* Argon2 password/secret hasher.
* Device UUID signature verification utility.

#### Phase 4: Core Express Middlewares
* `auth.ts`: Extract and verify Bearer JWT access tokens.
* `rbac.ts`: Enforce role boundaries (`citizen`, `moderator`, `super_admin`) and flags (`isNidVerified`, `isFrozen`).
* `rateLimiter.ts`: Redis sliding-window limiters:
  - Auth OTP: 5 requests / 10 minutes per phone.
  - Phone Reveal: 10 reveals / 24 hours per user.
  - Global API: 100 requests / 1 minute per IP.
* `errorHandler.ts`: Format all uncaught errors into the standard error envelope.

#### Phase 5: Authentication & Session Module
* OTP generation, storage in Redis with 120s TTL, and SMS dispatch.
* Verification endpoint validating OTP, checking active device count ($\le 2$), generating JWT access/refresh token pair.
* Token refresh route with automatic refresh token rotation and reuse detection.

#### Phase 6: KYC & Identity Verification
* Porichoy API integration with fallback `MockKycProvider` for local development.
* Check incoming NID against `NidBlacklist` and existing `users.nidHash`.
* Enforce maximum 3 verification attempts in 24 hours; route failures to `manual_review`.
* Encrypt verified citizen data into `encryptedNidData` and set `isNidVerified: true`.

#### Phase 7: Listing Engine & Media Management
* Pre-signed S3 URL generation for secure, direct-to-bucket image uploads.
* Listing CRUD with Zod validation, category and condition enums, and 2dsphere geo-indexing.
* Filter and search endpoint with text indexing, category filtering, price range, and geospatial radius (`nearLocation`).
* Phone reveal gate: checks buyer verification, logs audit record in `PhoneRevealAudit`, increments Redis counter, and returns seller phone.

#### Phase 8: Real-Time Messaging & WebSockets
* Socket.io server initialization with Redis Adapter.
* Handshake authentication extracting JWT from `socket.handshake.auth.token`.
* Chat events: `join_conversation`, `send_message`, `receive_message`, `typing_indicator`, `message_read`.
* Persistent storage of messages in `messages` collection and updating `conversations.lastMessage`.

#### Phase 9: Negotiation & Atomic Deal Engine
* Offer creation with limit of 3 counter-offer rounds per buyer per listing.
* Accept offer logic executing within a MongoDB ACID transaction:
  - Lock listing to `under_offer`.
  - Accept offer and auto-decline competing pending offers.
  - Create `Deal` document in `pending_meetup` state.
* Confirm meetup and complete deal: Transition listing to `sold`, update deal status to `completed`, and increment seller's `totalDealsCompleted`.

#### Phase 10: Bilateral Review & Rating System
* Review submission endpoint restricted to completed deals.
* Allow exactly 1 buyer review and 1 seller review per deal.
* Calculate rolling weighted average rating and persist on `users.averageRating`.

#### Phase 11: Moderation, Dispute & Dual-Approval Ban System
* Report creation for abusive listings, messages, or users.
* Police General Diary (GD) formal dispute filing for scams or stolen goods: immediately freezes seller account (`isFrozen: true`).
* Dual-Approval Ban Workflow:
  - Step 1: Moderator proposes ban with reason (`user.banProposedBy = moderatorId`).
  - Step 2: Super Admin confirms ban $\rightarrow$ sets `isBanned: true`, inserts `nidHash` and `phone` into `nid_blacklists`, and cancels all active listings.

#### Phase 12: Background Queues & BullMQ Workers
* `offerExpirationQueue`: Delayed job (24h) auto-declining unresponded offers.
* `priceDropAlertQueue`: Triggered on listing price reduction; pushes notifications to all users in `favorites`.
* `listingLifecycleQueue`: Daily cron checking for listings older than 30 days and transitioning to `expired`.

#### Phase 13: Automated Testing & Verification Suite
* Set up Jest and `mongodb-memory-server`.
* Integration tests for Auth, KYC, Listings, Offers, Deals, and Disputes.
* Concurrency test: Two buyers attempting to accept/close the same listing simultaneously (ensure exactly one succeeds).

---

## 8. Specific Domain Edge Cases & Enforcement Rules

When writing code, you must handle these specific domain edge cases:

1. **Dual-Device Limit (Concurrent Logins):**
   - Each citizen account is allowed a maximum of 2 active device UUIDs in `user.deviceUUIDs`.
   - If a login attempt presents a 3rd distinct UUID, reject with `423 Locked` and error code `DEVICE_LIMIT_EXCEEDED`, requiring the user to revoke an existing device session.
2. **Phone Reveal Anti-Scraping Quota:**
   - Maximum 10 phone reveals per user in any 24-hour window.
   - Checked atomically in Redis using key `ratelimit:phone_reveal:<userId>`.
   - On exceeding, throw `RateLimitError` (HTTP 429).
3. **Offer Negotiation 3-Round Limit:**
   - In any given conversation between buyer and seller for a listing, a maximum of 3 counter-offers can be made by the buyer.
   - Count existing offers in `offers` where `listingId` and `buyerId` match. If count $\ge 3$, reject with `400 Bad Request` and error code `OFFER_LIMIT_EXCEEDED`.
4. **Offer 24-Hour Auto-Expiry:**
   - Every pending offer automatically expires 24 hours after creation.
   - When an offer is created, add a BullMQ delayed job with `delay: 24 * 60 * 60 * 1000`.
   - The worker checks if status is still `pending`; if so, updates to `expired` and emits a WebSocket notification.
5. **Frozen Account Privileges:**
   - When a citizen has `isFrozen: true` (e.g., due to an active police dispute):
     - They cannot create new listings.
     - They cannot send offers or accept deals.
     - They cannot withdraw or reveal contact information.
     - Existing listings are temporarily hidden from search results.
6. **Banned Citizen Isolation:**
   - If a citizen is banned (`isBanned: true`):
     - Reject all OTP requests immediately at the auth gateway.
     - Revoke all active JWT refresh tokens in Redis (`del refreshtoken:<userId>:*`).
     - Mark all active listings as `archived`.
     - Reject any new registration attempt matching their `nidHash` or phone number via `nid_blacklists`.

---

## 9. AI Agent Workflow & Execution Checklist

Whenever you are assigned a prompt or task in this repository, follow this execution protocol:

```
Step 1: Ingest Request
   │
   ▼
Step 2: Cross-Reference Specifications
   ├─ Check database-schema.md for exact model fields & types
   ├─ Check api-spec.md for routes, status codes & request/response shapes
   └─ Check architecture.md for layer boundaries & provider rules
   │
   ▼
Step 3: Check Existing Dependencies & Types
   ├─ Verify imported models and types exist
   └─ Ensure no duplicate type declarations
   │
   ▼
Step 4: Implement Production Code
   ├─ Adhere strictly to 4-layer separation
   ├─ Implement Zod validation schema
   ├─ Add proper error handling with custom AppError classes
   └─ Add transactional protection for state-changing operations
   │
   ▼
Step 5: Verify & Validate
   ├─ Run TypeScript compiler check: `npm run typecheck`
   ├─ Ensure zero compilation errors and zero lint warnings
   └─ Execute relevant unit or integration tests
   │
   ▼
Step 6: Commit
   └─ Format git commit using Conventional Commits (e.g., feat(deals): implement atomic deal closure)
```

### Definition of Done (DoD) Checklist
Before marking any feature, route, or phase complete, verify:
- [ ] No `any` types used; all inputs validated via Zod schemas.
- [ ] No placeholder or stubbed functions (`TODO`, `pass`, `null` fallbacks).
- [ ] All database queries use proper indexes and respect soft-deletes/statuses.
- [ ] Multi-document mutations run inside `session.withTransaction()`.
- [ ] Standard response envelope used for both success and error responses.
- [ ] Sensitive citizen PII (NID, password, secret) is encrypted or hashed, and excluded from logs.
- [ ] All code and documentation written in 100% standard English.
- [ ] Code compiles cleanly without errors via `tsc --noEmit`.
