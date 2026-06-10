// Vercel Web Analytics initialization
// This script initializes Vercel Web Analytics using the script injection method
// Recommended for vanilla HTML/JavaScript projects

(function() {
  // Initialize the Vercel Analytics queue
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  // Load the Vercel Analytics script
  var script = document.createElement('script');
  script.defer = true;
  script.src = 'https://cdn.vercel-insights.com/v1/script.js';
  
  // Append to head
  document.head.appendChild(script);
})();
