/// <reference lib="webworker" />

// This is a placeholder service worker file.
// The actual implementation using Workbox will be done in Milestone M6.

// Example of basic service worker lifecycle event listeners (optional for now)
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  // Perform install steps, like caching assets (will be done with Workbox later)
  // event.waitUntil(...); // Example usage
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  // Perform activate steps, like cleaning up old caches
  // event.waitUntil(...); // Example usage
});

self.addEventListener('fetch', (event: Event) => {
  // Explicitly cast event to FetchEvent
  const fetchEvent = event as FetchEvent;
  console.log('Service Worker: Fetching', fetchEvent.request.url);
  // Handle fetch requests (e.g., serve from cache) - Workbox will handle this
  // fetchEvent.respondWith(...); // Example usage
});
