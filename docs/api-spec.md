# REST & WebSocket API Specification: Becha-Kena

**Project Name:** Becha-Kena — NID-Verified C2C Resale Marketplace  
**Document Version:** 1.0  
**Target Specification File:** `api-spec.md`  
**API Protocol:** REST (HTTPS) & Real-Time WebSockets (Socket.io / WSS)  
**API Base URL:** `https://api.becha-kena.com/api/v1` (Production) / `http://localhost:5000/api/v1` (Development)  
**Reference Documents:** [`PRD.md`](file:///e:/becha-kena/PRD.md) (v2.0), [`database.md`](file:///e:/becha-kena/database.md) (v1.0), [`database-schema.md`](file:///e:/becha-kena/database-schema.md) (v1.0), [`architecture.md`](file:///e:/becha-kena/architecture.md) (v1.0)  

---

## Table of Contents
1. [Global API Standards & Conventions](#1-global-api-standards--conventions)
   - 1.1 HTTP Status Codes & Error Response Format
   - 1.2 Authentication & Token Strategy
   - 1.3 Role-Based Access Control (RBAC) & Permission Levels
   - 1.4 Rate Limiting & Anti-Scraping Throttling
2. [Authentication & Session Management (`/auth`)](#2-authentication--session-management-auth)
3. [User & Profile Management (`/users`)](#3-user--profile-management-users)
4. [Identity Verification & Fast E-KYC (`/kyc`)](#4-identity-verification--fast-e-kyc-kyc)
5. [Listing & Discovery Engine (`/listings`)](#5-listing--discovery-engine-listings)
6. [Favorites & Wishlist (`/favorites`)](#6-favorites--wishlist-favorites)
7. [In-App Conversations & Chat (`/chats`)](#7-in-app-conversations--chat-chats)
8. [Binding Offers & Counter-Offer Negotiation (`/chats/:conversationId/offers`)](#8-binding-offers--counter-offer-negotiation-chatsuconversationidoffers)
9. [Deals & Bilateral Reputation (`/deals` & `/reviews`)](#9-deals--bilateral-reputation-deals--reviews)
10. [Community Safety & Flagging (`/reports`)](#10-community-safety--flagging-reports)
11. [Post-Deal Stolen Item Legal Disputes (`/disputes`)](#11-post-deal-stolen-item-legal-disputes-disputes)
12. [Cloud Media Direct Uploads (`/uploads`)](#12-cloud-media-direct-uploads-uploads)
13. [Trust & Safety Moderation & Super Admin (`/admin`)](#13-trust--safety-moderation--super-admin-admin)
14. [Real-Time WebSocket Protocol (Socket.io)](#14-real-time-websocket-protocol-socketio)

---

## 1. Global API Standards & Conventions

### 1.1 HTTP Status Codes & Response Envelope
All HTTP endpoints return standardized JSON envelopes.

#### Standard Success Envelope:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Action completed successfully",
  "data": {},
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 150,
    "totalPages": 8
  }
}
```

#### Standard Error Envelope:
```json
{
  "success": false,
  "statusCode": 400,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters provided",
    "details": [
      {
        "field": "phone",
        "message": "Please enter a valid 11-digit Bangladeshi mobile number."
      }
    ]
  },
  "timestamp": "2026-10-23T19:59:00.000Z",
  "path": "/api/v1/auth/request-otp"
}
```

#### Standard HTTP Status Codes:
| Code | Meaning | Usage |
|---|---|---|
| `200 OK` | Success | Successful `GET`, `PUT`, `PATCH`, or action `POST`. |
| `201 Created` | Created | Successful entity creation (`POST`). |
| `400 Bad Request` | Client Error | Malformed JSON, failing validation rules, or business constraint violation. |
| `401 Unauthorized` | Authentication Failure | Missing, invalid, or expired Access JWT. |
| `403 Forbidden` | Authorization Failure | Insufficient role, unverified citizen attempting gated action, or account frozen/banned. |
| `404 Not Found` | Resource Missing | Entity ID not found in database or soft-deleted. |
| `409 Conflict` | State Conflict | Duplicate unique key (e.g. NID already registered, duplicate offer collision, listing already sold). |
| `422 Unprocessable` | Semantic Error | Syntactically correct payload violating semantic business logic (e.g., offering price higher than asking price or below 50 BDT). |
| `429 Too Many Requests`| Throttled | Rate limit exceeded (e.g. OTP spam, phone reveal limit $>10$/24hr). |
| `500 Server Error` | Internal Failure | Unhandled server exception or unexpected external gateway outage. |

---

### 1.2 Authentication & Token Strategy
* **Access Token:** Short-lived JWT (15-minute TTL) passed via the `Authorization` header:  
  `Authorization: Bearer <access_token>`  
  *Payload:* `{ userId: string, role: string, isNidVerified: boolean, isFrozen: boolean, deviceId: string }`
* **Refresh Token:** Long-lived opaque token (30-day TTL) issued in a secure HTTP-Only, SameSite, Secure cookie (`refreshToken`). Monitored in Redis with token-family reuse detection.
* **OTP Challenge:** 6-digit cryptographic PIN with 120-second TTL stored in Redis (`otp:<phone>`).

---

### 1.3 Role-Based Access Control (RBAC) & Permission Levels
Every endpoint defines its required authorization level:

| Level | Description | Enforcement Middleware |
|---|---|---|
| `Public` | Open to all visitors (No token required) | None |
| `Authenticated` | Logged-in citizen with valid Access JWT (`isBanned: false`) | `requireAuth` |
| `Verified Citizen` | Logged-in citizen with `isNidVerified: true` and `isFrozen: false` | `requireAuth`, `requireVerifiedCitizen` |
| `Listing Owner` | Authenticated verified citizen matching `listing.sellerId` | `requireAuth`, `requireListingOwner` |
| `Moderator` | Platform staff with role `moderator` or `super_admin` | `requireAuth`, `requireRole(['moderator', 'super_admin'])` |
| `Super Admin` | Root administrator (`role === 'super_admin'`) | `requireAuth`, `requireRole('super_admin')` |

---

### 1.4 Rate Limiting & Anti-Scraping Throttling
1. **Global API Throttling:** Max 100 requests / minute per IP address.
2. **OTP Generation:** Max 1 request / 60 seconds per phone number; max 5 requests / 24 hours per phone number.
3. **Automated KYC Queries:** Strictly 3 automated attempts / citizen profile. Subsequent attempts route to manual desk.
4. **Phone Reveal Gate:** Strictly **10 reveals / 24 hours** per verified buyer profile. Exceeding triggers 429 cooldown.
5. **C2C Listing Quota:** Max **5 active listings** per verified citizen per rolling 30-day window.

---

## 2. Authentication & Session Management (`/auth`)

### 2.1 Request SMS OTP
Generates and dispatches a 6-digit OTP to a Bangladeshi mobile number.

* **Path:** `/api/v1/auth/request-otp`
* **Method:** `POST`
* **Auth Required:** `Public`
* **Rate Limit:** 1 request / 60s per phone; max 5 / 24hr

#### Request Headers:
```http
Content-Type: application/json
```

#### Request Body:
```json
{
  "phone": "01712345678"
}
```
*Validation:* `phone` must match BD regex `/^(?:\+8801|01)[3-9]\d{8}$/`.

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "OTP has been sent to your mobile number.",
  "data": {
    "phone": "+8801712345678",
    "expiresInSeconds": 120,
    "resendCooldownSeconds": 60
  }
}
```

#### Error Responses:
* `400 Bad Request`: Invalid Bangladeshi phone number format.
* `429 Too Many Requests`: Resend cooldown active or daily quota exhausted.
* `403 Forbidden`: Mobile number is registered on `nid_blacklists`.

---

### 2.2 Verify SMS OTP & Session Creation
Validates the OTP, logs in the user (or registers initial profile), issues JWT access token, and sets refresh cookie.

* **Path:** `/api/v1/auth/verify-otp`
* **Method:** `POST`
* **Auth Required:** `Public`

#### Request Body:
```json
{
  "phone": "01712345678",
  "otp": "492810",
  "deviceUUID": "a7b8c9d0-1234-4567-89ab-cdef01234567",
  "deviceName": "Samsung Galaxy S23 (SM-S911B)"
}
```
*Parameters:*
- `phone` (string, required): BD phone number.
- `otp` (string, required): 6-digit numeric string (`^\d{6}$`).
- `deviceUUID` (string, required): Client device hardware footprint.
- `deviceName` (string, optional): Human-readable device descriptor.

#### Response `200 OK`:
*Response Headers:*
`Set-Cookie: refreshToken=eyJh...; HttpOnly; Secure; SameSite=Strict; Path=/api/v1/auth; Max-Age=2592000`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Login completed successfully.",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tokenType": "Bearer",
    "expiresIn": 900,
    "user": {
      "id": "6718dd2f0b7194fbc1110001",
      "phone": "+8801712345678",
      "displayName": "Farhana R.",
      "role": "citizen",
      "isNidVerified": true,
      "kycStatus": "verified",
      "avatarUrl": "https://cdn.becha-kena.com/avatars/user_1.webp",
      "isFrozen": false,
      "averageRating": 4.9,
      "totalDealsCompleted": 14
    },
    "isNewUser": false,
    "isNewDeviceChallengeRequired": false
  }
}
```

#### Error Responses:
* `400 Bad Request`: OTP incorrect or expired.
* `403 Forbidden`: Account is banned or blacklisted.
* `423 Locked`: "New Phone, Same SIM" detected with $>2$ active devices. Requires biometric verification challenge (`isNewDeviceChallengeRequired: true`).

---

### 2.3 Refresh Access Token
Exchanges the long-lived `refreshToken` cookie for a fresh 15-minute access token.

* **Path:** `/api/v1/auth/refresh-token`
* **Method:** `POST`
* **Auth Required:** `Public` (Reads `refreshToken` HTTP-Only Cookie)

#### Request Headers:
```http
Cookie: refreshToken=<opaque_token_string>
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Access token refreshed",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expiresIn": 900
  }
}
```

#### Error Responses:
* `401 Unauthorized`: Missing, invalid, or expired refresh cookie.
* `403 Forbidden`: Token reuse detected (family rotation invalidates all associated sessions).

---

### 2.4 Logout
Invalidates the current session token in Redis and clears the refresh cookie.

* **Path:** `/api/v1/auth/logout`
* **Method:** `POST`
* **Auth Required:** `Authenticated`

#### Request Headers:
```http
Authorization: Bearer <access_token>
```

#### Response `200 OK`:
*Response Headers:*
`Set-Cookie: refreshToken=; Path=/api/v1/auth; Max-Age=0`

```json
{
  "success": true,
  "statusCode": 200,
  "message": "Logged out successfully."
}
```

---

## 3. User & Profile Management (`/users`)

### 3.1 Get Current Citizen Profile (`/me`)
Returns the authenticated citizen's full profile, KYC status, reputation scores, and bound devices.

* **Path:** `/api/v1/users/me`
* **Method:** `GET`
* **Auth Required:** `Authenticated`

#### Request Headers:
```http
Authorization: Bearer <access_token>
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "6718dd2f0b7194fbc1110001",
    "phone": "+8801712345678",
    "displayName": "Farhana R. [NID Verified]",
    "role": "citizen",
    "isNidVerified": true,
    "kycStatus": "verified",
    "kycAttempts": 1,
    "avatarUrl": "https://cdn.becha-kena.com/avatars/user_1.webp",
    "activeDeviceCount": 1,
    "deviceUUIDs": ["a7b8c9d0-1234-4567-89ab-cdef01234567"],
    "isBanned": false,
    "isFrozen": false,
    "averageRating": 4.9,
    "totalDealsCompleted": 14,
    "notificationPreferences": {
      "pushEnabled": true,
      "smsEnabled": true,
      "priceDropAlerts": true,
      "quietHoursStart": "23:00",
      "quietHoursEnd": "07:00"
    },
    "createdAt": "2026-08-12T10:30:00.000Z"
  }
}
```

---

### 3.2 Update Profile Info
Modifies public profile elements (display name, avatar).

* **Path:** `/api/v1/users/me/profile`
* **Method:** `PATCH`
* **Auth Required:** `Authenticated`

#### Request Body:
```json
{
  "displayName": "Farhana Rahman",
  "avatarUrl": "https://cdn.becha-kena.com/avatars/user_1_new.webp"
}
```
*Validation:* `displayName` min 3, max 50 characters.

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Profile updated successfully.",
  "data": {
    "displayName": "Farhana Rahman",
    "avatarUrl": "https://cdn.becha-kena.com/avatars/user_1_new.webp"
  }
}
```

---

### 3.3 Update Notification Preferences
Adjusts notification delivery channels and quiet hours.

* **Path:** `/api/v1/users/me/notification-preferences`
* **Method:** `PATCH`
* **Auth Required:** `Authenticated`

#### Request Body:
```json
{
  "pushEnabled": true,
  "smsEnabled": false,
  "priceDropAlerts": true,
  "quietHoursStart": "22:00",
  "quietHoursEnd": "08:00"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification preferences saved successfully.",
  "data": {
    "pushEnabled": true,
    "smsEnabled": false,
    "priceDropAlerts": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "08:00"
  }
}
```

---

### 3.4 Get Public Citizen Trust Profile
Retrieves sanitized public profile, verified trust badge, deal count, and feedback rating.

* **Path:** `/api/v1/users/:userId/public-profile`
* **Method:** `GET`
* **Auth Required:** `Public`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "6718dd2f0b7194fbc1110001",
    "displayName": "Farhana R.",
    "isNidVerified": true,
    "avatarUrl": "https://cdn.becha-kena.com/avatars/user_1.webp",
    "averageRating": 4.9,
    "totalDealsCompleted": 14,
    "memberSince": "2026-08-12T10:30:00.000Z",
    "trustBadges": {
      "item_as_described": 12,
      "punctual": 10,
      "friendly_communication": 14,
      "quick_payment": 8
    }
  }
}
```

---

## 4. Identity Verification & Fast E-KYC (`/kyc`)

### 4.1 Optical Character Recognition (OCR) Pre-Check
Performs client-side or gateway OCR on uploaded front and back NID photos to prefill NID number and Date of Birth.

* **Path:** `/api/v1/kyc/ocr`
* **Method:** `POST`
* **Auth Required:** `Authenticated`

#### Request Body (Multipart/form-data):
- `frontImage`: File (JPEG/PNG/WebP, max 5MB)
- `backImage`: File (JPEG/PNG/WebP, max 5MB)

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "NID details extracted successfully",
  "data": {
    "nidNumber": "19942691234567890",
    "dob": "1994-05-18",
    "extractedName": "FARHANA RAHMAN",
    "format": "smart_card_10"
  }
}
```

---

### 4.2 Composite Fast KYC Pipeline (Primary Flow)
Performs zero-knowledge duplicate check, Porichoy demographic lookup, and real-time biometric liveness match in a single atomic transaction.

* **Path:** `/api/v1/kyc/verify-nid`
* **Method:** `POST`
* **Auth Required:** `Authenticated`

#### Request Body:
```json
{
  "nidNumber": "19942691234567890",
  "dob": "1994-05-18",
  "frontImageKey": "uploads/nid_front_temp_abc123.webp",
  "backImageKey": "uploads/nid_back_temp_def456.webp",
  "liveSelfieKey": "uploads/selfie_liveness_ghi789.webp",
  "livenessMeta": {
    "blinkDetected": true,
    "headTurnDetected": true,
    "confidence": 98.2
  }
}
```
*Validation Rules:*
- `nidNumber`: 10-digit Smart NID (`^\d{10}$`) OR 13/17-digit legacy NID (`^\d{13}$` / `^\d{17}$`).
- `dob`: Valid ISO date string `YYYY-MM-DD`.

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Congratulations! Your National ID has been successfully verified.",
  "data": {
    "isNidVerified": true,
    "kycStatus": "verified",
    "maskedLegalName": "F****** R*****",
    "verifiedAt": "2026-10-23T20:00:00.000Z"
  }
}
```

#### Error Responses:
* `400 Bad Request`: Validation failure (invalid NID format or DOB).
* `409 Conflict`: `NID_ALREADY_REGISTERED` — This NID is already tied to another registered citizen account (`"This National ID is already registered to another account."`).
* `403 Forbidden`: `NID_BLACKLISTED` — This NID is permanently barred due to confirmed fraudulent activity.
* `422 Unprocessable Entity`: `BIOMETRIC_FACE_MISMATCH` — Facial match score $< 85\%$ against EC database photo.
  ```json
  {
    "success": false,
    "statusCode": 422,
    "error": {
      "code": "BIOMETRIC_FACE_MISMATCH",
      "message": "Facial match failed. Please retake your selfie in well-lit conditions.",
      "remainingAttempts": 2
    }
  }
  ```
* `429 Too Many Requests`: `KYC_ATTEMPTS_EXHAUSTED` — 3 attempts failed. Case routed to manual admin review queue (`manual_review`).

---

### 4.3 Query KYC Status & Queue SLA
Queries the citizen's current verification state and remaining SLA time if under manual review.

* **Path:** `/api/v1/kyc/status`
* **Method:** `GET`
* **Auth Required:** `Authenticated`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "kycStatus": "manual_review",
    "isNidVerified": false,
    "attemptsUsed": 3,
    "submittedAt": "2026-10-23T18:00:00.000Z",
    "slaRemainingMinutes": 120,
    "slaWorkingHours": "9:00 AM - 9:00 PM BST"
  }
}
```

---

### 4.4 Lost SIM / Mobile Rebinding (Biometric-First)
Enables a citizen who lost their registered SIM to authenticate via NID + biometric liveness and bind a new phone number.

* **Path:** `/api/v1/kyc/rebind-phone`
* **Method:** `POST`
* **Auth Required:** `Public` (One-Time Token issued after OTP on new phone)

#### Request Body:
```json
{
  "newPhone": "01811223344",
  "phoneOtp": "837192",
  "nidNumber": "19942691234567890",
  "dob": "1994-05-18",
  "liveSelfieKey": "uploads/recovery_selfie_jkl012.webp"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Mobile number successfully changed. All previous sessions have been revoked.",
  "data": {
    "newPhone": "+8801811223344",
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 4.5 Verify New Device Challenge ("New Phone, Same SIM")
Authorizes a secondary device login for an existing SIM card via a quick 3-second biometric selfie.

* **Path:** `/api/v1/kyc/verify-new-device`
* **Method:** `POST`
* **Auth Required:** `Authenticated` (Challenge Scope)

#### Request Body:
```json
{
  "deviceUUID": "b8c9d0e1-2345-6789-01bc-def012345678",
  "deviceName": "Xiaomi Redmi Note 13",
  "liveSelfieKey": "uploads/device_challenge_mno345.webp"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "New device authorized successfully.",
  "data": {
    "activeDeviceCount": 2,
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

## 5. Listing & Discovery Engine (`/listings`)

### 5.1 Public Catalog Search & Filtering (Bilingual)
Queries active pre-owned listings using MongoDB Atlas bilingual search, geospatial radius, division/thana facets, price ranges, and condition filters.

* **Path:** `/api/v1/listings`
* **Method:** `GET`
* **Auth Required:** `Public`

#### Query Parameters:
| Param | Type | Required | Constraints | Description |
|---|---|:---:|---|---|
| `q` | `string` | No | Min 2, max 100 chars | Free-text search term in English (e.g. `iphone 13` or `Samsung Galaxy`) |
| `category` | `string` | No | Enum: `electronics`, `vehicles`, `property`, `fashion`, `home`, `hobbies` | Category filter |
| `division` | `string` | No | Enum: 8 BD Divisions | e.g. `Dhaka`, `Chittagong` |
| `thana` | `string` | No | Valid BD Thana | e.g. `Dhanmondi`, `Mirpur` |
| `longitude` | `number` | No | -180.0 to 180.0 | Longitude coordinate for proximity sorting |
| `latitude` | `number` | No | -90.0 to 90.0 | Latitude coordinate for proximity sorting |
| `maxDistanceKm`| `number` | No | 1 to 500 (Default: 25) | Radius distance in kilometers |
| `condition` | `string` | No | Enum: `brand_new`, `like_new`, `gently_used`, `heavily_used` | Item condition |
| `minPrice` | `number` | No | $\ge 50$ | Minimum price filter in BDT |
| `maxPrice` | `number` | No | $\le 2500000$ | Maximum price filter in BDT |
| `sort` | `string` | No | `newest`, `price_low`, `price_high`, `distance` | Sort order (Default: `newest`) |
| `page` | `number` | No | Integer $\ge 1$ (Default: 1) | Pagination page |
| `limit` | `number` | No | Integer 1 to 50 (Default: 20) | Items per page |

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "6718dd2f0b7194fbc1110002",
      "title": "Apple iPhone 13 128GB Midnight Blue",
      "price": 54000,
      "condition": "like_new",
      "category": "electronics",
      "thumbnailUrl": "https://cdn.becha-kena.com/listings/img_thumb_1.webp",
      "location": {
        "division": "Dhaka",
        "thana": "Dhanmondi",
        "coordinates": [90.3742, 23.7461]
      },
      "distanceKm": 2.4,
      "seller": {
        "id": "6718dd2f0b7194fbc1110001",
        "displayName": "Farhana R.",
        "isNidVerified": true,
        "averageRating": 4.9,
        "totalDealsCompleted": 14
      },
      "isPhoneHidden": true,
      "createdAt": "2026-10-22T14:30:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "totalCount": 84,
    "totalPages": 5
  }
}
```

---

### 5.2 Get Listing Details
Fetches complete product specifications, seller trust badge, image gallery, and view count.

* **Path:** `/api/v1/listings/:id`
* **Method:** `GET`
* **Auth Required:** `Public`

#### URL Parameters:
- `id` (string, required): 24-character hexadecimal MongoDB `ObjectId`.

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "id": "6718dd2f0b7194fbc1110002",
    "title": "Apple iPhone 13 128GB Midnight Blue (BTRC Approved)",
    "description": "Original device with box and invoice. Battery health 87%. No scratch or dent. Selling to upgrade. Only genuine buyers please.",
    "price": 54000,
    "condition": "like_new",
    "category": "electronics",
    "imageUrls": [
      "https://cdn.becha-kena.com/listings/img_1.webp",
      "https://cdn.becha-kena.com/listings/img_2.webp",
      "https://cdn.becha-kena.com/listings/img_3.webp"
    ],
    "location": {
      "type": "Point",
      "coordinates": [90.3742, 23.7461],
      "division": "Dhaka",
      "thana": "Dhanmondi"
    },
    "status": "active",
    "isPhoneHidden": true,
    "viewCount": 312,
    "inquiryCount": 8,
    "renewCount": 0,
    "expiresAt": "2026-11-21T14:30:00.000Z",
    "seller": {
      "id": "6718dd2f0b7194fbc1110001",
      "displayName": "Farhana R.",
      "avatarUrl": "https://cdn.becha-kena.com/avatars/user_1.webp",
      "isNidVerified": true,
      "averageRating": 4.9,
      "totalDealsCompleted": 14,
      "memberSince": "2026-08-12T10:30:00.000Z"
    },
    "createdAt": "2026-10-22T14:30:00.000Z"
  }
}
```

---

### 5.3 Reveal Seller Phone Number (Click-and-Call Gate)
Unmasks the seller's contact phone number. Rate-limited to max 10 reveals per 24hr; audit-logged in `phone_reveal_audits`.

* **Path:** `/api/v1/listings/:id/reveal-phone`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen`
* **Rate Limit:** 10 reveals per rolling 24 hours per verified citizen

#### Request Headers:
```http
Authorization: Bearer <access_token>
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Seller contact phone number revealed.",
  "data": {
    "listingId": "6718dd2f0b7194fbc1110002",
    "sellerPhone": "+8801712345678",
    "revealsUsedToday": 3,
    "revealsRemainingToday": 7
  }
}
```

#### Error Responses:
* `403 Forbidden`: Citizen is not NID-verified (`isNidVerified: false`) or seller enabled Chat-Only mode.
* `429 Too Many Requests`: `PHONE_REVEAL_LIMIT_EXCEEDED` — Daily quota of 10 reveals reached. 6-hour cooldown activated.

---

### 5.4 Create Marketplace Listing
Publishes a new ad. Enforces verified citizen check, 5 active ads/month quota, and automated image moderation.

* **Path:** `/api/v1/listings`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen`

#### Request Body:
```json
{
  "title": "Sony WH-1000XM4 Wireless Noise Cancelling Headphones",
  "description": "Used with extreme care for 6 months. Comes with original carrying case, 3.5mm cable, and flight adapter. Battery backup 30+ hours.",
  "price": 22000,
  "condition": "like_new",
  "category": "electronics",
  "location": {
    "division": "Dhaka",
    "thana": "Uttara",
    "coordinates": [90.3984, 23.8759]
  },
  "imageUrls": [
    "https://cdn.becha-kena.com/listings/sony_1.webp",
    "https://cdn.becha-kena.com/listings/sony_2.webp"
  ],
  "isPhoneHidden": true
}
```
*Validation Rules:*
- `title`: 10–100 characters.
- `description`: 20–2000 characters.
- `price`: Integer between 50 and 2,500,000 BDT.
- `condition`: Enum `['brand_new', 'like_new', 'gently_used', 'heavily_used']`.
- `category`: Enum `['electronics', 'vehicles', 'property', 'fashion', 'home', 'hobbies']`.
- `imageUrls`: Array of min 1, max 8 valid image URLs.

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Your listing has been published successfully.",
  "data": {
    "id": "6718dd2f0b7194fbc1110003",
    "title": "Sony WH-1000XM4 Wireless Noise Cancelling Headphones",
    "price": 22000,
    "status": "active",
    "moderationStatus": "approved",
    "expiresAt": "2026-11-22T20:00:00.000Z",
    "activeQuotaRemaining": 3
  }
}
```

#### Error Responses:
* `403 Forbidden`: `C2C_QUOTA_EXHAUSTED` — Citizen already has 5 active listings in rolling 30-day window (`"A personal account can post a maximum of 5 listings per month."`) or citizen is not NID-verified.
* `422 Unprocessable`: `IMAGE_MODERATION_FAILED` — Uploaded photo contains prohibited content, adult imagery, or phishing QR codes.

---

### 5.5 Edit Listing
Modifies asking price, description, images, or condition of an active ad.

* **Path:** `/api/v1/listings/:id`
* **Method:** `PUT`
* **Auth Required:** `Listing Owner`

#### Request Body:
```json
{
  "title": "Sony WH-1000XM4 Wireless Noise Cancelling Headphones (Price Dropped)",
  "description": "Updated price for urgent sale. Used with extreme care for 6 months. Comes with original carrying case.",
  "price": 19500,
  "condition": "like_new",
  "imageUrls": [
    "https://cdn.becha-kena.com/listings/sony_1.webp",
    "https://cdn.becha-kena.com/listings/sony_2.webp"
  ],
  "isPhoneHidden": false
}
```
*Business Rule:* If `price` is lowered, a BullMQ job (`jobId = price_drop:${listingId}`) is enqueued with a **5-minute debounce delay** before alerting wishlisted users.

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing updated successfully.",
  "data": {
    "id": "6718dd2f0b7194fbc1110003",
    "price": 19500,
    "updatedAt": "2026-10-23T20:15:00.000Z"
  }
}
```

---

### 5.6 Soft-Delete / Archive Listing
Removes an ad from the public marketplace while preserving audit trails for completed or pending deals.

* **Path:** `/api/v1/listings/:id`
* **Method:** `DELETE`
* **Auth Required:** `Listing Owner`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing deleted successfully.",
  "data": {
    "id": "6718dd2f0b7194fbc1110003",
    "status": "archived",
    "deletedAt": "2026-10-23T20:20:00.000Z"
  }
}
```

---

### 5.7 Update Listing State
Manually switches ad state between `active` and `under_offer` (reserved during inspection).

* **Path:** `/api/v1/listings/:id/status`
* **Method:** `PATCH`
* **Auth Required:** `Listing Owner`

#### Request Body:
```json
{
  "status": "under_offer"
}
```
*Constraints:* Allowed values: `active`, `under_offer`. (Transitions to `sold` require `/deals` API).

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing status updated successfully.",
  "data": {
    "id": "6718dd2f0b7194fbc1110003",
    "status": "under_offer"
  }
}
```

