/* ══════════════════════════════════════════════════════════════
   SERVICE WORKER — CONTROLE TÉCNICO AGRÍCOLA
   Estratégia: Cache First para assets, Network First para APIs externas
   Versão: incrementar CACHE_NAME sempre que publicar nova versão do app
══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'agro-v6.7';

/* Assets do próprio repositório — sempre em cache */
const ASSETS_LOCAIS = [
  './',
  './index.html',
  './manifest.json',
  './icone_agro.png',
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

// ── FETCH: lógica de cache ─────────────────────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

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

  // 2. Assets locais e CDNs → Cache First, fallback network
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cached => {
        if (cached) return cached;

        // Não está em cache: busca na rede e guarda
        return fetch(event.request)
          .then(response => {
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
            return response;
          })
          .catch(() => {
            // Offline e não há cache → retorna página principal (fallback)
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
          });
      })
    );
  }
});
