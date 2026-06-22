# Daily Bug Report - 2026-06-22

Repository: `premjain230/Mentora`
Default branch inspected: `main`
Audit run time: 2026-06-22 01:19:00 -05:00

## Summary

- Total issues found: 8
- Total issues fixed: 3
- Remaining issues: 5
- Pull request branch: `bugfix/daily-audit-2026-06-22`

## Validation Status

- `npm install`: Passed. Installed 2 packages and npm audit during install reported 0 vulnerabilities.
- `npm audit --audit-level=moderate`: Passed. 0 vulnerabilities found.
- `npm run build`: Passed. Current build script is a no-op for vanilla HTML.
- `npm run test`: Passed. Current test script is a placeholder (`No tests specified`).
- `npm run lint`: Failed. `package.json` does not define a `lint` script.

Tooling note: local `git` and `gh` were not available on PATH in the automation environment, so latest `main` was inspected and updated through the connected GitHub app. npm validation was run from a local manifest copy.

## Fixed Issues

### 1. Browser analytics module import fails

- File location: `analytics.js`
- Severity: High
- Root cause: The file is loaded directly by vanilla HTML pages as a browser ES module, but it imported `@vercel/analytics` as a bare package specifier. Browsers cannot resolve bare package imports without a bundler or import map.
- Recommended fix: Use a browser-resolvable ESM URL or add a bundling step.
- Status: Fixed by changing the import to `https://esm.sh/@vercel/analytics`.

### 2. Browser speed insights module import fails

- File location: `speed-insights.js`
- Severity: High
- Root cause: The file is loaded directly by vanilla HTML pages as a browser ES module, but it imported `@vercel/speed-insights` as a bare package specifier.
- Recommended fix: Use a browser-resolvable ESM URL or add a bundling step.
- Status: Fixed by changing the import to `https://esm.sh/@vercel/speed-insights`.

### 3. Sitemap points to stale deployment URLs

- File location: `sitemap.xml`
- Severity: Medium
- Root cause: The sitemap referenced `https://aquila-sand.vercel.app/...`, while page metadata uses `https://aquila-ai.vercel.app/` as canonical.
- Recommended fix: Keep sitemap URLs aligned with the canonical production host and only include public crawlable pages.
- Status: Fixed by updating the sitemap to the canonical host and public landing/auth pages.

## Remaining Issues

### 4. Lint validation is unavailable

- File location: `package.json`
- Severity: Medium
- Root cause: The repository has no `lint` script, so the requested lint validation cannot run in automation or CI.
- Recommended fix: Add an HTML/CSS/JS linting setup appropriate for the vanilla app, then wire it to `npm run lint`.
- Status: Remaining.

### 5. Test coverage is a placeholder

- File location: `package.json`
- Severity: Medium
- Root cause: `npm run test` only echoes `No tests specified`, so regressions in auth, Firebase flows, API contracts, and routing are not validated.
- Recommended fix: Add focused browser/API smoke tests for login, signup, chat, quiz, planner onboarding, and protected-route redirects.
- Status: Remaining.

### 6. Referenced SEO/social assets are missing

- File location: `index.html`, repository root
- Severity: Medium
- Root cause: `index.html` references `/og-image.png` and `/logo.png`, but those files were not found. Social previews and structured data logo references may be broken.
- Recommended fix: Add the referenced assets or update metadata to point at existing production assets.
- Status: Remaining.

### 7. Landing-page icon classes have no loaded icon font

- File location: `index.html`
- Severity: Medium
- Root cause: The page uses Tabler-style classes such as `ti ti-search`, `ti ti-user`, and `ti ti-bolt`, but no Tabler icon stylesheet is loaded. On mobile, some button text is hidden, leaving icon-only controls with no visible icon.
- Recommended fix: Add the intended icon stylesheet or replace those `<i>` tags with inline SVG icons.
- Status: Remaining.

### 8. AI API endpoints do not enforce server-side Firebase auth

- File location: `api/chat.js`, `api/generate-plan.js`, `api/replan.js`
- Severity: High
- Root cause: Frontend pages are auth-gated, but the serverless API handlers do not verify Firebase ID tokens before processing expensive AI requests. `generate-plan` and `replan` receive an Authorization header from the browser, but the handlers do not validate it.
- Recommended fix: Add Firebase Admin token verification or an equivalent server-side auth gate before calling Groq, while preserving rate limits and CORS.
- Status: Remaining.

## Security Findings

- No npm package vulnerabilities were found by `npm audit --audit-level=moderate`.
- No secret values were exposed or copied into the report.
- Required environment variable names are documented in `.env.example`; live Vercel environment values were not inspected.
- Highest remaining security risk: unauthenticated server-side AI endpoints can be abused if reachable from an allowed origin or same-origin context.

## Performance Recommendations

- Avoid serving duplicate inline CSS/JS across every HTML page long term; shared static assets would reduce payload size and maintenance risk.
- Keep telemetry imports browser-resolvable for vanilla pages, or introduce a real build step if package imports are preferred.
- Consider durable rate limiting for serverless functions; the current in-memory map can reset across serverless instances.

## Deployment Status

- `vercel.json` is present and configures `api/*.js` functions.
- Static build command passes, but it is currently a no-op.
- Lint is unavailable and test coverage is placeholder-only.
- The applied fixes are low-risk static-file changes and should deploy through Vercel with the existing static/function setup.