---

### 5.8 Renew Listing (Day 25+ Extension)
Extends an ad's expiration for 30 additional days. Maximum 2 renewals per ad (90-day total cap).

* **Path:** `/api/v1/listings/:id/renew`
* **Method:** `POST`
* **Auth Required:** `Listing Owner`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Listing validity has been extended by 30 days.",
  "data": {
    "id": "6718dd2f0b7194fbc1110003",
    "renewCount": 1,
    "maxRenewals": 2,
    "expiresAt": "2026-12-22T20:00:00.000Z"
  }
}
```

#### Error Responses:
* `400 Bad Request`: `RENEWAL_TOO_EARLY` — Ad can only be renewed on or after Day 25.
* `403 Forbidden`: `MAX_RENEWALS_REACHED` — Ad has already used all 2 renewals.

---

### 5.9 Seller Dashboard: My Listings
Fetches all ads posted by the authenticated seller, filtered by tab (`active`, `under_offer`, `sold`, `expired`).

* **Path:** `/api/v1/listings/my-listings`
* **Method:** `GET`
* **Auth Required:** `Verified Citizen`

#### Query Parameters:
- `status` (`string`, optional): `active`, `under_offer`, `sold`, `expired`.
- `page` (`number`, default: 1), `limit` (`number`, default: 10).

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "6718dd2f0b7194fbc1110003",
      "title": "Sony WH-1000XM4 Wireless Headphones",
      "price": 19500,
      "status": "active",
      "viewCount": 78,
      "inquiryCount": 4,
      "renewCount": 0,
      "expiresAt": "2026-11-22T20:00:00.000Z",
      "createdAt": "2026-10-23T20:00:00.000Z"
    }
  ],
  "meta": {
    "activeCount": 2,
    "underOfferCount": 1,
    "soldCount": 14,
    "expiredCount": 0
  }
}
```

