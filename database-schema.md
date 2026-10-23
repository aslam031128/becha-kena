# Database Schema Specification: Becha-Kena

**Project Name:** Becha-Kena — NID-Verified C2C Resale Marketplace  
**Document Version:** 1.0  
**Source:** Extracted from `database.md` (Section 2: Detailed Schema Definitions)  
**Database Engine:** MongoDB Atlas (v7.0+)  
**ODM:** Mongoose (v8.x) with TypeScript  
**Reference Documents:** `PRD.md` (v2.0), `architecture.md` (v1.0), `dfd.md` (v1.0), `database.md` (v1.0)  

---

## 2. Detailed Schema Definitions

### 2.1 Collection: `users` (Store D1)
Stores all citizen accounts. Separates public profile data from zero-knowledge biometric and legal identity details.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Internal system identifier |
| `phone` | `String` | Yes | — | Regex: `/^(?:\+8801\|01)[3-9]\d{8}$/`, Unique | Bangladeshi mobile number (Primary auth key) |
| `nidHash` | `String` | No | `null` | Index (Sparse), 64-char hex | Salted HMAC-SHA256 hash of NID number for collision check |
| `encryptedNidData` | `Object` | No | `null` | Envelope KMS AES-256-GCM | Encrypted legal vault containing real name, DOB, and EC photo vector |
| `displayName` | `String` | Yes | — | Min 3, Max 50 chars, trimmed | Public citizen name displayed on marketplace |
| `role` | `String` | Yes | `'citizen'` | Enum: `['citizen', 'moderator', 'super_admin']` | Authorization role |
| `isNidVerified` | `Boolean` | Yes | `false` | Index | Flag unlocking seller publishing and phone reveal |
| `kycStatus` | `String` | Yes | `'unverified'` | Enum: `['unverified', 'pending', 'verified', 'retake_required', 'manual_review']` | Identity lifecycle state |
| `kycAttempts` | `Number` | Yes | `0` | Max: 3 per 24 hours | Rate limiter against brute-force Porichoy queries |
| `avatarUrl` | `String` | No | `null` | Valid URI | S3 / Cloudinary public avatar URL |
| `deviceUUIDs` | `[String]` | Yes | `[]` | Array of hardware UUIDs | Bound device footprints for "New SIM, New Phone" challenge |
| `activeDeviceCount`| `Number` | Yes | `1` | Max: 2 active devices | Concurrent active login threshold |
| `isBanned` | `Boolean` | Yes | `false` | Index | Termination status (Dual-approval required) |
| `banReason` | `String` | No | `null` | String | Justification recorded for termination |
| `banProposedBy` | `ObjectId` | No | `null` | Ref: `User` (Moderator role) | Moderator ID proposing account ban |
| `bannedAt` | `Date` | No | `null` | Timestamp | Timestamp when ban was finalized by Super Admin |
| `isFrozen` | `Boolean` | Yes | `false` | Index | Temporary privilege freeze during active police dispute |
| `notificationPreferences` | `Object` | Yes | Defined below | Nested Object | Citizen delivery preferences and quiet hour settings |
| `notificationPreferences.pushEnabled` | `Boolean` | Yes | `true` | — | Enable Firebase Cloud Messaging push |
| `notificationPreferences.smsEnabled` | `Boolean` | Yes | `true` | — | Enable Telco SMS fallback |
| `notificationPreferences.priceDropAlerts`| `Boolean` | Yes | `true` | — | Receive notifications when favorited ad price drops |
| `notificationPreferences.quietHoursStart`| `String` | No | `'23:00'` | 24-hr time format `HH:mm` | Start of muted notification window |
| `notificationPreferences.quietHoursEnd` | `String` | No | `'07:00'` | 24-hr time format `HH:mm` | End of muted notification window |
| `averageRating` | `Number` | Yes | `0.0` | Min 0.0, Max 5.0, Float | Rolling weighted average star rating |
| `totalDealsCompleted` | `Number`| Yes | `0` | Non-negative integer | Total peer-to-peer verified transactions closed |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Account registration timestamp |
| `updatedAt` | `Date` | Yes | Auto | Timestamp | Profile last update timestamp |

---

