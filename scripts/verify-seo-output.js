const fs = require('fs');
const path = require('path');

function checkFile(relPath, label) {
  const fullPath = path.join('.next/server/app', relPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`${label}: NOT FOUND at ${fullPath}`);
    return;
  }
  const content = fs.readFileSync(fullPath, 'utf8');
  const robotsMatch = content.match(/<meta\s+name=["']robots["']\s+content=["']([^"']+)["']/i);
  const canonicalMatch = content.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
  console.log(`${label}:`);
  console.log(`  Robots:    ${robotsMatch ? robotsMatch[1] : 'NONE (defaults to index, follow)'}`);
  console.log(`  Canonical: ${canonicalMatch ? canonicalMatch[1] : 'NONE'}`);
}

console.log('=== Public Pages (Must be INDEX, FOLLOW with Canonical) ===');
checkFile('index.html', '/ (Home)');
checkFile('about.html', '/about');
checkFile('founder.html', '/founder');
checkFile('jee-preparation.html', '/jee-preparation');
checkFile('neet-preparation.html', '/neet-preparation');
checkFile('cbse-board.html', '/cbse-board');
checkFile('maharashtra-board.html', '/maharashtra-board');
checkFile('blog/how-to-make-a-jee-study-plan.html', '/blog/how-to-make-a-jee-study-plan');

console.log('\n=== Private / Auth Pages (Must be NOINDEX, FOLLOW with Canonical) ===');
checkFile('arena.html', '/arena');
checkFile('chat.html', '/chat');
checkFile('chat-history.html', '/chat-history');
checkFile('home.html', '/home');
checkFile('learning-hub.html', '/learning-hub');
checkFile('planner.html', '/planner');
checkFile('profile.html', '/profile');
checkFile('quiz.html', '/quiz');
checkFile('review.html', '/review');
checkFile('settings.html', '/settings');
checkFile('study-session.html', '/study-session');
checkFile('subscription.html', '/subscription');
checkFile('admin.html', '/admin');
checkFile('login.html', '/login');
checkFile('signup.html', '/signup');
checkFile('onboarding.html', '/onboarding');
checkFile('planner-onboarding.html', '/planner-onboarding');
checkFile('verify-email.html', '/verify-email');
