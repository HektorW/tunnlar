const userEls = Array.from(document.querySelectorAll('[data-user]'))
const timeLeftEl = document.querySelector('[data-time-left]')
const pulseEl = document.querySelector('[data-pulse-notification]')
const toastEl = document.querySelector('[data-toast]')

const getUserElId = userEl => parseInt(userEl.getAttribute('data-user'), 10)
const getTunnelsByEl = userEl => userEl.querySelector('[data-tunnels-by]')
const getTunnelsAgainstEl = userEl =>
  userEl.querySelector('[data-tunnels-against]')

const pageLoadNow = performance.now()

let requestChain = Promise.resolve()
let lastTunnelResponse = []

const { abs, floor, random, sin, cos, PI } = Math

const translatePosRegex = /translate3d\((\d+)(?:px)?,\s*(\d+)/i

const doubleRaf = fn => {
  let rafId = requestAnimationFrame(() => {
    rafId = requestAnimationFrame(fn)
  })

  const cancel = () => {
    cancelAnimationFrame(rafId)
  }

  return cancel
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.register('/service-worker.js').then(registration => {
    subscribeToPush(registration)
  })

  navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage)
}

function subscribeToPush(serviceWorkerRegistration) {
  serviceWorkerRegistration.pushManager
    .getSubscription()
    .then(async subscription => {
      if (!subscription) {
        await Notification.requestPermission()
        if (Notification.permission !== 'granted') return

        subscription = await serviceWorkerRegistration.pushManager.subscribe({
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
}

function onServiceWorkerMessage(event) {
  switch (event.data.messageType) {
    case 'api-response': {
      if (event.data.requestUrl.indexOf('get-all') !== -1) {
        renderTunnelCounts(event.data.responseData.tunnels)
      }
      break
    }

    case 'main-resource': {
      showToast('Refresh to see<br>latest version')
      break
    }
  }
}

let toastTimeoutId = null
async function showToast(toastContent) {
  if (toastTimeoutId !== null) return

  if (performance.now() - pageLoadNow < 1000) {
    toastTimeoutId = '_' // Just need some value, can't be canceled
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  const contentEl = toastEl.querySelector('[data-content]')
  const closeEl = toastEl.querySelector('[data-close]')

  contentEl.innerHTML = toastContent

  const onCloseClick = () => {
    clearTimeout(toastTimeoutId)
    closeEl.removeEventListener('click', onCloseClick)

    toastEl.classList.remove('active')

    onTransitionEndOnce(toastEl, 500, () => {
      toastEl.setAttribute('hidden', '')
      toastTimeoutId = null
    })
  }

  toastEl.removeAttribute('hidden')

  doubleRaf(() => {
    toastEl.classList.add('active')
  })

  closeEl.addEventListener('click', onCloseClick)
  toastTimeoutId = setTimeout(onCloseClick, 5000)
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
      navigator.vibrate(10)

      dragStartTouch = event.touches ? event.touches[0] : event

      userEl.style.zIndex = 2
      otherUserEls.forEach(otherEl => {
        otherEl.style.zIndex = 1
        otherEl.classList.add('drag-target')
      })

      dragBall.style.transition = ''

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

      const moveX = (startAnimatingX = moveTouch.pageX - dragStartTouch.pageX)
      const moveY = (startAnimatingY = moveTouch.pageY - dragStartTouch.pageY)

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
        dragBall.style.transition =
          'transform 0.3s ease-out, opacity 0.2s 0.1s ease-in'

        const targetX = userCardX + userCardWidth * 0.55 - ballX
        const targetY =
          hoveredEl.getBoundingClientRect().top + userCardHeight * 0.35 - ballY

        addScoreAnimation(userEl)

        const byId = getUserElId(userEl)
        const againstId = getUserElId(hoveredEl)

        addTunnel(byId, againstId)

        hoveredEl.classList.add('drag-target', 'hovered')
        requestAnimationFrame(() => {
          dragBall.style.opacity = `0`
          dragBall.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) scale(0.65)`

          onTransitionEndOnce(dragBall, 500, () => {
            dragBall.style.opacity = ''
            dragBall.style.transform = ''
            dragBall.style.transition = ''

            setTimeout(() => {
              hoveredEl.classList.add('fade-in')
              hoveredEl.classList.remove('drag-target', 'hovered')

              onTransitionEndOnce(
                hoveredEl.querySelector('.user__tunnels'),
                500,
                () => {
                  hoveredEl.classList.remove('fade-in')
                }
              )
            }, 200)
          })
        })

        navigator.vibrate(50)
      } else {
        startAnimatingTime = performance.now()
        animateBallBack()
      }
    }

    const animateBallBack = () => {
      dragBall.style.transition = 'transform 250ms ease-out'
      requestAnimationFrame(() => {
        dragBall.style.transform = `none`
      })
    }

    dragBall.addEventListener('touchstart', onTouchStart)
    dragBall.addEventListener('mousedown', onTouchStart)
  })
}

function addTunnel(byId, againstId, tunnelItem) {
  const tempId = random()

  const tempTunnel = { by: byId, against: againstId, tunnelItem, id: tempId }

  renderTunnelCounts([...lastTunnelResponse, tempTunnel])

  requestChain.then(async () => {
    setLoading(true)
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

      setLoading(false)

      lastTunnelResponse = tunnels
      renderTunnelCounts(tunnels)
    } catch (error) {
      showToast(`Couldn't add tunnel<br>Server might be down`)

      setLoading(false)
      renderTunnelCounts(lastTunnelResponse)
      requestChain = Promise.resolve()
      fetchLatestValues()
      throw error // Break current request chain
    }
  })
}

const onTransitionEndOnce = (el, fallbackMs, fn) => {
  const _onTransitionEnd = () => {
    cancel()
    fn()
  }

  const timeoutId = setTimeout(_onTransitionEnd, fallbackMs)

  el.addEventListener('transitionend', _onTransitionEnd)

  const cancel = () => {
    clearTimeout(timeoutId)
    el.removeEventListener('transitionend', _onTransitionEnd)
  }

  return cancel
}

let loadingTimeoutId = null
function setLoading(loading = true) {
  if (loading) {
    if (loadingTimeoutId === null) {
      loadingTimeoutId = setTimeout(() => pulseEl.classList.add('active'), 1000)
    }
  } else {
    clearTimeout(loadingTimeoutId)
    loadingTimeoutId = null
    pulseEl.classList.remove('active')
  }
}

let fetchLatestTimeoutId = null
function fetchLatestValues() {
  clearTimeout(fetchLatestTimeoutId)

  requestChain.then(async () => {
    setLoading(true)

    const response = await fetch('/api/get-all')
    if (!response.ok) return

    const { tunnels } = await response.json()

    setLoading(false)

    lastTunnelResponse = tunnels
    renderTunnelCounts(tunnels)

    const intervalSeconds = 10
    fetchLatestTimeoutId = setTimeout(fetchLatestValues, intervalSeconds * 1000)
  })
}

function animateCountChange(el, count) {
  const currentCount = parseInt(el.innerHTML, 10)
  if (currentCount === count) return

  // Avoid updates during appear animation
  if (performance.now() - pageLoadNow < 2000) {
    el.innerHTML = count
    return
  }

  if (el.cancelAnimation) {
    el.cancelAnimation()
  }

  const clearTransitionListener = onTransitionEndOnce(el, 500, () => {
    clearDoubleRaf()
    el.cancelAnimation = null
    el.innerHTML = count
    el.classList.remove('animate')
  })

  const clearDoubleRaf = doubleRaf(() => {
    el.classList.add('animate')
  })

  el.cancelAnimation = () => {
    clearTransitionListener()
    clearDoubleRaf()
  }
}

const randRange = (min, max) => min + abs(max - min) * random()
const randInt = max => floor(random() * max)
const radianToDegree = radian => radian * (180 / PI)

function addScoreAnimation(userEl) {
  const animationContainerEl = userEl.querySelector(
    '[data-animation-container]'
  )

  const balloonSvgs = document.querySelector('[data-balloons]').children
  const confettiSvgs = document.querySelector('[data-confetti]').children

  const userColor = getComputedStyle(userEl).borderLeftColor
  const colors = [userColor, 'hsl(52, 100%, 50%)', 'hsl(32, 100%, 55%)']

  const createParticles = (particleSvgs, count, minDistance, maxDistance) => {
    for (let index = 0; index < count; index += 1) {
      const particleClone = particleSvgs[
        randInt(particleSvgs.length)
      ].cloneNode(true)

      const particleColor = colors[randInt(colors.length)]

      particleClone
        .querySelectorAll('[data-color]')
        .forEach(node => (node.style.fill = particleColor))

      const angle = randRange(PI + PI * 0.2, PI + PI * 0.65)
      const distance = randRange(minDistance, maxDistance)

      const targetX = cos(angle) * distance
      const targetY = sin(angle) * distance

      const rotateDeg = radianToDegree(angle) + 90

      const scale = randRange(0.9, 1.1)

      particleClone.style.transform = `translate3d(0, 0, 0) rotate(${rotateDeg}deg) scale(${scale})`

      setTimeout(() => {
        particleClone.style.opacity = 0
        particleClone.style.transform = `translate3d(${targetX}px, ${targetY}px, 0) rotate(${rotateDeg}deg) scale(${scale})`
        particleClone.style.transition =
          'transform 1s ease-out, opacity 0.7s 0.3s'
      }, randInt(300))

      animationContainerEl.appendChild(particleClone)
    }
  }

  createParticles(balloonSvgs, 8, 230, 350)
  createParticles(confettiSvgs, 15, 100, 200)

  setTimeout(() => {
    animationContainerEl.innerHTML = ''
  }, 1500)
}

function renderTunnelCounts(tunnels) {
  userEls.forEach(userEl => {
    const userId = getUserElId(userEl)
    const tunnelsByEl = getTunnelsByEl(userEl)
    const tunnelsAgainstEl = getTunnelsAgainstEl(userEl)

    const byCount = tunnels.filter(tunnel => tunnel.by === userId).length
    const againstCount = tunnels.filter(tunnel => tunnel.against === userId)
      .length

    animateCountChange(tunnelsByEl, byCount)
    animateCountChange(tunnelsAgainstEl, againstCount)
  })
}

function renderTimeLeft() {
  const endDate = new Date('2019-8-30')
  const timeLeft = endDate - new Date()

  const secondsLeft = timeLeft / 1000
  const minutesLeft = secondsLeft / 60
  const hoursLeft = minutesLeft / 60
  const daysLeft = hoursLeft / 24

  const { floor } = Math
  let value = floor(daysLeft)
  let unit = 'dagar'
  if (daysLeft < 1) {
    setTimeout(renderTimeLeft, 1000)

    value = floor(hoursLeft)
    unit = 'timmar'
  }
  if (hoursLeft < 1) {
    value = floor(minutesLeft)
    unit = 'minuter'
  }
  if (minutesLeft < 1) {
    value = floor(secondsLeft)
    unit = 'sekunder'
  }

  timeLeftEl.innerHTML = `${value} ${unit} kvar`
}

setupEventHandlers()
fetchLatestValues()
registerServiceWorker()
renderTimeLeft()
