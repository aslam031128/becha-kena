# Master AI Implementation Prompt: Becha-Kena Frontend

> **Purpose:** This is a complete, step-by-step AI coding prompt to build the entire **Becha-Kena** frontend from scratch using Next.js 15 (App Router). Feed each phase sequentially to an AI agent or use the full document as a system-level reference prompt. Every instruction below is derived from the canonical backend API, PRD, and architecture specifications.
>
> **Backend API Base URL:** `http://localhost:5000/api/v1`
> **WebSocket URL:** `ws://localhost:5000/socket.io/`
>
> **Source Documents:**
> - [`prompt.md`](file:///e:/becha-kena/docs/prompt.md) — Backend implementation prompt (fully built)
> - [`api-spec.md`](file:///e:/becha-kena/docs/api-spec.md) — Complete REST & WebSocket API contracts
> - [`PRD.md`](file:///e:/becha-kena/docs/PRD.md) — Business requirements, user stories, validation rules
> - [`architecture.md`](file:///e:/becha-kena/docs/architecture.md) — System design, frontend architecture, rendering strategy
> - [`ui-reference.jpg`](file:///e:/becha-kena/docs/ui-reference.jpg) — Visual design reference (DealKart-style marketplace UI)

---

## System Role & Engineering Constraints

You are a **Senior Frontend Engineer** building the production frontend for **Becha-Kena**, Bangladesh's first NID-verified C2C resale marketplace. The backend is already fully built and running at `http://localhost:5000`. You must follow these non-negotiable constraints:

1. **Next.js App Router:** Use Next.js 15 with the App Router (`app/` directory), React 19, and TypeScript strict mode. No Pages Router.
2. **Hybrid Rendering Strategy:**
   - **Public pages** (homepage, search, listing detail): **SSR + ISR** for SEO indexing and sub-300ms FCP on Bangladesh 4G networks.
   - **Dashboard & Chat pages**: **CSR** with optimistic UI updates and WebSocket real-time streaming.
3. **Strict TypeScript:** `"strict": true` in `tsconfig.json`. No `any` type anywhere. All API response types fully typed.
4. **Mobile-First Responsive:** Design for 360px minimum width (Bangladesh smartphone market). Progressive enhancement to tablet (768px) and desktop (1280px+).
5. **Bilingual UI:** All user-facing text must support **Bengali (Bangla)** as the primary language and **English** as secondary. Use a centralized i18n dictionary pattern.
6. **Direct-to-Cloud Uploads:** The frontend uploads media files (images/videos) directly to AWS S3 using presigned PUT URLs obtained from the backend. The frontend NEVER sends binary file data to the backend server.
7. **All English Code:** Every code comment, variable name, function name, component name, and commit message must be in 100% standard English.
8. **Atomic Design Components:** Follow Atomic Design methodology — Atoms → Molecules → Organisms → Templates → Pages.
9. **Accessibility (WCAG 2.1 AA):** All interactive elements must have proper ARIA labels, keyboard navigation, and sufficient color contrast ratios.

---

## Technology Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 15.x |
| Language | TypeScript | 5.x |
| UI Library | React | 19.x |
| Styling | Tailwind CSS + shadcn/ui | 4.x / Latest |
| State Management | Zustand | 5.x |
| Server State / Data Fetching | TanStack React Query | 5.x |
| Form Handling | React Hook Form + Zod | Latest / 3.x |
| Real-Time | Socket.io Client | 4.x |
| HTTP Client | Axios (with interceptors) | Latest |
| Icons | Lucide React | Latest |
| Maps | Leaflet + React-Leaflet | Latest |
| Image Optimization | Next.js `<Image />` + sharp | Built-in |
| Animation | Framer Motion | Latest |
| Date Handling | date-fns | Latest |
| Testing | Vitest + React Testing Library + Playwright | Latest |
| Linting | ESLint + Prettier | Latest |

---

## Design System & Visual Language

### Color Palette (Inspired by UI Reference — DealKart-style modern marketplace)

```
Primary Brand:
  --brand-green:       #22C55E   (NID Verified badges, CTAs, trust indicators)
  --brand-green-dark:  #16A34A   (Hover states)
  --brand-green-light: #DCFCE7   (Success backgrounds)

Accent:
  --accent-purple:     #7C3AED   (Premium features, member sections, hero gradients)
  --accent-purple-dark:#6D28D9   (Hover states)
  --accent-yellow:     #FACC15   (Star ratings, deal alerts, discount badges)

Neutral:
  --bg-primary:        #FFFFFF   (Card backgrounds)
  --bg-secondary:      #F8FAFC   (Page background, section alternation)
  --bg-dark:           #0F172A   (Dark sections — hero, footer, daily deals)
  --text-primary:      #0F172A   (Headings)
  --text-secondary:    #475569   (Body text)
  --text-muted:        #94A3B8   (Placeholders, disabled)
  --border:            #E2E8F0   (Card borders, dividers)

Semantic:
  --danger:            #EF4444   (Scam warnings, errors, delete actions)
  --danger-bg:         #FEF2F2   (Warning banner backgrounds)
  --warning:           #F59E0B   (Caution states)
  --info:              #3B82F6   (Informational badges)
```

### Typography

```
Font Family:
  --font-primary:  'Inter', system-ui, sans-serif      (English text)
  --font-bengali:  'Noto Sans Bengali', 'Hind Siliguri', sans-serif  (Bengali text)

Scale (Mobile → Desktop):
  --text-xs:    0.75rem / 1rem      (Badges, captions)
  --text-sm:    0.875rem / 1.25rem  (Secondary labels)
  --text-base:  1rem / 1.5rem       (Body text)
  --text-lg:    1.125rem / 1.75rem  (Subheadings)
  --text-xl:    1.25rem / 1.75rem   (Section titles)
  --text-2xl:   1.5rem / 2rem       (Page headings)
  --text-3xl:   1.875rem / 2.25rem  (Hero headings)
  --text-4xl:   2.25rem / 2.5rem    (Landing hero — desktop only)
```

### Responsive Breakpoints

```
sm:   640px    (Large phones — landscape)
md:   768px    (Tablets)
lg:   1024px   (Small laptops)
xl:   1280px   (Desktops)
2xl:  1536px   (Wide monitors)
```

### Component Spacing System (Tailwind-based)

```
Micro:    4px  (gap-1, p-1)     — Badge padding, icon gaps
Small:    8px  (gap-2, p-2)     — Compact card padding
Medium:   16px (gap-4, p-4)     — Standard card padding, form gaps
Large:    24px (gap-6, p-6)     — Section padding
XLarge:   32px (gap-8, p-8)     — Page section margins
XXLarge:  48px (gap-12, p-12)   — Hero section padding
```

---

## Project Directory Structure

```
frontend/
├── app/
│   ├── layout.tsx                    # Root layout (fonts, providers, metadata)
│   ├── loading.tsx                   # Global loading skeleton
│   ├── not-found.tsx                 # Custom 404 page
│   ├── error.tsx                     # Global error boundary
│   ├── globals.css                   # Tailwind base + custom CSS variables
│   │
│   ├── (public)/                     # Open discovery route group (SEO — SSR/ISR)
│   │   ├── layout.tsx                # Public layout (Navbar + Footer)
│   │   ├── page.tsx                  # Homepage — hero, categories, featured listings (ISR 60s)
│   │   ├── search/
│   │   │   └── page.tsx              # Search & filter catalog (SSR with query params)
│   │   ├── listing/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Listing detail page (SSR + dynamic OG tags)
│   │   ├── user/
│   │   │   └── [id]/
│   │   │       └── page.tsx          # Public user profile & reviews (SSR)
│   │   └── categories/
│   │       └── [slug]/
│   │           └── page.tsx          # Category-filtered listings (ISR 300s)
│   │
│   ├── (auth)/                       # Auth & onboarding route group
│   │   ├── layout.tsx                # Minimal auth layout (centered card)
│   │   ├── login/
│   │   │   └── page.tsx              # Phone OTP input & verification (CSR)
│   │   └── kyc/
│   │       └── page.tsx              # NID capture + selfie liveness modal (CSR)
│   │
│   ├── (dashboard)/                  # Authenticated protected route group
│   │   ├── layout.tsx                # Dashboard layout (sidebar + topbar)
│   │   ├── page.tsx                  # Dashboard home (redirect to /dashboard/listings)
│   │   ├── listings/
│   │   │   ├── page.tsx              # My Listings management (tabs: Active/Under Offer/Sold/Expired)
│   │   │   ├── new/
│   │   │   │   └── page.tsx          # Create new listing (multi-step form)
│   │   │   └── [id]/
│   │   │       └── edit/
│   │   │           └── page.tsx      # Edit existing listing
│   │   ├── chat/
│   │   │   ├── page.tsx              # Conversation inbox list
│   │   │   └── [conversationId]/
│   │   │       └── page.tsx          # Real-time chat thread with offer negotiation
│   │   ├── favorites/
│   │   │   └── page.tsx              # Saved listings with price drop indicators
│   │   ├── deals/
│   │   │   ├── page.tsx              # Deal history list
│   │   │   └── [dealId]/
│   │   │       └── page.tsx          # Deal receipt + review form + dispute filing
│   │   ├── profile/
│   │   │   └── page.tsx              # Edit profile, notification preferences, devices
│   │   └── notifications/
│   │       └── page.tsx              # Notification center (all alerts)
│   │
│   └── (admin)/                      # Admin moderation route group
│       ├── layout.tsx                # Admin layout (sidebar with moderation nav)
│       ├── kyc-queue/
│       │   └── page.tsx              # Manual KYC review queue with SLA timer
│       ├── reports/
│       │   └── page.tsx              # Community reports triage
│       ├── disputes/
│       │   └── page.tsx              # Legal dispute resolution panel
│       ├── users/
│       │   └── [userId]/
│       │       └── page.tsx          # User moderation profile (ban proposal/confirm)
│       └── audits/
│           └── page.tsx              # Phone reveal anomaly detection dashboard
│
├── components/
│   ├── ui/                           # Atomic design — Atoms (shadcn/ui based)
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── modal.tsx
│   │   ├── skeleton.tsx
│   │   ├── toast.tsx
│   │   ├── dropdown-menu.tsx
│   │   ├── tabs.tsx
│   │   ├── avatar.tsx
│   │   ├── separator.tsx
│   │   ├── tooltip.tsx
│   │   ├── progress.tsx
│   │   ├── star-rating.tsx           # 1-5 interactive star rating input
│   │   ├── price-tag.tsx             # BDT formatted price display (৳)
│   │   ├── countdown-timer.tsx       # Offer expiration & deal countdown
│   │   └── verified-badge.tsx        # Green NID Verified shield badge
│   │
│   ├── layout/                       # Structural layout components
│   │   ├── navbar.tsx                # Top navigation bar (search, auth, notifications)
│   │   ├── mobile-nav.tsx            # Bottom tab navigation (mobile only)
│   │   ├── footer.tsx                # Site footer with trust badges
│   │   ├── sidebar.tsx               # Dashboard sidebar navigation
│   │   └── search-bar.tsx            # Global search with bilingual autocomplete
│   │
│   ├── listing/                      # Listing-related molecules & organisms
│   │   ├── listing-card.tsx          # Product card (image, price, condition badge, seller)
│   │   ├── listing-grid.tsx          # Responsive product grid (2-col mobile, 4-col desktop)
│   │   ├── listing-carousel.tsx      # Horizontal scroll carousel (featured/daily deals)
│   │   ├── listing-gallery.tsx       # Full-screen image gallery with swipe (detail page)
│   │   ├── listing-form.tsx          # Multi-step listing creation/edit form
│   │   ├── category-bar.tsx          # Horizontal scrollable category chips
│   │   ├── condition-badge.tsx       # Color-coded condition indicator
│   │   ├── filter-sidebar.tsx        # Search filter panel (category, price, location, condition)
│   │   ├── filter-mobile-sheet.tsx   # Bottom sheet filter for mobile
│   │   ├── phone-reveal-button.tsx   # "Show Phone Number" gated button with rate limit display
│   │   ├── seller-trust-card.tsx     # Seller info card (rating, deals, verified badge)
│   │   └── listing-status-badge.tsx  # Active/Under Offer/Sold/Expired status pill
│   │
│   ├── chat/                         # Chat & negotiation components
│   │   ├── chat-inbox-item.tsx       # Conversation list item with preview
│   │   ├── chat-window.tsx           # Full chat interface with message bubbles
│   │   ├── message-bubble.tsx        # Individual message (text, image, system, offer_event)
│   │   ├── scam-warning-banner.tsx   # Red advance payment fraud warning
│   │   ├── offer-card.tsx            # Binding offer display (amount, status, expiry timer)
│   │   ├── offer-form.tsx            # Make/counter offer input
│   │   ├── typing-indicator.tsx      # "User is typing..." animation
│   │   └── chat-empty-state.tsx      # Empty inbox illustration
│   │
│   ├── kyc/                          # KYC verification components
│   │   ├── otp-input.tsx             # 6-digit OTP code input with auto-focus
│   │   ├── phone-input.tsx           # BD phone number input with +880 prefix
│   │   ├── nid-capture.tsx           # Camera capture for NID front & back
│   │   ├── selfie-liveness.tsx       # Liveness detection (blink/head turn) camera
│   │   ├── kyc-status-card.tsx       # Current verification status display
│   │   └── kyc-progress-steps.tsx    # Step indicator (Phone → NID → Selfie → Done)
│   │
│   ├── deal/                         # Deal & review components
│   │   ├── deal-receipt-card.tsx     # Immutable deal receipt display
│   │   ├── review-form.tsx           # Star rating + trust badges + comment form
│   │   ├── review-card.tsx           # Individual review display
│   │   ├── review-summary.tsx        # Average rating + badge count aggregation
│   │   └── dispute-form.tsx          # Police GD filing form
│   │
│   ├── report/                       # Safety reporting components
│   │   ├── report-modal.tsx          # Report entity modal (reason select + details)
│   │   └── report-history.tsx        # User's submitted reports list
│   │
│   ├── notification/                 # Notification components
│   │   ├── notification-bell.tsx     # Header bell icon with unread count badge
│   │   ├── notification-dropdown.tsx # Dropdown notification list
│   │   └── notification-item.tsx     # Individual notification row
│   │
│   ├── home/                         # Homepage-specific sections
│   │   ├── hero-banner.tsx           # Main hero with search CTA
│   │   ├── category-grid.tsx         # "Shop by Category" circular icons grid
│   │   ├── daily-deals-section.tsx   # Flash deals with countdown timer
│   │   ├── popular-listings.tsx      # Popular/trending products carousel
│   │   ├── trust-banner.tsx          # "NID Verified Marketplace" trust indicators
│   │   └── newsletter-signup.tsx     # Email/phone subscription form
│   │
│   └── shared/                       # Cross-cutting shared components
│       ├── empty-state.tsx           # Generic empty state with illustration
│       ├── error-fallback.tsx        # Error boundary fallback UI
│       ├── infinite-scroll.tsx       # Intersection observer infinite loading
│       ├── image-upload.tsx          # Direct-to-S3 image uploader with preview
│       ├── video-upload.tsx          # Direct-to-S3 video uploader
│       ├── location-picker.tsx       # Division → District → Thana cascading select
│       ├── map-view.tsx              # Leaflet map with listing pin markers
│       ├── protected-route.tsx       # Auth guard HOC / wrapper
│       ├── verified-route.tsx        # KYC verified guard wrapper
│       ├── language-toggle.tsx       # Bengali ↔ English switcher
│       └── seo-head.tsx              # Dynamic meta tags, OG images, JSON-LD
│
├── lib/
│   ├── api/
│   │   ├── client.ts                 # Axios instance with interceptors (auth, refresh, error)
│   │   ├── auth.api.ts               # Auth endpoints (request-otp, verify-otp, refresh, logout)
│   │   ├── user.api.ts               # User profile endpoints
│   │   ├── kyc.api.ts                # KYC verification endpoints
│   │   ├── listing.api.ts            # Listing CRUD + search endpoints
│   │   ├── chat.api.ts               # Chat REST endpoints
│   │   ├── offer.api.ts              # Offer negotiation endpoints
│   │   ├── deal.api.ts               # Deal closure & receipt endpoints
│   │   ├── review.api.ts             # Review submission & retrieval endpoints
│   │   ├── favorite.api.ts           # Favorites wishlist endpoints
│   │   ├── report.api.ts             # Community report endpoints
│   │   ├── dispute.api.ts            # Legal dispute endpoints
│   │   ├── upload.api.ts             # Presigned URL & confirmation endpoints
│   │   └── admin.api.ts              # Admin moderation endpoints
│   │
│   ├── socket/
│   │   ├── client.ts                 # Socket.io client singleton with auto-reconnect
│   │   ├── events.ts                 # Type-safe event name constants
│   │   └── hooks.ts                  # useSocket, useChatRoom, useNotifications hooks
│   │
│   ├── store/
│   │   ├── auth.store.ts             # Auth state (user, tokens, isAuthenticated)
│   │   ├── chat.store.ts             # Active conversations, unread counts
│   │   ├── notification.store.ts     # Notification queue, unread badge count
│   │   ├── listing.store.ts          # Listing form draft state
│   │   └── ui.store.ts               # UI state (modals, sidebar, theme)
│   │
│   ├── hooks/
│   │   ├── use-auth.ts               # Auth convenience hook (login, logout, user)
│   │   ├── use-debounce.ts           # Debounced value hook
│   │   ├── use-infinite-scroll.ts    # Intersection observer pagination
│   │   ├── use-geolocation.ts        # Browser geolocation API wrapper
│   │   ├── use-media-upload.ts       # Direct-to-S3 upload orchestration hook
│   │   ├── use-countdown.ts          # Countdown timer hook (offer expiry)
│   │   └── use-responsive.ts         # Breakpoint detection hook
│   │
│   ├── utils/
│   │   ├── format.ts                 # Price formatting (৳), date formatting, phone masking
│   │   ├── validation.ts             # Zod schemas (phone, listing form, offer, review)
│   │   ├── constants.ts              # Enums, categories, conditions, divisions mapping
│   │   ├── cn.ts                     # Tailwind className merge utility (clsx + twMerge)
│   │   └── seo.ts                    # generateMetadata helpers, JSON-LD schema builders
│   │
│   ├── i18n/
│   │   ├── index.ts                  # i18n provider & useTranslation hook
│   │   ├── bn.ts                     # Bengali translations dictionary
│   │   └── en.ts                     # English translations dictionary
│   │
│   └── types/
│       ├── api.types.ts              # All API response/request TypeScript interfaces
│       ├── user.types.ts             # User, KYC, Device types
│       ├── listing.types.ts          # Listing, Category, Condition, Location types
│       ├── chat.types.ts             # Conversation, Message, typing event types
│       ├── offer.types.ts            # Offer, negotiation chain types
│       ├── deal.types.ts             # Deal, Review, Dispute types
│       └── socket.types.ts           # WebSocket event payload types
│
├── public/
│   ├── images/
│   │   ├── logo.svg                  # Becha-Kena brand logo
│   │   ├── logo-white.svg            # White variant for dark backgrounds
│   │   ├── hero-bg.webp              # Homepage hero background
│   │   ├── empty-*.svg               # Empty state illustrations
│   │   └── categories/               # Category icon SVGs
│   ├── fonts/                        # Self-hosted Inter + Noto Sans Bengali
│   └── manifest.json                 # PWA manifest
│
├── tailwind.config.ts                # Extended Tailwind theme (colors, fonts, breakpoints)
├── next.config.ts                    # Next.js config (images, rewrites, i18n)
├── tsconfig.json                     # TypeScript strict config
├── .env.local                        # Environment variables
└── package.json
```

---

## Environment Variables (`.env.local`)

```env
# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000/api/v1
NEXT_PUBLIC_WS_URL=http://localhost:5000
NEXT_PUBLIC_CDN_BASE_URL=https://cdn.becha-kena.com

# App Configuration
NEXT_PUBLIC_APP_NAME=Becha-Kena
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DEFAULT_LOCALE=bn

# Maps
NEXT_PUBLIC_DEFAULT_LAT=23.8103
NEXT_PUBLIC_DEFAULT_LNG=90.4125
NEXT_PUBLIC_DEFAULT_ZOOM=12

# Analytics (Production)
NEXT_PUBLIC_GA_ID=
NEXT_PUBLIC_SENTRY_DSN=
```

---

## Phase-by-Phase Implementation Guide

---



### PHASE 0: Project Initialization & Core Infrastructure

**Goal:** Set up the Next.js 15 project, Tailwind CSS, shadcn/ui, TypeScript strict config, fonts, providers, and root layout.

**Step 0.1 — Initialize the project:**
```bash
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*"
cd frontend
```

**Step 0.2 — Install all dependencies:**
```bash
# Core UI
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-avatar @radix-ui/react-separator @radix-ui/react-progress @radix-ui/react-select @radix-ui/react-checkbox @radix-ui/react-toast @radix-ui/react-popover @radix-ui/react-slot class-variance-authority clsx tailwind-merge

# State & Data
npm install zustand @tanstack/react-query axios socket.io-client

# Forms & Validation
npm install react-hook-form @hookform/resolvers zod

# UI Enhancements
npm install lucide-react framer-motion date-fns react-hot-toast embla-carousel-react react-dropzone

# Maps & Geo
npm install leaflet react-leaflet @types/leaflet

# Internationalization
npm install next-intl

# Dev
npm install -D @types/node prettier eslint-config-prettier
```

**Step 0.3 — Configure `tsconfig.json`:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Step 0.4 — Configure `tailwind.config.ts`:**
Extend theme with the Becha-Kena design system colors, fonts, and breakpoints defined above. Register Bengali font family. Add `animate-` utilities for skeleton loading, pulse, and slide transitions.

**Step 0.5 — Set up `app/globals.css`:**
Import Tailwind layers (`@tailwind base`, `components`, `utilities`). Define CSS custom properties for the color palette. Import `Inter` (Google Fonts) and `Noto Sans Bengali` font faces. Add scrollbar styling for WebKit.

**Step 0.6 — Create `lib/utils/cn.ts`:**
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Step 0.7 — Create `app/layout.tsx` (Root Layout):**
- Set `<html lang="bn">` with Bengali as default language.
- Load Inter and Noto Sans Bengali fonts via `next/font/google`.
- Wrap children with `QueryClientProvider` (TanStack React Query), `Toaster` (react-hot-toast), and a custom `AuthProvider`.
- Set global metadata: `title`, `description`, `keywords`, `openGraph`, `twitter` for SEO.
- Include `<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />`.

**Step 0.8 — Create `app/loading.tsx`:**
Full-page skeleton with the Becha-Kena logo pulse animation.

**Step 0.9 — Create `app/not-found.tsx`:**
Custom 404 page with message: "Page Not Found" (Bengali i18n key: `pageNotFound`) and a "Go Home" button.

**Step 0.10 — Create `app/error.tsx`:**
Global error boundary with "Something went wrong" message (Bengali i18n key: `somethingWentWrong`), retry button, and error details toggle (dev only).

---

### PHASE 1: API Client, Auth State & Type System

**Goal:** Build the typed API client with automatic token refresh, Zustand auth store, and all TypeScript type definitions matching the backend API contracts.

**Step 1.1 — Define all TypeScript types in `lib/types/`:**

Create precise interfaces for every API entity. All types must exactly match the backend response shapes:

**`api.types.ts`:**
```typescript
// Standard API response envelope
interface ApiSuccessResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
}

interface ApiErrorResponse {
  success: false;
  statusCode: number;
  error: {
    code: string;
    message: string;
    details?: Record<string, string>[];
  };
  timestamp: string;
  path: string;
}

interface PaginationMeta {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}
```

**`user.types.ts`:**
```typescript
interface User {
  id: string;
  phone: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: 'citizen' | 'moderator' | 'super_admin';
  isNidVerified: boolean;
  kycStatus: 'unverified' | 'pending' | 'verified' | 'retake_required' | 'manual_review';
  isBanned: boolean;
  isFrozen: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  totalListings: number;
  activeDeviceCount: number;
  notificationPreferences: NotificationPreferences;
  memberSince: string;
}

interface NotificationPreferences {
  pushEnabled: boolean;
  smsEnabled: boolean;
  priceDropAlerts: boolean;
  chatMessages: boolean;
  quietHoursStart: string | null;
  quietHoursEnd: string | null;
}

interface PublicUserProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isNidVerified: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  memberSince: string;
  trustBadges: Record<string, number>;
}
```

**`listing.types.ts`:**
```typescript
type ListingStatus = 'draft' | 'active' | 'under_offer' | 'sold' | 'expired' | 'archived' | 'under_review';
type ListingCondition = 'brand_new' | 'like_new' | 'gently_used' | 'heavily_used';
type ListingCategory = 'electronics' | 'vehicles' | 'property' | 'fashion' | 'home' | 'hobbies';

interface ListingLocation {
  division: string;
  thana: string;
  coordinates: [number, number]; // [longitude, latitude]
}

interface Listing {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: ListingCondition;
  category: ListingCategory;
  imageUrls: string[];
  videoUrl: string | null;
  location: ListingLocation;
  status: ListingStatus;
  moderationStatus: 'pending' | 'approved' | 'flagged' | 'rejected';
  viewCount: number;
  inquiryCount: number;
  renewCount: number;
  maxRenewals: number;
  expiresAt: string;
  isPhoneHidden: boolean;
  sellerId: string;
  seller: SellerSummary;
  createdAt: string;
  updatedAt: string;
}

interface SellerSummary {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  isNidVerified: boolean;
  averageRating: number;
  totalDealsCompleted: number;
  memberSince: string;
}

interface ListingSearchParams {
  q?: string;
  category?: ListingCategory;
  condition?: ListingCondition;
  division?: string;
  thana?: string;
  longitude?: number;
  latitude?: number;
  maxDistanceKm?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: 'newest' | 'price_low' | 'price_high' | 'distance';
  page?: number;
  limit?: number;
}
```

Continue the same pattern for `chat.types.ts` (Conversation, Message), `offer.types.ts` (Offer with round, status, expiry), `deal.types.ts` (Deal, Review, Dispute), and `socket.types.ts` (all WebSocket event payloads).

**Step 1.2 — Create `lib/api/client.ts` (Axios Instance with Interceptors):**

```typescript
// Create axios instance with base URL and credentials
const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true, // Send HTTP-Only refresh cookie
  headers: { 'Content-Type': 'application/json' }
});
```

**Request interceptor:**
- Read `accessToken` from Zustand auth store.
- Attach `Authorization: Bearer <token>` header.
- Attach `X-Device-UUID` header from localStorage.

**Response interceptor (error handler):**
- On `401 UNAUTHORIZED` or `TOKEN_EXPIRED`:
  1. Attempt silent token refresh via `POST /auth/refresh-token`.
  2. If refresh succeeds, retry the original failed request with new token.
  3. If refresh fails (403 or no cookie), clear auth store and redirect to `/login`.
- On `403 ACCOUNT_BANNED`: Redirect to a banned account page.
- On `403 ACCOUNT_FROZEN`: Show frozen account modal.
- On `429 RATE_LIMIT_EXCEEDED`: Show rate limit toast with retry-after countdown.
- On `5xx`: Show generic error toast.

**Step 1.3 — Create typed API modules in `lib/api/`:**

Each module exports async functions wrapping API calls. Example for `auth.api.ts`:
```typescript
export const authApi = {
  requestOtp: (phone: string) =>
    apiClient.post<ApiSuccessResponse<{ phone: string; expiresInSeconds: number }>>('/auth/request-otp', { phone }),

  verifyOtp: (data: { phone: string; otp: string; deviceUUID: string; deviceName: string }) =>
    apiClient.post<ApiSuccessResponse<{ accessToken: string; user: User; isNewUser: boolean }>>('/auth/verify-otp', data),

  refreshToken: () =>
    apiClient.post<ApiSuccessResponse<{ accessToken: string }>>('/auth/refresh-token'),

  logout: () =>
    apiClient.post('/auth/logout'),

  getProfile: () =>
    apiClient.get<ApiSuccessResponse<User>>('/auth/me'),
};
```

Create the same pattern for ALL 14 API modules: `user.api.ts`, `kyc.api.ts`, `listing.api.ts`, `chat.api.ts`, `offer.api.ts`, `deal.api.ts`, `review.api.ts`, `favorite.api.ts`, `report.api.ts`, `dispute.api.ts`, `upload.api.ts`, `admin.api.ts`.

**Step 1.4 — Create `lib/store/auth.store.ts` (Zustand Auth Store):**
```typescript
interface AuthState {
  user: User | null;
  accessToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  updateUser: (updates: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
}
```
- Persist `accessToken` in memory only (NOT localStorage for security).
- On app initialization, attempt silent refresh via `POST /auth/refresh-token` to restore session from HTTP-Only cookie.

**Step 1.5 — Create `lib/store/notification.store.ts`:**
```typescript
interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}
```

**Step 1.6 — Create `lib/store/chat.store.ts`:**
Track active conversations, unread message counts per conversation, and typing indicators.

**Step 1.7 — Create `lib/hooks/use-auth.ts`:**
Convenience hook that combines the Zustand store with React Query for profile fetching:
```typescript
export function useAuth() {
  const { user, accessToken, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  // On mount, attempt silent refresh if no user but cookie might exist
  // Return { user, isAuthenticated, isLoading, login, logout, refreshProfile }
}
```

---

### PHASE 2: Layout System & Navigation

**Goal:** Build the responsive layout shell — Navbar, Footer, Mobile Bottom Nav, Dashboard Sidebar, and the route group layouts.

**Step 2.1 — Create `components/layout/navbar.tsx`:**

Desktop navbar (inspired by UI reference):
```
┌──────────────────────────────────────────────────────────────────────┐
│  [Logo]   [Search Bar ───────────────]   [♡ Favorites] [🔔 Bell] [Sign In / Avatar] │
├──────────────────────────────────────────────────────────────────────┤
│  [📱 Electronics] [🚗 Vehicles] [🏠 Property] [👗 Fashion] [🏡 Home] [🎮 Hobbies]   │
└──────────────────────────────────────────────────────────────────────┘
```

- **Logo:** Link to `/`. Show "Becha-Kena" brand name with green accent.
- **Search Bar:** Full-width on mobile, centered on desktop. Bilingual placeholder: "Search products..." (i18n). On submit, navigate to `/search?q=<query>`.
- **Category Bar:** Horizontal scroll of 6 category chips with icons. Click navigates to `/categories/<slug>`.
- **Favorites Heart:** Link to `/dashboard/favorites`. Show count badge if items saved.
- **Notification Bell:** `components/notification/notification-bell.tsx`. Show unread count from Zustand store. Click opens dropdown with latest 5 notifications.
- **Auth Button:** If unauthenticated → "Sign In" button linking to `/login`. If authenticated → User avatar dropdown with: Profile, My Listings, Deals, Settings, Logout.
- **Post Ad CTA:** Green button "Post Ad" → navigates to `/dashboard/listings/new`. Only shown to authenticated users. If not verified, show KYC gate modal.

**Step 2.2 — Create `components/layout/mobile-nav.tsx`:**

Bottom tab bar for mobile (< 768px). Fixed at bottom, 5 tabs:
```
┌────────────────────────────────────────┐
│  🏠 Home  │  🔍 Search  │  ➕ Post  │  💬 Chat  │  👤 Profile  │
└────────────────────────────────────────┘
```
- Active tab highlighted with `--brand-green`.
- "Post" center button is elevated/circular with green background.
- Chat tab shows unread message count badge.

**Step 2.3 — Create `components/layout/footer.tsx`:**

Full-width footer with dark background (`--bg-dark`):
- Trust badges row: "✅ NID Verified Users", "🔒 Secure Transactions", "🛡️ Scam Protection"
- Link columns: Categories, Help (FAQ, Safety Tips), Company (About, Contact), Legal (Terms, Privacy)
- Social media icons
- "© 2026 Becha-Kena. Bangladesh's First NID-Verified Marketplace."
- Language toggle at bottom

**Step 2.4 — Create `components/layout/sidebar.tsx` (Dashboard Sidebar):**

Collapsible sidebar for authenticated dashboard pages:
```
┌─────────────────┐
│ 📊 Dashboard     │
│ 📋 My Listings   │
│ 💬 Messages (3)  │
│ ❤️ Favorites     │
│ 🤝 Deals         │
│ ──────────────── │
│ 👤 Profile       │
│ ⚙️ Settings      │
│ 🚪 Logout        │
└─────────────────┘
```
- Show unread counts next to Messages.
- Highlight active route.
- On mobile: slide-in drawer from left.

**Step 2.5 — Create `app/(public)/layout.tsx`:**
Wraps public pages with `<Navbar />` at top and `<Footer />` at bottom. Includes mobile bottom nav.

**Step 2.6 — Create `app/(auth)/layout.tsx`:**
Minimal centered layout. Becha-Kena logo at top. Single card container in the center. No navbar or footer.

**Step 2.7 — Create `app/(dashboard)/layout.tsx`:**
- Auth guard: If not authenticated, redirect to `/login?redirect=<current_path>`.
- Desktop: Sidebar + main content area.
- Mobile: Bottom nav + hamburger for sidebar.
- Initialize WebSocket connection on mount (see Phase 7).

**Step 2.8 — Create `app/(admin)/layout.tsx`:**
- Role guard: If `user.role` is not `moderator` or `super_admin`, redirect to `/`.
- Admin-specific sidebar with moderation navigation items.

---

### PHASE 3: Public Discovery Pages (SSR/ISR)

**Goal:** Build the homepage, search/filter page, listing detail page, and public user profile — all server-rendered for SEO.

**Step 3.1 — Create `app/(public)/page.tsx` (Homepage — ISR 60s):**

Build the homepage with these sections (top to bottom, inspired by UI reference):

**Section 1 — Hero Banner:**
- Full-width dark gradient background (`--bg-dark` → `--accent-purple`).
- Large heading: "Trusted Marketplace." / "NID Verified Buyers & Sellers." (i18n keys: `heroTitle`, `heroSubtitle`).
- Subheading: "Bangladesh's First NID-Verified C2C Resale Marketplace" (i18n key: `heroDescription`).
- Trust pills: "✅ NID Verified", "🔒 Scam Protection", "📱 10 Lakh+ Products".
- Search bar prominently centered.
- CTA button: "Browse Now →" (i18n key: `browseNow`).

**Section 2 — Shop by Category:**
- Heading: "Shop by Category" (i18n key: `shopByCategory`).
- 6 circular category cards in a horizontal scroll/grid: Electronics (📱), Vehicles (🚗), Property (🏠), Fashion (👗), Home & Living (🏡), Hobbies (🎮).
- Each card: circular icon on light bg, category name below. Click → `/categories/<slug>`.

**Section 3 — Featured / Recently Listed:**
- Heading: "Just Added" (i18n key: `justAdded`) with "View All →" link.
- Horizontal carousel of `ListingCard` components (6-8 cards).
- Fetch from `GET /api/v1/listings?sort=newest&limit=8`.

**Section 4 — Popular Listings / Trending:**
- Heading: "Popular Products" (i18n key: `popularProducts`).
- Grid of `ListingCard` components (2-col mobile, 4-col desktop).
- Fetch from `GET /api/v1/listings?sort=popular&limit=12`.

**Section 5 — Trust & Safety Banner:**
- Dark background section.
- 3 trust pillars with icons:
  1. "🪪 All users are NID verified" (i18n key: `trustNidVerified`)
  2. "🛡️ Advance payment scam prevention" (i18n key: `trustScamPrevention`)
  3. "⚖️ Legal action against stolen goods" (i18n key: `trustLegalAction`)

**Section 6 — Newsletter / App Download CTA:**
- "Never Miss a Deal!" (i18n key: `neverMissADeal`)
- Phone number input + subscribe button for price drop alerts.

**Data Fetching:** Use Next.js `fetch` with `{ next: { revalidate: 60 } }` for ISR (60-second cache).

**Step 3.2 — Create `components/listing/listing-card.tsx`:**

The core product card component used everywhere:
```
┌─────────────────────────┐
│  [Image]          [♡]   │  ← Favorite toggle (top-right heart)
│                         │
│  ┌──────────┐           │
│  │ Like New │           │  ← Condition badge (color-coded)
│  └──────────┘           │
├─────────────────────────┤
│  Product Title          │  ← Max 2 lines, ellipsis overflow
│  📍 Dhaka, Gulshan      │  ← Location (division, thana)
│  ⭐ 4.8 (12 deals)      │  ← Seller rating
│                         │
│  ৳ 15,000               │  ← Price in BDT with ৳ symbol
│  ✅ NID Verified         │  ← Green verified badge
└─────────────────────────┘
```

Props: `listing: Listing`, `onFavoriteToggle?: () => void`, `isFavorited?: boolean`.

Condition badge colors:
- `brand_new` → Green bg
- `like_new` → Blue bg
- `gently_used` → Yellow bg
- `heavily_used` → Orange bg

**Step 3.3 — Create `app/(public)/search/page.tsx` (Search & Filter — SSR):**

Full search page with filters:

**Layout:**
```
┌──────────────────────────────────────────────┐
│  Search: [_______________] [🔍]  [Filter 🎛️] │
├──────────────┬───────────────────────────────┤
│  FILTERS     │   Results (235 items found)   │
│              │   Sort: [Newest ▾]            │
│  Category    │   ┌────┐  ┌────┐  ┌────┐     │
│  ☑ Electronics│   │Card│  │Card│  │Card│     │
│  ☐ Vehicles  │   └────┘  └────┘  └────┘     │
│              │   ┌────┐  ┌────┐  ┌────┐     │
│  Condition   │   │Card│  │Card│  │Card│     │
│  ☑ Like New  │   └────┘  └────┘  └────┘     │
│              │                               │
│  Price Range │   [Load More / Infinite Scroll]│
│  ৳ [min]-[max]│                              │
│              │                               │
│  Location    │                               │
│  [Division ▾]│                               │
│  [Thana ▾]   │                               │
│              │                               │
│  📍 Near Me  │                               │
│  [25 km ▾]   │                               │
└──────────────┴───────────────────────────────┘
```

- **On mobile:** Filters hidden behind a bottom sheet (`filter-mobile-sheet.tsx`). Show "Filter" button with active filter count badge.
- **Server-side:** Read all query params from URL. Fetch `GET /api/v1/listings` with those params server-side.
- **Client-side enhancements:** Filter changes update URL params (shallow routing). Infinite scroll pagination.
- **"Near Me" toggle:** Request browser geolocation. If granted, pass `longitude`, `latitude`, `maxDistanceKm` to API.
- **Sort options:** "Newest", "Price: Low → High", "Price: High → Low", "Distance" (only if location granted). All labels via i18n.
- **Empty state:** "No products found" with suggestions to broaden filters.

**Step 3.4 — Create `app/(public)/listing/[id]/page.tsx` (Listing Detail — SSR):**

Full product detail page:

**Image Gallery (top):**
- Primary large image with swipe/click navigation.
- Thumbnail strip below (up to 8 images).
- Full-screen lightbox on tap.
- If video exists, play button overlay on first position.

**Product Info:**
```
┌─────────────────────────────────────────────┐
│  ┌──────────┐                               │
│  │ Like New │  📍 Dhaka, Gulshan            │
│  └──────────┘                               │
│                                             │
│  Samsung Galaxy S24 Ultra - 256GB           │  ← Title
│  ৳ 95,000                                   │  ← Price (large, bold)
│  Listed 3 days ago · 125 views · 8 inquiries│
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Description:                               │
│  In brand new condition, with box...     │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  📍 Location Map [Leaflet Map View]         │
│                                             │
│  ─────────────────────────────────────────  │
│                                             │
│  Seller Info:                               │
│  ┌────────────────────────────────┐         │
│  │ [Avatar] Rahim K.             │         │
│  │ ✅ NID Verified                │         │
│  │ ⭐ 4.7 (23 deals completed)   │         │
│  │ Member since Jan 2025         │         │
│  │                               │         │
│  │ [📞 Show Phone] [💬 Chat Now] │         │
│  │ [❤️ Save] [🚩 Report]         │         │
│  └────────────────────────────────┘         │
└─────────────────────────────────────────────┘
```

**Key interactions:**
- **"📞 Show Phone" button (`phone-reveal-button.tsx`):** If user not logged in → redirect to `/login`. If not KYC verified → show KYC gate modal. If verified → call `POST /api/v1/listings/:id/reveal-phone`. Show phone number in a copyable chip. Display "Used X/10 reveals today" (i18n key: `phoneRevealCount`).
- **"💬 Chat Now" button:** If not verified → KYC gate modal. If verified → call `POST /api/v1/chats/start` with `{ listingId }` → navigate to `/dashboard/chat/<conversationId>`.
- **"❤️ Save" button:** Toggle favorite. Optimistic UI update.
- **"🚩 Report" button:** Open `report-modal.tsx` with entity type `listing`.

**Dynamic SEO metadata:** Use `generateMetadata()` to set title, description, and OpenGraph image from listing data.

**Step 3.5 — Create `app/(public)/user/[id]/page.tsx` (Public User Profile):**
- Fetch `GET /api/v1/users/:userId/public-profile` and `GET /api/v1/users/:userId/reviews`.
- Display: avatar, display name, verified badge, average rating, total deals, member since date.
- Trust badges summary: count of each badge type (Punctual, Item as Described, etc.).
- Reviews list with pagination.
- Active listings by this seller (fetch `GET /api/v1/listings?sellerId=<userId>`).

**Step 3.6 — Create `app/(public)/categories/[slug]/page.tsx` (Category Page — ISR 300s):**
- Pre-filter listings by category slug.
- Same filter sidebar as search page but with category pre-selected.
- ISR with 5-minute revalidation.

**Step 3.7 — Create `components/shared/location-picker.tsx`:**
Cascading dropdown selector for Bangladesh location hierarchy:
1. First dropdown: **Division** (8 divisions: Dhaka, Chittagong, Rajshahi, Khulna, Sylhet, Barisal, Rangpur, Mymensingh).
2. Second dropdown (filtered): **District** within the selected division.
3. Third dropdown (filtered): **Thana/Upazila** within the selected district.

Store the complete Bangladesh geo data as a static JSON file in `lib/utils/bd-locations.json`.



---

### PHASE 4: Authentication & OTP Flow

**Goal:** Build the phone-based OTP login/registration flow with device binding and session management.

**Step 4.1 — Create `app/(auth)/login/page.tsx`:**

Two-step login flow in a single page with animated transitions:

**Step 1 — Phone Input:**
```
┌─────────────────────────────────────┐
│         [Becha-Kena Logo]           │
│                                     │
│    Enter your phone number          │
│    (i18n key: enterPhoneNumber)     │
│                                     │
│   +880 [1XXXXXXXXX__________]       │
│                                     │
│   [  Send OTP (i18n: sendOtp) →  ]  │
│                                     │
│   By continuing, you agree to our   │
│   Terms of Service & Privacy Policy │
└─────────────────────────────────────┘
```

- Validate with BD phone regex: `^(?:\+?880)?1[3-9]\d{8}$`.
- Use React Hook Form + Zod for validation.
- On submit: call `POST /api/v1/auth/request-otp`.
- Show loading spinner on button during API call.
- On success: transition to Step 2 with slide animation.
- On `429 RATE_LIMIT`: Show countdown timer "Retry in X seconds" (i18n key: `retryInSeconds`).

**Step 2 — OTP Verification:**
```
┌─────────────────────────────────────┐
│         [Becha-Kena Logo]           │
│                                     │
│    OTP code has been sent            │
│    to +8801XXXXXXXX                  │
│                                     │
│    [_] [_] [_] [_] [_] [_]         │  ← 6-digit auto-focus OTP input
│                                     │
│    ⏱️ 01:45 remaining               │  ← 120s countdown timer
│                                     │
│    Resend Code (i18n: resendCode)   │  ← Disabled until timer expires
│    ← Change Phone Number            │  ← Go back to Step 1
│                                     │
│    [  Verify (i18n: verify) →  ]    │
└─────────────────────────────────────┘
```

- `otp-input.tsx`: 6 individual digit inputs with auto-advance focus. Paste support for full 6-digit code.
- Auto-submit when all 6 digits entered.
- Generate unique `deviceUUID` using `crypto.randomUUID()` and persist in `localStorage`.
- Detect `deviceName` from `navigator.userAgent`.
- On submit: call `POST /api/v1/auth/verify-otp` with `{ phone, otp, deviceUUID, deviceName }`.
- On success:
  1. Store `accessToken` and `user` in Zustand auth store.
  2. If `isNewUser === true`: redirect to `/kyc` for identity verification.
  3. If existing user and verified: redirect to `redirect` query param or `/`.
  4. If existing user but unverified: redirect to `/kyc`.
- On `400 INVALID_OTP`: Shake animation on input + red error message.
- On `423 DEVICE_LIMIT_EXCEEDED`: Show modal explaining max 2 devices with option to verify new device via biometric.

**Step 4.2 — Create `components/kyc/otp-input.tsx`:**
Reusable 6-digit OTP component:
- Auto-focus first input on mount.
- Auto-advance to next input on digit entry.
- Backspace returns to previous input.
- Paste handler to fill all 6 digits at once.
- Expose `onComplete(code: string)` callback.

**Step 4.3 — Create `components/kyc/phone-input.tsx`:**
BD phone number input:
- Fixed "+880" prefix (non-editable, grayed out).
- Input accepts remaining 10 digits.
- Real-time format display: `+880 1XXX-XXXXXX`.
- Zod validation with BD regex.

**Step 4.4 — Create `components/shared/protected-route.tsx`:**
Auth guard wrapper for dashboard pages:
```typescript
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) return <DashboardSkeleton />;
  if (!isAuthenticated) return null;
  return <>{children}</>;
}
```

**Step 4.5 — Create `components/shared/verified-route.tsx`:**
KYC verification guard — checks `user.isNidVerified`. If not verified, redirect to `/kyc`.

---

### PHASE 5: KYC Verification Flow (NID + Biometric Selfie)

**Goal:** Build the multi-step KYC verification interface with camera capture for NID photos and liveness selfie.

**Step 5.1 — Create `app/(auth)/kyc/page.tsx`:**

Multi-step KYC wizard with progress indicator:

```
Step 1: NID Photos  →  Step 2: Selfie Verification  →  Step 3: Processing  →  Done ✅
```

**Step 1 — NID Photo Capture:**
```
┌─────────────────────────────────────────┐
│  Step 1 of 3: Upload National ID Card│
│  (i18n key: uploadNidCard)           │
│                                         │
│  ┌──────────────┐  ┌──────────────┐     │
│  │              │  │              │     │
│  │  NID Front   │  │  NID Back    │     │
│  │  (Front Side)│  │  (Back Side) │     │
│  │              │  │              │     │
│  │  📷 Capture  │  │  📷 Capture  │     │
│  │  or Upload   │  │  or Upload   │     │
│  └──────────────┘  └──────────────┘     │
│                                         │
│  💡 Take photos in clear lighting    │
│     (i18n key: clearLightingTip)     │
│                                         │
│  [  Next Step (i18n: nextStep) →  ]     │
└─────────────────────────────────────────┘
```

- Two image capture zones (front and back).
- Each zone: Option to use camera (`getUserMedia`) or file upload.
- Preview captured image with retake option.
- Upload images to S3 using presigned URLs:
  1. Call `POST /api/v1/uploads/presigned-url` with `context: 'nid_front'` (or `nid_back`).
  2. Upload directly to S3 via the presigned PUT URL.
  3. Call `POST /api/v1/uploads/confirm` to verify.
- Store returned `objectKey` for each image.

**Step 2 — Selfie Liveness Verification:**
```
┌─────────────────────────────────────────┐
│  Step 2 of 3: Selfie Verification    │
│  (i18n key: selfieVerification)      │
│                                         │
│  ┌─────────────────────────────┐        │
│  │                             │        │
│  │     [Live Camera Feed]      │        │
│  │     Oval face guide overlay │        │
│  │                             │        │
│  │  👁️ Please blink your eyes  │        │
│  │     (i18n: blinkYourEyes)   │        │
│  │                             │        │
│  └─────────────────────────────┘        │
│                                         │
│  ✅ Blink detected                       │
│  ⬜ Head turn (Next)                  │
│                                         │
│  [  Capture 📸 (i18n: capture)  ]       │
└─────────────────────────────────────────┘
```

- `selfie-liveness.tsx`: WebRTC camera stream with oval face guide overlay.
- Liveness checks: Prompt user to blink, then turn head slightly.
- Capture selfie frame as base64/blob.
- Upload to S3 as private media (`context: 'nid_front'`). **Note:** The backend reuses `nid_front` context for selfie uploads since there is no separate `selfie` context in the `UploadContext` enum. Valid contexts are: `listing_image`, `listing_video`, `avatar`, `nid_front`, `nid_back`, `gd_document`.

**Step 3 — Processing & Result:**
- Call `POST /api/v1/kyc/verify-nid` with:
  ```json
  {
    "nidNumber": "<extracted or entered>",
    "dob": "<entered>",
    "frontImageKey": "<s3 object key>",
    "backImageKey": "<s3 object key>",
    "liveSelfieKey": "<s3 object key>",
    "livenessMeta": { "blinkDetected": true, "headTurnDetected": true, "confidence": 0.95 }
  }
  ```
- Show processing animation (spinner with "Verifying..." / i18n key: `verifying`).
- **On success:** Confetti/celebration animation → "✅ Your identity has been verified!" (i18n key: `identityVerified`) → redirect to dashboard or original destination.
- **On failure (attempts < 3):** Show specific error → "❌ Face didn't match, please try again" (i18n key: `faceMismatch`) → allow retry.
- **On failure (attempts >= 3):** Show manual review message → "Your request has been sent for manual review. You'll be notified within 4 hours." (i18n key: `manualReviewSent`)

**Step 5.2 — Create `components/kyc/kyc-status-card.tsx`:**
Display current KYC status with appropriate icon, color, and message:
- `unverified` → Gray "Not started" with "Start Verification" CTA.
- `pending` → Yellow spinner "Under Review".
- `verified` → Green checkmark "Verified ✅".
- `retake_required` → Orange warning "Retake Required" with retry CTA.
- `manual_review` → Blue info "Manual Review in Progress" with SLA timer.

**Step 5.3 — Create `components/kyc/kyc-progress-steps.tsx`:**
Horizontal step indicator showing: Phone ✅ → NID → Selfie → Complete.

---

### PHASE 6: Listing Management (Seller Dashboard)

**Goal:** Build the listing creation multi-step form, edit form, and seller listing management dashboard with status tabs.

**Step 6.1 — Create `app/(dashboard)/listings/page.tsx` (My Listings):**

Tabbed listing management dashboard:
```
┌──────────────────────────────────────────────────────────┐
│  My Listings (i18n: myListings)    [+ New Listing]  │
├──────────────────────────────────────────────────────────┤
│  [Active (5)] [Under Offer (2)] [Sold (12)] [Expired (3)]│
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────┐       │
│  │ [img] Samsung Galaxy S24    ৳95,000  Active  │       │
│  │       📍 Dhaka · 👁️ 125 · 💬 8  · 23 days left│       │
│  │       [Edit] [Renew] [Delete]                │       │
│  └──────────────────────────────────────────────┘       │
│  ┌──────────────────────────────────────────────┐       │
│  │ [img] iPhone 15 Pro Max     ৳140,000  Active │       │
│  │       📍 Chittagong · 👁️ 89 · 💬 3 · 18 days  │       │
│  │       [Edit] [Mark as Sold]                  │       │
│  └──────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────┘
```

- Fetch `GET /api/v1/listings/my-listings?status=<tab>`.
- Tab counts shown in badges.
- Each listing row shows: thumbnail, title, price, status badge, location, view count, inquiry count, days remaining.
- **Actions per status:**
  - Active: Edit, Renew (if Day 25+), Mark as Sold, Delete
  - Under Offer: View offer details, Edit
  - Sold: View deal receipt, Leave review (if not done)
  - Expired: Renew (if renewals < 2), Delete
- **Renewal button:** Only enabled if `renewCount < maxRenewals` and listing is expired or within 5 days of expiry. Call `POST /api/v1/listings/:id/renew`.
- **Mark as Sold:** Opens modal to select buyer from chat inquiries → calls `POST /api/v1/deals/direct-sale`.
- **Delete:** Confirmation dialog → calls `DELETE /api/v1/listings/:id`.

**Step 6.2 — Create `app/(dashboard)/listings/new/page.tsx` (Create Listing — Multi-step Form):**

**Step 1 — Category & Condition:**
```
Select Category (i18n: selectCategory):
  ┌────┐ ┌────┐ ┌────┐
  │📱  │ │🚗  │ │🏠  │
  │Elec│ │Vehi│ │Prop│
  └────┘ └────┘ └────┘
  ┌────┐ ┌────┐ ┌────┐
  │👗  │ │🏡  │ │🎮  │
  │Fash│ │Home│ │Hobb│
  └────┘ └────┘ └────┘

Item Condition (i18n: itemCondition):
  ○ Brand New
  ○ Like New
  ○ Gently Used
  ○ Heavily Used
```

**Step 2 — Details:**
- Title input (min 10, max 100 chars) with character counter.
- Description textarea (min 20, max 2000 chars).
- Price input with ৳ prefix (min 50, max 2,500,000 BDT).
- "Chat-Only Mode" toggle (isPhoneHidden).

**Step 3 — Photos & Video:**
- Image upload zone: Drag & drop or click to upload. Min 1, max 8 images.
- First image automatically becomes the cover/thumbnail.
- Each upload uses the Direct-to-S3 presigned URL flow:
  1. `POST /api/v1/uploads/presigned-url` with `context: 'listing_image'`.
  2. `PUT` binary directly to S3 signed URL.
  3. `POST /api/v1/uploads/confirm`.
- Show upload progress bar for each file.
- Preview thumbnails with reorder (drag) and delete capability.
- Optional: Video upload (max 1, max 50MB, mp4/webm).

**Step 4 — Location:**
- Cascading location picker: Division → District → Thana.
- Optional: "📍 Use My Location" button (browser geolocation API).
- Map preview showing selected location pin.

**Step 5 — Review & Publish:**
- Full preview of the listing as it will appear to buyers.
- "Publish" button (i18n key: `publish`).
- On submit: call `POST /api/v1/listings` with all form data.
- On success: show "✅ Your listing has been published!" toast (i18n key: `listingPublished`) → redirect to My Listings.
- On `422 C2C_QUOTA_EXHAUSTED`: Show error "You can post a maximum of 5 ads per month" (i18n key: `quotaExhausted`).

**Step 6.3 — Create `components/shared/image-upload.tsx`:**
Reusable Direct-to-S3 image uploader:
- Accept file via drag-drop or click.
- Validate: max 5MB, allowed MIME types (jpeg, png, webp).
- Request presigned URL from backend.
- Upload to S3 with XMLHttpRequest for progress tracking.
- Confirm upload.
- Return `objectKey` and `publicUrl`.
- Show: progress bar during upload, preview thumbnail after success, retry button on failure.

**Step 6.4 — Create `app/(dashboard)/listings/[id]/edit/page.tsx`:**
Same form as creation but pre-populated with existing listing data. Fetch `GET /api/v1/listings/:id`. On submit: call `PUT /api/v1/listings/:id`.

---

### PHASE 7: Real-Time Chat & Offer Negotiation

**Goal:** Build the WebSocket-powered chat system with conversation inbox, real-time messaging, scam warnings, and the 3-round offer negotiation protocol.

**Step 7.1 — Create `lib/socket/client.ts` (Socket.io Client Singleton):**

```typescript
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/lib/store/auth.store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = useAuthStore.getState().accessToken;
    socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
```

**Step 7.2 — Create `lib/socket/hooks.ts`:**

**`useSocket()`:** Initialize socket connection on dashboard mount. Handle reconnection with updated auth token. Clean up on unmount.

**`useChatRoom(conversationId)`:**
- Join room on mount: `socket.emit('join_chat', { conversationId })`.
- Listen for `new_message` events → append to message list.
- Listen for `scam_alert` events → show warning banner.
- Listen for `offer_updated` events → update offer state.
- Listen for typing indicators.
- Leave room on unmount.
- Return `{ messages, sendMessage, sendTyping, isConnected }`.

**`useNotifications()`:**
- Listen on personal channel for `price_drop_alert`, `offer_updated`, `user_notification` events.
- Append to notification store.
- Show toast for high-priority notifications.

**Step 7.3 — Create `app/(dashboard)/chat/page.tsx` (Conversation Inbox):**

```
┌───────────────────────────────────────────────────────────┐
│  💬 Messages (i18n: messages)                       │
├──────────────┬────────────────────────────────────────────┤
│  Conversations│  [Select a conversation to start chatting]│
│              │                                            │
│  ┌──────────┐│                                            │
│  │[Avi] Rahim│  Last: "What's the price?"  · 2m ago   │
│  │[img] S24  │  ✅ NID Verified                           │
│  └──────────┘│                                            │
│  ┌──────────┐│                                            │
│  │[Avi] Karim│  Last: "Offer: ৳85,000"  · 1h ago         │
│  │[img] iPhn │  ✅ NID Verified                           │
│  └──────────┘│                                            │
│              │                                            │
│  [Empty if   │                                            │
│   no chats]  │                                            │
└──────────────┴────────────────────────────────────────────┘
```

- **Desktop:** Split-pane layout. Conversation list on left (30%), chat window on right (70%).
- **Mobile:** Full-screen conversation list. Tapping opens chat window with back button.
- Fetch `GET /api/v1/chats` for inbox list.
- Each item shows: counterpart avatar, name, verified badge, listing thumbnail, last message preview, timestamp, unread count.
- Sort by most recent activity.
- Real-time updates via WebSocket push new messages to conversation previews.

**Step 7.4 — Create `app/(dashboard)/chat/[conversationId]/page.tsx` (Chat Thread):**

```
┌─────────────────────────────────────────┐
│  ← Back   [Samsung Galaxy S24] ৳95,000  │  ← Listing context header
│           Rahim K. ✅ Online            │
├─────────────────────────────────────────┤
│                                         │
│  ┌───────────────────────┐              │
│  │ System: Chat started  │              │  ← System message
│  └───────────────────────┘              │
│                                         │
│          ┌──────────────────────┐       │
│          │ Bro, is the product really  │       │  ← Received message (left)
│          │ in good condition?          │       │
│          │            10:30 AM  │       │
│          └──────────────────────┘       │
│                                         │
│  ┌──────────────────────┐               │
│  │ Yes, it's in brand new     │               │  ← Sent message (right, green)
│  │ condition                  │               │
│  │ 10:32 AM            │               │
│  └──────────────────────┘               │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ ⚠️ WARNING: Never send advance     │    │  ← Scam warning banner (red)
│  │ money via bKash/Nagad before       │    │
│  │ verifying the product in person.   │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ 💰 Offer: ৳85,000               │    │  ← Offer event card
│  │ Status: Pending  ⏱️ 23:45:12    │    │
│  │ [Accept ✅] [Counter ↩️] [Decline ❌]│  │
│  └─────────────────────────────────┘    │
│                                         │
│  Rahim is typing...                     │  ← Typing indicator
├─────────────────────────────────────────┤
│  [📎] [Type a message...____] [Send ➤] │
│        [💰 Make Offer]                  │
└─────────────────────────────────────────┘
```

**Key features:**
- **Message bubbles (`message-bubble.tsx`):** Sent (right, green bg) vs received (left, gray bg). Timestamp below each. System messages centered with gray italic.
- **Scam warning banner (`scam-warning-banner.tsx`):** Red banner shown when `hasScamWarning: true` on a message. Non-dismissable.
- **Offer event cards (`offer-card.tsx`):** Inline offer display within chat. Shows amount, status, countdown timer. Action buttons (Accept/Counter/Decline) only for the relevant party.
- **Typing indicator (`typing-indicator.tsx`):** Three bouncing dots animation.
- **"Make Offer" button:** Opens `offer-form.tsx` bottom sheet. Input amount (min 50, max listing price). On submit: `POST /api/v1/chats/:conversationId/offers`. Max 3 offers per buyer per listing.
- **Counter offer:** Opens form with pre-filled seller counter amount. Calls `POST /api/v1/chats/:conversationId/offers/:offerId/counter`.
- **Accept offer:** Confirmation modal → `POST /api/v1/chats/:conversationId/offers/:offerId/accept`. On success → listing moves to `under_offer` → show deal closure option.
- **Decline offer:** Calls `POST /api/v1/chats/:conversationId/offers/:offerId/decline`.
- **Auto-scroll:** Scroll to bottom on new messages.
- **Infinite scroll up:** Load older messages via `GET /api/v1/chats/:conversationId/messages?page=N`.
- **Message input:** Text input + send button. Strip external links client-side before sending. Use WebSocket `send_message` for real-time delivery, with REST `POST /api/v1/chats/:conversationId/messages` as fallback.
- **Typing events:** Emit `typing_start` on keypress (debounced 500ms), `typing_stop` on 2s idle.

**Step 7.5 — Create `components/chat/offer-card.tsx`:**
```typescript
interface OfferCardProps {
  offer: Offer;
  currentUserId: string;
  listingPrice: number;
  onAccept?: () => void;
  onDecline?: () => void;
  onCounter?: (amount: number) => void;
}
```
- Display offer amount in BDT with ৳ symbol.
- Show offer round number (1/3, 2/3, 3/3).
- Countdown timer using `use-countdown` hook (from `expiresAt`).
- Status badge: Pending (yellow), Accepted (green), Countered (blue), Declined (red), Expired (gray).
- Action buttons visible only to the appropriate party (seller sees Accept/Counter/Decline on buyer's offer, buyer sees Accept/Decline on seller's counter).

**Step 7.6 — Create `components/chat/scam-warning-banner.tsx`:**
Red warning banner:
```
⚠️ WARNING: Never send advance money via bKash, Nagad, or any other method before physically verifying the product.
(i18n key: scamWarningFull — Bengali translation in bn.ts)
```
- Displayed above messages when the scam detector flags a message.
- Red left border, light red background.
- Non-dismissable for safety.



---

### PHASE 8: Deals, Reviews & Favorites

**Goal:** Build deal receipts, bilateral review forms, favorites with price drop indicators, and deal history.

**Step 8.1 — Create `app/(dashboard)/deals/page.tsx` (Deal History):**

List all completed deals:
```
┌──────────────────────────────────────────────┐
│  🤝 My Deals (i18n: myDeals)                  │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐    │
│  │ [img] Samsung Galaxy S24             │    │
│  │ ৳95,000 · 🤝 Sold to Karim H.       │    │
│  │ 📅 Oct 15, 2026                      │    │
│  │ Status: Completed ✅                 │    │
│  │ [View Receipt] [Leave Review ⭐]     │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ [img] iPhone 15 Pro                  │    │
│  │ ৳140,000 · 🛒 Bought from Rahim K.  │    │
│  │ 📅 Oct 10, 2026                      │    │
│  │ Status: Disputed ⚠️                  │    │
│  │ [View Receipt] [View Dispute]        │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

- Show role context: "Sold to" (if user is seller) or "Bought from" (if user is buyer).
- Show review CTA only if within 48-hour review window and user hasn't reviewed yet.
- Show dispute CTA for buyers only.

**Step 8.2 — Create `app/(dashboard)/deals/[dealId]/page.tsx` (Deal Receipt):**

Immutable deal receipt:
```
┌─────────────────────────────────────────┐
│  📃 Deal Receipt (i18n: dealReceipt)   │
│  Deal ID: #BK-2026-XXXXXXXX            │
├─────────────────────────────────────────┤
│                                         │
│  Product: Samsung Galaxy S24 Ultra      │
│  Final Price: ৳95,000                   │
│  Completed: Oct 15, 2026, 3:45 PM      │
│                                         │
│  ─────────────────────────────────────  │
│  Seller: Rahim K. ✅                    │
│  Buyer: Karim H. ✅                     │
│  ─────────────────────────────────────  │
│                                         │
│  Reviews:                               │
│  [Seller → Buyer: ⭐⭐⭐⭐⭐ Punctual]    │
│  [Buyer → Seller: Not yet reviewed]     │
│                                         │
│  ─────────────────────────────────────  │
│  Dispute Status: None                   │
│                                         │
│  [⭐ Leave Review]  [🚩 File Dispute]   │
└─────────────────────────────────────────┘
```

- Fetch `GET /api/v1/deals/:dealId`.
- Show "Leave Review" button if eligible (within 48h, not yet reviewed).
- Show "File Dispute" button only for buyers, only if `disputeStatus === 'none'`.

**Step 8.3 — Create `components/deal/review-form.tsx`:**

```
┌─────────────────────────────────────────┐
│  ⭐ Leave a Review (i18n: leaveReview) │
│                                         │
│  Rating:  ⭐ ⭐ ⭐ ⭐ ☆               │
│                                         │
│  Trust Badges (select all that apply):  │
│  ☑ ⏱️ Punctual                        │
│  ☑ ✅ Item as Described               │
│  ☐ 💬 Friendly Communication         │
│  ☐ 💳 Quick Payment                  │
│                                         │
│  Comment (optional):                    │
│  [____________________________________] │
│                                         │
│  [  Submit Review (i18n: submitReview) →  ]   │
└─────────────────────────────────────────┘
```

- `star-rating.tsx`: Interactive 1-5 star input with hover preview.
- Trust badge checkboxes from enum: `punctual`, `item_as_described`, `friendly_communication`, `quick_payment`.
- Optional comment textarea.
- On submit: `POST /api/v1/reviews` with `{ dealId, rating, tags[], comment }`.
- On success: toast "✅ Review submitted successfully!" (i18n key: `reviewSubmitted`) → refresh deal receipt.
- On `400 ALREADY_REVIEWED`: Show error "You have already submitted a review." (i18n key: `alreadyReviewed`).
- On `400 REVIEW_WINDOW_EXPIRED`: Show error "The review window has expired (48 hours)." (i18n key: `reviewWindowExpired`).

**Step 8.4 — Create `app/(dashboard)/favorites/page.tsx` (Favorites / Wishlist):**

```
┌──────────────────────────────────────────────┐
│  ❤️ Saved Items (i18n: savedItems)             │
├──────────────────────────────────────────────┤
│  ┌──────────────────────────────────────┐    │
│  │ [img] Samsung Galaxy S24             │    │
│  │ ৳95,000  (was ৳110,000)             │    │
│  │ 📉 ৳15,000 price drop!  🟢          │    │  ← Green price drop indicator
│  │ [View Listing] [Remove ❌]           │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ [img] MacBook Air M2                 │    │
│  │ ৳85,000  (saved at ৳85,000)         │    │
│  │ No price change                      │    │
│  │ [View Listing] [Remove ❌]           │    │
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │ [img] Honda CBR 150                  │    │
│  │ ⚫ SOLD / UNAVAILABLE                │    │  ← Grayed out unavailable
│  │ [Remove ❌]                          │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

- Fetch `GET /api/v1/favorites`.
- For each favorite, show:
  - Current price vs `priceAtSave`.
  - If `isPriceDropped === true`: Green "📉 ৳X price drop!" indicator.
  - If listing status is `sold`, `expired`, or `archived`: Gray "UNAVAILABLE" overlay.
- Remove favorite: `DELETE /api/v1/favorites/:listingId` with optimistic UI.

---

### PHASE 9: Community Safety — Reports & Disputes

**Goal:** Build the report flagging modal, dispute filing form for stolen items, and user's report history.

**Step 9.1 — Create `components/report/report-modal.tsx`:**

Modal dialog for reporting entities (listings, chats, users):
```
┌─────────────────────────────────────────┐
│  🚩 Report (i18n: report)              │
│                                         │
│  Select reason (i18n: selectReason):    │
│  ○ Advance payment scam                │
│  ○ Stolen goods suspected              │
│  ○ Harassment                           │
│  ○ Counterfeit                          │
│  ○ Spam                                 │
│                                         │
│  Details (optional):                    │
│  [____________________________________] │
│                                         │
│  [Cancel]   [  Submit Report →  ]     │
└─────────────────────────────────────────┘
```

- Props: `entityType: 'listing' | 'chat' | 'user'`, `entityId: string`.
- Reason enum matches backend: `scam_advance_demanded`, `stolen_goods_suspected`, `harassment`, `counterfeit`, `spam`.
- On submit: `POST /api/v1/reports`.
- On success: toast "✅ Report submitted. Our team will review it." (i18n key: `reportSubmitted`)
- On `409 ALREADY_REPORTED`: Show "You have already reported this item." (i18n key: `alreadyReported`)

**Step 9.2 — Create `components/deal/dispute-form.tsx`:**

Police GD filing form for stolen item disputes:
```
┌─────────────────────────────────────────┐
│  ⚖️ File Stolen Item Dispute          │
│  (i18n key: fileStolenItemDispute)    │
├─────────────────────────────────────────┤
│                                         │
│  GD/FIR Number: [___________________]  │
│  Police Station Name: [_______________]│
│  GD Filing Date: [📅 _______________]   │
│                                         │
│  GD Document Photo:                     │
│  ┌──────────────┐                       │
│  │  📷 Upload    │  ← Direct-to-S3      │
│  │  GD Document  │    (context: gd_doc)  │
│  └──────────────┘                       │
│                                         │
│  ⚠️ WARNING: Filing a false dispute   │
│  may result in account suspension.    │
│                                         │
│  [  File Dispute (i18n: fileDispute) →  ]│
└─────────────────────────────────────────┘
```

- Zod validation: GD number (non-empty string), thana name, filing date (past date, not future).
- GD document upload via Direct-to-S3 presigned URL (`context: 'gd_document'`, private storage).
- On submit: `POST /api/v1/deals/:dealId/disputes`.
- On success: alert "Dispute filed successfully. The seller's account has been temporarily suspended." (i18n key: `disputeFiled`)

**Step 9.3 — Create report history in Profile page:**
- Section in profile showing `GET /api/v1/reports/me`.
- Each report: entity type, reason, submission date, current status badge (Pending, Investigating, Actioned, Dismissed).

---

### PHASE 10: Admin Moderation Dashboard

**Goal:** Build the admin back-office for KYC review, report triage, dispute resolution, and dual-approval ban workflow.

**Step 10.1 — Create `app/(admin)/kyc-queue/page.tsx`:**

Manual KYC review queue with SLA aging:
```
┌──────────────────────────────────────────────────────────┐
│  🪪 KYC Review Queue (12 pending)       SLA Target: <4h  │
├──────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────┐    │
│  │  User: +8801XXXXXXXX · 3 attempts               │    │
│  │  Submitted: 2h 15m ago  🟡 SLA: 1h 45m left     │    │
│  │                                                  │    │
│  │  [NID Front 🖼️]  [NID Back 🖼️]  [Selfie 🖼️]    │    │
│  │                                                  │    │
│  │  [✅ Approve]  [❌ Reject (with reason)]         │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

- Fetch `GET /api/v1/admin/kyc/queue`.
- Each entry shows: phone, attempt count, time since submission, SLA remaining.
- SLA color coding: Green (>2h remaining), Yellow (1-2h), Red (<1h).
- Image previews: Fetch private presigned GET URLs via `GET /api/v1/uploads/private-url?key=<objectKey>`.
- Approve: `PATCH /api/v1/admin/kyc/:userId/approve`.
- Reject: Shows reason input modal → `PATCH /api/v1/admin/kyc/:userId/reject` with `{ reason }`.

**Step 10.2 — Create `app/(admin)/reports/page.tsx`:**

Community reports triage:
- Fetch `GET /api/v1/admin/reports?status=pending`.
- Each report shows: reporter info, entity type/ID, reason, details, timestamp.
- Actions: "Dismiss" or "Quarantine" → `PATCH /api/v1/admin/reports/:reportId/action` with `{ action }`.
- Link to view the reported entity (listing, chat, user).

**Step 10.3 — Create `app/(admin)/disputes/page.tsx`:**

Legal dispute resolution panel:
- Fetch `GET /api/v1/admin/disputes`.
- Each dispute shows: deal info, GD number, thana, filing date, GD document preview, seller freeze status.
- Resolution actions (Super Admin only): `seller_banned`, `claim_dismissed`, `legal_hold`.
- `PATCH /api/v1/admin/disputes/:disputeId/resolve` with `{ resolutionAction }`.

**Step 10.4 — Create `app/(admin)/users/[userId]/page.tsx` (User Moderation):**

User moderation profile with ban workflow:
- Display full user profile, listing history, deal history, report history.
- **Step 1 (Moderator):** "Propose Ban" button → `POST /api/v1/admin/users/:userId/propose-ban` with `{ reason }`.
- **Step 2 (Super Admin):** "Confirm Ban" button (only visible if ban proposed) → `POST /api/v1/admin/users/:userId/confirm-ban`.
- Clear visual distinction between the two steps with approval chain indicator.

**Step 10.5 — Create `app/(admin)/audits/page.tsx`:**

Phone reveal anomaly detection:
- Fetch `GET /api/v1/admin/audits/phone-reveals`.
- Table showing: buyer ID, reveal count today, flagged (>8 reveals/day).
- Highlight anomalous users in red.

---

### PHASE 11: Notifications, PWA & Production Hardening

**Goal:** Build the notification system, Progressive Web App support, performance optimization, and SEO hardening.

**Step 11.1 — Create `components/notification/notification-bell.tsx`:**
- Bell icon in navbar with unread count badge (red circle with number).
- On click: toggle notification dropdown.
- Badge count from Zustand notification store, updated via WebSocket `user_notification` events.

**Step 11.2 — Create `components/notification/notification-dropdown.tsx`:**
- Dropdown panel showing latest 10 notifications.
- Each notification: icon (type-based), title, message, timestamp, read/unread indicator.
- "Mark all as read" button.
- "View all" link → `/dashboard/notifications`.
- Notification types and their icons:
  - `kyc_approved`: ✅ Green checkmark
  - `kyc_rejected`: ❌ Red cross
  - `new_message`: 💬 Chat bubble
  - `offer_received`: 💰 Money bag
  - `offer_accepted`: 🎉 Celebration
  - `offer_expired`: ⏰ Clock
  - `price_drop`: 📉 Down arrow
  - `listing_expiry`: ⚠️ Warning
  - `deal_completed`: 🤝 Handshake
  - `dispute_filed`: ⚖️ Scale
  - `new_device_login`: 🔒 Lock

**Step 11.3 — Create `app/(dashboard)/notifications/page.tsx`:**
Full notification center with all historical notifications. Grouped by date. Infinite scroll pagination.

**Step 11.4 — Create `app/(dashboard)/profile/page.tsx`:**

User profile management:
```
┌─────────────────────────────────────────┐
│  👤 Profile (i18n: profile)            │
├─────────────────────────────────────────┤
│  [Avatar Upload]                        │
│  Display Name: [_______________]        │
│  Phone: +8801XXXXXXXX (read-only)      │
│  KYC Status: ✅ Verified               │
│  Member Since: Jan 2025                │
│  Rating: ⭐ 4.7 (23 deals)            │
│                                         │
│  ─── Notification Preferences ───       │
│  ☑ Push Notifications                   │
│  ☑ SMS Fallback                         │
│  ☑ Price Drop Alerts                    │
│  ☑ Chat Messages                        │
│  Quiet Hours: [22:00] to [08:00]       │
│                                         │
│  ─── Active Devices ───                 │
│  📱 Samsung Galaxy A54 (This device)    │
│  📱 Xiaomi Note 12 Pro                  │
│                                         │
│  [Save Changes]                         │
└─────────────────────────────────────────┘
```

- Avatar upload via Direct-to-S3 (`context: 'avatar'`).
- Update profile: `PATCH /api/v1/users/me/profile`.
- Update notification preferences: `PATCH /api/v1/users/me/notification-preferences`.

**Step 11.5 — Bilingual i18n System:**

Create `lib/i18n/bn.ts` and `lib/i18n/en.ts` with all UI strings:
```typescript
// lib/i18n/bn.ts
export const bn = {
  common: {
    search: 'Search products',
    signIn: 'Sign In',
    postAd: 'Post Ad',
    viewAll: 'View All',
    loadMore: 'Load More',
    save: 'Save',
    cancel: 'Cancel',
    submit: 'Submit',
    delete: 'Delete',
    edit: 'Edit',
    back: 'Back',
    next: 'Next',
    currency: 'BDT',
  },
  home: {
    heroTitle: 'Trusted Marketplace.',
    heroSubtitle: 'NID Verified Buyers & Sellers.',
    categories: 'Browse by Category',
    justAdded: 'Just Added',
    popular: 'Popular Products',
    trustBanner: 'Every user is NID & biometric verified',
  },
  // ... all other sections
};
```

Language toggle stored in localStorage and Zustand. Default: Bengali.

**Step 11.6 — SEO & Meta Tags:**

For every public page, use Next.js `generateMetadata()`:
```typescript
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const listing = await fetchListing(params.id);
  return {
    title: `${listing.title} - ৳${listing.price.toLocaleString()} | Becha-Kena`,
    description: listing.description.slice(0, 160),
    openGraph: {
      title: listing.title,
      description: `৳${listing.price.toLocaleString()} · ${listing.condition} · ${listing.location.division}`,
      images: [listing.imageUrls[0]],
      type: 'product',
    },
  };
}
```

Add JSON-LD structured data for listings (`Product` schema) and user profiles (`Person` schema).

**Step 11.7 — Performance Optimization:**
1. **Image optimization:** Use `next/image` with `sizes` prop for responsive loading. WebP format via sharp.
2. **Code splitting:** Dynamic imports for heavy components (map, camera, chat window).
3. **Prefetching:** `<Link prefetch>` for category and listing pages.
4. **Bundle analysis:** Configure `@next/bundle-analyzer`.
5. **Lighthouse targets:** Performance ≥ 90, Accessibility ≥ 95, SEO ≥ 95 on mobile.

**Step 11.8 — PWA Configuration:**
- Create `public/manifest.json` with app name "Becha-Kena" (Bengali label "Becha-Kena" in i18n), short name "Becha-Kena", theme color `#22C55E`.
- Add service worker for offline caching of static assets and API responses.
- Add "Add to Home Screen" prompt for mobile users.

**Step 11.9 — Error Handling & Loading States:**
- Every page must have a `loading.tsx` sibling with appropriate skeleton UI.
- Every page must have an `error.tsx` sibling with retry capability.
- All API calls via React Query must show: loading skeleton → data → error state.
- Optimistic UI updates for: favorites toggle, message sending, offer actions.
- Network offline detection: Show persistent banner "No internet connection" (i18n key: `noInternet`).

---

## API Integration Quick Reference

### Authentication Flow
```
1. User enters phone → POST /auth/request-otp
2. User enters OTP → POST /auth/verify-otp → Store accessToken in memory
3. On 401 → POST /auth/refresh-token (cookie) → Retry original request
4. Logout → POST /auth/logout → Clear store + redirect to /
```

### Direct-to-Cloud Upload Flow
```
1. User selects file → Validate type/size client-side
2. POST /uploads/presigned-url → Get { uploadUrl, objectKey }
3. PUT file binary directly to uploadUrl (S3) → Show progress bar
4. POST /uploads/confirm { objectKey } → Get { publicUrl }
5. Use publicUrl in listing/profile form submission
```

### WebSocket Event Flow
```
1. Dashboard mount → Connect socket with auth.token
2. Join personal room: user:events_{userId}
3. Enter chat → join_chat { conversationId }
4. Listen: new_message, scam_alert, offer_updated, typing
5. Send: send_message, typing_start, typing_stop
6. Leave chat → leave_chat
7. Dashboard unmount → Disconnect socket
```

### Bengali Category Labels
| Enum Key | Bengali (Transliterated) | English |
|---|---|---|
| `electronics` | Electronics (Ilectronics) | Electronics |
| `vehicles` | Janbahon | Vehicles |
| `property` | Shompotti | Property |
| `fashion` | Fashion | Fashion |
| `home` | Grihashojja | Home & Living |
| `hobbies` | Shokher Ponno | Hobbies |

### Bengali Condition Labels
| Enum Key | Bengali (Transliterated) | English |
|---|---|---|
| `brand_new` | Ekdom Notun | Brand New |
| `like_new` | Notuner Moto | Like New |
| `gently_used` | Olpo Bebohrito | Gently Used |
| `heavily_used` | Beshi Bebohrito | Heavily Used |

---

## How to Use This Prompt

### Option A: Feed Entire Document
Copy this entire `frontend-prompt.md` as a system prompt to an AI coding agent. Then say:
```
"Start with Phase 0. Build each file completely with production-ready code. Move to the next phase only after the current phase compiles and renders without errors."
```

### Option B: Phase-by-Phase Execution
Send one phase at a time:
```
"Execute Phase [N] of the Becha-Kena Frontend Prompt.
The backend is running at http://localhost:5000/api/v1.
Reference the API spec at docs/api-spec.md for exact request/response contracts.
Produce complete, strict TypeScript React components with Tailwind CSS, proper error handling, loading states, and mobile-first responsive design."
```

### Option C: Component-Specific Extraction
Target a specific component:
```
"Build only the Real-Time Chat Window component (Phase 7, Step 7.4).
Follow the WebSocket event contracts from api-spec.md Section 14.
Include Socket.io integration, scam warning banners, offer cards, typing indicators, and infinite scroll message history."
```