### 2.2 Collection: `listings` (Store D2)
Manages C2C marketplace listings, media references, and auto-expiry logic.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Internal listing identifier |
| `sellerId` | `ObjectId` | Yes | — | Ref: `User`, Index | ID of the verified citizen seller |
| `title` | `String` | Yes | — | Min 10, Max 100 chars, trimmed | Listing headline (Indexed for Atlas bilingual search) |
| `description` | `String` | Yes | — | Min 20, Max 2000 chars | Full item condition description and terms |
| `price` | `Number` | Yes | — | Min: 50, Max: 2,500,000 BDT | Asking price in Bangladeshi Taka |
| `condition` | `String` | Yes | — | Enum: `['brand_new', 'like_new', 'gently_used', 'heavily_used']`| Physical grade of item |
| `category` | `String` | Yes | — | Enum: `['electronics', 'vehicles', 'property', 'fashion', 'home', 'hobbies']` | Category taxonomy |
| `location` | `Object` | Yes | — | GeoJSON Point | Geographical coordinates and administrative hierarchy |
| `location.type` | `String` | Yes | `'Point'` | Enum: `['Point']` | GeoJSON coordinate type |
| `location.coordinates`| `[Number]`| Yes | — | `[longitude, latitude]` | 2dsphere index coordinate pair |
| `location.division`| `String` | Yes | — | Enum of 8 BD Divisions | e.g., `'Dhaka'`, `'Chittagong'` |
| `location.thana` | `String` | Yes | — | Valid Bangladesh Thana | e.g., `'Dhanmondi'`, `'Mirpur'` |
| `imageUrls` | `[String]` | Yes | — | Min 1, Max 8 URLs | Direct S3 / Cloudinary media tokens |
| `status` | `String` | Yes | `'active'` | Enum: `['draft', 'active', 'under_offer', 'sold', 'expired', 'archived', 'under_review']` | Operational listing state |
| `moderationStatus` | `String` | Yes | `'pending'` | Enum: `['pending', 'approved', 'flagged', 'rejected']` | Automated NSFW and scam watermark check status |
| `isPhoneHidden` | `Boolean` | Yes | `true` | Default hidden | Protects seller phone behind the click-and-call reveal gate |
| `soldToBuyerId` | `ObjectId` | No | `null` | Ref: `User` | Buyer ID when marked sold |
| `viewCount` | `Number` | Yes | `0` | Non-negative integer | Unique view count accumulator |
| `inquiryCount` | `Number` | Yes | `0` | Non-negative integer | Total conversation threads opened |
| `renewCount` | `Number` | Yes | `0` | Max: 2 renewals | Total lifecycle renewals applied |
| `maxRenewals` | `Number` | Yes | `2` | Static limit | Cap enforcing maximum 90-day total lifespan |
| `renewedAt` | `Date` | No | `null` | Timestamp | Last renewal execution date |
| `expiresAt` | `Date` | Yes | +30 days | Index (30-day lifecycle) | Expiration timestamp (30 days from publish/renew; monitored by BullMQ/cron) |
| `deletedAt` | `Date` | No | `null` | Index | Soft deletion timestamp |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Listing creation date |
| `updatedAt` | `Date` | Yes | Auto | Timestamp | Last modification date |

---

### 2.3 Collection: `conversations` (Store D3)
Enforces a 1-to-1 communication channel between a buyer, a seller, and a specific listing.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Internal conversation identifier |
| `listingId` | `ObjectId` | Yes | — | Ref: `Listing` | Associated listing |
| `buyerId` | `ObjectId` | Yes | — | Ref: `User` | Initiating citizen buyer |
| `sellerId` | `ObjectId` | Yes | — | Ref: `User` | Listing owner |
| `lastMessage` | `Object` | No | `null` | Embedded object | Fast preview cache for chat inbox list |
| `lastMessage.text` | `String` | Yes | — | String preview | Truncated message text |
| `lastMessage.senderId`| `ObjectId`| Yes | — | Ref: `User` | Last sender |
| `lastMessage.createdAt`| `Date` | Yes | — | Timestamp | Timestamp of last message |
| `status` | `String` | Yes | `'active'` | Enum: `['active', 'blocked', 'archived']` | Thread state |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Thread creation date |
| `updatedAt` | `Date` | Yes | Auto | Index | Last activity date |

---

