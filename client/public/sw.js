// Service Worker - Nestdrion
// v3 - Network-first: sempre busca do servidor, usa cache só quando offline
const CACHE_NAME = 'nestdrion-v3';

// Assets essenciais para funcionar offline (apenas shell básico)
const OFFLINE_ASSETS = ['/tecnico'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(OFFLINE_ASSETS).catch(() => {});
    })
  );
  // Força ativação imediata sem esperar tabs antigas fecharem
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    // Remove TODOS os caches antigos (inclusive nestdrion-v1 e nestdrion-v2)
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => {
        console.log('[SW] Removendo cache antigo:', k);
        return caches.delete(k);
      }))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Não intercepta chamadas de API — deixa passar normalmente
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/manus-storage/')) return;

  // Não intercepta arquivos de desenvolvimento do Vite
  if (url.pathname.startsWith('/src/') || url.pathname.startsWith('/@') ||
      url.pathname.includes('node_modules') || url.pathname.includes('__manus__')) {
    return;
  }

  // Estratégia NETWORK-FIRST para tudo:
  // 1. Tenta buscar do servidor (sempre pega versão mais recente)
  // 2. Se offline ou erro de rede, usa cache como fallback
  event.respondWith(
    fetch(event.request.clone())
      .then(response => {
        // Se a resposta for válida, atualiza o cache e retorna
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Offline: usa cache se disponível
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Fallback para a raiz do app técnico
          return caches.match('/tecnico') || new Response(
            '<html><body style="background:#0a0f1e;color:white;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:12px">' +
            '<p style="font-size:18px;font-weight:bold">Sem conexão</p>' +
            '<p style="font-size:14px;color:#94a3b8">Verifique sua internet e tente novamente</p>' +
            '</body></html>',
            { status: 503, headers: { 'Content-Type': 'text/html' } }
          );
        });
      })
  );
});

// Escuta mensagens do cliente para forçar atualização
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))));
  }
});
