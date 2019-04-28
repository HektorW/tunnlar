const cacheName = 'files-chache-1.0.0'
const precacheFiles = [
  '/',
  '/main.js',
  '/styles.css',
  '/manifest.json'
  // '/background.jpg'
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(precacheFiles))
  )
})

self.addEventListener('fetch', event => {
  const { request } = event

  if (request.method !== 'GET') return
  // if (request.url.indexOf('/api/') !== -1) return handleApiRequest(event)

  const fetchRequest = fetch(request)

  event.respondWith(
    caches
      .open(cacheName)
      .then(cache =>
        cache
          .match(request)
          .then(
            cachedResponse =>
              cachedResponse || fetchRequest.then(response => response.clone())
          )
      )
  )

  event.waitUntil(
    fetchRequest.then(response =>
      caches.open(cacheName).then(cache =>
        cache.match(request).then(async cachedResponse => {
          if (cachedResponse && request.url.indexOf('/api/') !== -1) {
            const responseData = await response.clone().json()
            sendMessage({
              messageType: 'api-response',
              requestUrl: request.url,
              responseData
            })
          }
          // if (
          //   cachedResponse &&
          //   cachedResponse.headers.get('etag') !== response.headers.get('etag')
          // ) {
          //   sendMessage('refresh')
          // }

          return cache.put(request, response.clone())
        })
      )
    )
  )
})

self.addEventListener('push', onPush)

function onPush(event) {
  event.waitUntil(
    (async () => {
      const { title, ...notificationOptions } = await event.data.json()

      notificationOptions.icon = '/images/icon_192x192.png'
      notificationOptions.badge = '/images/icon-black_64x64.png'

      return self.registration.showNotification(title, notificationOptions)
    })()
  )
}

const sendMessage = message =>
  self.clients.matchAll().then(clients => {
    if (clients) {
      clients.forEach(client => client.postMessage(message))
    }
  })
