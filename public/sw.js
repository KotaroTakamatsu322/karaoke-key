// サービスワーカー：一度開いたら、電波がなくてもアプリを開けるようにする（⑦ PWA）
// 中身を変えたら VERSION を上げる（古いキャッシュを消すため）
const VERSION = 1
const CACHE = `karaoke-key-v${VERSION}`
const STATIC_FILES = ['./', './manifest.webmanifest', './favicon.svg', './icon-192.png', './icon-512.png', './apple-touch-icon.png']

// インストール：ページと、そのページが読む JS・CSS（assets/…）をまとめてキャッシュする。
// ファイル名はビルドのたびに変わるので、HTML の中から読み取る
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE)
      const html = await (await fetch('./', { cache: 'no-cache' })).text()
      const assets = [...html.matchAll(/(?:src|href)="\.?\/?(assets\/[^"]+)"/g)].map((m) => `./${m[1]}`)
      await cache.addAll([...STATIC_FILES, ...assets])
      await self.skipWaiting()
    })(),
  )
})

// 新しい版になったら、古いキャッシュを消す
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return

  // ページを開くとき：ネットを先に試し（新しい版を届けるため）、だめならキャッシュ
  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          const cache = await caches.open(CACHE)
          await cache.put('./', response.clone())
          return response
        } catch {
          return (await caches.match('./')) ?? Response.error()
        }
      })(),
    )
    return
  }

  // そのほかのファイル：キャッシュを先に使い、なければ取ってきて保存する
  // （JS・CSS はファイル名に中身のハッシュが付くので、古くならない）
  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached
      const response = await fetch(request)
      if (response.ok) {
        const cache = await caches.open(CACHE)
        await cache.put(request, response.clone())
      }
      return response
    })(),
  )
})