---

## 6. Favorites & Wishlist (`/favorites`)

### 6.1 Save Listing to Favorites
Bookmarks a listing and benchmarks `priceAtSave` for automated price drop alerts.

* **Path:** `/api/v1/listings/:id/favorite`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item has been added to your favorites.",
  "data": {
    "favoriteId": "6718dd2f0b7194fbc1110004",
    "listingId": "6718dd2f0b7194fbc1110003",
    "priceAtSave": 19500,
    "createdAt": "2026-10-23T20:25:00.000Z"
  }
}
```

---

### 6.2 Remove Listing from Favorites
Removes a saved bookmark.

* **Path:** `/api/v1/listings/:id/favorite`
* **Method:** `DELETE`
* **Auth Required:** `Verified Citizen`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Item removed from favorites."
}
```

---

### 6.3 Get My Favorites
Fetches the user's saved wishlist with live availability status and price delta computation.

* **Path:** `/api/v1/users/me/favorites`
* **Method:** `GET`
* **Auth Required:** `Verified Citizen`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "favoriteId": "6718dd2f0b7194fbc1110004",
      "listing": {
        "id": "6718dd2f0b7194fbc1110003",
        "title": "Sony WH-1000XM4 Wireless Headphones",
        "currentPrice": 18000,
        "priceAtSave": 19500,
        "isPriceDropped": true,
        "priceDelta": -1500,
        "status": "active",
        "thumbnailUrl": "https://cdn.becha-kena.com/listings/sony_thumb.webp",
        "sellerName": "Farhana R."
      }
    }
  ]
}
```

---

## 7. In-App Conversations & Chat (`/chats`)

### 7.1 Start / Retrieve Conversation (Upsert Flow)
Initiates a 1-to-1 conversation thread between buyer and seller for a listing. If a thread already exists for `(listingId, buyerId, sellerId)`, the existing document is returned.

* **Path:** `/api/v1/chats/start`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen`

