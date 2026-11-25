// Service worker do app da produção: guarda a página e os arquivos do app para abrir sem internet.
// Escopo: só /producao.html (o app da roça usa /roca-sw.js com escopo "/"; um não interfere no outro).
const CACHE = 'producao-eno-v1';
const PAGINA = '/producao.html';
const PRECARGA = [PAGINA, '/producao.webmanifest', '/favicon-192.png', '/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  // Só apaga cachês antigos deste próprio app (prefixo producao-eno-)
  event.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(c => c.startsWith('producao-eno-') && c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Só o próprio site; banco e outros serviços vão direto para a rede
  if (url.origin !== self.location.origin) return;

  // Página da produção: rede primeiro (pega versão nova); sem internet, usa a guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(PAGINA, copia));
          return resp;
        })
        .catch(() => caches.match(PAGINA))
    );
    return;
  }

  // Arquivos do app (JS, CSS, imagens): guarda na primeira vez e usa a guardada depois
  event.respondWith(
    caches.match(req).then(guardado => {
      if (guardado) return guardado;
      return fetch(req).then(resp => {
        if (resp.ok) {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put(req, copia));
        }
        return resp;
      });
    })
  );
});
