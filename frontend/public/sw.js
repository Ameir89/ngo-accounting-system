// frontend/public/sw.js

const CACHE_NAME = 'ngo-accounting-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install SW
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
  );
});

// Background sync for offline transactions
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

const doBackgroundSync = async () => {
  // Sync pending transactions when online
  const pendingTransactions = await getStoredTransactions();
  
  for (const transaction of pendingTransactions) {
    try {
      await fetch('/api/journal-entries', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredToken()}`
        },
        body: JSON.stringify(transaction)
      });
      
      // Remove from local storage after successful sync
      await removeStoredTransaction(transaction.id);
    } catch (error) {
      console.error('Sync failed for transaction:', transaction.id);
    }
  }
};