/* ══════════════════════════════════════════════════════════════
   SERVICE WORKER — CONTROLE TÉCNICO AGRÍCOLA
   Estratégia: Cache First para assets, Network First para APIs externas
   Versão: incrementar CACHE_NAME sempre que publicar nova versão do app
══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'agro-v8.4';

/* Assets do próprio repositório — sempre em cache */
const ASSETS_LOCAIS = [
  './',
  './index.html',
  './manifest.json',
  './icone_agro.png',
  './css/style.css',
  './js/app.js',
];

/* CDNs externos — baixados e guardados no primeiro acesso */
const ASSETS_CDN = [
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.2/papaparse.min.js',
  'https://cdn.jsdelivr.net/npm/chart.js',
];

/* APIs externas — network first, sem fallback offline (retorna erro amigável) */
/* APIs externas — network first, sem fallback offline (retorna erro amigável) */
const API_HOSTS_ONLINE = [
  'power.larc.nasa.gov',           // NASA POWER (GDA)
  'router.project-osrm.org',       // OSRM (ETA logística)
  'fonts.gstatic.com',             // Google Fonts arquivos de fonte
  'ka-f.fontawesome.com',          // Font Awesome kits
  'docs.google.com'                // 👈 ADICIONADO: Google Sheets (Planilha Atualizada)
];

// ── INSTALL: pré-cacheia tudo ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Assets locais: falha se um não carregar (crítico)
      const localPromise = cache.addAll(ASSETS_LOCAIS);

      // CDNs: tenta um por um, ignora falhas individuais (non-critical)
      const cdnPromises = ASSETS_CDN.map(url =>
        fetch(url, { mode: 'cors' })
          .then(res => {
            if (res.ok) return cache.put(url, res);
          })
          .catch(() => { /* CDN offline no install — ok, tentará depois */ })
      );

      return Promise.all([localPromise, ...cdnPromises]);
    })
    .then(() => self.skipWaiting())
  );
});

// ── ACTIVATE: remove caches antigos ───────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── MESSAGE: permite que a página peça pro SW novo assumir na hora,
//    em vez de esperar todas as abas fecharem (usado pela auto-atualização) ──
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── LIMPEZA PERIÓDICA DE CACHE (quando o navegador suporta Periodic
//    Background Sync). Mesmo sem essa API, a estratégia Network First
//    abaixo já garante que HTML/CSS/JS do app nunca fiquem presos numa
//    versão antiga — isso aqui é uma camada extra de segurança para
//    remover qualquer cache órfão de tempos em tempos. ──
self.addEventListener('periodicsync', event => {
  if (event.tag === 'agro-cache-cleanup') {
    event.waitUntil(
      caches.keys().then(keys =>
        Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
      )
    );
  }
});

// ── FETCH: lógica de cache ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  const isLocal = url.origin === self.location.origin;

  // 1. APIs externas (NASA, OSRM…) → Network Only
  if (API_HOSTS_ONLINE.some(host => url.hostname.includes(host))) {
    event.respondWith(
      fetch(event.request).catch(() =>
        new Response(
          JSON.stringify({ error: 'offline', message: 'Sem conexão com a internet.' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      )
    );
    return;
  }

  if (event.request.method !== 'GET') return;

  // 2. Assets locais (HTML/CSS/JS do próprio app) → NETWORK FIRST.
  //    Sempre tenta buscar a versão mais nova do servidor primeiro; só cai
  //    pro cache se estiver offline. É isso que garante que o usuário
  //    sempre recebe a última versão publicada, sem depender de limpar
  //    cache manualmente.
  if (isLocal) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(event.request).then(cached =>
            cached || (event.request.destination === 'document' ? caches.match('./index.html') : undefined)
          )
        )
    );
    return;
  }

  // 3. CDNs externos → Cache First, fallback network (mudam pouco, economiza dados)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200 || response.type === 'error') return response;
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {});
    })
  );
});

// ── Registro do Periodic Background Sync (se o navegador suportar) ──
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    try {
      if ('periodicSync' in self.registration) {
        await self.registration.periodicSync.register('agro-cache-cleanup', {
          minInterval: 24 * 60 * 60 * 1000 // 1x por dia
        });
      }
    } catch (e) { /* API não suportada/negada — sem problema, o Network First já cobre */ }
  })());
});
