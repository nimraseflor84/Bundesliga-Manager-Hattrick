const CACHE_NAME = 'bmh-v6';

const ASSETS = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './css/main.css',
    './css/dos-theme.css',
    './fonts/PressStart2P-Regular.woff2',
    './fonts/VT323-Regular.woff2',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png',
    './src/core/EventBus.js',
    './src/core/GameState.js',
    './src/core/Router.js',
    './src/core/SaveManager.js',
    './src/core/AudioManager.js',
    './src/engine/Calendar.js',
    './src/engine/FinanceEngine.js',
    './src/engine/LeagueManager.js',
    './src/engine/MatchEngine.js',
    './src/engine/TransferMarket.js',
    './src/engine/TrainingEngine.js',
    './src/data/teams-bl1.js',
    './src/data/players-bl1.js',
    './src/data/formations.js',
    './src/ui/Screen.js',
    './src/ui/TitleScreen.js',
    './src/ui/NewGameScreen.js',
    './src/ui/DashboardScreen.js',
    './src/ui/MatchDayScreen.js',
    './src/ui/LeagueTableScreen.js',
    './src/ui/FixturesScreen.js',
    './src/ui/SquadScreen.js',
    './src/ui/TacticsScreen.js',
    './src/ui/FinancesScreen.js',
    './src/ui/StadiumScreen.js',
    './src/ui/TransferScreen.js',
    './src/ui/TrainingScreen.js',
];

// Install: cache all assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        })
    );
    self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch: cache-first strategy
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') return;

    // Skip Google Fonts CDN (use cached local fonts)
    if (event.request.url.includes('fonts.googleapis.com') ||
        event.request.url.includes('fonts.gstatic.com')) {
        return;
    }

    event.respondWith(
        caches.match(event.request).then((cached) => {
            if (cached) return cached;

            return fetch(event.request).then((response) => {
                // Cache successful responses
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            }).catch(() => {
                // Offline fallback: return index for navigation requests
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});
