# 📱 Becha-Kena Mobile App — Step-by-Step Development Prompts
# From Zero to Production (React Native / Expo)

**Project:** Becha-Kena — Bangladesh's First NID-Verified C2C Resale Marketplace  
**Mobile App Path:** `e:\becha-kena\mobile-app`  
**Tech Stack:** Expo SDK 58, React Native 0.88, TypeScript, Expo Router  
**Backend API:** `https://api.becha-kena.com/api/v1` (Production) / `http://localhost:5000/api/v1` (Development)  
**Reference Docs:** `PRD.md`, `api-spec.md`, `architecture.md`, `database-schema.md`

---

## 📋 Table of Contents

| Phase | Title | Prompts |
|:---:|:---|:---:|
| 1 | [Project Foundation & Architecture Setup](#phase-1-project-foundation--architecture-setup) | P01–P05 |
| 2 | [Authentication & Session Management](#phase-2-authentication--session-management) | P06–P10 |
| 3 | [KYC / NID Verification Flow](#phase-3-kyc--nid-verification-flow) | P11–P14 |
| 4 | [Home Feed & Listing Discovery](#phase-4-home-feed--listing-discovery) | P15–P19 |
| 5 | [Listing Detail & Seller Contact](#phase-5-listing-detail--seller-contact) | P20–P23 |
| 6 | [In-App Chat & Real-Time Messaging](#phase-6-in-app-chat--real-time-messaging) | P24–P28 |
| 7 | [Offers & Negotiation System](#phase-7-offers--negotiation-system) | P29–P32 |
| 8 | [Listing Creation & Seller Dashboard](#phase-8-listing-creation--seller-dashboard) | P33–P37 |
| 9 | [Deals, Reviews & Reputation](#phase-9-deals-reviews--reputation) | P38–P41 |
| 10 | [Favorites, Notifications & Safety](#phase-10-favorites-notifications--safety) | P42–P46 |
| 11 | [Profile, Settings & Account Management](#phase-11-profile-settings--account-management) | P47–P49 |
| 12 | [Polish, Performance & Production Release](#phase-12-polish-performance--production-release) | P50–P55 |

---

## Phase 1: Project Foundation & Architecture Setup

### ✅ Prompt P01 — Project Structure, Path Aliases & Base Configuration

```
Set up the project structure for our Becha-Kena mobile app. The application directory is located at e:\becha-kena\mobile-app and runs on Expo SDK 58, React Native 0.88, and TypeScript.

Organize the project according to the following folder structure:

src/
├── app/                          # Expo Router file-based routes
│   ├── (public)/                 # Guest / Public accessible screens (no authentication required)
│   │   ├── _layout.tsx
│   │   ├── index.tsx             # Public home feed / marketplace discovery
│   │   ├── search.tsx            # Search and filter catalog page
│   │   └── listing/[id].tsx      # Public listing detail view
│   ├── (auth)/                   # Authentication route group
│   │   ├── _layout.tsx
│   │   ├── login.tsx             # Phone number and OTP verification screen
│   │   └── kyc.tsx               # Identity verification (NID & Liveness) flow
│   ├── (tabs)/                   # Authenticated bottom tab navigator
│   │   ├── _layout.tsx           # Tab bar layout (Home, Chat, Sell, Profile)
│   │   ├── home.tsx              # Authenticated personalized home feed
│   │   ├── chat/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Chat inbox & conversations list
│   │   │   └── [conversationId].tsx  # Individual conversation & negotiation thread
│   │   ├── sell/
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx         # Seller dashboard (My active, reserved, sold listings)
│   │   │   └── create.tsx        # Multi-step listing creation wizard
│   │   └── profile/
│   │       ├── _layout.tsx
│   │       ├── index.tsx         # Citizen trust profile and account hub
│   │       ├── favorites.tsx     # Saved wishlist & price drop tracking
│   │       └── deals.tsx         # Transaction receipts & bilateral reviews
│   └── _layout.tsx               # Global root layout (Providers, fonts, splash)
├── components/
│   ├── ui/                       # Reusable atomic UI components (Button, Input, Badge, Modal, Card)
│   ├── listing/                  # ListingCard, FilterBar, ConditionBadge, PriceTag, ImageGallery
│   ├── chat/                     # ChatBubble, OfferCard, ScamWarning, TypingIndicator
│   ├── kyc/                      # NidScanner, LivenessCamera, VerificationStatus
│   └── common/                   # Header, EmptyState, LoadingSkeleton, ErrorBoundary
├── services/
│   ├── api/                      # Axios / Fetch HTTP client setup with interceptors
│   │   ├── client.ts             # Base API client with automatic token rotation
│   │   ├── auth.api.ts           # Authentication & session endpoints
│   │   ├── user.api.ts           # Profile & preference endpoints
│   │   ├── kyc.api.ts            # Fast e-KYC & OCR endpoints
│   │   ├── listing.api.ts        # Listing CRUD & discovery endpoints
│   │   ├── chat.api.ts           # Messaging & inbox endpoints
│   │   ├── offer.api.ts          # Offer & counter-offer negotiation endpoints
│   │   ├── deal.api.ts           # Deal closure & review endpoints
│   │   ├── favorite.api.ts       # Wishlist & price alert endpoints
│   │   ├── report.api.ts         # Safety flagging & dispute endpoints
│   │   └── upload.api.ts         # Direct-to-S3 presigned URL endpoints
│   └── socket/                   # Socket.io real-time client singleton & event handlers
│       ├── socket.client.ts
│       └── socket.events.ts
├── store/                        # Zustand global state management
│   ├── auth.store.ts             # Authentication state (tokens, profile, verification)
│   ├── chat.store.ts             # Active conversations, messages, unread counts
│   ├── listing.store.ts          # Search queries, active filters, catalog cache
│   └── notification.store.ts     # System alerts, badge counters, push notifications
├── hooks/                        # Custom React hooks
│   ├── useAuth.ts
│   ├── useSocket.ts
│   ├── useLocation.ts
│   └── useImagePicker.ts
├── utils/                        # Shared utility functions
│   ├── validators.ts             # Bangladeshi phone, NID, and price regex validators
│   ├── formatters.ts             # Currency (BDT), timestamps, and distance formatters
│   ├── storage.ts                # Expo SecureStore & AsyncStorage helpers
│   └── constants.ts              # API URLs, enums, administrative divisions/thanas
├── types/                        # Strict TypeScript definitions
│   ├── api.types.ts              # API response envelopes and error structures
│   ├── user.types.ts
│   ├── listing.types.ts
│   ├── chat.types.ts
│   ├── offer.types.ts
│   └── deal.types.ts
├── theme/                        # Design system tokens
│   ├── colors.ts                 # Brand palette (Verified green, scam danger red, neutrals)
│   ├── typography.ts             # Font weights, line heights, scale
│   ├── spacing.ts                # 4px base spacing scale
│   └── index.ts                  # Unified theme export
└── global.css                    # Tailwind / styling config

Initialize this folder structure, clean up the default Expo boilerplate files, ensure each directory has a proper index.ts entry, and verify that the TypeScript path alias (@/*) configured in tsconfig.json resolves cleanly to src/*.
```

---

### ✅ Prompt P02 — Design System & Theme Configuration

```
Implement the comprehensive design system and theme configuration for the Becha-Kena mobile app inside src/theme/.

In colors.ts, define the semantic color palette:
- Primary Brand: Emerald Green (#16A34A) — NID verified trust badge, primary actions, positive states
- Secondary: Royal Blue (#2563EB) — contextual links, informative badges, active selection
- Warning: Amber (#F59E0B) — pending review states, cautious notifications
- Danger: Crimson Red (#DC2626) — scam detection shield, transaction errors, banned accounts
- Background: Pure White (#FFFFFF) in light mode, Slate Black (#0F172A) in dark mode
- Surface / Cards: Off-White (#F8FAFC) in light mode, Dark Slate (#1E293B) in dark mode
- Text Primary: Deep Slate (#0F172A) in light mode, Off-White (#F8FAFC) in dark mode
- Text Secondary: Muted Slate (#64748B)
- Borders: Subtle Slate (#E2E8F0) in light mode, (#334155) in dark mode
- Trust Shield Green: (#16A34A) with light green fill (#DCFCE7)
- Scam Warning Background: Tinted Rose (#FEF2F2) with Crimson Border (#FCA5A5)

In typography.ts, specify font sizes and weights:
- heading1: 28px, Bold
- heading2: 22px, SemiBold
- heading3: 18px, SemiBold
- body: 16px, Regular
- bodySmall: 14px, Regular
- caption: 12px, Regular
- priceDisplay: 24px, Bold (tailored for Bangladeshi Taka currency display)

In spacing.ts, define a standard 4px spacing scale (xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32).

Export a custom useTheme() hook that automatically reacts to react-native useColorScheme(), giving components typed access to the current theme tokens.
```

---

### ✅ Prompt P03 — Core UI Component Library

```
Develop a reusable, accessible UI component library inside src/components/ui/. All components must be fully typed in TypeScript, support dark and light modes, and adhere to our design tokens.

Implement the following components:

1. **Button.tsx**: Variants: primary (green), secondary (outline), danger (red), ghost. Sizes: sm, md, lg. Includes loading spinner state, icon slots (left/right), and disabled states.
2. **Input.tsx**: Text input with label, helper text, error message banner, password visibility toggle, and formatted phone number mode. Supports prefix icons (e.g., Bangladesh flag, search magnifying glass).
3. **Badge.tsx**: Variants: verified (green shield with "NID Verified" label), status (active, sold, expired, under_review), condition (brand_new, like_new, gently_used, heavily_used), and warning.
4. **Card.tsx**: Elevated surface with 12px border radius, subtle drop shadow, and smooth press scale animation via react-native-reanimated.
5. **Modal.tsx**: Bottom sheet modal presentation with backdrop overlay, swipe-down gesture to dismiss, title bar, content scroll view, and action footer.
6. **Avatar.tsx**: Circular user avatar with image caching, fallback user initials, optional verified shield badge overlay, and size options (sm: 32px, md: 48px, lg: 72px).
7. **Skeleton.tsx**: Shimmer/pulse loading placeholder with customizable width, height, and border radius.
8. **EmptyState.tsx**: Clean placeholder featuring an illustrative icon, title, descriptive subtitle, and optional call-to-action button.
9. **Toast.tsx**: Top notification toast supporting success, warning, error, and informational messages with auto-dismiss after 3 seconds.
10. **Divider.tsx**: Horizontal or vertical separator with optional centered text label.
11. **PriceTag.tsx**: Currency display component rendering formatted Bangladeshi Taka (e.g., "BDT 54,000"), with support for strikethrough original prices and discount percentage chips.
12. **StarRating.tsx**: 5-star rating component supporting both interactive input and read-only display with fractional ratings.

Ensure every component defines strict TypeScript prop interfaces and exports clean defaults.
```

---

### ✅ Prompt P04 — API Client, Interceptors & Token Management

```
Configure the centralized API client in src/services/api/client.ts. The target backend API operates at http://localhost:5000/api/v1 for development and https://api.becha-kena.com/api/v1 for production.

Implement the following architecture:

1. **Axios Client Instance**:
   - Set baseURL, default headers (Content-Type: application/json), and a 15-second request timeout.

2. **Request Interceptor**:
   - Read the stored short-lived access token from SecureStore and inject the Authorization: Bearer <accessToken> header into all outgoing requests.
   - Include the unique device footprint header (X-Device-UUID) generated via expo-device.

3. **Response Interceptor — Automatic Token Rotation**:
   - Intercept 401 Unauthorized responses.
   - Implement a mutex / request queue to prevent race conditions during concurrent token refresh attempts.
   - Call POST /api/v1/auth/refresh-token using the long-lived refresh token stored in SecureStore.
   - Upon a successful refresh, update SecureStore with the new access token and replay all queued requests with the updated header.
   - If token refresh fails (expired or revoked session), clear local credentials, reset global auth state, and redirect the user to the login screen.

4. **Standard Envelope Parser**:
   - Parse all responses to conform to the standard API response structure: { success, statusCode, message, data, meta, error }.
   - Extract structured validation error messages and propagate typed ApiError exceptions.

5. **SecureStore Wrapper (src/utils/storage.ts)**:
   - Provide safe, asynchronous helper functions:
     - saveTokens(accessToken: string, refreshToken: string): Promise<void>
     - getAccessToken(): Promise<string | null>
     - getRefreshToken(): Promise<string | null>
     - clearTokens(): Promise<void>
     - getOrCreateDeviceUUID(): Promise<string>
```

---

### ✅ Prompt P05 — TypeScript Type Definitions (All API Models)

```
Generate comprehensive TypeScript interfaces and enums matching our database schema and API specifications inside src/types/.

Include the following modules:

**src/types/api.types.ts**:
- ApiResponse<T>: { success: boolean; statusCode: number; message: string; data: T; meta?: PaginationMeta }
- ApiError: { success: false; statusCode: number; error: { code: string; message: string; details?: FieldError[] } }
- PaginationMeta: { page: number; limit: number; totalCount: number; totalPages: number }

**src/types/user.types.ts**:
- User: Complete citizen profile model (id, phone, displayName, role, isNidVerified, kycStatus, kycAttempts, avatarUrl, deviceUUIDs, activeDeviceCount, isBanned, isFrozen, averageRating, totalDealsCompleted, notificationPreferences, createdAt).
- NotificationPreferences: { pushEnabled, smsEnabled, priceDropAlerts, quietHoursStart, quietHoursEnd }.
- PublicProfile: Sanitized citizen public card (id, displayName, isNidVerified, avatarUrl, averageRating, totalDealsCompleted, memberSince, trustBadges).
- UserRole: 'citizen' | 'moderator' | 'super_admin'.
- KycStatus: 'unverified' | 'pending' | 'verified' | 'retake_required' | 'manual_review'.

**src/types/listing.types.ts**:
- Listing: Full ad model (id, sellerId, title, description, price, condition, category, location, imageUrls, status, moderationStatus, isPhoneHidden, soldToBuyerId, viewCount, inquiryCount, renewCount, maxRenewals, expiresAt, createdAt).
- ListingStatus: 'draft' | 'active' | 'under_offer' | 'sold' | 'expired' | 'archived' | 'under_review'.
- ListingCondition: 'brand_new' | 'like_new' | 'gently_used' | 'heavily_used'.
- ListingCategory: 'electronics' | 'vehicles' | 'property' | 'fashion' | 'home' | 'hobbies'.
- ListingSearchParams: Full filter and sorting query parameters.

**src/types/chat.types.ts**:
- Conversation: { conversationId, listing, seller, buyer, lastMessage, status, updatedAt }.
- Message: { id, conversationId, senderId, text, messageType, hasScamWarning, warningText?, isDeleted, createdAt }.
- MessageType: 'text' | 'image' | 'system' | 'offer_event'.

**src/types/offer.types.ts**:
- Offer: { offerId, conversationId, listingId, buyerId, sellerId, amount, status, parentOfferId?, round, expiresAt, createdAt }.
- OfferStatus: 'pending' | 'accepted' | 'countered' | 'declined' | 'expired'.

**src/types/deal.types.ts**:
- Deal: { dealId, listing, seller, buyer, finalPrice, isReviewedBySeller, isReviewedByBuyer, disputeStatus, completedAt }.
- Review: { reviewId, dealId, rating, tags, comment?, reviewer, listingTitle, createdAt }.
- ReviewTag: 'punctual' | 'item_as_described' | 'friendly_communication' | 'quick_payment'.
- Favorite: Saved wishlist record with price delta calculations.
- Report: Community moderation flag model.
- Dispute: Police GD dispute record.
```

---

## Phase 2: Authentication & Session Management

### ✅ Prompt P06 — Auth API Service Layer

```
Create the authentication API service layer in src/services/api/auth.api.ts adhering to Section 2 of api-spec.md.

Implement the following API methods:

1. **requestOtp(phone: string): Promise<ApiResponse<OtpResponse>>**:
   - Endpoint: POST /api/v1/auth/request-otp
   - Body: { phone: "01712345678" }
   - Expected Response: { phone, expiresInSeconds: 120, resendCooldownSeconds: 60 }
   - Validate that the phone number matches the Bangladeshi telecommunication regex: /^(?:\+8801|01)[3-9]\d{8}$/.

2. **verifyOtp(params: VerifyOtpRequest): Promise<ApiResponse<LoginResponse>>**:
   - Endpoint: POST /api/v1/auth/verify-otp
   - Body: { phone, otp, deviceUUID, deviceName }
   - Expected Response: { accessToken, tokenType, expiresIn, user: User, isNewUser, isNewDeviceChallengeRequired }
   - Enforce 6-digit numeric OTP validation: /^\d{6}$/.

3. **refreshToken(): Promise<ApiResponse<RefreshResponse>>**:
   - Endpoint: POST /api/v1/auth/refresh-token
   - Transmits the stored refresh token to receive a fresh 15-minute access token.

4. **logout(): Promise<ApiResponse<null>>**:
   - Endpoint: POST /api/v1/auth/logout
   - Invalidates the active Redis session and clears client credentials.

Handle all documented HTTP status codes:
- 400 Bad Request: Malformed phone format or invalid OTP.
- 403 Forbidden: Blacklisted NID or banned citizen profile.
- 429 Too Many Requests: OTP rate limits exceeded (cooldown enforced).
- 423 Locked: Unrecognized device challenge required (New Phone, Same SIM).
```

---

### ✅ Prompt P07 — Auth State Management (Zustand Store)

```
Implement the global authentication store using Zustand in src/store/auth.store.ts.

Define state and actions as follows:

**State**:
- user: User | null
- accessToken: string | null
- isAuthenticated: boolean
- isLoading: boolean
- isNidVerified: boolean
- kycStatus: KycStatus
- error: string | null

**Actions**:
- setUser(user: User): Updates user profile and synchronizes isNidVerified and kycStatus flags.
- setToken(token: string): Updates the accessToken in memory and writes it to SecureStore.
- login(phone: string, otp: string): Orchestrates the complete login flow:
  1. Executes verifyOtp API call with device metadata.
  2. Persists accessToken and refreshToken into SecureStore.
  3. Updates user and authentication states.
  4. Triggers the Socket.io connection handshake.
- logout(): Handles complete session termination:
  1. Calls logout API endpoint.
  2. Clears tokens from SecureStore and resets local state.
  3. Disconnects the active Socket.io instance.
  4. Redirects the navigation router to the login screen.
- checkAuthState(): Executed upon app bootstrap:
  1. Reads tokens from SecureStore.
  2. Calls GET /api/v1/users/me to validate session authenticity.
  3. Attempts automatic token refresh if the access token has expired.
  4. Clears state and redirects if credentials are invalid.

Use Zustand persist middleware with an AsyncStorage adapter for non-sensitive profile caching, keeping sensitive cryptographic tokens strictly in SecureStore.
```

---

### ✅ Prompt P08 — Phone Number OTP Login Screen

```
Construct the phone number and OTP authentication screen in src/app/(auth)/login.tsx. Implement a smooth 2-step transition flow.

**Step 1 — Phone Number Input**:
- Display the Becha-Kena brand emblem and the tagline: "Bangladesh's First NID-Verified Marketplace".
- Formatted phone number input with a fixed "+880" prefix and a Bangladesh flag badge (🇧🇩).
- Real-time regex validation with inline feedback.
- Full-width "Get OTP" primary button with loading indicator during network transit.
- Clear error banner handling rate limits or blacklisted account notices.

**Step 2 — OTP Verification (Interactive Transition)**:
- Subtitle: "Enter the 6-digit verification code sent to 01XXXXXXXXX".
- 6-cell interactive OTP input with auto-advance cursor and clipboard paste detection.
- Automatic form submission upon completion of the 6th digit.
- 120-second circular countdown timer: "Resend code in 1:45".
- "Resend Code" action button enabled once the countdown expires (enforcing 60s cooldown).
- "Edit Phone Number" action to return to Step 1.
- Clear error handling for invalid or expired OTP inputs.

**Routing Rules**:
- Success with isNidVerified === true → Navigate to (tabs)/home.
- Success with isNidVerified === false → Navigate to (auth)/kyc.
- Response with isNewDeviceChallengeRequired === true → Navigate to biometric device challenge screen.

Provide haptic feedback on keypad actions and integrate smooth entrance animations using react-native-reanimated.
```

---

### ✅ Prompt P09 — Root Layout, Auth Guard & Navigation

```
Establish the root navigation architecture and route protection guards in src/app/_layout.tsx and nested route groups.

**Root _layout.tsx**:
- Wrap application with ThemeProvider (reacting to system dark/light modes).
- Manage SplashScreen: keep native splash visible until fonts are loaded and checkAuthState() resolves.
- Initialize global providers: Zustand store hydration, Socket.io lifecycle, and ErrorBoundary.
- Configure global StatusBar style dynamically based on theme.

**Route Groups**:
1. **(public)/_layout.tsx**: Stack navigator for unrestricted discovery:
   - Home catalog (index.tsx)
   - Search & filters (search.tsx)
   - Product details (listing/[id].tsx)
   - Guests can freely browse; tapping "Chat", "Call Seller", or "Post Ad" triggers the auth gate modal.

2. **(auth)/_layout.tsx**: Stack navigator for onboarding:
   - Login & OTP (login.tsx)
   - Identity verification (kyc.tsx)
   - Transparent headers with custom back navigation.

3. **(tabs)/_layout.tsx**: Authenticated bottom tab navigator:
   - 🏠 Home: Authenticated personalized feed.
   - 💬 Chat: Conversation threads with unread badge counter.
   - ➕ Sell: Multi-step ad creation or seller inventory dashboard.
   - 👤 Profile: Citizen trust badge, ratings, and settings.

**useProtectedRoute() Guard Hook**:
- Listen to auth store state changes.
- If a guest attempts access to protected tab routes → redirect to (auth)/login.
- If an authenticated citizen with isNidVerified === false accesses seller tools or chat initiation → redirect to (auth)/kyc.
- If authenticated and fully verified → permit complete tab navigation.
```

---

### ✅ Prompt P10 — Secure Token Storage & Auto-Refresh

```
Implement end-to-end token security and session resilience using expo-secure-store and Axios response interceptors.

**Storage Implementation (src/utils/storage.ts)**:
- Store tokens in encrypted hardware-backed storage:
  - ACCESS_TOKEN: 15-minute expiration JWT.
  - REFRESH_TOKEN: 30-day opaque token.
  - DEVICE_UUID: Unique hardware footprint string.
- Provide clean async wrappers: saveTokens, getAccessToken, getRefreshToken, clearTokens, and getOrCreateDeviceUUID.

**Interceptor Logic (enhance src/services/api/client.ts)**:
- Request Interceptor:
  - Automatically read ACCESS_TOKEN and inject Authorization: Bearer <token>.
  - Append X-Device-UUID header.
- Response Interceptor:
  - Intercept 401 Unauthorized responses.
  - Check if a refresh attempt is already in flight; if so, queue the pending request.
  - If not in flight, acquire the refresh lock and dispatch POST /api/v1/auth/refresh-token.
  - Upon 200 OK: Persist the new access token, update the default Authorization header, drain the queued requests, and resolve.
  - Upon 401 or 403 failure: Purge all credentials, release the queue with an authentication error, and execute global logout.

**Hardware Device Binding**:
- On first launch, generate and persist a persistent UUID using expo-device and crypto.randomUUID().
- Ensure this UUID is transmitted during OTP verification to prevent unauthorized multi-device cloning.
```

---

## Phase 3: KYC / NID Verification Flow

### ✅ Prompt P11 — KYC Verification Screen UI

```
Build the multi-step identity verification screen in src/app/(auth)/kyc.tsx adhering to Section 3.1 of PRD.md and Section 4 of api-spec.md.

**Screen Header**:
- Linear step indicator: Step 1/3 (NID Document), Step 2/3 (Data Review), Step 3/3 (Biometric Liveness).
- Title: "Verify Your National ID".
- Subtitle: "Complete verification in under 90 seconds to unlock buying and selling privileges."

**Step 1 — Document Capture**:
- Camera viewfinder with an aspect-ratio guide frame for the front of the Bangladeshi NID card.
- Visual prompt: "Position the front of your NID card within the frame".
- Camera shutter button with automated lighting detection.
- Seamless transition to back-side capture once the front photo is verified.
- Image preview card with a "Retake" button.
- Validate maximum image file size (5MB) and minimum resolution (≥480×480px).

**Step 2 — OCR Data Confirmation**:
- Following document capture, call POST /api/v1/kyc/ocr.
- Display extracted fields in editable input containers:
  - NID Number (auto-filled, editable for OCR correction; validate 10-digit Smart Card or 13/17-digit legacy format).
  - Date of Birth (ISO YYYY-MM-DD format with date-picker validation).
  - Legal Name (read-only extracted descriptor).
- "Confirm & Proceed to Selfie" primary button.

**Step 3 — Biometric Liveness Challenge**:
- Front-facing camera stream with an oval facial alignment guide.
- Step-by-step interactive liveness prompts:
  1. "Look directly into the camera" (hold 2 seconds).
  2. "Blink your eyes naturally" (blink detection).
  3. "Turn your head slowly to the right" (yaw rotation detection).
- Live progress indicator tracking match confidence.
- Automatic capture once all liveness checks pass.

**Submission & Response Handling**:
- Submit composite payload to POST /api/v1/kyc/verify-nid.
- Display an animated processing overlay: "Verifying your identity with the Election Commission gateway...".
- On Success: Render confetti celebration, display the green "NID Verified" badge, and route to (tabs)/home.
- On Biometric Mismatch (422): Display "Facial match did not pass. Retake selfie in bright lighting", showing remaining attempts (e.g., "2 attempts remaining").
- On Exhaustion (429): Route user to the Manual Review Waiting Screen (SLA < 4 hours).
```

---

### ✅ Prompt P12 — KYC API Service & Camera Integration

```
Construct the KYC API service (src/services/api/kyc.api.ts) and camera utility hooks (src/hooks/useCamera.ts).

**KYC API Endpoints**:

1. **ocrExtract(frontImage: FormData, backImage: FormData): Promise<ApiResponse<OcrResult>>**:
   - POST /api/v1/kyc/ocr (multipart/form-data)
   - Response: { nidNumber, dob, extractedName, format }

2. **verifyNid(payload: VerifyNidRequest): Promise<ApiResponse<KycVerifyResult>>**:
   - POST /api/v1/kyc/verify-nid
   - Payload: { nidNumber, dob, frontImageKey, backImageKey, liveSelfieKey, livenessMeta }
   - Response: { isNidVerified, kycStatus, maskedLegalName, verifiedAt }

3. **getKycStatus(): Promise<ApiResponse<KycStatusResponse>>**:
   - GET /api/v1/kyc/status
   - Response: { kycStatus, isNidVerified, attemptsUsed, submittedAt, slaRemainingMinutes }

**Camera & Image Utilities**:
- Integrate expo-camera with proper runtime permission management and informative denial dialogs.
- Compress captured frames client-side to WebP format (max 1280x1280px, ~200KB target).
- Support front/rear camera switching and flash mode control.

**Direct Upload Pipeline**:
- Request S3 presigned PUT URLs via POST /api/v1/uploads/presigned-url with contexts 'nid_front', 'nid_back', and 'avatar'.
- Stream the binary buffer directly to AWS S3.
- Confirm upload via POST /api/v1/uploads/confirm to receive the permanent objectKey.

**Liveness Verification Component (src/components/kyc/LivenessCamera.tsx)**:
- Implement lightweight client-side motion and blink detection.
- Construct the livenessMeta descriptor: { blinkDetected: true, headTurnDetected: true, confidence: number }.
```

---

### ✅ Prompt P13 — KYC Status & Manual Review Waiting Screen

```
Develop the manual KYC review queue status screen in src/app/(auth)/kyc-status.tsx for submissions requiring human moderation after automated attempts are exhausted.

**Screen Layout**:
- Status Indicator Icon:
  - manual_review: Animated clock / hourglass indicator.
  - retake_required: Amber warning triangle with moderator notes.
  - verified: Green checkmark badge.
- Informative Status Card:
  - Title: "Identity Verification Under Review"
  - Submission Timestamp: formatted BST date and time.
  - SLA Counter: "Estimated review time: within [slaRemainingMinutes] minutes".
  - Operating Hours: "Operational review window: 9:00 AM – 9:00 PM BST".
- "Refresh Status" button that invokes GET /api/v1/kyc/status.
- Automatic polling loop executing every 30 seconds while screen is in foreground.
- AppState listener to pause polling when backgrounded.
- Immediate navigation to (tabs)/home with celebratory toast upon receiving KYC_APPROVED push notification or poll result.
```

---

### ✅ Prompt P14 — Lost SIM / Phone Rebinding Flow

```
Implement the biometric-first account recovery flow for citizens who have lost access to their registered SIM card (PRD.md Flow 3, api-spec.md Section 4.4).

**Entry Point**:
- Place a "Lost your registered phone number?" action on the login screen.

**Screen: src/app/(auth)/recover-account.tsx**:

1. **Step 1 — New Mobile Verification**:
   - Collect the new Bangladeshi phone number.
   - Dispatch and verify a standard 6-digit SMS OTP.

2. **Step 2 — NID Identity Verification**:
   - Collect registered NID Number and Date of Birth.
   - Enforce standard NID formatting checks.

3. **Step 3 — Biometric Facial Liveness Match**:
   - Activate front-facing camera with the liveness challenge.
   - Capture live selfie vector to verify against the vaulted identity record (≥95% confidence threshold required).

4. **Step 4 — Atomic Account Rebinding**:
   - Call POST /api/v1/kyc/rebind-phone with { newPhone, phoneOtp, nidNumber, dob, liveSelfieKey }.
   - On Success: Revoke all existing sessions across previous devices, issue fresh access tokens, update the user phone reference, and navigate to (tabs)/home.
   - Display prominent security warning: "All previous sessions on your lost SIM card have been immediately terminated."
```

---

## Phase 4: Home Feed & Listing Discovery

### ✅ Prompt P15 — Listing API Service Layer

```
Build the complete listing API client module in src/services/api/listing.api.ts covering Section 5 of api-spec.md.

Implement the following functions with strict TypeScript typings:

1. **searchListings(params: ListingSearchParams): Promise<ApiResponse<Listing[]>>**:
   - GET /api/v1/listings
   - Accepts parameters: q, category, division, thana, longitude, latitude, maxDistanceKm, condition, minPrice, maxPrice, sort, page, limit.
   - Returns paginated data envelope with pagination metadata.

2. **getListingById(id: string): Promise<ApiResponse<ListingDetail>>**:
   - GET /api/v1/listings/:id
   - Public endpoint returning full listing specifications, image URLs, view counts, and verified seller trust card.

3. **revealSellerPhone(listingId: string): Promise<ApiResponse<PhoneRevealResponse>>**:
   - POST /api/v1/listings/:id/reveal-phone
   - Gated endpoint for verified citizens; returns unmasked phone number and daily quota usage (max 10/day).

4. **createListing(payload: CreateListingRequest): Promise<ApiResponse<Listing>>**:
   - POST /api/v1/listings
   - Gated endpoint for verified citizens; enforces 5 active ads/month quota and image moderation.

5. **updateListing(id: string, payload: UpdateListingRequest): Promise<ApiResponse<Listing>>**:
   - PUT /api/v1/listings/:id (owner only).

6. **deleteListing(id: string): Promise<ApiResponse<{ id, status, deletedAt }>>**:
   - DELETE /api/v1/listings/:id (soft deletion).

7. **updateListingStatus(id: string, status: 'active' | 'under_offer'): Promise<ApiResponse<Listing>>**:
   - PATCH /api/v1/listings/:id/status

8. **renewListing(id: string): Promise<ApiResponse<{ id, renewCount, maxRenewals, expiresAt }>>**:
   - POST /api/v1/listings/:id/renew (available Day 25+).

9. **getMyListings(params: { status?, page?, limit? }): Promise<ApiResponse<Listing[]>>**:
   - GET /api/v1/listings/my-listings
```

---

### ✅ Prompt P16 — Listing State Management (Zustand)

```
Construct the listing catalog and search state store in src/store/listing.store.ts using Zustand.

**State Model**:
- listings: Listing[] (active search/catalog feed)
- selectedListing: ListingDetail | null
- searchQuery: string
- filters: ListingFilters (category, division, thana, condition, minPrice, maxPrice, sort)
- pagination: PaginationMeta
- isLoading: boolean
- isRefreshing: boolean (pull-to-refresh)
- isLoadingMore: boolean (infinite scroll pagination)
- error: string | null

**Actions**:
- fetchListings(params?: ListingSearchParams): Loads initial page with active filters.
- loadMoreListings(): Increments page number and appends new records while guarding against duplicate concurrent fetches.
- refreshListings(): Resets to page 1 and updates the catalog cleanly.
- setSearchQuery(query: string): Debounces keyword searches (500ms delay, minimum 2 characters).
- setFilter(key, value) & resetFilters(): Manages search parameter state.
- fetchListingDetail(id: string): Retrieves and caches full listing specifications.
- clearSelectedListing(): Flushes detail view cache on screen unmount.
```

---

### ✅ Prompt P17 — Home Feed Screen

```
Construct the marketplace home discovery feed supporting both guest and authenticated users.

**Public Discovery Feed (src/app/(public)/index.tsx)**:
- Sticky header featuring the Becha-Kena emblem, search input bar, and notification action.
- Horizontal category filter chips:
  📱 Electronics | 🚗 Vehicles | 🏠 Property | 👕 Fashion | 🏡 Home | ⚽ Hobbies
- "Nearby Deals" section showing items within proximity if location permissions are granted.
- "Fresh Listings" feed rendered via an optimized FlatList.
- Pull-to-refresh and infinite scroll pagination with footer spinners.
- Floating "Post Ad" action button (checking auth & KYC status on press).

**ListingCard Component (src/components/listing/ListingCard.tsx)**:
- Thumbnail image (100x100px with rounded corners and WebP caching).
- Title (truncated to 2 lines).
- Formatted price: "BDT 54,000" in bold brand emerald green.
- Condition chip: "Like New", "Brand New", etc.
- Location label: "📍 Dhanmondi, Dhaka".
- Distance indicator: "2.4 km away" (if coordinates available).
- Seller badge row: Avatar thumbnail + Display Name + ✅ NID Verified shield.
- Relative timestamp: "Posted 2 hours ago".
- Heart toggle button to save to wishlist.
- Smooth card tap navigating to listing/[id].

**Empty & Loading States**:
- Render 4 Skeleton cards during initial network fetch.
- Clean EmptyState illustration when no listings match query filters.
```

---

### ✅ Prompt P18 — Search & Filter Screen

```
Develop the comprehensive search and faceted filter screen in src/app/(public)/search.tsx.

**Sticky Search Bar**:
- Input with search icon and clear button.
- Debounced query execution (500ms).
- Local search history tags (persisting top 10 recent searches).

**Faceted Filter Controls**:
1. **Category**: Horizontal chips with single-select toggle.
2. **Geographic Hierarchy**:
   - Administrative Division selector (Dhaka, Chittagong, Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh).
   - Thana selector dynamically populated based on chosen division.
   - "Nearby Radius" slider (5km to 50km) utilizing device GPS coordinates.
3. **Price Range**:
   - Dual-input fields for Min Price and Max Price.
   - Quick preset filter chips ("Under BDT 5,000", "BDT 5,000 - BDT 25,000", "BDT 25,000 - BDT 1,00,000", "Above BDT 1,00,000").
4. **Condition**: Checkbox selection for Brand New, Like New, Gently Used, Heavily Used.
5. **Sort Order**: Radio options for Newest First, Price: Low to High, Price: High to Low, Nearest First.

**Active Filter Bar**:
- Horizontal scrollable container showing chips for every applied filter with an '×' remove action.
- "Clear All" action button.
- Result count headline: "84 items found".
```

---

### ✅ Prompt P19 — Location Utilities & Bangladesh Data

```
Create Bangladesh geographic data constants and location helper hooks.

**Data Constants (src/utils/bd-data.ts)**:
- Export the 8 administrative divisions of Bangladesh.
- Export prominent thanas mapped per division:
  - Dhaka: Dhanmondi, Gulshan, Mirpur, Uttara, Mohammadpur, Banani, Motijheel, Lalbagh, Farmgate, Jatrabari, etc.
  - Chittagong: Agrabad, Nasirabad, Chawkbazar, Patenga, Halishahar, etc.
  - (Define equivalent sets for Rajshahi, Khulna, Barisal, Sylhet, Rangpur, Mymensingh).
- Geographic coordinate bounding box for Bangladesh to validate location requests.

**Location Hook (src/hooks/useLocation.ts)**:
- Utilize expo-location for foreground GPS permission requests.
- Fetch current coordinates via getCurrentPositionAsync().
- Provide reverse geocoding to resolve coordinates to division and thana.
- Graceful fallbacks when location permissions are denied.

**Formatters (src/utils/formatters.ts)**:
- formatDistance(km: number): string
  - < 1 km → "500m away"
  - 1-50 km → "2.4 km away"
  - > 50 km → "52 km away"
```

---

## Phase 5: Listing Detail & Seller Contact

### ✅ Prompt P20 — Listing Detail Screen

```
Construct the public product detail screen in src/app/(public)/listing/[id].tsx adhering to Section 5.2 of api-spec.md.

**Screen Structure (ScrollView)**:

1. **Image Gallery**:
   - Full-width swipeable image carousel.
   - Pagination dots and position badge ("2 / 5").
   - Tap to expand into a full-screen interactive modal gallery with pinch-to-zoom.

2. **Price & Title Header**:
   - Price display: "BDT 54,000" in 24px bold emerald green.
   - Title: "Apple iPhone 13 128GB Midnight Blue".
   - Condition badge and category label.
   - Metadata: "Posted 3 days ago · 👁 312 views".

3. **Seller Trust Card**:
   - Circular avatar with ✅ green verified shield.
   - Display name: "Farhana R. [NID Verified]".
   - Trust statistics: "⭐ 4.9 Rating · 🤝 14 Deals Completed".
   - "Member since Aug 2026".
   - Tapping navigates to the seller's public trust profile.

4. **Product Description**:
   - Full description with "Read More / Read Less" expander for lengthy text.

5. **Location & Safety Banner**:
   - 📍 "Dhanmondi, Dhaka" location marker.
   - Distance indicator relative to buyer.
   - Highlighted safety tips banner:
     "⚠️ Safety Guidelines: Always meet in public places. Inspect products thoroughly before paying. Never send advance booking fees via bKash or Nagad."

**Fixed Action Bar**:
- Floating bottom bar containing:
  1. "💬 Chat with Seller" (primary green button).
  2. "📞 Call Seller" (secondary outline button).
  3. Wishlist heart toggle icon.

**Authentication & Role Logic**:
- If guest taps Chat or Call → present login modal.
- If citizen is unverified → route to KYC screen.
- If current user owns the listing → replace action buttons with "✏️ Edit Listing" and "📊 View in Dashboard".
- If listing status is 'sold' → render prominent "SOLD" banner and disable contact buttons.
```

---

### ✅ Prompt P21 — Image Gallery Component

```
Implement the high-performance image gallery component in src/components/listing/ImageGallery.tsx using expo-image and react-native-reanimated.

**Features**:
- Horizontal paging FlatList with smooth snapping.
- Active slide indicator dots at bottom center.
- Image counter overlay: "2 / 5" in top right corner.
- Low-resolution blurhash placeholder transitions.
- Interactive full-screen modal gallery on press:
  - Dark backdrop overlay.
  - Pinch-to-zoom and double-tap zoom gestures via react-native-gesture-handler.
  - Swipe-down gesture to dismiss full-screen mode.
  - Top close button (×).

**Component Interface**:
```typescript
interface ImageGalleryProps {
  images: string[];
  height?: number;
  showCounter?: boolean;
  showDots?: boolean;
  onImagePress?: (index: number) => void;
  soldOverlay?: boolean;
}
```
```

---

### ✅ Prompt P22 — Phone Reveal & Click-to-Call

```
Implement the seller phone number reveal gate and native dialer launcher (PRD.md Section 3.2, api-spec.md Section 5.3).

**Phone Reveal Workflow**:
1. User taps "📞 Call Seller" on the listing detail page.
2. Verify that the user is an authenticated, NID-verified citizen.
3. If the listing has isPhoneHidden: true, present a confirmation modal:
   - "Reveal Seller Contact Number?"
   - "You have [revealsRemainingToday] reveals remaining today (limit: 10/day)."
   - Actions: "Reveal & Call" or "Cancel".
4. Execute POST /api/v1/listings/:id/reveal-phone.
5. On 200 OK: Extract sellerPhone and launch the native phone dialer via Linking.openURL(`tel:${sellerPhone}`).
6. Update local reveal quota counters in the store.

**Quota & Error Handling**:
- If revealsRemainingToday === 0:
  - Disable call button.
  - Display error: "Daily phone reveal limit reached (10/24h). Please contact sellers via in-app chat."
- Handle HTTP 403: "Complete NID verification to access seller contact information."
- Handle Chat-Only sellers: If the seller disabled phone visibility entirely, hide the Call button and expand the Chat button to full width.
```

---

### ✅ Prompt P23 — Public Seller Profile Screen

```
Construct the public citizen trust profile screen in src/app/(public)/user/[userId].tsx adhering to Section 3.4 of api-spec.md.

**Profile Header**:
- Large circular avatar with ✅ green verified badge overlay.
- Masked legal display name: "Farhana R. [NID Verified]".
- "Member since August 2026".
- Trust Metrics Row:
  - ⭐ 4.9 Average Star Rating
  - 🤝 14 Deals Completed
  - 📦 3 Active Listings

**Trust Badges Section**:
- Grid display of qualitative transaction badges earned:
  - 📦 "Item as Described" × 12
  - ⏰ "Punctual" × 10
  - 💬 "Friendly Communication" × 14
  - 💰 "Quick Payment" × 8

**Bilateral Reviews Section**:
- Paginated review list fetched via GET /api/v1/users/:userId/reviews.
- Each review card includes:
  - Reviewer avatar + verified badge + masked name.
  - Star rating (1-5 stars).
  - Associated listing title: "Re: Apple iPhone 13 128GB".
  - Qualitative tags earned.
  - Optional written comment.
  - Date of review.

**Active Listings Section**:
- Horizontal scroll view rendering active ListingCards posted by this citizen.
```

---

## Phase 6: In-App Chat & Real-Time Messaging

### ✅ Prompt P24 — Socket.io Client Setup

```
Configure the real-time Socket.io client in src/services/socket/ matching Section 14 of api-spec.md.

**Socket Singleton (src/services/socket/socket.client.ts)**:
- Install socket.io-client.
- Configure connection URL: wss://api.becha-kena.com (production) / ws://localhost:5000 (development).
- Authenticate the handshake by passing the JWT in the auth payload:
  ```typescript
  const socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  });
  ```
- Lifecycle Management:
  - On connect: join personal event room user:events_${userId}.
  - On disconnect: clean up listeners and attempt automated reconnection.
  - On connect_error: trigger token refresh on UNAUTHORIZED_SOCKET error.

**Typed Socket Events (src/services/socket/socket.events.ts)**:
- Client-to-Server: join_chat, leave_chat, send_message, typing_start, typing_stop.
- Server-to-Client: new_message, scam_alert, offer_updated, price_drop_alert, user_notification, typing_indicator.

**Custom Hook & Provider (src/hooks/useSocket.ts)**:
- Export useSocket() hook delivering socket state and connection status.
- Automatically connect upon user login; disconnect cleanly upon logout.
- Listen to React Native AppState to reconnect when the application returns to the foreground.
```

---

### ✅ Prompt P25 — Chat API Service Layer

```
Implement the chat API service layer in src/services/api/chat.api.ts and the chat Zustand store in src/store/chat.store.ts.

**API Endpoints**:
1. **startConversation(listingId: string): Promise<ApiResponse<Conversation>>**:
   - POST /api/v1/chats/start
   - Idempotent upsert flow: returns existing thread or initializes a new one.

2. **getConversations(): Promise<ApiResponse<Conversation[]>>**:
   - GET /api/v1/chats
   - Returns all active conversation threads sorted by latest message timestamp.

3. **getMessages(conversationId: string, params: { page?, limit? }): Promise<ApiResponse<Message[]>>**:
   - GET /api/v1/chats/:conversationId/messages
   - Fetches paginated chat history.

4. **sendMessage(conversationId: string, text: string): Promise<ApiResponse<Message>>**:
   - POST /api/v1/chats/:conversationId/messages
   - HTTP fallback endpoint applying server-side scam filters.

**Chat Zustand Store**:
- State: conversations, activeConversationId, messages (keyed by conversationId), unreadCount, typingUsers.
- Actions: fetchConversations, fetchMessages, addMessage, sendMessage, setTyping, markAsRead.
- Optimistic UI: Append sent messages immediately with a 'sending' status, updating to 'delivered' once the server socket confirms.
```

---

### ✅ Prompt P26 — Chat Inbox Screen

```
Develop the chat inbox screen in src/app/(tabs)/chat/index.tsx.

**Screen Features**:
- Header: "Messages" with an unread badge counter.
- Search input to filter conversations by counterparty name or listing title.
- FlatList of conversation cards supporting pull-to-refresh.

**Conversation Card Component**:
- Left: Counterparty avatar with ✅ green verified badge overlay.
- Center Column:
  - Counterparty display name (bold if unread).
  - Associated listing reference: "Re: Apple iPhone 13...".
  - Last message preview (truncated to 1 line; prefix with "You: " if authored by the user).
  - Scam flag icon 🚩 if the thread triggered advance-payment warnings.
- Right Column:
  - Timestamp ("2:32 PM", "Yesterday", or "Oct 23").
  - Unread message badge (blue circle with count).
  - Small listing thumbnail (40x40px).

**Real-Time Behavior**:
- Move conversation to top of list upon receiving new_message socket event.
- Synchronize bottom tab bar unread badge with global unread count.
```

---

### ✅ Prompt P27 — Individual Chat Thread Screen

```
Construct the individual conversation screen in src/app/(tabs)/chat/[conversationId].tsx.

**Header Bar**:
- Counterparty avatar, name, and verified badge.
- Listing summary card (thumbnail, title, price) with tap action navigating to listing details.

**Message Stream (Inverted FlatList)**:
- Group messages chronologically with date headers ("Today", "Yesterday").
- ChatBubble component:
  - Sent: Right-aligned, primary emerald green background, white typography.
  - Received: Left-aligned, light slate surface, dark typography.
  - Status indicators: Sending (clock), Delivered (double check).
- Inline Scam Alert: If hasScamWarning: true, display a prominent crimson alert banner directly above the message.
- Inline Offer Cards: Special interactive offer modules (see Phase 7).

**Real-Time Interactions**:
- Emit join_chat with conversationId on screen mount; emit leave_chat on unmount.
- Typing indicator: Debounced emission of typing_start and typing_stop; render animated three-dot bubble when counterparty is typing.
- Listen for new_message socket events to append messages in real time.

**Input Bar**:
- Multiline text input container (max 1000 characters).
- "Make Offer" action button (opening negotiation bottom sheet).
- Send button triggering real-time transmission.
```

---

### ✅ Prompt P28 — Scam Detection Warning Component

```
Implement the real-time chat scam shield warning component in src/components/chat/ScamWarningBanner.tsx adhering to Section 2.4 of architecture.md.

**Scam Warning Banner**:
- Container: Crimson background (#FEF2F2) with red border (#FCA5A5) and alert icon (⚠️).
- Warning Text:
  "⚠️ Warning: Never send advance money via bKash, Nagad, or courier booking fees before physically inspecting the product."
- Dismissible via '×' button, but automatically resurfaces if a subsequent message triggers scam filters.

**Client-Side Predictive Warning**:
- Perform client-side regex pre-checks as user types:
  - Keywords: 'advance', 'bkash', 'nagad', 'courier fee', 'booking fee', 'delivery charge'.
- If detected, render a soft yellow warning above the input bar:
  "Reminder: Becha-Kena transactions should be settled in person upon physical verification."

**Phishing Link Protection**:
- Notify user when external links are stripped:
  "🔗 External links and APK downloads have been disabled to protect against phishing scams."

**Safety Guidelines Sheet**:
- Add an "ℹ️ Safety Guidelines" action in the chat header opening a modal sheet with meetup best practices.
```

---

## Phase 7: Offers & Negotiation System

### ✅ Prompt P29 — Offer API Service & Components

```
Implement the binding offer and counter-offer negotiation engine (api-spec.md Section 8, PRD.md Section 3.4).

**Offer API Service (src/services/api/offer.api.ts)**:
1. **submitOffer(conversationId: string, amount: number): Promise<ApiResponse<Offer>>**:
   - POST /api/v1/chats/:conversationId/offers
   - Enforce minimum amount (≥ 50 BDT) and maximum 3 offers per buyer per listing.
2. **respondToOffer(conversationId: string, offerId: string, action: 'accept' | 'decline'): Promise<ApiResponse<OfferResponse>>**:
   - PATCH /api/v1/chats/:conversationId/offers/:offerId
3. **counterOffer(conversationId: string, offerId: string, amount: number): Promise<ApiResponse<Offer>>**:
   - POST /api/v1/chats/:conversationId/offers/:offerId/counter

**Make Offer Bottom Sheet (src/components/chat/MakeOfferSheet.tsx)**:
- Summary of listing title and asking price.
- Numeric offer input with BDT formatting.
- Validation warning if offer is < 50% of asking price: "Your offer is significantly below the asking price."
- Quota indicator: "Offer [X] of 3 for this listing".
- Submit action button.

**Offer Card Component (src/components/chat/OfferCard.tsx)**:
- Rendered inline within the chat stream.
- Headline: "💰 Formal Offer: BDT 51,000".
- Round indicator: "Round 1 of 3".
- Status Badge: Pending (amber), Accepted (emerald), Countered (blue), Declined (crimson), Expired (slate).
- 24-hour live countdown timer.
- Action Buttons (for seller when pending): "Accept", "Counter-Offer", "Decline".
```

---

### ✅ Prompt P30 — Offer Status & Negotiation Timeline

```
Create the negotiation timeline component in src/components/chat/OfferTimeline.tsx to display negotiation history.

**Negotiation Timeline Structure**:
- Visual vertical audit trail:
  ```
  ● Round 1: Buyer offered BDT 51,000 — Countered
     ↓
  ● Round 2: Seller countered BDT 52,500 — Accepted
     ↓
  ✅ Deal Closed: Final Agreed Price BDT 52,500
  ```
- Each timeline node indicates round number, participant name, amount, status chip, and timestamp.

**Active Offer Sticky Banner**:
- If a pending offer exists in the open chat thread, display a sticky header banner:
  - "Active Offer: BDT 51,000 · Expires in 22h 15m"
  - Quick action buttons (Accept/Counter/Decline for seller; Waiting state for buyer).

**Real-Time Socket Synchronization**:
- Listen to offer_updated events.
- Update offer state and timeline nodes in real time without requiring manual refresh.
```

---

### ✅ Prompt P31 — Deal Creation from Accepted Offer

```
Implement atomic deal closure upon offer acceptance (api-spec.md Section 9, PRD.md Section 3.5).

**Offer Acceptance Workflow**:
1. Seller taps "Accept" on an active offer.
2. Call PATCH /api/v1/chats/:conversationId/offers/:offerId with { action: 'accept' }.
3. Backend creates immutable Deal record and transitions listing status to 'sold'.
4. Socket broadcasts offer_updated event with dealId.

**Deal Celebration Modal**:
- Full-screen modal overlay with confetti animation.
- Headline: "Deal Closed Successfully! 🎉"
- Transaction summary: Listing title, agreed final price, and counterparty trust profile.
- Action CTAs:
  1. "⭐ Rate Experience" → Navigates to bilateral review screen.
  2. "View Deal Receipt" → Opens deal documentation.

**Direct Sale Fallback (Without Formal Offer)**:
- In the seller dashboard, provide a "Mark as Sold" action.
- Open buyer selection modal showing only verified citizens who have active chat threads on this listing.
- Input agreed final price and dispatch POST /api/v1/deals/direct-sale.
- Transition listing to sold and launch mutual review privileges.
```

---

### ✅ Prompt P32 — Offer Notification Badges

```
Implement offer notification events and badge indicators across the application.

**Notification Handling**:
- Offer Received (Seller): Push alert "💰 New offer of BDT 51,000 received for [title]".
- Offer Accepted (Buyer): Push alert "🎉 Your offer of BDT 51,000 was accepted!".
- Offer Countered: Push alert "🔄 Seller countered with BDT 52,500 for [title]".
- Offer Expired: Push alert "⌛ Offer expired for [title]".

**Badge Synchronization**:
- Update notification store unread counters.
- Increment chat tab badge when pending offers require seller action.
```

---

## Phase 8: Listing Creation & Seller Dashboard

### ✅ Prompt P33 — Create Listing Form (Multi-Step)

```
Construct the multi-step listing wizard in src/app/(tabs)/sell/create.tsx (PRD.md Section 3.3, api-spec.md Section 5.4).

**Access Gate**: Restricted to verified citizens (isNidVerified === true). Unverified users are routed to KYC.

**Step 1 — Photo Management**:
- Grid uploader supporting 1 to 8 images.
- First slot: Primary camera / gallery picker button.
- Preview thumbnails with remove (×) and drag-to-reorder capabilities.
- Enforce client-side WebP compression (max 1280x1280px, ~200KB).
- Direct-to-S3 presigned URL upload pipeline with individual progress bars.
- Validation: At least 1 image required; maximum 8 images.

**Step 2 — Item Specifications**:
- Title input (10 to 100 characters with character counter).
- Description input (20 to 2000 characters).
- Category selector: Electronics, Vehicles, Property, Fashion, Home, Hobbies.
- Physical Condition selector: Brand New, Like New, Gently Used, Heavily Used.
- Asking Price input (numeric with comma formatting; 50 BDT to 2,500,000 BDT).

**Step 3 — Location & Privacy Settings**:
- Cascading Location Picker: Division dropdown → Thana dropdown.
- "Use Current Location" button populating coordinates via GPS.
- Privacy toggle: "Hide my phone number" (default: ON).
  - Explanatory note: "When enabled, buyers can only contact you via in-app chat."

**Step 4 — Final Preview & Publication**:
- Realistic ListingCard preview.
- Monthly quota tracker: "You have [X] of 5 active listing slots remaining this month."
- "Publish Listing" primary action button calling POST /api/v1/listings.
- On Success: Celebratory screen and navigation to Seller Dashboard.
- Error Handling: Handle 403 C2C_QUOTA_EXHAUSTED and 422 IMAGE_MODERATION_FAILED.
```

---

### ✅ Prompt P34 — Image Upload & S3 Presigned Flow

```
Implement direct-to-S3 image uploads in src/services/api/upload.api.ts and src/hooks/useImageUpload.ts (api-spec.md Section 12).

**Upload Service (src/services/api/upload.api.ts)**:
1. **getPresignedUrl(params)**: POST /api/v1/uploads/presigned-url with context ('listing_image', 'avatar', 'gd_document'). Returns uploadUrl and objectKey.
2. **uploadToS3(uploadUrl, fileBlob, mimeType)**: Direct HTTP PUT to AWS S3 storage with progress monitoring.
3. **confirmUpload(objectKey, context)**: POST /api/v1/uploads/confirm validating upload completion.

**useImageUpload Hook**:
- Provide pickImage, takePhoto, and uploadImage methods.
- Compress images to WebP format client-side before network transmission.
- Support parallel uploads with individual progress tracking.
- Automatic retry on transient network drops (up to 3 attempts with exponential backoff).
```

---

### ✅ Prompt P35 — Seller Dashboard Screen

```
Build the seller dashboard screen in src/app/(tabs)/sell/index.tsx for inventory and deal management.

**Dashboard Header**:
- Title: "Seller Dashboard".
- Active Quota Badge: "3 of 5 monthly listings active".
- "➕ Post New Ad" action button.

**Tab Filter Bar**:
- Tabs: All | Active (2) | Reserved (1) | Sold (14) | Expired (0).
- Filter listing stream based on operational status.

**Seller Listing Card**:
- Thumbnail, title, and asking price.
- Status badge (Active, Under Offer, Sold, Expired).
- Metrics row: "👁 78 views · 💬 4 inquiries".
- Validity counter: "Expires in 15 days".
- Renewal button (visible Day 25+): "🔄 Renew (1 of 2 used)".

**Card Action Menu**:
- ✏️ Edit Listing: Navigates to edit form.
- 🏷️ Mark as Sold: Opens buyer selection sheet.
- ⏸️ Reserve / Unreserve: Toggles under_offer status.
- 🗑️ Delete Listing: Prompts confirmation dialog before soft-deleting.
```

---

### ✅ Prompt P36 — Edit Listing Form

```
Construct the listing modification screen in src/app/(tabs)/sell/edit/[id].tsx.

**Functionality**:
- Fetch current specifications via GET /api/v1/listings/:id and pre-fill form fields.
- Permit modifications to photos, title, description, price, condition, location, and phone visibility.
- Price Drop Alert Notice: If asking price is lowered, display notice:
  "Lowering your price will notify all users who favorited this listing after a 5-minute debounce window."
- Enforce constraints: Sold or archived listings cannot be edited.
- Save changes via PUT /api/v1/listings/:id.
- Handle 409 Conflict if listing state changed concurrently.
```

---

### ✅ Prompt P37 — Listing Status Management

```
Implement listing lifecycle state transitions and renewal mechanisms.

**State Machine**:
- Active → Under Offer: Seller marks item reserved during inspection.
- Under Offer → Active: Seller reopens item if inspection falls through.
- Active / Under Offer → Sold: Deal closure executed.
- Active → Expired: Automated transition after 30 days.
- Expired → Active: Renewal applied (maximum 2 renewals per listing).

**Renewal Action (src/services/api/listing.api.ts)**:
- Call POST /api/v1/listings/:id/renew.
- Validate that the listing is on or after Day 25 of its lifecycle.
- Update expiry timestamp to +30 days and increment renewCount.
- Enforce max 2 renewals error state (MAX_RENEWALS_REACHED).
```

---

## Phase 9: Deals, Reviews & Reputation

### ✅ Prompt P38 — Deal API Service

```
Build the deal and review API service layer in src/services/api/deal.api.ts matching Section 9 of api-spec.md.

**Implement Functions**:
1. **createDirectSale(payload: DirectSaleRequest): Promise<ApiResponse<Deal>>**:
   - POST /api/v1/deals/direct-sale
   - Closes deal by selecting a buyer from active chats.

2. **getDealById(dealId: string): Promise<ApiResponse<DealDetail>>**:
   - GET /api/v1/deals/:dealId
   - Retrieves immutable transaction receipt.

3. **submitReview(payload: CreateReviewRequest): Promise<ApiResponse<Review>>**:
   - POST /api/v1/reviews
   - Validates that user is an authorized deal participant who has not yet reviewed.

4. **getUserReviews(userId: string, params: { page?, limit? }): Promise<ApiResponse<Review[]>>**:
   - GET /api/v1/users/:userId/reviews
   - Retrieves paginated public reviews for a citizen.
```

---

### ✅ Prompt P39 — Review & Rating Screen

```
Construct the bilateral rating and review submission screen in src/app/(tabs)/profile/review/[dealId].tsx.

**Screen Layout**:
- Deal Summary Header: Product thumbnail, title, final price, and counterparty avatar with verified badge.
- Interactive Star Rating: 5 stars supporting tap and drag gestures with descriptive labels:
  (1: Poor, 2: Fair, 3: Good, 4: Very Good, 5: Excellent).
- Qualitative Trust Badge Chips (multi-select):
  - ⏰ "Punctual"
  - 📦 "Item as Described"
  - 💬 "Friendly Communication"
  - 💰 "Quick Payment" (available to sellers only)
- Written Comment: Optional text input (max 300 characters).
- "Submit Review" action button calling POST /api/v1/reviews.
- Handle 409 Conflict if review was already submitted.
```

---

### ✅ Prompt P40 — My Deals Screen

```
Develop the transaction history screen in src/app/(tabs)/profile/deals.tsx.

**Screen Structure**:
- Header: "My Deals" with segmented tab control: "As Buyer" | "As Seller".
- FlatList of DealCards.

**DealCard Component**:
- Listing thumbnail, title, and final transaction price.
- Counterparty avatar, name, and verified badge.
- Role indicator: "You Bought" or "You Sold".
- Completion date: "Completed Oct 23, 2026".
- Review Status Indicator:
  - Both reviewed: "✅ Both parties reviewed".
  - Pending your review: "⭐ Leave a Review" action CTA.
  - Awaiting counterparty: "⏳ Awaiting [Name]'s review".
- Legal Dispute Indicator: "⚠️ Dispute Filed" (if applicable).
```

---

### ✅ Prompt P41 — Reputation Score Display

```
Build modular reputation components to display citizen trust metrics across the app.

**TrustScore Widget (src/components/common/TrustScore.tsx)**:
- Circular rating ring displaying numerical score (e.g., 4.9).
- Star visualization.
- Verified deal counter: "14 verified deals".

**TrustBadgeGrid (src/components/common/TrustBadgeGrid.tsx)**:
- Grid of qualitative trust badges with counters:
  - 📦 "Item as Described" × 12
  - ⏰ "Punctual" × 10
  - 💬 "Friendly Communication" × 14
  - 💰 "Quick Payment" × 8

**Rating Distribution Breakdown**:
- Horizontal bar chart showing 1 to 5 star rating distribution.
```

---

## Phase 10: Favorites, Notifications & Safety

### ✅ Prompt P42 — Favorites / Wishlist Feature

```
Implement the favorites and wishlist feature (api-spec.md Section 6, PRD.md Section 3.8).

**API Service (src/services/api/favorite.api.ts)**:
1. addFavorite(listingId: string): POST /api/v1/listings/:id/favorite
2. removeFavorite(listingId: string): DELETE /api/v1/listings/:id/favorite
3. getMyFavorites(): GET /api/v1/users/me/favorites

**FavoriteButton Component (src/components/listing/FavoriteButton.tsx)**:
- Animated heart icon toggle (outline ♡ to filled red ❤️).
- Haptic feedback and optimistic UI update.

**Favorites Screen (src/app/(tabs)/profile/favorites.tsx)**:
- List of bookmarked listings showing:
  - Thumbnail, title, current asking price.
  - Price Drop Indicator: If currentPrice < priceAtSave, display "⬇ BDT 1,500 Price Drop" in green.
  - Availability State: Grey out and badge items marked 'Sold' or 'Expired'.
  - Swipe-to-remove action.
```

---

### ✅ Prompt P43 — Push Notifications (FCM) Setup

```
Configure Firebase Cloud Messaging (FCM) push notifications using expo-notifications.

**Notification Service (src/services/notifications.ts)**:
1. **registerForPushNotifications()**:
   - Request system notification permissions.
   - Retrieve Expo / FCM device push token.
   - Register token with backend: POST /api/v1/users/me/notification-preferences.

2. **Notification Response Routing**:
   - Route incoming notifications to corresponding screens:
     - NEW_CHAT_MESSAGE → chat/[conversationId]
     - OFFER_RECEIVED → chat/[conversationId]
     - OFFER_ACCEPTED → profile/deals
     - KYC_APPROVED → home
     - PRICE_DROP → listing/[id]
     - DISPUTE_UPDATE → profile/deals

3. **Badge Synchronization**:
   - Update native application icon badge count to reflect combined unread messages and pending offers.
```

---

### ✅ Prompt P44 — Notification Preferences Screen

```
Build the notification preferences configuration screen in src/app/(tabs)/profile/notification-settings.tsx.

**Settings Sections**:
1. **Channels**:
   - Push Notifications (Toggle).
   - SMS Alerts (Toggle).
2. **Notification Triggers**:
   - Chat message alerts.
   - Price drop alerts on favorited items.
   - Offer status updates.
   - Listing expiration reminders.
3. **Quiet Hours**:
   - Enable Quiet Hours toggle.
   - Start Time (default: 23:00) and End Time (default: 07:00) time pickers.
4. **Mandatory Security Notices (Locked ON)**:
   - New device login alerts, KYC approvals, and dispute notices cannot be disabled.

Persist updates to backend via PATCH /api/v1/users/me/notification-preferences.
```

---

### ✅ Prompt P45 — Report & Safety System

```
Implement community safety reporting and dispute filing (PRD.md Section 3.7, api-spec.md Section 10 & 11).

**Report Sheet (src/components/common/ReportSheet.tsx)**:
- Accessible via listing details, chat threads, and seller profiles.
- Categorized reason selection:
  - 🚨 Advance payment demanded (scam_advance_demanded)
  - 🔒 Suspected stolen item (stolen_goods_suspected)
  - ⚠️ Harassment or abuse (harassment)
  - 🏷️ Counterfeit goods (counterfeit)
  - 📢 Spam or misleading listing (spam)
- Detailed narrative textarea (max 500 characters).
- Call POST /api/v1/reports.

**Stolen Item Police Dispute (src/components/deal/DisputeSheet.tsx)**:
- Accessible on completed deal receipts.
- Form inputs: General Diary (GD) Number, Thana Name, GD Filing Date, Stamped GD Document photo upload.
- Execute POST /api/v1/deals/:dealId/disputes.
- Display notice: "Seller account privileges will be frozen pending legal investigation."
```

---

### ✅ Prompt P46 — Dispute Status Tracking

```
Implement dispute status tracking on transaction receipts (api-spec.md Section 11).

**Dispute Lifecycle View**:
- Timeline display:
  - Filed (Pending Moderator Review).
  - Verified (Police GD Confirmed).
  - Escalated to Cybercrime Investigation Unit.
  - Resolved / Dismissed.

**Seller Account Freeze State**:
- If user.isFrozen === true, render persistent warning banner:
  "⚠️ Your account privileges are temporarily restricted due to an active dispute."
- Disable listing creation and editing actions while keeping chat accessible for dispute resolution.
```

---

## Phase 11: Profile, Settings & Account Management

### ✅ Prompt P47 — My Profile Screen

```
Construct the citizen profile and account management screen in src/app/(tabs)/profile/index.tsx.

**Profile Header**:
- Large circular avatar with ✅ green verified badge overlay.
- Display name: "Farhana Rahman [NID Verified]".
- Registered phone: "+880 171 234 5678".
- Avatar upload action with direct-to-S3 upload.

**Quick Stats Overview**:
- ⭐ 4.9 Rating | 🤝 14 Deals | 📋 3 Active Listings

**Navigation Menu**:
- 👤 Edit Profile
- 🔔 Notification Preferences
- ❤️ My Favorites
- 🤝 My Deals
- 📋 My Submitted Reports
- 📱 Linked Devices (Hardware security)
- 🔒 Identity Verification Status
- 🌙 Dark Mode toggle
- 🚪 Logout action (with confirmation dialog)
```

---

### ✅ Prompt P48 — Edit Profile Screen

```
Build the profile editing screen in src/app/(tabs)/profile/edit.tsx.

**Editable Properties**:
- Avatar: Camera or gallery picker with S3 upload.
- Display Name: Text input (3 to 50 characters).
- Submit updates via PATCH /api/v1/users/me/profile.

**Read-Only Security Properties**:
- Registered phone number (with customer support change prompt).
- NID verification status and national identity hash.
- Member registration date.
```

---

### ✅ Prompt P49 — Device Management & Security

```
Implement hardware device management in src/app/(tabs)/profile/devices.tsx (PRD.md Section 3.1).

**Device List**:
- Fetch registered devices from user profile (max 2 active devices allowed).
- Display device model name, hardware UUID (masked), and active status badge ("Current Device").
- "Remove Device" action to remotely revoke session tokens for secondary devices.

**New Device Verification Challenge**:
- If login occurs on an unrecognized device when quota is full, enforce biometric selfie challenge via POST /api/v1/kyc/verify-new-device before granting access tokens.
```

---

## Phase 12: Polish, Performance & Production Release

### ✅ Prompt P50 — Error Handling & Offline Support

```
Implement global error boundaries, centralized network handlers, and offline synchronization.

**Global Error Boundary (src/components/common/ErrorBoundary.tsx)**:
- Wrap root application layout.
- Render clean error recovery screen with a "Try Again" reload action.

**Network Connectivity Monitoring (src/hooks/useNetworkStatus.ts)**:
- Track connection state via @react-native-community/netinfo.
- Display a top banner when offline: "📡 No Internet Connection — Changes will sync when reconnected."

**Offline Queue**:
- Cache outgoing chat messages and wishlist toggles locally in AsyncStorage when offline.
- Drain and synchronize the queue automatically upon network restoration.
```

---

### ✅ Prompt P51 — Loading States & Skeletons

```
Implement consistent loading skeletons across all list and detail screens.

**Pre-built Skeletons (src/components/common/Skeleton.tsx)**:
- ListingCardSkeleton: Matches marketplace card dimensions.
- ConversationCardSkeleton: Matches chat inbox items.
- ProfileHeaderSkeleton: Matches profile trust metrics.

Ensure every list screen provides pull-to-refresh (RefreshControl) and infinite-scroll pagination indicators.
```

---

### ✅ Prompt P52 — Performance Optimization

```
Optimize mobile app runtime performance and asset delivery.

**Image Optimization**:
- Leverage expo-image with disk and memory caching policies.
- Serve WebP formats with blurhash placeholders.

**List Performance**:
- Optimize FlatList configuration: windowSize: 5, maxToRenderPerBatch: 10, removeClippedSubviews: true.
- Use React.memo for high-frequency components (ListingCard, ChatBubble).

**Bundle & Startup Optimization**:
- Minimize initial bundle size through tree-shaking.
- Ensure React Compiler is active (experiments.reactCompiler: true in app.json).
```

---

### ✅ Prompt P53 — App Configuration & Branding

```
Finalize production app configuration in app.json.

**Configuration Settings**:
- Bundle identifier: com.bechakena.app
- Deep link scheme: bechakena://
- Configure permission descriptions:
  - NSCameraUsageDescription: "Becha-Kena requires camera access for NID identity verification and listing photos."
  - NSPhotoLibraryUsageDescription: "Becha-Kena requires photo library access to upload listing imagery."
  - NSLocationWhenInUseUsageDescription: "Becha-Kena uses your location to discover nearby marketplace listings."
- Set adaptive icons, notification emblems, and native splash screens.
```

---

### ✅ Prompt P54 — Testing & Quality Assurance

```
Set up the automated testing suite using Jest and React Native Testing Library.

**Test Coverage Requirements**:
1. **Validation Utilities**: Phone regex, NID formatting, BDT price boundaries.
2. **Formatters**: Currency representation, relative time formatting, distance calculations.
3. **API Client**: Bearer token injection, automatic token rotation on 401, error parsing.
4. **Auth Store**: Login state transitions, logout credential purging.
5. **Core Components**: Button states, ListingCard navigation, ChatBubble rendering, OfferCard actions.
```

---

### ✅ Prompt P55 — Build, Deploy & Production Checklist

```
Configure Expo Application Services (EAS) for production deployment.

**EAS Configuration (eas.json)**:
- Setup development, preview, and production build profiles.
- Configure Google Play Store service account keys and Apple Developer credentials.

**Production Launch Verification**:
- [ ] Backend API endpoints pointing to production URL (https://api.becha-kena.com/api/v1).
- [ ] Socket.io server connection verified (wss://api.becha-kena.com).
- [ ] Push notifications configured with production FCM keys.
- [ ] S3 direct upload bucket policies verified for public listings and private KYC vaults.
- [ ] ProGuard / R8 minification enabled for Android builds.
- [ ] App size verified under 50MB.
- [ ] Deep linking routes tested across iOS and Android devices.
```

---

## 📌 How to Use These Prompts

> [!IMPORTANT]
> **Execute these prompts sequentially.** Complete and verify Phase 1 before advancing to Phase 2. Verify and test the generated code after each prompt.

### Recommended Workflow:
1. **Copy** the desired prompt.
2. **Provide** it to your AI coding assistant (Antigravity, Claude, etc.).
3. **Review and test** the resulting implementation.
4. **Resolve** any discrepancies or runtime issues.
5. **Proceed** to the subsequent prompt in the sequence.

---

> **Total Prompts: 55** | **Estimated Development Timeline: 3–5 weeks (solo developer)**
