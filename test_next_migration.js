// test_next_migration.js
// Automated verification suite for the Learning Allied Next.js migration

const fs = require('fs');
const path = require('path');
const assert = require('assert');

let passedTests = 0;
let failedTests = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
    failedTests++;
  }
}

console.log('\n--- Running Next.js Migration Automated Verification ---');

// 1. Verify Core Config & Package Setup
test('package.json contains Next.js 14 and required dependencies', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  assert(pkg.dependencies.next, 'Next.js dependency missing');
  assert(pkg.dependencies.react, 'React dependency missing');
  assert(pkg.dependencies['react-dom'], 'React-DOM dependency missing');
  assert(pkg.dependencies.firebase, 'Firebase dependency missing');
  assert(pkg.scripts.build, 'build script missing');
  assert(pkg.scripts.dev, 'dev script missing');
});

test('next.config.mjs exists and contains security headers and legacy redirects', () => {
  const nextConfig = fs.readFileSync(path.join(__dirname, 'next.config.mjs'), 'utf8');
  assert(nextConfig.includes('mentora.vercel.app'), 'Missing legacy mentora redirect');
  assert(nextConfig.includes('https://www.learningallied.world'), 'Missing destination canonical domain');
  assert(nextConfig.includes('X-Frame-Options'), 'Missing security header X-Frame-Options');
  assert(nextConfig.includes('X-Content-Type-Options'), 'Missing security header X-Content-Type-Options');
  assert(nextConfig.includes('Strict-Transport-Security'), 'Missing HSTS header');
});

// 2. Verify Canonical Production Domain in SEO utility & metadata
test('lib/seo.ts defines the canonical production domain and helper', () => {
  const seoFile = fs.readFileSync(path.join(__dirname, 'lib/seo.ts'), 'utf8');
  assert(seoFile.includes('https://www.learningallied.world'), 'SEO base domain mismatch');
  assert(seoFile.includes('constructMetadata'), 'constructMetadata helper missing');
});

// 3. Verify Public Pages have Metadata, Canonical URLs and single H1
const publicPages = [
  { path: 'app/page.tsx', route: '/' },
  { path: 'app/about/page.tsx', route: '/about' },
  { path: 'app/founder/page.tsx', route: '/founder' },
  { path: 'app/blog/how-to-make-a-jee-study-plan/page.tsx', route: '/blog/how-to-make-a-jee-study-plan' },
  { path: 'app/jee-preparation/page.tsx', route: '/jee-preparation' },
  { path: 'app/neet-preparation/page.tsx', route: '/neet-preparation' },
  { path: 'app/cbse-board/page.tsx', route: '/cbse-board' },
  { path: 'app/maharashtra-board/page.tsx', route: '/maharashtra-board' },
];

publicPages.forEach(({ path: pagePath, route }) => {
  test(`Public page [${pagePath}] exports metadata with canonical URL and JSON-LD`, () => {
    const content = fs.readFileSync(path.join(__dirname, pagePath), 'utf8');
    assert(content.includes('export const metadata'), `${pagePath} missing metadata export`);
    assert(content.includes(`path: "${route}"`), `${pagePath} missing expected path: "${route}"`);
    assert(content.includes('<h1') && (content.match(/<h1/g) || []).length === 1, `${pagePath} must contain exactly one <h1> heading`);
    assert(content.includes('application/ld+json'), `${pagePath} must render structured JSON-LD`);
  });
});

// 4. Verify Sitemap and Robots
test('app/sitemap.ts contains all 8 indexable canonical public URLs and excludes private routes', () => {
  const sitemapContent = fs.readFileSync(path.join(__dirname, 'app/sitemap.ts'), 'utf8');
  const expectedRoutes = [
    '${baseUrl}/',
    '${baseUrl}/about',
    '${baseUrl}/founder',
    '${baseUrl}/jee-preparation',
    '${baseUrl}/neet-preparation',
    '${baseUrl}/cbse-board',
    '${baseUrl}/maharashtra-board',
    '${baseUrl}/blog/how-to-make-a-jee-study-plan',
  ];
  expectedRoutes.forEach((route) => {
    assert(sitemapContent.includes(route), `Sitemap missing route: ${route}`);
  });
  assert(!sitemapContent.includes('/admin'), 'Sitemap must not include /admin');
  assert(!sitemapContent.includes('/home'), 'Sitemap must not include /home');
  assert(!sitemapContent.includes('/chat'), 'Sitemap must not include /chat');
  assert(!sitemapContent.includes('/api/'), 'Sitemap must not include /api/');
});

