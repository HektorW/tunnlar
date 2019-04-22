let userEls = document.querySelectorAll('[data-user]')

const getUserElId = userEl => parseInt(userEl.getAttribute('data-user'), 10)
const getUserCountEl = userEl => userEl.querySelector('[data-count]')
const getUserTunnelCount = userEl =>
  parseInt(getUserCountEl(userEl).innerHTML, 10)

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
    const userId = getUserElId(userEl)
    const countEl = getUserCountEl(userEl)

    let requestChain = Promise.resolve()

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
  })
}

async function fetchLatestValues() {
  const response = await fetch('/api/get-all')
  if (!response.ok) return

  const userRows = await response.json()

  updateUserCountsFromServer(userRows)
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

function pollForServerUpdates() {
  const intervalSeconds = 10
  setInterval(fetchLatestValues, intervalSeconds * 1000)
}

setupEventHandlers()
fetchLatestValues()
pollForServerUpdates()
registerServiceWorker()
