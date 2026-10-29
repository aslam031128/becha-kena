# Master AI Implementation Prompt: Becha-Kena Backend

> **Purpose:** This is a complete, step-by-step AI coding prompt to build the entire **Becha-Kena** backend from scratch. Feed each phase sequentially to an AI agent or use the full document as a system-level reference prompt. Every instruction below is derived from the canonical specification files and must be followed exactly.
>
> **Source Documents:**
> - [`PRD.md`](file:///e:/becha-kena/PRD.md) — Business requirements, user stories, validation rules
> - [`architecture.md`](file:///e:/becha-kena/architecture.md) — System design, layers, provider strategy
> - [`database.md`](file:///e:/becha-kena/database.md) — Collection list, indexes, relationships, transactions, Mongoose schemas
> - [`database-schema.md`](file:///e:/becha-kena/database-schema.md) — Field-level schema tables for all 12 collections
> - [`api-spec.md`](file:///e:/becha-kena/api-spec.md) — Complete REST & WebSocket API contracts with request/response examples

---

## System Role & Engineering Constraints

You are a **Senior Backend Engineer** building the production backend for **Becha-Kena**, Bangladesh's first NID-verified C2C resale marketplace. You must follow these non-negotiable constraints:

1. **Backend-First:** Build the entire server (REST API, WebSocket, database, queues, security) before any frontend work.
2. **Layered Monolith:** 4 strict layers — Transport (Express controllers) → Validation (Zod + middlewares) → Domain Services (business logic) → Data Access (Mongoose models + Redis).
3. **Strict TypeScript:** `"strict": true` in `tsconfig.json`. No `any` type anywhere. All DTOs inferred from Zod schemas. Custom domain error classes.
4. **ESM Modules:** `"type": "module"` in `package.json`. `"moduleResolution": "NodeNext"` in tsconfig.
5. **Zero-Trust Identity:** NID numbers are NEVER stored in plaintext. Use salted HMAC-SHA256 hashing for lookups and AES-256-GCM envelope encryption for legal vaults.
6. **Transactional Integrity:** All deal closures use MongoDB multi-document ACID transactions with status guards (`session.withTransaction`).
7. **All English:** Every code comment, log message, error message, variable name, and commit message must be in 100% standard English.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Runtime | Node.js | >= 20.x LTS |
| Language | TypeScript | 5.x |
| Framework | Express.js | 4.x or 5.x |
| Database | MongoDB Atlas + Mongoose | 7.0+ / 8.x |
| Cache & Queues | Redis (ioredis) + BullMQ | Latest / 5.x |
| Real-time | Socket.io + Redis Adapter | 4.x |
| Validation | Zod | 3.x |
| Auth Tokens | jsonwebtoken (JWT) | Latest |
| Hashing | crypto (native Node.js) + argon2 | Native |
| Object Storage | AWS S3 (@aws-sdk/client-s3 + s3-request-presigner) | Latest |
| Security | helmet, cors, express-rate-limit, rate-limit-redis | Latest |
| Logging | winston + morgan | Latest |
| Testing | jest, supertest, mongodb-memory-server, ts-jest | Latest |

---

## Project Directory Structure

```
src/
├── config/
│   ├── env.ts              # Zod-validated environment variables
│   ├── database.ts         # MongoDB Atlas connection with Mongoose
│   ├── redis.ts            # ioredis singleton client
│   └── s3.ts               # AWS S3 client configuration
├── constants/
│   ├── enums.ts            # All shared enum values (roles, statuses, categories, conditions)
│   ├── regex.ts            # Phone regex, NID regex patterns
│   └── errorCodes.ts       # Standardized error code strings
├── errors/
│   ├── AppError.ts         # Base error class
│   ├── ValidationError.ts  # 400
│   ├── UnauthorizedError.ts # 401
│   ├── ForbiddenError.ts   # 403
│   ├── NotFoundError.ts    # 404
│   ├── ConflictError.ts    # 409
│   └── RateLimitError.ts   # 429
├── middlewares/
│   ├── errorHandler.ts     # Global Express error handler
│   ├── auth.ts             # requireAuth (JWT verification)
│   ├── rbac.ts             # requireRole, requireVerifiedCitizen, requireListingOwner
│   ├── validate.ts         # Generic Zod validation middleware factory
│   └── rateLimiter.ts      # Rate limiting configurations per endpoint group
├── models/                 # Mongoose schemas for all 12 collections
│   ├── user.model.ts
│   ├── listing.model.ts
│   ├── conversation.model.ts
│   ├── message.model.ts
│   ├── offer.model.ts
│   ├── deal.model.ts
│   ├── review.model.ts
│   ├── favorite.model.ts
│   ├── report.model.ts
│   ├── dispute.model.ts
│   ├── phoneRevealAudit.model.ts
│   └── nidBlacklist.model.ts
├── routes/
│   ├── index.ts            # Central route aggregator
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
├── controllers/            # One controller per route module
├── services/               # Pure business logic, no req/res
├── queues/
│   ├── offerExpiration.queue.ts
│   ├── offerExpiration.worker.ts
│   ├── priceDropAlert.queue.ts
│   ├── priceDropAlert.worker.ts
│   ├── listingLifecycle.queue.ts
│   └── listingLifecycle.worker.ts
├── sockets/
│   ├── socketServer.ts     # Socket.io initialization & Redis adapter
│   ├── authMiddleware.ts   # JWT handshake verification
│   └── chatHandler.ts      # Message events, room management
├── utils/
│   ├── response.ts         # Standard success/error envelope builders
│   ├── logger.ts           # Winston logger configuration
│   ├── kms.ts              # AES-256-GCM encrypt/decrypt for NID vault
│   ├── hmac.ts             # Salted HMAC-SHA256 for NID hashing
│   └── scamDetector.ts     # Regex-based advance payment fraud filter
├── app.ts                  # Express app factory (helmet, cors, morgan, routes)
└── server.ts               # HTTP + Socket.io server bootstrap, graceful shutdown
```

---

## Phase-by-Phase Implementation Guide

---

### PHASE 0: Project Initialization & Core Infrastructure

**Goal:** Set up the TypeScript project, environment validation, logging, and standardized error handling.

**Step 0.1 — Initialize the project:**
```bash
mkdir becha-kena-backend && cd becha-kena-backend
npm init -y
# Set "type": "module" in package.json
```

**Step 0.2 — Install all dependencies:**
```bash
# Core
npm install express mongoose ioredis bullmq socket.io zod jsonwebtoken argon2 helmet cors morgan winston express-rate-limit rate-limit-redis @aws-sdk/client-s3 @aws-sdk/s3-request-presigner cookie-parser dotenv

# Dev
npm install -D typescript @types/express @types/node @types/jsonwebtoken @types/morgan @types/cookie-parser ts-node-dev tsx jest ts-jest @types/jest supertest @types/supertest mongodb-memory-server @socket.io/redis-adapter
```

**Step 0.3 — Configure `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true,
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

**Step 0.4 — Create `src/config/env.ts`:**
Validate all required environment variables using Zod at startup. If any are missing, crash immediately with a clear error. Required variables:
- `PORT` (number, default 5000)
- `NODE_ENV` (enum: `development`, `production`, `test`)
- `MONGODB_URI` (string, MongoDB Atlas connection string)
- `REDIS_URL` (string, Redis connection URL)
- `JWT_ACCESS_SECRET` (string, min 32 chars)
- `JWT_REFRESH_SECRET` (string, min 32 chars)
- `KMS_SECRET_KEY` (string, exactly 32 bytes hex for AES-256)
- `HMAC_SALT` (string, min 32 chars for NID hashing)
- `AWS_S3_BUCKET`, `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `PORICHOY_API_KEY`, `PORICHOY_BASE_URL`
- `KYC_PROVIDER` (enum: `porichoy`, `shadhin`, `mock`, default `mock`)

**Step 0.5 — Create `src/utils/response.ts`:**
Two helper functions:
- `sendSuccess(res, statusCode, message, data, meta?)` → `{ success: true, statusCode, message, data, meta }`
- `sendError(res, statusCode, code, message, details?, path?)` → `{ success: false, statusCode, error: { code, message, details }, timestamp, path }`

**Step 0.6 — Create error classes in `src/errors/`:**
Base `AppError` extends `Error` with `statusCode`, `code`, and `isOperational`. Then subclasses: `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitError` (429).

**Step 0.7 — Create `src/middlewares/errorHandler.ts`:**
Catches all errors. If `AppError`, use its statusCode and code. If Mongoose `ValidationError`, map to 400. If `JsonWebTokenError`, map to 401. Otherwise, 500 with generic message (hide internal details in production).

**Step 0.8 — Create `src/utils/logger.ts`:**
Winston logger with `console` transport (colorized in dev), `file` transport in production. Log levels: `error`, `warn`, `info`, `debug`.

**Step 0.9 — Create `src/app.ts`:**
Express factory: applies `helmet()`, `cors()`, `express.json({ limit: '10mb' })`, `cookieParser()`, `morgan('dev')`, mounts all route groups under `/api/v1`, attaches global error handler.

**Step 0.10 — Create `src/server.ts`:**
Starts HTTP server, attaches Socket.io, connects to MongoDB and Redis, registers graceful shutdown handlers for `SIGTERM` and `SIGINT`.

---

### PHASE 1: Database Models & Indexes

**Goal:** Implement all 12 Mongoose models exactly matching `database-schema.md`.

**Step 1.1 — Create `src/config/database.ts`:**
- Connect to MongoDB Atlas using `mongoose.connect(env.MONGODB_URI)`.
- Set connection pool: `maxPoolSize: 50`.
- Enable `autoIndex: true` in development, `false` in production.
- Log connection success/failure.
- Register `process.on('SIGTERM')` for graceful disconnect.

**Step 1.2 — Implement each model file in `src/models/`:**

For every model, define a TypeScript interface (`IUser`, `IListing`, etc.) and a Mongoose schema with all fields, types, defaults, validations, and indexes exactly as specified in `database-schema.md`.

**Critical schema details to implement precisely:**

1. **`user.model.ts` (D1):** 28 fields. `phone` unique with BD regex. `nidHash` sparse unique. `role` enum `['citizen', 'moderator', 'super_admin']`. `kycStatus` enum `['unverified', 'pending', 'verified', 'retake_required', 'manual_review']`. `deviceUUIDs` string array. `activeDeviceCount` max 2. `notificationPreferences` nested subdocument. `averageRating` min 0 max 5. Indexes: `{ phone: 1 }` unique, `{ nidHash: 1 }` unique sparse, `{ isNidVerified: 1, role: 1 }` compound, `{ isBanned: 1, isFrozen: 1 }` compound.

2. **`listing.model.ts` (D2):** `title` min 10 max 100. `price` min 50 max 2500000. `condition` enum `['brand_new', 'like_new', 'gently_used', 'heavily_used']`. `category` enum `['electronics', 'vehicles', 'property', 'fashion', 'home', 'hobbies']`. `location` GeoJSON Point subdocument with `coordinates [lon, lat]`, `division`, `thana`. `imageUrls` min 1 max 8. `status` enum `['draft', 'active', 'under_offer', 'sold', 'expired', 'archived', 'under_review']`. `moderationStatus` enum `['pending', 'approved', 'flagged', 'rejected']`. `renewCount` max 2. `maxRenewals` default 2. `expiresAt` default +30 days. `deletedAt` for soft delete. Indexes: `{ status: 1, category: 1, createdAt: -1 }`, `{ "location.coordinates": "2dsphere" }`, `{ sellerId: 1, status: 1 }`, `{ expiresAt: 1 }`, `{ deletedAt: 1 }` sparse.

3. **`conversation.model.ts` (D3):** `listingId`, `buyerId`, `sellerId` refs. Embedded `lastMessage` subdocument `{ text, senderId, createdAt }`. Unique compound index: `{ listingId: 1, buyerId: 1, sellerId: 1 }`.

4. **`message.model.ts` (D4):** `text` max 1000. `messageType` enum `['text', 'image', 'system', 'offer_event']`. `hasScamWarning` boolean. Indexes: `{ conversationId: 1, createdAt: -1 }`, `{ hasScamWarning: 1 }` sparse.

5. **`offer.model.ts` (D5):** `amount` min 50. `status` enum `['pending', 'accepted', 'countered', 'declined', 'expired']`. `parentOfferId` self-ref. `round` max 3. `expiresAt` default +24h. Indexes: `{ conversationId: 1, status: 1 }`, `{ listingId: 1, buyerId: 1 }`, `{ expiresAt: 1 }`.

6. **`deal.model.ts` (D6):** `listingId` unique (1 deal per listing). `disputeStatus` enum `['none', 'filed', 'under_review', 'resolved']`. Indexes: `{ listingId: 1 }` unique, `{ sellerId: 1, completedAt: -1 }`, `{ buyerId: 1, completedAt: -1 }`, `{ disputeStatus: 1 }` sparse.

7. **`review.model.ts` (D7):** `rating` integer 1-5. `tags` enum array `['punctual', 'item_as_described', 'friendly_communication', 'quick_payment']`. Unique compound index: `{ dealId: 1, reviewerId: 1 }`.

8. **`favorite.model.ts` (D8):** `priceAtSave` positive number. Unique compound index: `{ userId: 1, listingId: 1 }`.

9. **`report.model.ts` (D9):** `entityType` enum `['listing', 'chat', 'user']`. `reason` enum `['scam_advance_demanded', 'stolen_goods_suspected', 'harassment', 'counterfeit', 'spam']`. `status` enum `['pending', 'investigating', 'actioned', 'dismissed']`. Index: `{ entityType: 1, entityId: 1, status: 1 }`.

10. **`dispute.model.ts` (D10):** `dealId` unique. `status` enum `['pending', 'verified', 'rejected', 'escalated_to_police']`. `resolutionAction` enum `['seller_banned', 'claim_dismissed', 'legal_hold']`.

11. **`phoneRevealAudit.model.ts` (D11):** `ipAddress` string. TTL index on `createdAt` with `expireAfterSeconds: 7776000` (90 days).

12. **`nidBlacklist.model.ts` (D12):** `nidHash` unique. `phone` unique. `bannedBy` ref to User (Super Admin).

---

### PHASE 2: Redis Client, BullMQ Queues & Rate Limiters

**Goal:** Set up Redis, background job processing, and endpoint-level rate limiting.

**Step 2.1 — Create `src/config/redis.ts`:**
Export a singleton `ioredis` client. Configure automatic reconnect with exponential backoff. Log connection events.

**Step 2.2 — Create `src/middlewares/rateLimiter.ts`:**
Using `express-rate-limit` with `rate-limit-redis` store, export named rate limiters:
- `globalLimiter`: 100 requests / minute per IP.
- `otpRequestLimiter`: 1 request / 60s per phone AND max 5 / 24h per phone.
- `otpVerifyLimiter`: Max 5 attempts / 5 minutes per phone.
- `listingCreateLimiter`: Max 5 / 24h per userId.
- `phoneRevealLimiter`: Max 10 / 24h per userId.

**Step 2.3 — Create BullMQ queues and workers:**

- **`offerExpiration.queue.ts`:** Defines the queue `offer-expiration`. When an offer is created, schedule a delayed job with 24-hour delay.
- **`offerExpiration.worker.ts`:** Worker checks if the offer's status is still `pending`. If yes, atomically update to `expired` and notify the buyer.

- **`priceDropAlert.queue.ts`:** Defines the queue `price-drop-alert`. Uses `jobId: price_drop:${listingId}` with 5-minute delay for debouncing.
- **`priceDropAlert.worker.ts`:** Worker queries `favorites` where `priceAtSave > newPrice`, filters users with `notificationPreferences.priceDropAlerts === true`, dispatches push notifications.

- **`listingLifecycle.queue.ts`:** Defines a repeatable cron job that runs every hour.
- **`listingLifecycle.worker.ts`:** Worker queries `listings` where `status === 'active'` and `expiresAt < now()`, updates them to `expired`.

---

### PHASE 3: Authentication & Device Security

**Goal:** Implement passwordless phone OTP auth, JWT dual-token rotation, hardware device binding, and blacklist enforcement.

**Step 3.1 — Create `src/utils/hmac.ts`:**
Function `computeNidHash(nidNumber: string): string` — returns `HMAC-SHA256(nidNumber, env.HMAC_SALT)` as a 64-character hex string.

**Step 3.2 — Create `src/utils/kms.ts`:**
- `encryptData(plaintext: object): { ciphertext: string, iv: string, authTag: string }` — AES-256-GCM encrypt with `env.KMS_SECRET_KEY`, random 12-byte IV.
- `decryptData(ciphertext: string, iv: string, authTag: string): object` — Reverse decryption.

**Step 3.3 — Implement auth endpoints (see `api-spec.md` Section 2):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `/api/v1/auth/request-otp` | POST | Public | Validate BD phone regex. Check `nid_blacklists` for banned phone. Generate 6-digit OTP, hash with Argon2, store in Redis key `otp:<phone>` with 120s TTL. Return `expiresInSeconds: 120`. Rate: 1/60s, 5/24h. |
| 2 | `/api/v1/auth/verify-otp` | POST | Public | Timing-safe compare OTP. Upsert user (new or existing). Enforce max 2 `deviceUUIDs`. Issue 15-min Access JWT (`{ userId, role, isNidVerified, isFrozen, deviceId }`) and 30-day Refresh Token in HTTP-Only cookie. If `activeDeviceCount > 2`, return 423 requiring biometric challenge. |
| 3 | `/api/v1/auth/refresh-token` | POST | Cookie | Read `refreshToken` from HTTP-Only cookie. Validate in Redis token-family store. Rotate: issue new access + refresh. If reuse detected, revoke entire family. |
| 4 | `/api/v1/auth/logout` | POST | Auth | Delete refresh token from Redis. Clear cookie with `Max-Age=0`. |
| 5 | `/api/v1/auth/me` | GET | Auth | Same as `GET /api/v1/users/me`. Returns full profile. |

**Step 3.4 — Create `src/middlewares/auth.ts`:**
`requireAuth` middleware: Extracts `Bearer <token>` from `Authorization` header. Verifies JWT signature with `env.JWT_ACCESS_SECRET`. Attaches decoded user to `req.user`. Rejects if expired, malformed, or user `isBanned === true`.

**Step 3.5 — Create `src/middlewares/rbac.ts`:**
- `requireVerifiedCitizen`: Checks `req.user.isNidVerified === true` AND `req.user.isFrozen === false`. Returns 403 otherwise.
- `requireRole(roles: string[])`: Checks `req.user.role` is in allowed roles array.
- `requireListingOwner`: Loads listing by `:id` param, checks `listing.sellerId === req.user.userId`.

---

### PHASE 4: E-KYC Zero-Knowledge Identity Engine

**Goal:** Implement NID verification with the Porichoy API adapter pattern, HMAC collision checking, and envelope encryption.

**Step 4.1 — Create `src/services/kyc/IKYCProvider.ts`:**
Define the interface exactly as in `architecture.md` Section 2.2.2:
```typescript
interface IKYCProvider {
  extractOcr(frontImage: Buffer, backImage: Buffer): Promise<{ nidNumber: string; dob: string }>;
  verifyDemographics(nidNumber: string, dob: string): Promise<NidDemographics>;
  matchFace(ecPhotoBase64: string, liveSelfieBase64: string): Promise<FaceMatchResult>;
}
```

**Step 4.2 — Create 3 provider implementations:**
- `PorichoyProvider` — real API calls to `env.PORICHOY_BASE_URL`.
- `MockProvider` — instant pass/fail based on test fixtures (for development).
- `KYCProviderFactory` — reads `env.KYC_PROVIDER` and returns the correct implementation.

**Step 4.3 — Implement KYC endpoints (see `api-spec.md` Section 4):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `/api/v1/kyc/ocr` | POST | Auth | Accept front+back NID images (multipart). Extract NID number and DOB via OCR provider. |
| 2 | `/api/v1/kyc/verify-nid` | POST | Auth | **Primary composite flow.** Step 1: Compute `nidHash`, check against `nid_blacklists` (→ 403) and `users` (→ 409). Step 2: Call provider `verifyDemographics`. Step 3: Call provider `matchFace` (reject if confidence < 85%). Step 4: On success → encrypt legal data with KMS, save `encryptedNidData`, set `isNidVerified: true`, `kycStatus: 'verified'`. Enforce max 3 attempts via `kycAttempts`. After 3 failures → set `kycStatus: 'manual_review'`. |
| 3 | `/api/v1/kyc/status` | GET | Auth | Return `kycStatus`, `isNidVerified`, `attemptsUsed`, `slaRemainingMinutes` (if in manual review). |
| 4 | `/api/v1/kyc/rebind-phone` | POST | Public | Lost SIM recovery. Verify new phone OTP, compute `nidHash`, match biometric face (>= 95% confidence), rebind to new phone, revoke all old sessions. |
| 5 | `/api/v1/kyc/verify-new-device` | POST | Auth | "New Phone, Same SIM" challenge. Quick selfie liveness. On success, add new `deviceUUID` to array (max 2). |

---

### PHASE 5: Listings Engine, Media Uploads & Phone Reveal Gate

**Goal:** Full marketplace CRUD with geospatial queries, bilingual search, 30-day lifecycle, image uploads, and the privacy-preserving phone reveal system.

**Step 5.1 — Implement upload endpoint (see `api-spec.md` Section 12):**

| Endpoint | Method | Auth | What It Does |
|---|---|---|---|
| `/api/v1/uploads/presigned-url` | POST | Auth | Accept `{ fileName, fileType, context }`. Context enum: `listing_image`, `nid_front`, `nid_back`, `gd_document`, `avatar`. Validate MIME (`image/jpeg`, `image/png`, `image/webp`), max 5MB. Generate S3 pre-signed PUT URL (10-min expiry). Return `{ uploadUrl, publicUrl }`. |

**Step 5.2 — Implement listing endpoints (see `api-spec.md` Section 5):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `GET /api/v1/listings` | GET | Public | Full search with query params: `q` (text search), `category`, `condition`, `division`, `thana`, `longitude`, `latitude`, `maxDistanceKm` (default 25, uses `$nearSphere` on 2dsphere index), `minPrice`, `maxPrice`, `sort` (newest/price_low/price_high/distance), `page`, `limit`. Exclude `deletedAt != null` and `status != 'active'`. Populate seller summary. |
| 2 | `GET /api/v1/listings/:id` | GET | Public | Fetch full details. Atomically increment `viewCount` with `$inc`. Populate seller trust profile. Hide phone number field. |
| 3 | `POST /api/v1/listings` | POST | Verified | Validate all fields per PRD rules (title 10-100, price 50-2500000, images 1-8, etc.). Enforce 5 active listings per 30 days quota. Set `expiresAt = now() + 30 days`. Set `moderationStatus: 'pending'`. |
| 4 | `PUT /api/v1/listings/:id` | PUT | Owner | Update listing fields. If price decreased, publish `price-drop-alert` BullMQ job with 5-min debounce. |
| 5 | `DELETE /api/v1/listings/:id` | DELETE | Owner | Soft delete: set `deletedAt = now()`, change `status = 'archived'`. |
| 6 | `POST /api/v1/listings/:id/renew` | POST | Owner | If `renewCount < maxRenewals (2)`: increment `renewCount`, reset `expiresAt = now() + 30 days`, set `status = 'active'`. Otherwise return 422. |
| 7 | `PATCH /api/v1/listings/:id/status` | PATCH | Owner | Update status to `active`, `under_offer`, or `sold`. If `sold`, require `soldToBuyerId`. |

**Step 5.3 — Implement phone reveal gate (see `api-spec.md` Section 5.3):**

| Endpoint | Method | Auth | What It Does |
|---|---|---|---|
| `POST /api/v1/listings/:id/reveal-phone` | POST | Verified | Check Redis rate limit (10/24h per userId). Create `PhoneRevealAudit` record `{ buyerId, listingId, sellerId, ipAddress }`. Return seller's phone number, `revealsUsedToday`, `revealsRemainingToday`. |

---

### PHASE 6: Favorites & Price Drop Alerts

**Goal:** Wishlist management with real-time price comparison and debounced notifications.

**Implement endpoints (see `api-spec.md` Section 6):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `POST /api/v1/favorites/:listingId` | POST | Verified | Upsert favorite with `priceAtSave = listing.price`. Unique compound index prevents duplicates. |
| 2 | `DELETE /api/v1/favorites/:listingId` | DELETE | Verified | Remove the favorite document. |
| 3 | `GET /api/v1/favorites` | GET | Auth | List user's favorites. For each, include current listing price and compute `isPriceDropped: currentPrice < priceAtSave`. Show listing availability status. |

**Price Drop Integration:** In the listing update service (Phase 5), when `newPrice < oldPrice`, enqueue a `price-drop-alert` BullMQ job with `jobId: price_drop:${listingId}` and 5-minute delay. The worker queries all favorites for that listing and sends push notifications to users who have `priceDropAlerts: true`.

---

### PHASE 7: Real-Time Chat & Advance Payment Scam Shield

**Goal:** Authenticated WebSocket chat with message persistence, scam detection, and link stripping.

**Step 7.1 — Create `src/utils/scamDetector.ts`:**
Export function `detectScamPatterns(text: string): boolean` that returns `true` if the text matches advance payment fraud patterns:
```typescript
const SCAM_REGEX = /(advance|bkash|nagad|courier\s*charge|delivery\s*charge|booking\s*fee|send\s*money\s*first)/i;
```
Also export `stripExternalLinks(text: string): string` that removes `http://`, `https://`, `.apk` patterns.

**Step 7.2 — Create Socket.io server (`src/sockets/`):**
- `socketServer.ts`: Initialize Socket.io on the HTTP server. Attach Redis adapter for horizontal scaling. Apply JWT handshake middleware.
- `authMiddleware.ts`: Parse JWT from `socket.handshake.auth.token`. Verify signature. Reject banned/frozen users. Attach user info to `socket.data`.
- `chatHandler.ts`: Handle events:
  - `join_conversation`: Validate user is a participant, join room `conversation:<conversationId>`.
  - `send_message`: Save message to DB (with scam check), broadcast to room. If `hasScamWarning`, include warning payload.
  - `typing`: Broadcast typing indicator to the room.

**Step 7.3 — Implement REST chat endpoints (see `api-spec.md` Section 7):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `POST /api/v1/chats/initiate` | POST | Verified | Accept `{ listingId }`. Upsert conversation `{ listingId, buyerId: req.user, sellerId: listing.sellerId }` using the unique compound index. Prevent seller from chatting on own listing. Increment `listing.inquiryCount`. |
| 2 | `GET /api/v1/chats` | GET | Auth | List all conversations for the user, sorted by `updatedAt` descending. Include denormalized `lastMessage` preview and unread count. |
| 3 | `GET /api/v1/chats/:conversationId/messages` | GET | Auth | Cursor-paginated messages (newest first). Verify user is a participant. |
| 4 | `POST /api/v1/chats/:conversationId/messages` | POST | Verified | Validate user is a participant. Strip external links. Run scam detector. Save message. Update `conversation.lastMessage`. Emit `new_message` via Socket.io to the room. |

---

### PHASE 8: Binding Offer Negotiation Protocol

**Goal:** 3-round formal price negotiation with 24-hour auto-expiration.

**Implement endpoints (see `api-spec.md` Section 8):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `POST /api/v1/chats/:conversationId/offers` | POST | Verified | Buyer submits `{ amount }`. Validate: amount >= 50, amount <= listing.price. Check max 3 offers per buyer per listing (query offers by `{ listingId, buyerId }`, count <= 3). Set `round: 1`, `expiresAt: now() + 24h`, `status: 'pending'`. Schedule BullMQ `offer-expiration` delayed job. Create `offer_event` message in chat. Emit via Socket.io. |
| 2 | `POST /api/v1/chats/:conversationId/offers/:offerId/counter` | POST | Verified | Seller submits counter `{ amount }`. Mark original offer `status: 'countered'`. Create new offer with `parentOfferId`, `round: prevRound + 1`. Schedule new expiration job. |
| 3 | `POST /api/v1/chats/:conversationId/offers/:offerId/accept` | POST | Verified | Seller accepts. Mark offer `status: 'accepted'`. Update listing `status: 'under_offer'`. Cancel expiration job. Emit `offer_accepted` event. |
| 4 | `POST /api/v1/chats/:conversationId/offers/:offerId/decline` | POST | Verified | Mark offer `status: 'declined'`. Cancel expiration job. If listing was `under_offer` from this offer chain, revert to `active`. |

---

### PHASE 9: ACID Deal Closure & Bilateral Reviews

**Goal:** Atomic transaction to prevent double-selling. Bilateral reputation scoring.

**Step 9.1 — Implement deal closure service:**
The core function `executeAtomicDealClosure(listingId, sellerId, buyerId, finalPrice, offerId?)` runs inside `session.withTransaction`:
1. `Listing.findOneAndUpdate({ _id: listingId, status: { $in: ['active', 'under_offer'] } }, { status: 'sold', soldToBuyerId: buyerId }, { session })` — if null, throw ConflictError.
2. `Deal.create([{ listingId, sellerId, buyerId, finalPrice, offerId }], { session })` — unique index on `listingId` prevents duplicates.
3. `User.updateMany({ _id: { $in: [sellerId, buyerId] } }, { $inc: { totalDealsCompleted: 1 } }, { session })`.
4. `Offer.updateMany({ listingId, status: 'pending', _id: { $ne: offerId } }, { status: 'declined' }, { session })` — reject competing offers.

**Step 9.2 — Implement deal endpoints (see `api-spec.md` Section 9):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `POST /api/v1/deals` | POST | Verified | Seller closes deal from accepted offer. Calls `executeAtomicDealClosure`. |
| 2 | `POST /api/v1/deals/direct-sale` | POST | Verified | Seller marks item sold by selecting a buyer from active chats (no formal offer). Creates Deal with `offerId: null`. |
| 3 | `GET /api/v1/deals/:dealId` | GET | Auth | Fetch deal details. Only accessible by buyer or seller of the deal. |

**Step 9.3 — Implement review endpoints (see `api-spec.md` Section 9):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `POST /api/v1/deals/:dealId/reviews` | POST | Verified | Validate: user is buyer or seller in the deal. Validate: `isReviewedBySeller`/`isReviewedByBuyer` is still false. Validate: within 48 hours of `deal.completedAt`. Accept `{ rating (1-5), tags[], comment? }`. Create Review. Update deal flag. Recalculate `reviewee.averageRating` using weighted rolling formula with `$inc`. |
| 2 | `GET /api/v1/users/:userId/reviews` | GET | Public | Fetch all reviews where `revieweeId === userId`. Aggregate trust badge counts. |

---

### PHASE 10: Community Reporting & Auto-Quarantine

**Goal:** User-driven safety reports with automated listing quarantine on threshold.

**Implement endpoints (see `api-spec.md` Section 10):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `POST /api/v1/reports` | POST | Verified | Accept `{ entityType, entityId, reason, details }`. Validate entityType enum. Save Report. **Auto-quarantine check:** If `entityType === 'listing'`, count reports for this listing with `status: 'pending'`. If count >= 3, automatically set `listing.status = 'under_review'` and `listing.moderationStatus = 'flagged'`. |
| 2 | `GET /api/v1/reports/me` | GET | Auth | List reports submitted by current user with resolution status. |

---

### PHASE 11: Post-Deal Legal Disputes (Bangladesh Police GD)

**Goal:** Stolen gadget dispute filing with GD evidence and automatic seller account freeze.

**Implement endpoints (see `api-spec.md` Section 11):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `POST /api/v1/deals/:dealId/disputes` | POST | Verified | Accept `{ gdNumber, thanaName, gdFilingDate, gdDocumentUrl }`. Validate: deal exists, user is the buyer, no existing dispute (unique index on `dealId`). Create Dispute. Set `deal.disputeStatus = 'filed'`, `deal.disputeId = dispute._id`. **Freeze seller:** `User.findByIdAndUpdate(deal.sellerId, { isFrozen: true })`. Send high-priority notification to both parties. |
| 2 | `GET /api/v1/deals/:dealId/dispute` | GET | Auth | Fetch dispute details. Accessible by buyer, seller, moderator, or super_admin. |

---

### PHASE 12: Admin Moderation & Dual-Approval Ban System

**Goal:** Back-office admin endpoints for KYC review, report triage, dispute resolution, and the 2-party ban workflow.

**Implement admin endpoints (see `api-spec.md` Section 13):**

| # | Endpoint | Method | Auth | What It Does |
|---|---|---|---|---|
| 1 | `GET /api/v1/admin/kyc/queue` | GET | Moderator | Paginated list of users with `kycStatus: 'manual_review'`, sorted by oldest first. Show SLA aging (target < 4 hours). |
| 2 | `PATCH /api/v1/admin/kyc/:userId/approve` | PATCH | Moderator | Set `isNidVerified: true`, `kycStatus: 'verified'`. Notify user. |
| 3 | `PATCH /api/v1/admin/kyc/:userId/reject` | PATCH | Moderator | Set `kycStatus: 'retake_required'`. Notify user with reason. |
| 4 | `GET /api/v1/admin/reports` | GET | Moderator | List all pending reports with entity details. |
| 5 | `PATCH /api/v1/admin/reports/:reportId/action` | PATCH | Moderator | Resolve report: `dismiss`, `quarantine`, `warn`, `escalate`. |
| 6 | `GET /api/v1/admin/disputes` | GET | Moderator | List all active disputes with GD details. |
| 7 | `PATCH /api/v1/admin/disputes/:disputeId/resolve` | PATCH | Super Admin | Accept `{ resolutionAction }`. If `seller_banned`: trigger full ban pipeline. If `claim_dismissed`: unfreeze seller. If `legal_hold`: keep frozen, generate law enforcement export. |
| 8 | `POST /api/v1/admin/users/:userId/propose-ban` | POST | Moderator | Set `user.banProposedBy = moderatorId`, `user.banReason = reason`. Does NOT finalize the ban. |
| 9 | `POST /api/v1/admin/users/:userId/confirm-ban` | POST | Super Admin | **Dual-approval finalization.** Verify `banProposedBy` exists (a moderator already proposed). Then: (a) Set `isBanned: true`, `bannedAt: now()`. (b) Insert into `nid_blacklists`: `{ nidHash, phone, deviceUUID, reason, bannedBy }`. (c) Archive all seller's active listings. (d) Purge all refresh tokens from Redis. |
| 10 | `GET /api/v1/admin/audits/phone-reveals` | GET | Super Admin | Aggregate `phone_reveal_audits` to detect scraping bots (group by `buyerId`, count reveals, flag anomalies > 8/day). |

---

### PHASE 13: End-to-End Testing & Production Hardening

**Goal:** Comprehensive test suites verifying all business rules, concurrency safety, and security headers.

**Step 13.1 — Configure Jest:**
`jest.config.ts` with `ts-jest` preset, ESM transform, `mongodb-memory-server` for isolated DB tests.

**Step 13.2 — Implement test suites:**

1. **`tests/auth.test.ts`:**
   - Valid BD phone number formats accepted, invalid rejected.
   - OTP generation, Redis storage, 120s expiry.
   - OTP brute-force rate limiting (5 attempts max).
   - Dual-device enforcement (3rd device triggers 423).
   - JWT access token contains correct payload fields.
   - Refresh token rotation; reuse detection revokes family.
   - Banned phone rejected at OTP request.

2. **`tests/kyc.test.ts`:**
   - Mock provider passes/fails correctly.
   - HMAC NID hash collision blocked (409).
   - Blacklisted NID hash rejected (403).
   - AES-256-GCM encryption/decryption roundtrip.
   - 3-attempt limit then routes to manual review.

3. **`tests/listings.test.ts`:**
   - Create listing with valid data succeeds.
   - Title < 10 chars rejected. Price > 2,500,000 rejected.
   - 2dsphere geospatial query returns results within radius.
   - Listing expires after 30 days (simulate with date mocking).
   - Renewal increments `renewCount`; 3rd renewal rejected.
   - Phone reveal creates audit log; 11th reveal returns 429.

4. **`tests/offers.test.ts`:**
   - 3-round counter-offer chain works correctly.
   - 4th offer from same buyer rejected.
   - BullMQ offer expiration marks status as `expired` after 24h.

5. **`tests/deals.test.ts`:**
   - `executeAtomicDealClosure` marks listing as `sold`.
   - Concurrent deal closure attempts: only 1 succeeds, others get ConflictError.
   - Competing pending offers are auto-declined.
   - Bilateral reviews: buyer and seller can each submit exactly 1 review.

6. **`tests/disputes.test.ts`:**
   - Dispute creation freezes seller account.
   - Duplicate dispute on same deal rejected (unique index).

7. **`tests/security.test.ts`:**
   - Helmet headers present in responses.
   - CORS configured correctly.
   - Rate limit headers present (X-RateLimit-Limit, X-RateLimit-Remaining).
   - Error responses never leak internal stack traces in production.

---

## How to Use This Prompt

### Option A: Feed Entire Document
Copy this entire `prompt.md` as a system prompt to an AI coding agent. Then say:
```
"Start with Phase 0. Build each file completely with production-ready code. Move to the next phase only after the current phase compiles without errors."
```

### Option B: Phase-by-Phase Execution
Send one phase at a time:
```
"Execute Phase [N] of the Becha-Kena Master Prompt.
Reference specifications: PRD.md, architecture.md, database.md, database-schema.md, api-spec.md.
Produce complete, strict TypeScript code with Zod validation, full error handling, and zero placeholder code."
```

### Option C: Feature-Specific Extraction
Target a specific feature:
```
"Implement only the Phone Reveal Gate feature (Phase 5, Step 5.3).
Follow the exact API contract from api-spec.md Section 5.3.
Include the Redis rate limiter, PhoneRevealAudit model, and complete controller/service/route code."
```
