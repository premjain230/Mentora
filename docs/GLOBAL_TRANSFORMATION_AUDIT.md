# LEARNING ALLIED — GLOBAL PERSONAL AI LEARNING OS
## DEEP ARCHITECTURAL AUDIT & SAFETY CHECKPOINT (PHASE 1)

**Audit Date:** 2026-11-23  
**Status:** Complete & Verified  
**Branch:** `feat/global-learning-os`  
**Safety Checkpoint Branch:** `backup/pre-global-transformation` (Commit `7ee60a2`)

---

### 1. Git & Environment Safety Audit
- **Working Tree State:** Completely clean prior to branching.
- **Safety Checkpoint Created:** `backup/pre-global-transformation` created at `7ee60a2` (preserving exact pre-transformation state).
- **Working Branch:** Dedicated `feat/global-learning-os` checked out. No direct push or force-push to `main`.
- **Environment & Secret Hygiene:**
  - Client bundle keys: Firebase Web API config only (public client credentials).
  - Server-side keys: `GEMINI_API_KEY`, `GROQ_API_KEY`, `FIREBASE_ADMIN_*`, `STRIPE_SECRET_KEY`, `RAZORPAY_KEY_SECRET` loaded via server environment variables only.
  - Zero secrets committed to Git (`.env.local` and sensitive credentials properly gitignored).

---

### 2. Tech Stack & Infrastructure Mapping
- **Framework:** Next.js 14.2.15 (App Router with legacy HTML redirects and backwards compatibility).
- **Runtime:** Node.js 24.x compatible.
- **Frontend Core:** React 18.3.1, TypeScript 5.4.5, CSS modules + styled-jsx + vanilla lifecycle managers via `<VanillaPage />`.
- **Backend / API Layer:** Next.js Route Handlers (`app/api/*/route.ts`) delegating to modular server engines (`server/*.js`).
- **Database & Auth:**
  - Client: Firebase 10.12.0 (Auth, Firestore Client).
  - Server: Firebase Admin 12.7.0 (Server-authoritative token validation, Admin SDK Firestore, Claims verification).
- **AI Infrastructure:**
  - Primary Provider: Google Gemini (`@google/genai` 3.3.0 & REST v1beta fallback).
  - Fallback Provider: Groq (`llama-3.3-70b-versatile`, `llama-3.1-8b-instant`).
  - Architecture: Multi-provider failover engine (`server/_ai.js`) with automatic 429/5xx/timeout failover, signal isolation, and streaming recovery.
- **Deployment Platform:** Vercel (configured via `vercel.json`).

---

### 3. Existing Feature & Domain Audit

#### A. Learning Hub (`vanilla/learning-hub.js`, `server/_curriculum.js`, `server/_learn-core.js`)
- **Current Data Model:** Hardcoded to 5 Indian tracks: `maharashtra`, `cbse`, `jee_main`, `jee_advanced`, `neet`.
- **Current Granularity:** `Track` -> `Class` (9, 10, 11, 12) -> `Subject` -> `Chapter/Concept`.
- **Indian Assumptions:**
  - Hardcoded "Class 9", "Class 10", "Class 11", "Class 12" terminology everywhere.
  - NCERT / Balbharati assumptions in naming and subject mappings.
  - Does not support provincial/state curriculum models (e.g., US CCSS/NGSS, UK Key Stage/GCSE/A-Level awarding bodies, Canada provincial boards, Australia ACARA/VCE/HSC, NZ NCEA, Singapore G1/G2/G3).

#### B. Arena (`vanilla/arena.js`, `vanilla/arena/progress.js`, `server/_arena.js`)
- **Sequential Locking Bottleneck Identified:**
  - `vanilla/arena/progress.js:127`: `canBattle(chapter, progress, chapters)` enforces `if (entry.state === ArenaState.LOCKED) return { ok: false, reason: "Locked — defeat previous chapter first" }` and blocks battle entry if previous chapter is not defeated.
  - `vanilla/arena.js:533-568`: Nodes default to `state: "locked"` and padlock glyph `🔒` for any non-initial chapter.
  - `vanilla/arena.js:769`: `els.enterBattleBtn.disabled = !allowed.ok`.
- **Remediation Plan:** Eliminate sequential locks; unlock all chapters and lessons for open navigation from day one; replace hard blocking with non-blocking "Recommended Prerequisites" preview pills; ensure completion status (`defeated` / `mastered`) is earned through verified assessment rather than page visits.

#### C. AI Tutoring Engine (`server/_ai.js`, `server/_learn-core.js`, `server/_learn-adaptive.js`)
- **Prompt Grounding Audit:**
  - Context block currently appends only Indian board/class info: `Board/exam: ${track.label}`, `Class: ${classNum}`.
  - Regional spelling (e.g., `colour` vs `color`, `gradient` vs `slope`, `BIDMAS` vs `PEMDAS`), units (metric vs US customary), currency ($ vs £ vs ₹), and exam command rubrics are not currently parameterized.
- **Remediation Plan:** Enhance context injection layer with Country, Authority, Qualification, Grade/Stage, Regional Spelling, Units/Notation, Exam Style, and Syllabus Scope boundaries.

#### D. Monetization & Subscriptions (`lib/subscription.ts`, `components/UpgradeModal.tsx`, `vanilla/subscription.js`)
- **Current State:** Early Access mode with request form; hardcoded `₹0 / forever` and `JEE/NEET aspirants` text in `SubscriptionMarkup.tsx`.
- **Remediation Plan:** Abstract billing behind a provider-agnostic `BillingProvider` interface supporting Stripe (global) and Razorpay (India), multi-currency pricing tiers (USD, GBP, EUR, CAD, AUD, NZD, SGD, AED, SAR, INR), transparent billing tables, and parent authorization consent.

#### E. SEO & Sitemaps (`app/sitemap.ts`, `lib/seo.ts`)
- **Current State:** Static list of 43 Indian and general routes with `en-IN` hreflang default.
- **Remediation Plan:** Scalable hierarchical curriculum routes (`/curriculum/[country]/...`), canonical URLs, hreflang alternates, valid JSON-LD (`Course`, `EducationalOccupationalProgram`), and anti-thin-content gating (`noindex` + exclusion from sitemaps for unverified or empty nodes).

#### F. Security & Firestore Rules (`firestore.rules`)
- **Current State:** Tight rules on `users/{userId}`, `entitlements/{userId}`, `usage/{userId}`.
- **Audit Finding:** Assessment scores and arena battles are verified server-side (`/api/arena`). Ensure curriculum data is publicly readable and user progress writes conform to strict schemas.

---
### 4. Baseline Regression Test Verification
- Ran existing regression suite: **128 passed, 0 failed**.
- Ran feedback system verification: **17 passed, 0 failed**.
- Ran Next.js migration verification: **46 passed, 0 failed**.
- Total pre-transformation baseline: **191 tests passing with 0 errors**.