#### Request Body:
```json
{
  "listingId": "6718dd2f0b7194fbc1110002"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "conversationId": "6718dd2f0b7194fbc1110005",
    "listing": {
      "id": "6718dd2f0b7194fbc1110002",
      "title": "Apple iPhone 13 128GB Midnight Blue",
      "price": 54000,
      "status": "active",
      "thumbnailUrl": "https://cdn.becha-kena.com/listings/img_thumb_1.webp"
    },
    "seller": {
      "id": "6718dd2f0b7194fbc1110001",
      "displayName": "Farhana R.",
      "isNidVerified": true
    },
    "buyer": {
      "id": "6718dd2f0b7194fbc1110006",
      "displayName": "Tanvir H.",
      "isNidVerified": true
    },
    "createdAt": "2026-10-23T20:30:00.000Z"
  }
}
```

#### Error Responses:
* `400 Bad Request`: Seller cannot start a chat with themselves on their own listing.
* `403 Forbidden`: User or counterparty is not NID-verified or has an active account ban.

---

### 7.2 Get User Conversation Inbox
Lists all conversation threads involving the authenticated citizen, ordered by most recent message.

* **Path:** `/api/v1/chats`
* **Method:** `GET`
* **Auth Required:** `Verified Citizen`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "conversationId": "6718dd2f0b7194fbc1110005",
      "listing": {
        "id": "6718dd2f0b7194fbc1110002",
        "title": "Apple iPhone 13 128GB Midnight Blue",
        "price": 54000,
        "status": "active",
        "thumbnailUrl": "https://cdn.becha-kena.com/listings/img_thumb_1.webp"
      },
      "counterpart": {
        "id": "6718dd2f0b7194fbc1110001",
        "displayName": "Farhana R.",
        "avatarUrl": "https://cdn.becha-kena.com/avatars/user_1.webp",
        "isNidVerified": true
      },
      "lastMessage": {
        "text": "If you agree on 50,000 BDT, I will come to Dhanmondi today to inspect and buy.",
        "senderId": "6718dd2f0b7194fbc1110006",
        "createdAt": "2026-10-23T20:32:00.000Z"
      },
      "updatedAt": "2026-10-23T20:32:00.000Z"
    }
  ]
}
```

---

### 7.3 Get Message History
Fetches chronological messages in a chat thread with pagination.

* **Path:** `/api/v1/chats/:conversationId/messages`
* **Method:** `GET`
* **Auth Required:** `Verified Citizen` (Must be participant in thread)

#### Query Parameters:
- `page` (`number`, default: 1), `limit` (`number`, default: 30).

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "6718dd2f0b7194fbc1110007",
      "conversationId": "6718dd2f0b7194fbc1110005",
      "senderId": "6718dd2f0b7194fbc1110006",
      "text": "Hello, is this phone still available?",
      "messageType": "text",
      "hasScamWarning": false,
      "createdAt": "2026-10-23T20:31:00.000Z"
    },
    {
      "id": "6718dd2f0b7194fbc1110008",
      "conversationId": "6718dd2f0b7194fbc1110005",
      "senderId": "6718dd2f0b7194fbc1110001",
      "text": "Yes, it is in completely fresh condition. You can inspect it directly in Dhanmondi.",
      "messageType": "text",
      "hasScamWarning": false,
      "createdAt": "2026-10-23T20:31:40.000Z"
    }
  ]
}
```

