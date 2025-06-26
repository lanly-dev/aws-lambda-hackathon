const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let drawing = false

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = 'Ov23liNUvc7QG2vvoSfM' // Your GitHub OAuth App Client ID
const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname // Current page
console.log('⭐⭐', GITHUB_REDIRECT_URI)
let githubToken = localStorage.getItem('githubToken')
let currentUser = null

function loginWithGitHub() {
  const loginButton = document.getElementById('github-login-btn')
  const errorDiv = document.getElementById('login-error')
  loginButton.innerHTML = '<span class="spinner"></span> Authenticating...'
  loginButton.disabled = true
  errorDiv.textContent = ''
  // Redirect to GitHub OAuth (no async/await needed here)
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=user:email`
  window.location.href = githubAuthUrl
}

async function exchangeCodeForToken(code) {
  const loginButton = document.getElementById('github-login-btn')
  const errorDiv = document.getElementById('login-error')
  try {
    loginButton.innerHTML = '<span class="spinner"></span> Authenticating...'
    loginButton.disabled = true
    errorDiv.textContent = ''

    // Call our backend OAuth endpoint
    const response = await fetch('/auth/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    })

    if (!response.ok) throw new Error('Authentication failed')

    const data = await response.json()

    console.log('Received token and user data:', data) // Debugging log

    // Store the real token and user data
    githubToken = data.access_token
    currentUser = data.user

    if (!githubToken) {
      console.error('Auth token is missing') // Debugging log
      throw new Error('Failed to retrieve auth token')
    }

    localStorage.setItem('githubToken', githubToken)
    localStorage.setItem('githubUser', JSON.stringify(currentUser))

    showUserInfo()
    updateUIBasedOnAuth()
    loginButton.innerHTML = '🔗 Login with GitHub'
    loginButton.disabled = false
    errorDiv.textContent = ''
  } catch (error) {
    console.error('Authentication error:', error)
    loginButton.innerHTML = '🔗 Login with GitHub'
    loginButton.disabled = false
    errorDiv.textContent = 'Authentication failed. Please try again.'
    showLoginSection()
  }
}

function verifyGitHubToken() {
  try {
    console.log('Verifying GitHub token:', githubToken) // Debugging log

    if (!githubToken) {
      console.error('GitHub token is missing') // Debugging log
      alert('Your session has expired. Please log in again.')
      logout()
      return
    }

    fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    })
      .then(response => {
        if (response.ok) {
          return response.json()
        } else {
          throw new Error('Token verification failed')
        }
      })
      .then(user => {
        console.log('Verified user:', user) // Debugging log
        currentUser = user
        localStorage.setItem('githubUser', JSON.stringify(user))
        showUserInfo()
      })
      .catch(error => {
        console.error('Error verifying token:', error)
        alert('Your session has expired. Please log in again.')
        logout()
      })
  } catch (error) {
    console.error('Unexpected error during token verification:', error)
    alert('Your session has expired. Please log in again.')
    logout()
  }
}

function logout() {
  githubToken = null
  currentUser = null
  localStorage.removeItem('githubToken')
  localStorage.removeItem('githubUser')
  showLoginSection()
  updateUIBasedOnAuth()
  // Show logout success message under the button
  const logoutMsg = document.getElementById('logout-success')
  if (logoutMsg) {
    logoutMsg.textContent = 'Logged out successfully.'
    setTimeout(() => { logoutMsg.textContent = '' }, 3000)
  }
}

// Make functions globally accessible for HTML onclick handlers
window.logout = logout

function showLoginSection() {
  document.getElementById('login-section').style.display = 'block'
  document.getElementById('user-info').style.display = 'none'
}

function showUserInfo() {
  if (currentUser) {
    document.getElementById('username').textContent = currentUser.name || currentUser.login
    document.getElementById('login-section').style.display = 'none'
    document.getElementById('user-info').style.display = 'block'
    loadAccountSketches()
  }
}

function updateUIBasedOnAuth() {
  const isLoggedIn = !!githubToken

  // Enable/disable premium features based on login status
  const styleCountSelect = document.getElementById('style-count-select')
  const modelSelect = document.getElementById('model-select')

  // Update style count options
  Array.from(styleCountSelect.options).forEach((option, index) => {
    // Options 3 and 4 are disabled for anonymous users
    if (index > 1) option.disabled = !isLoggedIn
  })

  // Update model options
  Array.from(modelSelect.options).forEach(option => {
    if (option.value.includes('stability'))  option.disabled = !isLoggedIn
  })

  // Reset to safe defaults if logged out
  if (!isLoggedIn) {
    if (styleCountSelect.selectedIndex > 1) styleCountSelect.selectedIndex = 1 // 2 styles max for anonymous
    if (modelSelect.value.includes('stability')) modelSelect.selectedIndex = 0 // Default to Titan
  }
}

function getCanvasCoords(e) {
  const rect = canvas.getBoundingClientRect()
  let x, y
  if (e.touches && e.touches.length) {
    x = e.touches[0].clientX - rect.left
    y = e.touches[0].clientY - rect.top
  } else {
    x = e.offsetX !== undefined ? e.offsetX : e.clientX - rect.left
    y = e.offsetY !== undefined ? e.offsetY : e.clientY - rect.top
  }
  // Scale for high-DPI or CSS scaling
  x *= canvas.width / rect.width
  y *= canvas.height / rect.height
  return { x, y }
}

function clearStatus() {
  document.getElementById('status').textContent = ''
}

// Update canvas events to clear status
canvas.onmousedown = e => {
  clearStatus()
  drawing = true
  const { x, y } = getCanvasCoords(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}
canvas.onmousemove = e => {
  if (drawing) {
    clearStatus()
    const { x, y } = getCanvasCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
}
canvas.onmouseup = () => { clearStatus(); drawing = false }
canvas.onmouseleave = () => { clearStatus(); drawing = false }
function fillCanvasWhiteBg() {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}
function clearCanvas() {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  updateButtonStates()
}

let aiAssistCooldown = false
let aiAssistTimer = null
const AI_ASSIST_COOLDOWN_MS = 30000 // 30 seconds

function showSpinnerWithCountdown(seconds) {
  const status = document.getElementById('status')
  let remaining = seconds
  status.innerHTML = `<span class="spinner"></span> AI working... (${remaining}s)`
  if (aiAssistTimer) clearInterval(aiAssistTimer)
  aiAssistTimer = setInterval(() => {
    remaining--
    if (remaining > 0) status.innerHTML = `<span class="spinner"></span> Please wait... (${remaining}s)`
    else {
      clearInterval(aiAssistTimer)
      aiAssistTimer = null
      status.textContent = ''
    }
  }, 1000)
}

// Add spinner CSS
if (!document.getElementById('ai-spinner-style')) {
  const style = document.createElement('style')
  style.id = 'ai-spinner-style'
  style.textContent = '.spinner { display:inline-block; width:18px; height:18px; border:3px solid #bfcfff; border-top:3px solid #0078d7; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:8px; } @keyframes spin { 100% { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}

function downloadCanvas() {
  clearStatus()
  fillCanvasWhiteBg()
  const data = canvas.toDataURL('image/png')
  const a = document.createElement('a')
  a.href = data
  a.download = 'sketch.png'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

async function aiAssist() {
  clearStatus()
  fillCanvasWhiteBg()
  if (aiAssistCooldown) {
    document.getElementById('status').textContent = 'Please wait before using AI Assist again.'
    return
  }
  aiAssistCooldown = true
  document.querySelector('button[onclick="aiAssist()"]')?.setAttribute('disabled', 'disabled')
  showSpinnerWithCountdown(AI_ASSIST_COOLDOWN_MS / 1000)
  setTimeout(() => {
    aiAssistCooldown = false
    document.querySelector('button[onclick="aiAssist()"]')?.removeAttribute('disabled')
    if (aiAssistTimer) { clearInterval(aiAssistTimer); aiAssistTimer = null }
    document.getElementById('status').textContent = ''
  }, AI_ASSIST_COOLDOWN_MS)
  fillCanvasWhiteBg()
  const data = canvas.toDataURL()
  document.getElementById('ai-options').innerHTML = ''

  const model = document.getElementById('model-select').value
  const styleCount = parseInt(document.getElementById('style-count-select').value, 10) || 4

  // Prepare headers with GitHub token if available
  const headers = { 'Content-Type': 'application/json' }
  if (githubToken) {
    headers.Authorization = `Bearer ${githubToken}`
  }

  const res = await fetch('/ai-assist', {
    method: 'POST',
    headers,
    body: JSON.stringify({ image: data, model, styleCount })
  })
  const result = await res.json()
  const optionsDiv = document.getElementById('ai-options')
  optionsDiv.innerHTML = '<b>Pick a style:</b><br>'
  result.styles.forEach((style) => {
    const img = document.createElement('img')
    img.src = `data:image/png;base64,${style.image}`
    img.width = 160
    img.title = style.name
    img.onclick = () => {
      Array.from(optionsDiv.querySelectorAll('img')).forEach(im => im.classList.remove('selected'))
      img.classList.add('selected')
      const i = new Image()
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0); addToTimeline(i.src, 'Applied') }
      i.src = `data:image/png;base64,${style.image}`
      document.getElementById('status').textContent = 'Applied: ' + style.name
    }
    optionsDiv.appendChild(img)
  })
  document.getElementById('status').textContent = 'AI Assist complete! Pick a style.'
}

// Add spinner CSS
if (!document.getElementById('ai-spinner-style')) {
  const style = document.createElement('style')
  style.id = 'ai-spinner-style'
  style.textContent = '.spinner { display:inline-block; width:18px; height:18px; border:3px solid #bfcfff; border-top:3px solid #0078d7; border-radius:50%; animation:spin 1s linear infinite; vertical-align:middle; margin-right:8px; } @keyframes spin { 100% { transform: rotate(360deg); } }'
  document.head.appendChild(style)
}

// --- AI Assist Style Tags System ---
const DEFAULT_TAGS = [
  'Cartoon', 'Pencil', 'Watercolor', 'Oil Paint', 'Ink', 'Comic', '3D', 'Flat', 'Pixel', 'Pastel', 'Charcoal', 'Line Art', 'Pop Art', 'Anime', 'Realistic'
]

function getUserStyleTags() {
  try {
    return JSON.parse(localStorage.getItem('userStyleTags') || '[]')
  } catch { return [] }
}
function setUserStyleTags(tags) {
  localStorage.setItem('userStyleTags', JSON.stringify(tags))
}
function renderStyleTags() {
  const tagContainer = document.getElementById('style-tags')
  if (!tagContainer) return
  tagContainer.innerHTML = ''
  const selected = new Set(JSON.parse(localStorage.getItem('aiStyleTags')||'[]'))
  const userTags = getUserStyleTags()
  // Render user-added tags first
  userTags.forEach((tag, idx) => {
    const btn = document.createElement('button')
    btn.textContent = tag
    btn.type = 'button'
    btn.className = 'user-style-tag-btn'
    if (selected.has(tag)) btn.classList.add('selected')
    btn.onclick = () => {
      if (selected.has(tag)) selected.delete(tag); else selected.add(tag)
      localStorage.setItem('aiStyleTags', JSON.stringify([...selected]))
      renderStyleTags()
    }
    // Add remove button
    const removeBtn = document.createElement('span')
    removeBtn.className = 'remove-style-tag-btn'
    removeBtn.textContent = '×'
    removeBtn.title = 'Remove tag'
    removeBtn.onclick = (e) => {
      e.stopPropagation()
      userTags.splice(idx, 1)
      setUserStyleTags(userTags)
      selected.delete(tag)
      localStorage.setItem('aiStyleTags', JSON.stringify([...selected]))
      renderStyleTags()
    }
    btn.appendChild(removeBtn)
    tagContainer.appendChild(btn)
  })
  // Render default tags
  DEFAULT_TAGS.forEach(tag => {
    if (userTags.includes(tag)) return
    const btn = document.createElement('button')
    btn.textContent = tag
    btn.type = 'button'
    btn.className = 'user-style-tag-btn'
    if (selected.has(tag)) btn.classList.add('selected')
    btn.onclick = () => {
      if (selected.has(tag)) selected.delete(tag); else selected.add(tag)
      localStorage.setItem('aiStyleTags', JSON.stringify([...selected]))
      renderStyleTags()
    }
    tagContainer.appendChild(btn)
  })
}
function setupAddStyleTagRow() {
  const input = document.getElementById('new-style-tag-input')
  const addBtn = document.getElementById('add-style-tag-btn')
  if (!input || !addBtn) return
  function addTag() {
    const val = input.value.trim()
    if (!val) return
    // Prevent duplicates (case-insensitive)
    const userTags = getUserStyleTags()
    const allTags = userTags.concat(DEFAULT_TAGS)
    if (allTags.map(t => t.toLowerCase()).includes(val.toLowerCase())) {
      input.value = ''
      return
    }
    userTags.unshift(val)
    setUserStyleTags(userTags)
    input.value = ''
    renderStyleTags()
  }
  addBtn.onclick = addTag
  input.onkeydown = (e) => { if (e.key === 'Enter') addTag() }
}
window.renderStyleTags = renderStyleTags
window.setupAddStyleTagRow = setupAddStyleTagRow
// Ensure style tags render after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    renderStyleTags()
    setupAddStyleTagRow()
  })
} else {
  renderStyleTags()
  setupAddStyleTagRow()
}

// Timeline state
const timelineState = []

function addToTimeline(imageDataUrl) {
  // Prevent duplicate entries
  const idx = timelineState.findIndex(item => item.image === imageDataUrl)
  if (idx !== -1) {
    document.getElementById('status').textContent = 'This sketch is already in the timeline.'
    // Move to most recent
    const [item] = timelineState.splice(idx, 1)
    timelineState.push(item)
    renderTimeline()
    return
  }
  // Add or move item
  timelineState.push({ image: imageDataUrl })
  // Limit to 10
  if (timelineState.length > 10) timelineState.shift()
  renderTimeline()
}

function renderTimeline() {
  const timeline = document.getElementById('timeline')
  timeline.innerHTML = ''
  timelineState.forEach(({ image }) => {
    const wrapper = document.createElement('div')
    wrapper.style.display = 'flex'
    wrapper.style.flexDirection = 'column'
    wrapper.style.alignItems = 'center'
    wrapper.style.minWidth = '80px'
    const img = document.createElement('img')
    img.src = image
    img.style.width = '70px'
    img.style.height = '70px'
    img.style.objectFit = 'contain'
    img.style.border = '2px solid #e6edff'
    img.style.borderRadius = '6px'
    img.style.background = '#fff'
    img.style.boxShadow = '0 1px 4px #0001'
    img.style.marginBottom = '4px'
    img.style.cursor = 'pointer'
    img.title = 'Timeline image'
    img.onclick = () => {
      clearStatus()
      // Move this item to the end (most recent)
      const foundIdx = timelineState.findIndex(item => item.image === image)
      if (foundIdx !== -1 && foundIdx !== timelineState.length - 1) {
        const [item] = timelineState.splice(foundIdx, 1)
        timelineState.push(item)
        renderTimeline()
      }
      const i = new Image()
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0) }
      i.src = image
    }
    wrapper.appendChild(img)
    timeline.appendChild(wrapper)
  })
  // Scroll to end if overflow
  timeline.scrollLeft = timeline.scrollWidth
}

function saveToTimeline() {
  clearStatus()
  fillCanvasWhiteBg()
  const data = canvas.toDataURL('image/png')
  addToTimeline(data)
}

async function saveSketchForAccount(isPublic = false) {
  const canvas = document.getElementById('canvas')
  const sketchData = canvas.toDataURL('image/png')

  const authHeader = localStorage.getItem('githubToken')
  const user = JSON.parse(localStorage.getItem('githubUser') || '{}')
  const userId = user.id || user.login || user.sub || user.userId
  if (!authHeader || !userId) {
    alert('You must be logged in to save sketches')
    return
  }

  // Generate a unique sketchId (timestamp + random)
  const sketchId = 'sketch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)

  try {
    const response = await fetch('/save-sketch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authHeader}`
      },
      body: JSON.stringify({
        userId,
        sketchId,
        sketch: sketchData,
        isPublic: isPublic ? 1 : 0
      })
    })

    if (!response.ok) {
      throw new Error('Failed to save sketch')
    }

    alert('Sketch saved successfully!')
    loadAccountSketches()
  } catch (error) {
    console.error('Error saving sketch:', error)
    alert('An error occurred while saving the sketch')
  }
}

