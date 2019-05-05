const cacheName = 'files-chache-1.0.0'
const precacheFiles = ['/', '/main.js', '/styles.css', '/manifest.json']

self.addEventListener('install', event => {
  self.skipWaiting()

  event.waitUntil(
    caches.open(cacheName).then(cache => cache.addAll(precacheFiles))
  )
})

self.addEventListener('activate', () => {
  sendMainResourceNotification({ url: '/service-worker.js' })
})

self.addEventListener('fetch', event => {
  const { request } = event

  if (request.method !== 'GET') return

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
          if (cachedResponse) {
            const requestPath = getRequestPath(request)

            const isApiRequest = requestPath.indexOf('/api/') === 0

            const isMainResource =
              !isApiRequest && precacheFiles.includes(requestPath)

            const isUpdatedContent =
              cachedResponse.headers.get('etag') !==
              response.headers.get('etag')

            if (isApiRequest) {
              sendMessage({
                messageType: 'api-response',
                requestUrl: request.url,
                responseData: await response.clone().json()
              })
            } else if (isMainResource && isUpdatedContent) {
              sendMainResourceNotification(request)
            }
          }

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

const sendMessage = message => {
  return self.clients.matchAll().then(clients => {
    if (clients) {
      clients.forEach(client => client.postMessage(message))
    }
  })
}

let mainResourceNotificationTimeoutId = null
let updatedMainResourceUrls = []
const sendMainResourceNotification = request => {
  if (!updatedMainResourceUrls.includes(request.url)) {
    updatedMainResourceUrls.push(request.url)
  }

  if (mainResourceNotificationTimeoutId !== null) return

  mainResourceNotificationTimeoutId = setTimeout(() => {
    sendMessage({
      messageType: 'main-resource',
      requestUrls: updatedMainResourceUrls
    })
    updatedMainResourceUrls = []
    mainResourceNotificationTimeoutId = null
  }, 500)
}

const pathRegex = /^https?:\/\/[^\/]+([^?]*)$/
const getRequestPath = request => {
  const match = pathRegex.exec(request.url)
  return match ? match[1] : ''
}