---

### 7.4 Send Message (HTTP Fallback)
Sends an atomic message via HTTP (primary messaging operates over WebSockets). Strips external URLs and applies advance payment regex scan.

* **Path:** `/api/v1/chats/:conversationId/messages`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen`

#### Request Body:
```json
{
  "text": "Can you send 1000 BDT advance via bKash for courier?"
}
```
*Business Rules:*
- External links (`http://`, `https://`, `.apk`) are automatically stripped.
- If advance scam regex matches (`advance`, `bkash`, `courier fee`, `booking fee`), `hasScamWarning: true` is saved and delivered with a red warning banner.

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "6718dd2f0b7194fbc1110009",
    "conversationId": "6718dd2f0b7194fbc1110005",
    "senderId": "6718dd2f0b7194fbc1110001",
    "text": "Can you send 1000 BDT advance via bKash for courier?",
    "messageType": "text",
    "hasScamWarning": true,
    "warningText": "Warning: Never send advance money via bKash/Nagad before physically verifying the product.",
    "createdAt": "2026-10-23T20:33:00.000Z"
  }
}
```

---

## 8. Binding Offers & Counter-Offer Negotiation (`/chats/:conversationId/offers`)

### 8.1 Submit Binding Formal Offer
Submits an in-app purchase offer linked to the chat thread. Automatically sets 24-hour expiration.

* **Path:** `/api/v1/chats/:conversationId/offers`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen` (Must be the buyer)

#### Request Body:
```json
{
  "amount": 51000
}
```
*Validation Rules:*
- `amount`: Number $\ge 50$ BDT.
- Anti-Spam Quota: A buyer can submit a maximum of **3 offers per listing**.

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Offer sent successfully. Please wait for seller approval.",
  "data": {
    "offerId": "6718dd2f0b7194fbc1110010",
    "conversationId": "6718dd2f0b7194fbc1110005",
    "listingId": "6718dd2f0b7194fbc1110002",
    "buyerId": "6718dd2f0b7194fbc1110006",
    "sellerId": "6718dd2f0b7194fbc1110001",
    "amount": 51000,
    "round": 1,
    "status": "pending",
    "expiresAt": "2026-10-24T20:35:00.000Z",
    "createdAt": "2026-10-23T20:35:00.000Z"
  }
}
```

#### Error Responses:
* `403 Forbidden`: `OFFER_LIMIT_EXCEEDED` — Buyer has already submitted 3 offers for this listing.
* `409 Conflict`: Listing is already marked `sold` or `under_offer`.

---

### 8.2 Accept or Decline Offer
Seller responds to a pending offer. Accepting an offer triggers atomic deal closure.

* **Path:** `/api/v1/chats/:conversationId/offers/:offerId`
* **Method:** `PATCH`
* **Auth Required:** `Verified Citizen` (Must be the seller)

#### Request Body:
```json
{
  "action": "accept"
}
```
*Validation:* `action` must be `accept` or `decline`.

#### Response `200 OK` (Accepted):
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Offer accepted and deal closed successfully!",
  "data": {
    "offerId": "6718dd2f0b7194fbc1110010",
    "status": "accepted",
    "dealId": "6718dd2f0b7194fbc1110011",
    "finalPrice": 51000,
    "listingStatus": "sold"
  }
}
```

---

### 8.3 Submit Counter-Offer
Proposes a counter-amount, transitions previous offer status to `countered`, and advances negotiation round.

* **Path:** `/api/v1/chats/:conversationId/offers/:offerId/counter`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen` (Seller or Buyer)

#### Request Body:
```json
{
  "amount": 52500
}
```

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Counter-offer sent successfully.",
  "data": {
    "newOfferId": "6718dd2f0b7194fbc1110012",
    "parentOfferId": "6718dd2f0b7194fbc1110010",
    "amount": 52500,
    "round": 2,
    "status": "pending",
    "expiresAt": "2026-10-24T20:40:00.000Z"
  }
}
```

---

## 9. Deals & Bilateral Reputation (`/deals` & `/reviews`)

### 9.1 Direct Sale Deal Closure (Fallback Flow)
Enables a seller who closed a deal verbally or without formal in-app offer clicks to select the buyer from active inquiries and trigger mutual review privileges.

* **Path:** `/api/v1/deals/direct-sale`
* **Method:** `POST`
* **Auth Required:** `Listing Owner`

