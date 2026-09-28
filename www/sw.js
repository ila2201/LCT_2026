const CACHE = 'finny-v3'

const screens = ['welcome', 'intro', 'create', 'home', 'plan', 'shop', 'savings', 'tasks', 'task', 'progress', 'summary', 'adult', 'glossary', 'settings', 'phone', 'chat', 'common']
const FILES = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/style.css',
  'icons/icon-192.png',
  ...['main', 'game', 'task-check', 'format', 'storage', 'content', 'pet', 'ui', 'sound'].map((f) => `js/${f}.js`),
  ...screens.map((f) => `js/screens/${f}.js`),
  ...['rules', 'pets', 'shop', 'goals', 'tasks', 'glossary', 'intro', 'chats'].map((f) => `content/${f}.json`),
  ...['cyrillic', 'latin'].flatMap((s) => [400, 700, 800].map((w) => `fonts/nunito-${s}-${w}-normal.woff2`)),
]

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request)
      .then((res) => {
        const copy = res.clone()
        caches.open(CACHE).then((c) => c.put(e.request, copy))
        return res
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true })),
  )
})
