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
  const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(GITHUB_REDIRECT_URI)}&scope=user:email`
  window.location.href = githubAuthUrl
}

async function exchangeCodeForToken(code) {
  try {
    document.getElementById('status').textContent = 'Authenticating with GitHub...'

    // Call our backend OAuth endpoint
    const response = await fetch('/auth/github', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ code })
    })

    if (!response.ok) {
      throw new Error('Authentication failed')
    }

    const data = await response.json()

    // Store the real token and user data
    githubToken = data.access_token
    currentUser = data.user
    localStorage.setItem('githubToken', githubToken)
    localStorage.setItem('githubUser', JSON.stringify(currentUser))

    showUserInfo()
    updateUIBasedOnAuth()
    document.getElementById('status').textContent = 'Successfully logged in!'
    setTimeout(() => document.getElementById('status').textContent = '', 3000)
  } catch (error) {
    console.error('Authentication error:', error)
    document.getElementById('status').textContent = 'Authentication failed. Please try again.'
    showLoginSection()
  }
}

async function verifyGitHubToken() {
  try {
    const response = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${githubToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    })

    if (response.ok) {
      currentUser = await response.json()
      localStorage.setItem('githubUser', JSON.stringify(currentUser))
      showUserInfo()
    } else {
      // Token is invalid
      logout()
    }
  } catch (error) {
    console.error('Token verification failed:', error)
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
  document.getElementById('status').textContent = 'Logged out successfully.'
  setTimeout(() => document.getElementById('status').textContent = '', 3000)
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
  }
}

function updateUIBasedOnAuth() {
  const isLoggedIn = !!githubToken

  // Enable/disable premium features based on login status
  const styleCountSelect = document.getElementById('style-count-select')
  const modelSelect = document.getElementById('model-select')

  // Update style count options
  Array.from(styleCountSelect.options).forEach((option, index) => {
    if (index > 1) { // Options 3 and 4
      option.disabled = !isLoggedIn
      option.textContent = option.textContent.replace(' (Login required)', '')
      if (!isLoggedIn) {
        option.textContent += ' (Login required)'
      }
    }
  })

  // Update model options
  Array.from(modelSelect.options).forEach(option => {
    if (option.value.includes('stability')) {
      option.disabled = !isLoggedIn
      option.textContent = option.textContent.replace(' (Login required)', '')
      if (!isLoggedIn) {
        option.textContent += ' (Login required)'
      }
    }
  })

  // Reset to safe defaults if logged out
  if (!isLoggedIn) {
    if (styleCountSelect.selectedIndex > 1) {
      styleCountSelect.selectedIndex = 1 // 2 styles max for anonymous
    }
    if (modelSelect.value.includes('stability')) {
      modelSelect.selectedIndex = 0 // Default to Titan
    }
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
    if (remaining > 0) {
      status.innerHTML = `<span class="spinner"></span> Please wait... (${remaining}s)`
    } else {
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

// Timeline state
const timelineState = []

function addToTimeline(imageDataUrl, label = '') {
  // Prevent duplicate 'Saved' entries
  if (label === 'Saved') {
    const idx = timelineState.findIndex(item => item.image === imageDataUrl && item.label === 'Saved')
    if (idx !== -1) {
      document.getElementById('status').textContent = 'This sketch is already saved.'
      // Move to most recent
      const [item] = timelineState.splice(idx, 1)
      timelineState.push(item)
      renderTimeline()
      return
    }
  }
  // Add or move item
  timelineState.push({ image: imageDataUrl, label })
  // Limit to 10
  if (timelineState.length > 10) timelineState.shift()
  renderTimeline()
}

function renderTimeline() {
  const timeline = document.getElementById('timeline')
  timeline.innerHTML = ''
  timelineState.forEach(({ image, label }) => {
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
    img.title = label ? label : 'Timeline image'
    img.onclick = () => {
      clearStatus()
      // Move this item to the end (most recent)
      const foundIdx = timelineState.findIndex(item => item.image === image && item.label === label)
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
    if (label) {
      const lbl = document.createElement('div')
      lbl.textContent = label
      lbl.style.fontSize = '0.8rem'
      lbl.style.color = '#2d3a5a'
      lbl.style.textAlign = 'center'
      wrapper.appendChild(lbl)
    }
    timeline.appendChild(wrapper)
  })
  // Scroll to end if overflow
  timeline.scrollLeft = timeline.scrollWidth
}

function saveToTimeline() {
  clearStatus()
  fillCanvasWhiteBg()
  const data = canvas.toDataURL('image/png')
  addToTimeline(data, 'Saved')
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
  })

  canvas.addEventListener('touchmove', e => {
    e.preventDefault()
    if (drawing) {
      clearStatus()
      const { x, y } = getCanvasCoords(e)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  })

  canvas.addEventListener('touchend', e => {
    e.preventDefault()
    clearStatus()
    drawing = false
  })
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
  if (githubToken && currentUser) {
    verifyGitHubToken()
  } else {
    showLoginSection()
    updateUIBasedOnAuth()
  }
  setupCanvasEvents()
}

// Ensure initialization runs after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp)
} else {
  initializeApp()
}

window.saveToTimeline = saveToTimeline
window.downloadCanvas = downloadCanvas
window.clearCanvas = clearCanvas
window.loginWithGitHub = loginWithGitHub
window.aiAssist = aiAssist