#### Request Body:
```json
{
  "listingId": "6718dd2f0b7194fbc1110002",
  "buyerId": "6718dd2f0b7194fbc1110006",
  "finalPrice": 51000
}
```
*Business Rule:* System validates that an active conversation exists between the seller and `buyerId` on this listing to prevent phantom deal fabrication.

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Item marked as sold successfully.",
  "data": {
    "dealId": "6718dd2f0b7194fbc1110013",
    "listingId": "6718dd2f0b7194fbc1110002",
    "sellerId": "6718dd2f0b7194fbc1110001",
    "buyerId": "6718dd2f0b7194fbc1110006",
    "finalPrice": 51000,
    "completedAt": "2026-10-23T20:45:00.000Z"
  }
}
```

---

### 9.2 Get Deal Receipt
Fetches the immutable deal receipt for either buyer or seller.

* **Path:** `/api/v1/deals/:dealId`
* **Method:** `GET`
* **Auth Required:** `Verified Citizen` (Must be deal participant)

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "dealId": "6718dd2f0b7194fbc1110013",
    "listing": {
      "id": "6718dd2f0b7194fbc1110002",
      "title": "Apple iPhone 13 128GB Midnight Blue",
      "thumbnailUrl": "https://cdn.becha-kena.com/listings/img_thumb_1.webp"
    },
    "seller": {
      "id": "6718dd2f0b7194fbc1110001",
      "displayName": "Farhana R.",
      "isNidVerified": true
    },
    "buyer": {
      "id": "6718dd2f0b7194fbc1110006",
      "displayName": "Tanvir H.",
      "isNidVerified": true
    },
    "finalPrice": 51000,
    "isReviewedBySeller": false,
    "isReviewedByBuyer": false,
    "disputeStatus": "none",
    "completedAt": "2026-10-23T20:45:00.000Z"
  }
}
```

---

### 9.3 Submit Bilateral Rating & Review
Allows transacting parties to rate each other and assign qualitative trust badges. Strictly gated by existence of confirmed `Deal` and `isReviewedBy*` flag.

* **Path:** `/api/v1/reviews`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen`

#### Request Body:
```json
{
  "dealId": "6718dd2f0b7194fbc1110013",
  "rating": 5,
  "tags": ["punctual", "item_as_described", "friendly_communication"],
  "comment": "Very good and polite seller. Received the phone in pristine condition."
}
```
*Validation Rules:*
- `dealId`: Valid ObjectId of a deal where user is buyer or seller.
- `rating`: Integer 1 to 5.
- `tags`: Array of allowed enums `['punctual', 'item_as_described', 'friendly_communication', 'quick_payment']`.
- `comment`: Optional string, max 300 characters.

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Thank you for your feedback!",
  "data": {
    "reviewId": "6718dd2f0b7194fbc1110014",
    "dealId": "6718dd2f0b7194fbc1110013",
    "rating": 5,
    "tags": ["punctual", "item_as_described", "friendly_communication"],
    "createdAt": "2026-10-23T20:50:00.000Z"
  }
}
```

#### Error Responses:
* `409 Conflict`: `ALREADY_REVIEWED` — User has already submitted their review for this deal.
* `403 Forbidden`: `DEAL_NOT_FOUND_OR_UNAUTHORIZED` — Citizen is not an authorized party in this transaction.

---

### 9.4 Get User Reviews & Ratings
Returns paginated trust ratings and reviews received by a citizen.

* **Path:** `/api/v1/users/:userId/reviews`
* **Method:** `GET`
* **Auth Required:** `Public`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "reviewId": "6718dd2f0b7194fbc1110014",
      "rating": 5,
      "tags": ["punctual", "item_as_described", "friendly_communication"],
      "comment": "Very good and polite seller. Received the phone in pristine condition.",
      "reviewer": {
        "displayName": "Tanvir H.",
        "isNidVerified": true
      },
      "listingTitle": "Apple iPhone 13 128GB Midnight Blue",
      "createdAt": "2026-10-23T20:50:00.000Z"
    }
  ],
  "meta": {
    "averageRating": 4.9,
    "totalReviews": 14
  }
}
```

---

## 10. Community Safety & Flagging (`/reports`)

### 10.1 Flag Listing, Chat Message, or User Profile
Allows verified citizens to report scams, counterfeit products, harassment, or advance fee demands.

* **Path:** `/api/v1/reports`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen`

#### Request Body:
```json
{
  "entityType": "listing",
  "entityId": "6718dd2f0b7194fbc1110002",
  "reason": "scam_advance_demanded",
  "details": "Seller demanded 2000 BDT advance courier fee via bKash in inbox."
}
```
*Validation Rules:*
- `entityType`: Enum `['listing', 'chat', 'user']`.
- `reason`: Enum `['scam_advance_demanded', 'stolen_goods_suspected', 'harassment', 'counterfeit', 'spam']`.
- `details`: String, max 500 characters.

*Business Logic:* If a listing accumulates $\ge 3$ distinct verified community reports within 2 hours, it is **automatically quarantined** (`status = 'under_review'`) and hidden from the catalog pending moderator investigation.

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Report received. Our Trust & Safety team will investigate promptly.",
  "data": {
    "reportId": "6718dd2f0b7194fbc1110015",
    "status": "pending",
    "createdAt": "2026-10-23T20:55:00.000Z"
  }
}
```

---

### 10.2 View My Submitted Reports
Allows citizens to track the triage status of reports they filed.

* **Path:** `/api/v1/reports/me`
* **Method:** `GET`
* **Auth Required:** `Verified Citizen`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "reportId": "6718dd2f0b7194fbc1110015",
      "entityType": "listing",
      "reason": "scam_advance_demanded",
      "status": "actioned",
      "createdAt": "2026-10-23T20:55:00.000Z",
      "resolvedAt": "2026-10-23T21:10:00.000Z"
    }
  ]
}
```

---

## 11. Post-Deal Stolen Item Legal Disputes (`/disputes`)

### 11.1 File Police GD Dispute (Stolen Gadget Claim)
Allows a buyer from a completed deal to file a formal dispute attaching an official Bangladesh Police General Diary (GD) number and stamped document.

* **Path:** `/api/v1/deals/:dealId/disputes`
* **Method:** `POST`
* **Auth Required:** `Verified Citizen` (Must be the buyer in `dealId`)

#### Request Body:
```json
{
  "gdNumber": "GD-2026-9812",
  "thanaName": "Dhanmondi Model Thana",
  "gdFilingDate": "2026-10-23",
  "gdDocumentUrl": "https://cdn.becha-kena.com/disputes/gd_doc_stamped_9812.webp"
}
```
*Validation Rules:*
- `gdNumber`: Non-empty string.
- `thanaName`: Valid Bangladesh Thana.
- `gdFilingDate`: Past or current date (`YYYY-MM-DD`).
- `gdDocumentUrl`: Valid image URL of police stamped GD document.

*Automated Platform Action:*
1. Automatically freezes the accused seller's account (`user.isFrozen = true`).
2. Freezes ad posting and active deal modifications for the seller.
3. Dispatches high-priority alert to Trust & Safety moderator desk.
4. Generates an encrypted Cybercrime Forensic audit package.

#### Response `201 Created`:
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Police GD legal dispute recorded. Accused seller account has been temporarily frozen.",
  "data": {
    "disputeId": "6718dd2f0b7194fbc1110016",
    "dealId": "6718dd2f0b7194fbc1110013",
    "status": "pending",
    "sellerFrozen": true,
    "createdAt": "2026-10-23T21:00:00.000Z"
  }
}
```

---

### 11.2 Get Active Dispute Status
Queries the progress of an active police dispute.

* **Path:** `/api/v1/deals/:dealId/dispute`
* **Method:** `GET`
* **Auth Required:** `Verified Citizen` (Buyer or Seller)

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "disputeId": "6718dd2f0b7194fbc1110016",
    "gdNumber": "GD-2026-9812",
    "thanaName": "Dhanmondi Model Thana",
    "status": "verified",
    "resolutionAction": "legal_hold",
    "createdAt": "2026-10-23T21:00:00.000Z"
  }
}
```

