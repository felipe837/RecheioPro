// Service Worker do RecheioPro — cacheia os arquivos principais do site pra
// ele continuar abrindo mesmo sem internet (o que já foi carregado antes).
// Sempre que o index.html mudar de verdade, sobe uma versão nova aqui em
// baixo (CACHE_NOME) pra forçar todo mundo a baixar os arquivos atualizados.
const CACHE_NOME = "recheiopro-v2";
const ARQUIVOS_ESSENCIAIS = [
  "./",
  "./index.html",
  "./cardapio.html",
  "./manifest.json",
  "./logo.png",
  "./favicon.png",
  "./mockup-hero.jpg",
  "./icon-192.png",
  "./icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NOME).then((cache) => cache.addAll(ARQUIVOS_ESSENCIAIS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((nomes) =>
      Promise.all(
        nomes.filter((n) => n !== CACHE_NOME).map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // só cuida de pedidos do próprio site (GET, mesma origem) — deixa passar
  // direto qualquer coisa de fora (Firebase, fontes do Google, etc)
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== location.origin) return;

  // a página principal (index.html, ou a raiz "/") sempre busca a versão
  // mais nova primeiro — assim, qualquer atualização já aparece na hora,
  // sem precisar lembrar de mudar o CACHE_NOME toda vez. Só usa a cópia
  // guardada se a pessoa estiver mesmo sem internet.
  const ehPaginaPrincipal = event.request.mode === "navigate" ||
    url.pathname === "/" || url.pathname.endsWith("/index.html");

  if (ehPaginaPrincipal) {
    event.respondWith(
      fetch(event.request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.ok) {
            const copia = respostaRede.clone();
            caches.open(CACHE_NOME).then((cache) => cache.put(event.request, copia));
          }
          return respostaRede;
        })
        .catch(() => caches.match(event.request)) // sem internet? usa o que já tem guardado
    );
    return;
  }

  // arquivos mais "estáticos" (imagens, ícones, manifest) continuam
  // instantâneos: mostra o que já está em cache na hora, e atualiza em
  // segundo plano pra próxima vez
  event.respondWith(
    caches.match(event.request).then((respostaCache) => {
      const buscaRede = fetch(event.request)
        .then((respostaRede) => {
          if (respostaRede && respostaRede.ok) {
            const copia = respostaRede.clone();
            caches.open(CACHE_NOME).then((cache) => cache.put(event.request, copia));
          }
          return respostaRede;
        })
        .catch(() => respostaCache); // sem internet? usa o que já tem guardado

      return respostaCache || buscaRede;
    })
  );
});
