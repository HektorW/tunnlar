const userEls = Array.from(document.querySelectorAll('[data-user]'))
const timeLeftEl = document.querySelector('[data-time-left]')

const getUserElId = userEl => parseInt(userEl.getAttribute('data-user'), 10)
const getUserCountEl = userEl => userEl.querySelector('[data-count]')
const getUserTunnelCount = userEl =>
  parseInt(getUserCountEl(userEl).innerHTML, 10)

let requestChain = Promise.resolve()

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return

  navigator.serviceWorker.register('/service-worker.js').then(() => {
    // TODO : request notifications

    navigator.serviceWorker.addEventListener('message', event => {
      if (
        event.data.messageType === 'api-response' &&
        event.data.requestUrl.indexOf('get-all') !== -1
      ) {
        updateUserCountsFromServer(event.data.responseData)
      }
    })
  })
}

function setupEventHandlers() {
  userEls.forEach(userEl => {
    const otherUserEls = userEls.filter(other => other !== userEl)
    const dragBall = userEl.querySelector('[data-ball]')

    let dragStartTouch = null

    const onTouchStart = event => {
      dragStartTouch = event.touches ? event.touches[0] : event

      otherUserEls.forEach(otherEl => otherEl.classList.add('drag-target'))

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
    }

    const onTouchEnd = () => {
      dragBall.style.transform = ''

      otherUserEls.forEach(otherEl => otherEl.classList.remove('drag-target'))

      window.removeEventListener('touchmove', onTouchMove, { passive: false })
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
      window.removeEventListener('mousemove', onTouchMove)
      window.removeEventListener('mouseup', onTouchEnd)
    }

    dragBall.addEventListener('touchstart', onTouchStart)
    dragBall.addEventListener('mousedown', onTouchStart)
  })

  /* userEls.forEach(userEl => {
    const userId = getUserElId(userEl)
    const countEl = getUserCountEl(userEl)

    const renderCount = count => (countEl.innerHTML = count)

    const updateCount = delta => {
      const countBeforeRequest = getUserTunnelCount(userEl)
      const newCount = Math.max(0, countBeforeRequest + delta)

      renderCount(newCount)

      requestChain.then(async () => {
        try {
          const response = await fetch('/api/set-count', {
            method: 'POST',
            body: JSON.stringify({
              userId,
              count: newCount
            }),
            headers: {
              'content-type': 'application/json'
            }
          })

          if (!response.ok) {
            throw new Error()
          }
        } catch (error) {
          renderCount(countBeforeRequest)
          requestChain = Promise.resolve()
          fetchLatestValues()
          throw error // Break current request chain
        }
      })
    }

    userEl.querySelector('[data-remove]').addEventListener('click', () => {
      updateCount(-1)
    })
    userEl.querySelector('[data-add]').addEventListener('click', () => {
      updateCount(1)
    })
  }) */
}

let fetchLatestTimeoutId = null
function fetchLatestValues() {
  clearTimeout(fetchLatestTimeoutId)

  requestChain.then(async () => {
    const response = await fetch('/api/get-all')
    if (!response.ok) return

    const userRows = await response.json()

    updateUserCountsFromServer(userRows)

    const intervalSeconds = 10
    fetchLatestTimeoutId = setTimeout(fetchLatestValues, intervalSeconds * 1000)
  })
}

function updateUserCountsFromServer(userRows) {
  userEls.forEach(userEl => {
    const userId = getUserElId(userEl)
    const countEl = getUserCountEl(userEl)

    const userData = userRows.find(user => user.id === userId)
    if (!userData) return

    countEl.innerHTML = userData.tunnelCount
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