---

## 12. Cloud Media Direct Uploads (`/uploads`)

### 12.1 Request Presigned Upload URL
Generates a time-limited (15-minute) AWS S3 / Cloudinary upload token and presigned URL for direct client-to-storage transfer.

* **Path:** `/api/v1/uploads/presign`
* **Method:** `POST`
* **Auth Required:** `Authenticated`

#### Request Body:
```json
{
  "fileType": "image/webp",
  "context": "listing_image"
}
```
*Allowed `context` enums:*
- `listing_image`: Marketplace listing photo (Max 5MB).
- `nid_front`: Front of NID card (Max 5MB, strict vault retention).
- `nid_back`: Back of NID card (Max 5MB, strict vault retention).
- `selfie_frame`: Biometric liveness camera frame (Max 3MB).
- `gd_document`: Police GD copy (Max 8MB).
- `avatar`: User profile picture (Max 2MB).

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "uploadUrl": "https://becha-kena-vault.s3.ap-southeast-1.amazonaws.com/uploads/listing_abc123.webp?X-Amz-Signature=...",
    "fileKey": "uploads/listing_abc123.webp",
    "publicCdnUrl": "https://cdn.becha-kena.com/uploads/listing_abc123.webp",
    "expiresInSeconds": 900
  }
}
```

---

## 13. Trust & Safety Moderation & Super Admin (`/admin`)

### 13.1 Manual KYC Review Queue
Lists pending KYC submissions that failed automated Porichoy liveness tests (max 3 tries) with SLA aging markers ($<4$ hours).

* **Path:** `/api/v1/admin/kyc/queue`
* **Method:** `GET`
* **Auth Required:** `Moderator`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "userId": "6718dd2f0b7194fbc1110017",
      "phone": "+8801912987654",
      "displayName": "Rafiqul Islam",
      "kycAttempts": 3,
      "submittedAt": "2026-10-23T17:45:00.000Z",
      "slaAgingHours": 2.25,
      "slaStatus": "warning",
      "nidFrontUrl": "https://vault.becha-kena.com/secure/nid_front_17.webp",
      "nidBackUrl": "https://vault.becha-kena.com/secure/nid_back_17.webp",
      "selfieUrl": "https://vault.becha-kena.com/secure/selfie_17.webp"
    }
  ]
}
```

---

### 13.2 Approve Manual KYC Review
Moderator approves verified citizen status after manual document inspection.

* **Path:** `/api/v1/admin/kyc/:userId/approve`
* **Method:** `PATCH`
* **Auth Required:** `Moderator`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Citizen identity approved successfully.",
  "data": {
    "userId": "6718dd2f0b7194fbc1110017",
    "isNidVerified": true,
    "kycStatus": "verified"
  }
}
```

---

### 13.3 Reject Manual KYC Review
Moderator rejects submission with reason code and instructions.

* **Path:** `/api/v1/admin/kyc/:userId/reject`
* **Method:** `PATCH`
* **Auth Required:** `Moderator`

#### Request Body:
```json
{
  "reason": "Photos are blurry or cropped. Please take clear photos in good lighting."
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "KYC application rejected.",
  "data": {
    "userId": "6718dd2f0b7194fbc1110017",
    "kycStatus": "retake_required"
  }
}
```

---

### 13.4 Community Reports Queue
Lists community scam and harassment reports pending investigation.

* **Path:** `/api/v1/admin/reports`
* **Method:** `GET`
* **Auth Required:** `Moderator`

#### Query Parameters:
- `status` (`string`, optional): `pending`, `investigating`, `actioned`, `dismissed`.

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "data": [
    {
      "id": "6718dd2f0b7194fbc1110015",
      "reporterId": "6718dd2f0b7194fbc1110006",
      "entityType": "listing",
      "entityId": "6718dd2f0b7194fbc1110002",
      "reason": "scam_advance_demanded",
      "details": "Seller demanded 2000 BDT advance courier fee via bKash in inbox.",
      "status": "pending",
      "createdAt": "2026-10-23T20:55:00.000Z"
    }
  ]
}
```

---

### 13.5 Propose Permanent Citizen Ban (Step 1 of Dual-Approval)
Moderator initiates account termination proposal attaching evidence notes.

* **Path:** `/api/v1/admin/users/:userId/propose-ban`
* **Method:** `POST`
* **Auth Required:** `Moderator`

#### Request Body:
```json
{
  "reason": "Confirmed advance payment scam in chat logs. Repeated harassment."
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Permanent ban proposal recorded. Awaiting Super Admin approval.",
  "data": {
    "userId": "6718dd2f0b7194fbc1110018",
    "banProposedBy": "6718dd2f0b7194fbc1110099",
    "status": "BAN_PROPOSED"
  }
}
```

---

### 13.6 Confirm Permanent Citizen Ban & Cryptographic Blacklist (Step 2 of Dual-Approval)
Super Admin confirms the ban: unpublishes all ads, terminates sessions, and commits salted HMAC NID hash, phone, and device footprints into `nid_blacklists`.

* **Path:** `/api/v1/admin/users/:userId/confirm-ban`
* **Method:** `POST`
* **Auth Required:** `Super Admin`

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Citizen permanently banned and added to cryptographic blacklist.",
  "data": {
    "userId": "6718dd2f0b7194fbc1110018",
    "isBanned": true,
    "bannedAt": "2026-10-23T21:15:00.000Z",
    "blacklistedNidHash": "3f9b2c1e8a7d6e5f...",
    "blacklistedPhone": "+8801999888777",
    "blacklistedDevices": ["d1e2f3a4-5678-90ab-cdef-1234567890ab"]
  }
}
```

---

### 13.7 Export Cybercrime Forensic Package (Law Enforcement GD/FIR Compliance)
Generates an encrypted legal export package containing KMS-decrypted identity records, chat transcripts, IP footprints, and GD evidence for cybercrime investigators.

* **Path:** `/api/v1/admin/audit-logs/export`
* **Method:** `POST`
* **Auth Required:** `Super Admin` (Requires Secondary MFA Verification Header)

#### Request Headers:
```http
Authorization: Bearer <super_admin_jwt>
X-MFA-Token: 948201
```

#### Request Body:
```json
{
  "dealId": "6718dd2f0b7194fbc1110013",
  "caseReferenceNumber": "CYBER-CRIME-2026-DMP-091"
}
```

#### Response `200 OK`:
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Forensic package prepared for cybercrime investigation.",
  "data": {
    "exportId": "EXP-2026-10-23-001",
    "downloadUrl": "https://vault.becha-kena.com/forensic/EXP-001.enc",
    "expiresInMinutes": 30
  }
}
```

---

## 14. Real-Time WebSocket Protocol (Socket.io)

### 14.1 Connection & Handshake Authentication
* **Endpoint URL:** `wss://api.becha-kena.com/socket.io/`
* **Transports:** `websocket`, `polling`
* **Authentication:** Passes the session JWT in the handshake:
  ```javascript
  const socket = io("https://api.becha-kena.com", {
    auth: {
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  });
  ```
* **Handshake Validation:** Server verifies JWT statelessly. If token is missing, expired, or citizen is banned (`isBanned: true`), connection is rejected with `UNAUTHORIZED_SOCKET`.

---

### 14.2 Room Topology & Routing
Upon authentication, the socket joins:
1. **Personal Event Channel:** `user:events_${userId}` — Broadcasts badge updates, offer notifications, deal closures, and debounced price drops.
2. **Active Conversation Thread:** `chat:conv_${conversationId}` — Dynamically joined when entering a chat window.

---

### 14.3 Client-to-Server Events

#### Event: `join_chat`
Subscribes the client to a specific conversation room.

* **Payload:**
```json
{
  "conversationId": "6718dd2f0b7194fbc1110005"
}
```
*Server Response (ACK):* `{ "status": "ok", "joined": true }`

---

#### Event: `leave_chat`
Unsubscribes from the conversation room.