### 2.4 Collection: `messages` (Store D4)
Maintains atomic chat log payloads, soft-delete states, and automated scam warnings.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Message identifier |
| `conversationId` | `ObjectId` | Yes | — | Ref: `Conversation`, Index | Parent thread |
| `senderId` | `ObjectId` | Yes | — | Ref: `User` | Author citizen ID |
| `text` | `String` | Yes | — | Max 1000 chars, stripped of URLs | Sanitized chat payload |
| `messageType` | `String` | Yes | `'text'` | Enum: `['text', 'image', 'system', 'offer_event']` | Message archetype |
| `hasScamWarning` | `Boolean` | Yes | `false` | Index | True if Bengali regex detected advance payment words |
| `isDeleted` | `Boolean` | Yes | `false` | Soft-delete flag | User-hidden status |
| `deletedAt` | `Date` | No | `null` | Timestamp | Deletion date |
| `createdAt` | `Date` | Yes | Auto | Index | Timestamp when received |

---

### 2.5 Collection: `offers` (Store D5)
Tracks binding formal price bids, counter-offer parent pointers, and automated 24-hr expirations.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Offer identifier |
| `conversationId` | `ObjectId` | Yes | — | Ref: `Conversation`, Index | Chat thread context |
| `listingId` | `ObjectId` | Yes | — | Ref: `Listing`, Index | Targeted listing |
| `buyerId` | `ObjectId` | Yes | — | Ref: `User` | Bidding buyer |
| `sellerId` | `ObjectId` | Yes | — | Ref: `User` | Listing seller |
| `amount` | `Number` | Yes | — | Min: 50 BDT, Positive | Proposed binding purchase amount |
| `status` | `String` | Yes | `'pending'` | Enum: `['pending', 'accepted', 'countered', 'declined', 'expired']` | Offer state |
| `parentOfferId` | `ObjectId` | No | `null` | Ref: `Offer` | Links counter-offer to previous round |
| `round` | `Number` | Yes | `1` | Max: 3 per buyer | Current negotiation counter iteration |
| `expiresAt` | `Date` | Yes | +24 hours | TTL Index | Expiration deadline (Auto-expired via BullMQ) |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Offer creation date |

---

### 2.6 Collection: `deals` (Store D6)
Immutable transaction registry. Forms the legal basis for bilateral reviews and dispute escalations.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Deal identifier |
| `listingId` | `ObjectId` | Yes | — | Ref: `Listing`, Unique | Closed listing (1 deal per listing) |
| `offerId` | `ObjectId` | No | `null` | Ref: `Offer` | Accepted offer ID (null if direct sale) |
| `sellerId` | `ObjectId` | Yes | — | Ref: `User`, Index | Seller citizen ID |
| `buyerId` | `ObjectId` | Yes | — | Ref: `User`, Index | Buyer citizen ID |
| `finalPrice` | `Number` | Yes | — | Positive Number | Final agreed transaction price in BDT |
| `isReviewedBySeller`| `Boolean`| Yes | `false` | — | Seller bilateral review completion flag |
| `isReviewedByBuyer` | `Boolean`| Yes | `false` | — | Buyer bilateral review completion flag |
| `disputeStatus` | `String` | Yes | `'none'` | Enum: `['none', 'filed', 'under_review', 'resolved']` | Stolen item / dispute escalation state |
| `disputeId` | `ObjectId` | No | `null` | Ref: `Dispute` | Foreign key linking dispute document |
| `completedAt` | `Date` | Yes | Auto | Timestamp | Date and time deal was executed |

---

### 2.7 Collection: `reviews` (Store D7)
Bilateral star ratings and trust badges submitted between transacting parties.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Review identifier |
| `dealId` | `ObjectId` | Yes | — | Ref: `Deal` | Associated transaction |
| `listingId` | `ObjectId` | Yes | — | Ref: `Listing` | Associated listing item |
| `reviewerId` | `ObjectId` | Yes | — | Ref: `User` | Author citizen |
| `revieweeId` | `ObjectId` | Yes | — | Ref: `User`, Index | Rated citizen |
| `rating` | `Number` | Yes | — | Integer: 1 to 5 | Star rating score |
| `tags` | `[String]` | Yes | `[]` | Enum: `['punctual', 'item_as_described', 'friendly_communication', 'quick_payment']` | Trust badges |
| `comment` | `String` | No | `null` | Max 300 chars | Optional text feedback |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Submission date (Locked after 48h) |

---

### 2.8 Collection: `favorites` (Store D8)
Wishlist entries tracking items of interest with historical pricing benchmark.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Bookmark identifier |
| `userId` | `ObjectId` | Yes | — | Ref: `User` | Saving citizen |
| `listingId` | `ObjectId` | Yes | — | Ref: `Listing`, Index | Saved ad |
| `priceAtSave` | `Number` | Yes | — | Positive Number | Asking price at moment of saving (benchmark) |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Bookmark creation date |