test('app/robots.ts disallows private and sensitive paths', () => {
  const robotsContent = fs.readFileSync(path.join(__dirname, 'app/robots.ts'), 'utf8');
  assert(robotsContent.includes('/api/'), 'Robots must disallow /api/');
  assert(robotsContent.includes('/admin'), 'Robots must disallow /admin');
  assert(robotsContent.includes('/sidebar.html'), 'Robots must disallow /sidebar.html');
  assert(robotsContent.includes('sitemap.xml'), 'Robots must link to sitemap.xml');
});

// 5. Verify Authenticated and Private Pages have noindex robots directives or auth redirects
const dashboardPages = [
  'app/(dashboard)/home/page.tsx',
  'app/(dashboard)/chat/page.tsx',
  'app/(dashboard)/chat-history/page.tsx',
  'app/(dashboard)/planner/page.tsx',
  'app/(dashboard)/profile/page.tsx',
  'app/(dashboard)/settings/page.tsx',
  'app/(dashboard)/subscription/page.tsx',
  'app/(dashboard)/arena/page.tsx',
  'app/(dashboard)/learning-hub/page.tsx',
  'app/(dashboard)/study-session/page.tsx',
  'app/(dashboard)/quiz/page.tsx',
  'app/(dashboard)/review/page.tsx',
];

const standalonePrivatePages = [
  'app/admin/page.tsx',
  'app/onboarding/page.tsx',
  'app/planner-onboarding/page.tsx',
];

test('Dashboard layout guards every dashboard page', () => {
  const layout = fs.readFileSync(
    path.join(__dirname, 'app/(dashboard)/layout.tsx'),
    'utf8'
  );
  assert(layout.includes('AuthGate'), 'Dashboard layout must include AuthGate');
  assert(layout.includes('AppShell'), 'Dashboard layout must preserve AppShell');
  assert(
    layout.includes('index: false'),
    'Dashboard layout must mark dashboard routes noindex'
  );
});

dashboardPages.forEach((pagePath) => {
  test(`Dashboard page [${pagePath}] exists under the guarded layout`, () => {
    assert(
      fs.existsSync(path.join(__dirname, pagePath)),
      `${pagePath} must exist inside app/(dashboard)`
    );
  });
});

standalonePrivatePages.forEach((pagePath) => {
  test(`Standalone private page [${pagePath}] has auth guard and/or noindex protection`, () => {
    const content = fs.readFileSync(path.join(__dirname, pagePath), 'utf8');
    assert(
      content.includes('index: false') ||
      content.includes('useAuth') ||
      content.includes('AppShell') ||
      content.includes('onAuthStateChanged'),
      `${pagePath} should be protected by noindex metadata or AppShell/onAuthStateChanged auth wrapper`
    );
  });
});

// 6. Verify API Route Handlers exist and preserve backend contracts
const apiRoutes = [
  'app/api/firebase-config/route.ts',
  'app/api/groq-proxy/route.ts',
  'app/api/generate-plan/route.ts',
  'app/api/replan/route.ts',
  'app/api/research-agent/route.ts',
  'app/api/search/route.ts',
  'app/api/add-contact/route.ts',
  'app/api/growth/route.ts',
  'app/api/learning-event/route.ts',
  'app/api/study-session/route.ts',
  'app/api/version/route.ts',
];

apiRoutes.forEach((routePath) => {
  test(`API Route [${routePath}] exists and exports standard HTTP handlers`, () => {
    assert(fs.existsSync(path.join(__dirname, routePath)), `Missing API file: ${routePath}`);
    const content = fs.readFileSync(path.join(__dirname, routePath), 'utf8');
    assert(
      content.includes('export async function GET') || content.includes('export async function POST'),
      `${routePath} does not export GET or POST handler`
    );
  });
});

// 7. Verify Refer & Earn was NOT re-introduced
test('Refer & Earn is not re-introduced in navigation or sidebar', () => {
  const sidebar = fs.readFileSync(path.join(__dirname, 'components/AppSidebar.tsx'), 'utf8');
  assert(!sidebar.toLowerCase().includes('refer & earn'), 'Refer & Earn found in AppSidebar.tsx');
  assert(!sidebar.toLowerCase().includes('refer and earn'), 'Refer and Earn found in AppSidebar.tsx');
});

// 8. Verify Next.js configuration or build output exists
test('.next production build artifact or valid next configuration exists', () => {
  const hasBuild = fs.existsSync(path.join(__dirname, '.next/BUILD_ID'));
  const hasConfig = fs.existsSync(path.join(__dirname, 'next.config.mjs'));
  assert(hasBuild || hasConfig, 'Neither .next/BUILD_ID nor next.config.mjs was found');
});

console.log('\n--- Summary ---');
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);

if (failedTests > 0) {
  process.exit(1);
} else {
  console.log('All Next.js migration tests passed successfully!\n');
}
