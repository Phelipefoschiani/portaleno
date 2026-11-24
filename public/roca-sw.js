// Service worker do app da roça: guarda a página e os arquivos do app para abrir sem internet.
const CACHE = 'roca-eno-v1';
const PRECARGA = ['/roca.html', '/roca.webmanifest', '/favicon-192.png', '/apple-touch-icon.png'];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECARGA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(chaves => Promise.all(chaves.filter(c => c !== CACHE).map(c => caches.delete(c))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Só o próprio site; banco e outros serviços vão direto para a rede
  if (url.origin !== self.location.origin) return;

  // Outras páginas do site (a tela principal) seguem direto para a rede
  if (req.mode === 'navigate' && url.pathname !== '/roca.html') return;

  // Página da roça: rede primeiro (pega versão nova); sem internet, usa a guardada
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(resp => {
          const copia = resp.clone();
          caches.open(CACHE).then(c => c.put('/roca.html', copia));
          return resp;
        })
        .catch(() => caches.match('/roca.html'))
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