---

### 2.9 Collection: `reports` (Store D9)
Community moderation queue entries against listings, chat messages, or citizen accounts.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Report identifier |
| `reporterId` | `ObjectId` | Yes | — | Ref: `User`, Index | Reporting citizen |
| `entityType` | `String` | Yes | — | Enum: `['listing', 'chat', 'user']` | Target classification |
| `entityId` | `ObjectId` | Yes | — | Index | Target document ID |
| `reason` | `String` | Yes | — | Enum: `['scam_advance_demanded', 'stolen_goods_suspected', 'harassment', 'counterfeit', 'spam']` | Flag reason category |
| `details` | `String` | Yes | — | Max 500 chars | Additional narrative text |
| `status` | `String` | Yes | `'pending'` | Enum: `['pending', 'investigating', 'actioned', 'dismissed']` | Moderator review state |
| `reviewedBy` | `ObjectId` | No | `null` | Ref: `User` (Moderator role) | Operator who triaged the report |
| `resolvedAt` | `Date` | No | `null` | Timestamp | Resolution timestamp |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Incident log timestamp |

---

### 2.10 Collection: `disputes` (Store D10)
Preserves legal dispute claims, official Bangladesh Police General Diary (GD) records, and evidence links.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Dispute identifier |
| `dealId` | `ObjectId` | Yes | — | Ref: `Deal`, Unique | Contested transaction |
| `buyerId` | `ObjectId` | Yes | — | Ref: `User` | Claiming buyer |
| `sellerId` | `ObjectId` | Yes | — | Ref: `User`, Index | Accused seller |
| `gdNumber` | `String` | Yes | — | String (Official GD Ref) | Bangladesh Police General Diary number |
| `thanaName` | `String` | Yes | — | Valid Bangladesh Thana | Police station where GD was recorded |
| `gdFilingDate` | `Date` | Yes | — | Past or Present Date | Official GD submission date |
| `gdDocumentUrl` | `String` | Yes | — | Valid S3 URL | Scanned GD image or official seal copy |
| `status` | `String` | Yes | `'pending'` | Enum: `['pending', 'verified', 'rejected', 'escalated_to_police']` | Verification status |
| `resolutionAction`| `String`| No | `null` | Enum: `['seller_banned', 'claim_dismissed', 'legal_hold']` | Outcome |
| `resolvedBy` | `ObjectId` | No | `null` | Ref: `User` (Admin role) | Admin performing the verification |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Submission date |

---

### 2.11 Collection: `phone_reveal_audits` (Store D11)
High-velocity immutable access logs for click-and-call phone unmasks.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Audit identifier |
| `buyerId` | `ObjectId` | Yes | — | Ref: `User`, Index | Citizen who unmasked the number |
| `listingId` | `ObjectId` | Yes | — | Ref: `Listing` | Listing whose contact was requested |
| `sellerId` | `ObjectId` | Yes | — | Ref: `User` | Seller owning the phone number |
| `ipAddress` | `String` | Yes | — | IPv4 / IPv6 format | Originating client network address |
| `createdAt` | `Date` | Yes | Auto | TTL Index (90 days) | Execution timestamp |

---

### 2.12 Collection: `nid_blacklists` (Store D12)
Cryptographic registry storing permanently banned NID hashes, phone numbers, and hardware footprints.

| Field Name | Type | Required | Default | Constraints & Rules | Description |
|---|---|:---:|---|---|---|
| `_id` | `ObjectId` | Yes | Auto | Unique MongoDB ID | Blacklist entry identifier |
| `nidHash` | `String` | Yes | — | Unique, 64-char hex | Salted HMAC-SHA256 hash of banned citizen NID |
| `phone` | `String` | Yes | — | Unique, BD Phone Regex | Mobile number associated with banned account |
| `deviceUUID` | `String` | No | `null` | Hardware identifier | Banned device UUID |
| `reason` | `String` | Yes | — | Max 200 chars | Reason for termination (e.g., `'confirmed_scam'`) |
| `bannedBy` | `ObjectId` | Yes | — | Ref: `User` (Super Admin) | Authorized Super Admin confirming ban |
| `createdAt` | `Date` | Yes | Auto | Timestamp | Registry insertion date |
