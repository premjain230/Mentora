# Learning Allied — Search Engine & Analytics Integration Guide

This guide provides official verification and configuration procedures for connecting Learning Allied (`https://learningallied.world`) to major search engines, analytics platforms, and AI indexers.

---

## 1. Google Search Console (GSC)

### Verification Methods
1. **HTML File Verification (Already Deployed)**:
   - File path: `public/googlea0922a137d66d3af.html`
   - URL: `https://www.learningallied.world/googlea0922a137d66d3af.html`
   - Verification code: `googlea0922a137d66d3af`
   - Action: In Google Search Console, choose "HTML file" verification and click **Verify**.

2. **HTML Meta Tag Verification**:
   - The Root Layout (`app/layout.tsx`) includes:
     ```html
     <meta name="google-site-verification" content="googlea0922a137d66d3af" />
     ```
   - You can also customize this via the environment variable:
     `NEXT_PUBLIC_GSC_VERIFICATION=<your_token>`

3. **DNS TXT Record (Recommended for root domain)**:
   - Record type: `TXT`
   - Host / Name: `@`
   - Value: `google-site-verification=<your_token>`

### Post-Verification Steps
- Submit XML Sitemap: In GSC sidebar, navigate to **Sitemaps** &rarr; Add:
  `https://www.learningallied.world/sitemap.xml`
- Inspect URLs: Request indexing for:
  - `https://www.learningallied.world/`
  - `https://www.learningallied.world/best-ai-study-tools`
  - `https://www.learningallied.world/learning-allied-vs-chatgpt`
  - `https://www.learningallied.world/jee-preparation`
  - `https://www.learningallied.world/neet-preparation`

---

## 2. Google Analytics 4 (GA4) & Vercel Analytics

### Vercel Web Analytics & Speed Insights
- Already built into `app/layout.tsx`:
  - `<Analytics />` from `@vercel/analytics/react`
  - `<SpeedInsights />` from `@vercel/speed-insights/next`
- Real-time Core Web Vitals (LCP, FID/INP, CLS) are automatically captured on production deployments.

### Adding Google Analytics 4 (GA4)
To connect your GA4 Measurement ID:
1. Add `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX` to `.env.local` or Vercel Environment Variables.
2. The platform supports standard GA4 gtag event dispatching for pageviews, signup conversions, and quiz completions.

---

## 3. Bing Webmaster Tools & IndexNow

### Bing Webmaster Tools Verification
1. **Direct Import from Google Search Console**:
   - In Bing Webmaster Tools, select "Import your sites from GSC". This instantly authenticates `https://learningallied.world`.
2. **HTML Meta Tag Verification**:
   - Add your Bing verification token to `.env.local`:
     `NEXT_PUBLIC_BING_VERIFICATION=<your_bing_code>`
   - The root layout injects `<meta name="msvalidate.01" content="..." />`.

### IndexNow Protocol (Instant Submission)
Learning Allied is equipped with native IndexNow protocol support:
- Verification key file: `https://www.learningallied.world/d7e891c94b7e4f169cb4812f8649ab01.txt`
- Key value: `d7e891c94b7e4f169cb4812f8649ab01`
- Instant Submission Endpoint:
  - `POST https://www.learningallied.world/api/indexnow`
  - Submits all 28 canonical URLs simultaneously to `api.indexnow.org` and `bing.com/indexnow`.
  - Accessible via the internal **Admin Growth Dashboard** (`/admin`).

---

## 4. AI Search & GEO (Generative Engine Optimization)

Learning Allied publishes standardized machine-readable manifests for LLMs:
- **`https://www.learningallied.world/llms.txt`**: Standard machine manifest outlining identity, core pedagogy, Socratic framework, and canonical hubs.
- **`https://www.learningallied.world/llms-full.txt`**: Deep architectural knowledge base for Perplexity AI, ChatGPT Search, Gemini, and ClaudeBot.
- **`robots.txt`**: Explicitly permits AI crawlers:
  - `GPTBot` (OpenAI training)
  - `OAI-SearchBot` (ChatGPT Search live indexer)
  - `PerplexityBot` (Perplexity AI real-time engine)
  - `ClaudeBot` (Anthropic AI)
  - `Google-Extended` (Google Gemini)

---

## 5. Security & Privacy Compliance

- **DPDP Act 2023**: Fully compliant with India's Digital Personal Data Protection Act.
- **Private Route Protection**:
  - All private learning dashboards (`/home`, `/arena`, `/chat`, `/learning-hub`, `/quiz`, `/study-session`, `/planner`, `/profile`, `/settings`), onboarding flows, and admin portals are protected with `robots: { index: false }` and `Disallow` directives to prevent indexing of user sessions.
