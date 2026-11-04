async function verifyRedirects() {
  const configModule = await import('../next.config.mjs');
  const nextConfig = configModule.default || configModule;
  const redirects = await nextConfig.redirects();

  console.log('=== Total Redirect Rules Configured in next.config.mjs ===');
  console.log(`Count: ${redirects.length}`);

  const testCases = [
    '/index.html',
    '/about.html',
    '/admin.html',
    '/arena.html',
    '/cbse-board.html',
    '/chat.html',
    '/chat-history.html',
    '/founder.html',
    '/home.html',
    '/jee-preparation.html',
    '/learning-hub.html',
    '/login.html',
    '/maharashtra-board.html',
    '/neet-preparation.html',
    '/onboarding.html',
    '/planner.html',
    '/planner-onboarding.html',
    '/profile.html',
    '/quiz.html',
    '/review.html',
    '/settings.html',
    '/signup.html',
    '/study-session.html',
    '/subscription.html',
    '/verify-email.html',
    '/blog/how-to-make-a-jee-study-plan.html',
  ];

  console.log('\n=== Testing Redirect Matching for .html URLs ===');
  for (const tc of testCases) {
    let matched = false;
    for (const rule of redirects) {
      if (rule.has) continue; // host specific rules
      
      // Match using RegExp or exact
      if (rule.source === tc) {
        console.log(`  ✓ ${tc} -> ${rule.destination} (HTTP ${rule.permanent ? 308 : 307})`);
        matched = true;
        break;
      }
      
      // path-to-regexp style test for :page(...)
      if (rule.source.includes(':page(')) {
        const regexStr = rule.source.replace(/:page\(([^)]+)\)/, '(?<page>$1)');
        const regex = new RegExp(`^${regexStr}$`);
        const match = tc.match(regex);
        if (match) {
          const dest = rule.destination.replace(':page', match.groups.page);
          console.log(`  ✓ ${tc} -> ${dest} (HTTP ${rule.permanent ? 308 : 307})`);
          matched = true;
          break;
        }
      }
    }
    if (!matched) {
      console.error(`  ✗ NO MATCH FOR ${tc}`);
      process.exitCode = 1;
    }
  }

  // Ensure /sidebar.html and /googlea0922a137d66d3af.html are NOT redirected
  console.log('\n=== Verifying Exceptions Are NOT Redirected ===');
  for (const exc of ['/sidebar.html', '/googlea0922a137d66d3af.html']) {
    let matched = false;
    for (const rule of redirects) {
      if (rule.has) continue;
      if (rule.source === exc) { matched = true; break; }
      if (rule.source.includes(':page(')) {
        const regexStr = rule.source.replace(/:page\(([^)]+)\)/, '(?<page>$1)');
        const regex = new RegExp(`^${regexStr}$`);
        if (exc.match(regex)) { matched = true; break; }
      }
    }
    if (matched) {
      console.error(`  ✗ EXCEPTION ${exc} WAS UNEXPECTEDLY REDIRECTED`);
      process.exitCode = 1;
    } else {
      console.log(`  ✓ ${exc} correctly NOT redirected (remains static asset)`);
    }
  }
}

verifyRedirects().catch(console.error);