* **Payload:**
```json
{
  "conversationId": "6718dd2f0b7194fbc1110005"
}
```

---

#### Event: `send_message`
Dispatches an in-app chat message payload through the real-time pipeline.

* **Payload:**
```json
{
  "conversationId": "6718dd2f0b7194fbc1110005",
  "text": "I am waiting at Road 8, Dhanmondi."
}
```

---

#### Event: `typing_start` & `typing_stop`
Broadcasts real-time typing indicators to counterparty.

* **Payload:**
```json
{
  "conversationId": "6718dd2f0b7194fbc1110005"
}
```

---

### 14.4 Server-to-Client Events

#### Event: `new_message`
Delivered to all participants in `chat:conv_${conversationId}`.

* **Payload:**
```json
{
  "id": "6718dd2f0b7194fbc1110020",
  "conversationId": "6718dd2f0b7194fbc1110005",
  "senderId": "6718dd2f0b7194fbc1110006",
  "text": "I am waiting at Road 8, Dhanmondi.",
  "hasScamWarning": false,
  "createdAt": "2026-10-23T21:20:00.000Z"
}
```

---

#### Event: `scam_alert`
Emitted if a message triggers the Bengali advance payment regex shield.

* **Payload:**
```json
{
  "conversationId": "6718dd2f0b7194fbc1110005",
  "warningBanner": "Warning: Never send advance money via bKash/Nagad before physically verifying the product."
}
```

---

#### Event: `offer_updated`
Emitted to `chat:conv_${conversationId}` whenever an offer is submitted, accepted, countered, or declined.

* **Payload:**
```json
{
  "offerId": "6718dd2f0b7194fbc1110010",
  "conversationId": "6718dd2f0b7194fbc1110005",
  "status": "accepted",
  "amount": 51000,
  "round": 1,
  "dealId": "6718dd2f0b7194fbc1110011"
}
```

---

#### Event: `price_drop_alert`
Broadcast to user's personal channel `user:events_${userId}` when a favorited item drops in price after the 5-minute debounce window.

* **Payload:**
```json
{
  "listingId": "6718dd2f0b7194fbc1110003",
  "title": "Sony WH-1000XM4 Wireless Headphones",
  "oldPrice": 19500,
  "newPrice": 18000,
  "discountPercentage": 8,
  "message": "Your saved item price dropped! Reduced from 19,500 BDT to 18,000 BDT."
}
```

---

#### Event: `user_notification`
System alerts dispatched to `user:events_${userId}` (KYC approval, security alerts, dispute notifications).

* **Payload:**
```json
{
  "type": "KYC_APPROVED",
  "title": "National ID verification successful!",
  "message": "Green verified shield added to your profile. You can now start buying and selling.",
  "timestamp": "2026-10-23T21:25:00.000Z"
}
```

---

## 15. Summary Matrix: Endpoint Security & Access Control

| Module | Method | Endpoint Path | Auth Scope | Rate Limit / Throttling |
|---|:---:|---|---|---|
| **Auth** | `POST` | `/api/v1/auth/request-otp` | `Public` | 1/60s, 5/24hr per phone |
| | `POST` | `/api/v1/auth/verify-otp` | `Public` | Standard IP rate limit |
| | `POST` | `/api/v1/auth/refresh-token` | `Public` (Cookie) | Token rotation guard |
| | `POST` | `/api/v1/auth/logout` | `Authenticated` | Standard |
| **User** | `GET` | `/api/v1/users/me` | `Authenticated` | Standard |
| | `PATCH` | `/api/v1/users/me/profile` | `Authenticated` | Standard |
| | `PATCH` | `/api/v1/users/me/notification-preferences`| `Authenticated` | Standard |
| | `GET` | `/api/v1/users/:userId/public-profile` | `Public` | Standard |
| | `GET` | `/api/v1/users/:userId/reviews` | `Public` | Standard |
| **KYC** | `POST` | `/api/v1/kyc/ocr` | `Authenticated` | Standard |
| | `POST` | `/api/v1/kyc/verify-nid` | `Authenticated` | Max 3 attempts / user |
| | `GET` | `/api/v1/kyc/status` | `Authenticated` | Standard |
| | `POST` | `/api/v1/kyc/rebind-phone` | `Public` (Token) | Standard |
| | `POST` | `/api/v1/kyc/verify-new-device` | `Authenticated` | Max 2 devices |
| **Listing**| `GET` | `/api/v1/listings` | `Public` | Full Atlas cache |
| | `GET` | `/api/v1/listings/:id` | `Public` | Full Atlas cache |
| | `POST` | `/api/v1/listings/:id/reveal-phone` | `Verified Citizen`| **Max 10 reveals/24hr** |
| | `POST` | `/api/v1/listings` | `Verified Citizen`| **Max 5 active ads/mo** |
| | `PUT` | `/api/v1/listings/:id` | `Listing Owner` | Standard |
| | `DELETE`| `/api/v1/listings/:id` | `Listing Owner` | Standard |
| | `PATCH` | `/api/v1/listings/:id/status` | `Listing Owner` | Standard |
| | `POST` | `/api/v1/listings/:id/renew` | `Listing Owner` | Max 2 renewals (Day 25+) |
| | `GET` | `/api/v1/listings/my-listings` | `Verified Citizen`| Standard |
| **Favorite**| `POST`| `/api/v1/listings/:id/favorite` | `Verified Citizen`| Standard |
| | `DELETE`| `/api/v1/listings/:id/favorite` | `Verified Citizen`| Standard |
| | `GET` | `/api/v1/users/me/favorites` | `Verified Citizen`| Standard |
| **Chat** | `POST` | `/api/v1/chats/start` | `Verified Citizen`| Upsert idempotency |
| | `GET` | `/api/v1/chats` | `Verified Citizen`| Standard |
| | `GET` | `/api/v1/chats/:conversationId/messages`| `Verified Citizen`| Standard |
| | `POST` | `/api/v1/chats/:conversationId/messages`| `Verified Citizen`| Advance regex scan |
| **Offer** | `POST` | `/api/v1/chats/:conversationId/offers` | `Verified Citizen`| **Max 3 offers/buyer** |
| | `PATCH` | `/api/v1/chats/:conversationId/offers/:id`| `Verified Citizen`| Seller only |
| | `POST` | `/api/v1/chats/:conversationId/offers/:id/counter`| `Verified Citizen`| Counter chain |
| **Deal** | `POST` | `/api/v1/deals/direct-sale` | `Listing Owner` | Verified buyer chat check |
| | `GET` | `/api/v1/deals/:dealId` | `Verified Citizen`| Participant only |
| | `POST` | `/api/v1/reviews` | `Verified Citizen`| Deal-gated (1/party) |
| **Report** | `POST` | `/api/v1/reports` | `Verified Citizen`| Auto-quarantine $\ge 3$ |
| | `GET` | `/api/v1/reports/me` | `Verified Citizen`| Standard |
| **Dispute**| `POST` | `/api/v1/deals/:dealId/disputes` | `Verified Citizen`| Freezes seller |
| | `GET` | `/api/v1/deals/:dealId/dispute` | `Verified Citizen`| Participant only |
| **Upload** | `POST` | `/api/v1/uploads/presign` | `Authenticated` | Presigned S3 15-min TTL |
| **Admin** | `GET` | `/api/v1/admin/kyc/queue` | `Moderator` | SLA aging queue |
| | `PATCH` | `/api/v1/admin/kyc/:userId/approve` | `Moderator` | Sets verified badge |
| | `PATCH` | `/api/v1/admin/kyc/:userId/reject` | `Moderator` | Increments attempts |
| | `GET` | `/api/v1/admin/reports` | `Moderator` | Standard |
| | `POST` | `/api/v1/admin/users/:userId/propose-ban`| `Moderator` | Dual approval step 1 |
| | `POST` | `/api/v1/admin/users/:userId/confirm-ban`| `Super Admin` | Dual approval step 2 |
| | `POST` | `/api/v1/admin/audit-logs/export` | `Super Admin` | Secondary MFA required |
