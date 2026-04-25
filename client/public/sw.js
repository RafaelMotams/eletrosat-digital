// Service Worker - Eletrosat Técnico
// v2 - Não cacheia arquivos JS/TS do Vite para evitar servir versões antigas
const CACHE_NAME = 'eletrosat-v2';
const STATIC_ASSETS = ['/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não intercepta chamadas de API tRPC — deixa passar normalmente
  if (url.pathname.startsWith('/api/')) return;

  // Não cacheia arquivos JS/TS do Vite (evita servir versões antigas durante desenvolvimento)
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@') || 
      url.pathname.includes('.tsx') || url.pathname.includes('.ts') ||
      url.pathname.includes('.js') || url.pathname.includes('node_modules')) {
    return; // Deixa o browser buscar direto do servidor
  }

  // Para assets estáticos HTML: cache-first com network fallback
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(response => {
        // Cacheia apenas respostas HTML bem-sucedidas
        if (response && response.status === 200 && event.request.method === 'GET' &&
            response.headers.get('content-type')?.includes('text/html')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => caches.match('/') || new Response('Offline', { status: 503 }));
    })
  );
});
