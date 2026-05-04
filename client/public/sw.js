// Service Worker — Eletrosat Digital / Netvionis
// v4 — Cache-first para assets, Network-first para API, Background Sync para OS pendentes
const CACHE_NAME = 'netvionis-v4';

// Assets essenciais para funcionar offline
const OFFLINE_ASSETS = ['/tecnico'];

// ── Install ────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

// ── Activate: limpa caches antigos ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Removendo cache antigo:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não intercepta chamadas de API — deixa passar normalmente (tRPC lida com offline)
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/manus-storage/')) return;

  // Não intercepta arquivos de desenvolvimento do Vite
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@') ||
      url.pathname.includes('node_modules') || url.pathname.includes('__manus__')) {
    return;
  }

  // Assets estáticos (JS, CSS, imagens, fontes): Cache-first
  if (url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/) ||
      url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;
        return fetch(event.request).then(response => {
          if (response && response.ok && event.request.method === 'GET') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        }).catch(() => cached || new Response('', { status: 404 }));
      })
    );
    return;
  }

  // Demais requisições (HTML, etc.): Network-first com fallback para cache
  event.respondWith(
    fetch(event.request.clone())
      .then(response => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          return caches.match('/tecnico') || new Response(
            `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Eletrosat Digital — Offline</title>
  <style>
    body { font-family: sans-serif; display: flex; align-items: center; justify-content: center;
           height: 100vh; margin: 0; background: #0a0f1e; color: #e2e8f0;
           flex-direction: column; gap: 12px; text-align: center; padding: 1rem; }
    .icon { font-size: 3rem; }
    h1 { font-size: 1.25rem; margin: 0; }
    p { font-size: 0.875rem; color: #94a3b8; max-width: 280px; margin: 0; }
  </style>
</head>
<body>
  <div class="icon">📡</div>
  <h1>Sem conexão</h1>
  <p>Suas OS salvas localmente serão sincronizadas quando a internet voltar.</p>
</body>
</html>`,
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
  );
});

// ── Background Sync: dispara sincronização quando internet voltar ──────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-os-pendentes') {
    event.waitUntil(
      self.clients.matchAll({ includeUncontrolled: true, type: 'window' }).then(clients => {
        clients.forEach(client => client.postMessage({ type: 'TRIGGER_SYNC' }));
      })
    );
  }
});

// ── Mensagens do cliente ───────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING' || event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