async function loadAccountSketches() {
  const authHeader = localStorage.getItem('githubToken')
  const user = JSON.parse(localStorage.getItem('githubUser') || '{}')
  const userId = user.id || user.login || user.sub || user.userId
  if (!authHeader || !userId) {
    alert('You must be logged in to load your sketches')
    return
  }
  try {
    const response = await fetch(`/get-sketches?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authHeader}` }
    })
    if (!response.ok) throw new Error('Failed to load sketches')
    const data = await response.json()
    const sketches = data.sketches || []
    const div = document.getElementById('sketches')
    div.innerHTML = ''
    sketches.forEach(sk => {
      const img = document.createElement('img')
      img.src = sk.sketch
      img.width = 120
      img.title = sk.sketchId
      img.style.margin = '4px'
      img.onclick = () => { const i = new Image(); i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0) }; i.src = sk.sketch }
      div.appendChild(img)
    })
  } catch (error) {
    alert('Error loading sketches: ' + error.message)
  }
}

function setupCanvasEvents() {
  // Set up touch events for mobile
  canvas.addEventListener('touchstart', e => {
    e.preventDefault()
    clearStatus()
    drawing = true
    const { x, y } = getCanvasCoords(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }, { passive: false })

  canvas.addEventListener('touchmove', e => {
    e.preventDefault()
    if (drawing) {
      clearStatus()
      const { x, y } = getCanvasCoords(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }, { passive: false })

  canvas.addEventListener('touchend', e => {
    e.preventDefault()
    clearStatus()
    drawing = false
  }, { passive: false })
}

// Initialize the app when DOM is ready
function initializeApp() {
  // Check for OAuth callback code in URL
  const urlParams = new URLSearchParams(window.location.search)
  const code = urlParams.get('code')

  if (code) {
    // Exchange code for token
    exchangeCodeForToken(code)
    // Clean up URL
    window.history.replaceState({}, document.title, window.location.pathname)
    return // Exit early as exchangeCodeForToken will handle UI updates
  }

  // Load any existing user data
  const storedUser = localStorage.getItem('githubUser')
  if (storedUser) {
    try {
      currentUser = JSON.parse(storedUser)
    } catch (e) {
      console.error('Failed to parse stored user data:', e)
      localStorage.removeItem('githubUser')
      currentUser = null
    }
  }

  // Verify existing token if present
  if (githubToken && currentUser) verifyGitHubToken()
  else {
    showLoginSection()
    updateUIBasedOnAuth()
  }
  setupCanvasEvents()
}

// Ensure initialization runs after DOM is loaded
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeApp)
else initializeApp()

window.aiAssist = aiAssist
window.clearCanvas = clearCanvas
window.downloadCanvas = downloadCanvas
window.loginWithGitHub = loginWithGitHub
window.saveToTimeline = saveToTimeline
window.saveSketchForAccount = saveSketchForAccount

function updateButtonStates() {
  const isCanvasEmpty = !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0)

  const buttonsToDisable = [
    document.querySelector('button[onclick="aiAssist()"]'),
    document.querySelector('button[onclick="clearCanvas()"]'),
    document.querySelector('button[onclick="downloadCanvas()"]'),
    document.querySelector('button[onclick="saveSketchForAccount()"]'),
    document.querySelector('button[onclick="saveToTimeline()"]')
  ]

  buttonsToDisable.forEach(button => {
    if (button) button.disabled = isCanvasEmpty
  })
}

// Update button states whenever the canvas changes
canvas.addEventListener('mouseup', updateButtonStates)
canvas.addEventListener('touchend', updateButtonStates)

// Initial state update
updateButtonStates()
