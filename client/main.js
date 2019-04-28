const userEls = Array.from(document.querySelectorAll('[data-user]'))
const timeLeftEl = document.querySelector('[data-time-left]')

const getUserElId = userEl => parseInt(userEl.getAttribute('data-user'), 10)
const getTunnelsByEl = userEl => userEl.querySelector('[data-tunnels-by]')
const getTunnelsAgainstEl = userEl =>
  userEl.querySelector('[data-tunnels-against]')

let requestChain = Promise.resolve()
let lastTunnelResponse = []

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.register('/service-worker.js').then(registration => {
    registration.pushManager
      .getSubscription()
      .then(async subscription => {
        if (!subscription) {
          await Notification.requestPermission()
          subscription = await registration.pushManager.subscribe({
            applicationServerKey: urlBase64ToUint8Array(
              window.settings.vapidPublicKey
            ),
            userVisibleOnly: true
          })
        }

        const response = await fetch('/api/subscribe', {
          method: 'POST',
          body: JSON.stringify({
            subscription,
            userAgent: navigator.userAgent
          }),
          headers: {
            'content-type': 'application/json'
          }
        })

        if (response.ok) {
          const { subscriptionId } = await response.json()
          localStorage.setItem('subscriptionId', subscriptionId)
        }
      })
      .catch(error => console.error(error))

    navigator.serviceWorker.addEventListener('message', event => {
      if (
        event.data.messageType === 'api-response' &&
        event.data.requestUrl.indexOf('get-all') !== -1
      ) {
        renderTunnelCounts(event.data.responseData.tunnels)
      }
    })
  })
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')

  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)))
}

const isIntercepting = (aX, aY, aWidth, aHeight, bX, bY, bWidth, bHeight) =>
  aX + aWidth / 2 < bX + bWidth &&
  aX + aWidth / 2 > bX &&
  aY + aHeight / 2 < bY + bHeight &&
  aY + aHeight / 2 > bY

function setupEventHandlers() {
  userEls.forEach(userEl => {
    const otherUserEls = userEls.filter(other => other !== userEl)
    const dragBall = userEl.querySelector('[data-ball]')

    let ballX = 0
    let ballY = 0
    let ballWidth = 0
    let ballHeight = 0

    let userCardHeight = 0
    let userCardWidth = 0
    let userCardX = 0

    let otherYs = []

    let dragStartTouch = null

    const onTouchStart = event => {
      navigator.vibrate(15)

      dragStartTouch = event.touches ? event.touches[0] : event

      otherUserEls.forEach(otherEl => otherEl.classList.add('drag-target'))

      // Cache some values
      ballX = dragBall.getBoundingClientRect().left
      ballY = dragBall.getBoundingClientRect().top
      ballWidth = dragBall.clientWidth
      ballHeight = dragBall.clientHeight

      userCardHeight = userEl.clientHeight
      userCardWidth = userEl.clientWidth
      userCardX = userEl.getBoundingClientRect().left

      otherYs = otherUserEls.map(otherEl => otherEl.getBoundingClientRect().top)

      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd)
      window.addEventListener('touchcancel', onTouchEnd)
      window.addEventListener('mousemove', onTouchMove)
      window.addEventListener('mouseup', onTouchEnd)
    }

    const onTouchMove = event => {
      if (event.cancelable) {
        event.preventDefault()
      }

      const moveTouch = event.touches ? event.touches[0] : event

      const moveX = moveTouch.pageX - dragStartTouch.pageX
      const moveY = moveTouch.pageY - dragStartTouch.pageY

      dragBall.style.transform = `translate3d(${moveX}px, ${moveY}px, 0)`

      const _ballX = ballX + moveX
      const _ballY = ballY + moveY

      otherUserEls.forEach((otherEl, index) => {
        const otherY = otherYs[index]

        const isHovering = isIntercepting(
          _ballX,
          _ballY,
          ballWidth,
          ballHeight,
          userCardX,
          otherY,
          userCardWidth,
          userCardHeight
        )

        otherEl.classList.toggle('hovered', isHovering)
      })
    }

    const onTouchEnd = () => {
      dragBall.style.transform = ''

      const hoveredEl = otherUserEls.find(otherEl =>
        otherEl.classList.contains('hovered')
      )

      otherUserEls.forEach(otherEl =>
        otherEl.classList.remove('drag-target', 'hovered')
      )

      window.removeEventListener('touchmove', onTouchMove, { passive: false })
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('mousemove', onTouchMove)
      window.removeEventListener('mouseup', onTouchEnd)

      if (hoveredEl) {
        navigator.vibrate(50)

        const byId = getUserElId(userEl)
        const againstId = getUserElId(hoveredEl)

        addTunnel(byId, againstId)
      }
    }

    dragBall.addEventListener('touchstart', onTouchStart)
    dragBall.addEventListener('mousedown', onTouchStart)
  })
}

function addTunnel(byId, againstId, tunnelItem) {
  const tempId = Math.random()

  const tempTunnel = { by: byId, against: againstId, tunnelItem, id: tempId }

  renderTunnelCounts([...lastTunnelResponse, tempTunnel])

  requestChain.then(async () => {
    try {
      const response = await fetch('/api/add-tunnel', {
        method: 'POST',
        body: JSON.stringify({
          byId,
          againstId,
          tunnelItem,
          subscriptionId: localStorage.getItem('subscriptionId') || null
        }),
        headers: {
          'content-type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error()
      }

      const { tunnels, tunnelId } = await response.json()

      lastTunnelResponse = tunnels
      renderTunnelCounts(tunnels)
    } catch (error) {
      renderTunnelCounts(lastTunnelResponse)
      requestChain = Promise.resolve()
      fetchLatestValues()
      throw error // Break current request chain
    }
  })
}

let fetchLatestTimeoutId = null
function fetchLatestValues() {
  clearTimeout(fetchLatestTimeoutId)

  requestChain.then(async () => {
    const response = await fetch('/api/get-all')
    if (!response.ok) return

    const { tunnels } = await response.json()

    lastTunnelResponse = tunnels
    renderTunnelCounts(tunnels)

    const intervalSeconds = 10
    fetchLatestTimeoutId = setTimeout(fetchLatestValues, intervalSeconds * 1000)
  })
}

function renderTunnelCounts(tunnels) {
  userEls.forEach(userEl => {
    const userId = getUserElId(userEl)
    const tunnelsByEl = getTunnelsByEl(userEl)
    const tunnelsAgainstEl = getTunnelsAgainstEl(userEl)

    const byCount = tunnels.filter(tunnel => tunnel.by === userId).length
    const againstCount = tunnels.filter(tunnel => tunnel.against === userId)
      .length

    tunnelsByEl.innerHTML = byCount
    tunnelsAgainstEl.innerHTML = againstCount
  })
}

function renderTimeLeft() {
  const endDate = new Date('2019-8-30')
  const timeLeft = endDate - new Date()

  const daysLeft = Math.floor(timeLeft / (1000 * 60 * 60 * 24))

  timeLeftEl.innerHTML = `${daysLeft} dagar kvar`
}

setupEventHandlers()
fetchLatestValues()
registerServiceWorker()
renderTimeLeft()
