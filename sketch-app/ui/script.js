const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let drawing = false

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = 'Ov23liNUvc7QG2vvoSfM' // Your GitHub OAuth App Client ID
const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname // Current page
let githubToken = localStorage.getItem('githubToken')
let currentUser = null

function loginWithGitHub() {
  const loginButton = document.getElementById('github-login-btn')
  const errorDiv = document.getElementById('login-error')
  loginButton.innerHTML = '<span class="spinner"></span> Authenticating...'
  loginButton.disabled = true
  errorDiv.textContent = ''
  // Redirect to GitHub OAuth
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
    console.error('Authentication error:', error.message)
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
    if (option.value.includes('stability')) option.disabled = !isLoggedIn
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
  // Take a snapshot before running AI Assist
  addToTimeline(canvas.toDataURL('image/png'))
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

  const styleTags = JSON.parse(localStorage.getItem('aiStyleTags') || '[]')
  const description = localStorage.getItem('aiDescription')

  const res = await fetch('/ai-assist', {
    method: 'POST',
    headers,
    body: JSON.stringify({ image: data, model, styleCount, description, styleTags })
  })
  const result = await res.json()
  const optionsDiv = document.getElementById('ai-options')
  optionsDiv.innerHTML = '<div style="margin-bottom:6px">Pick a style:</div><br>'
  result.styles.forEach((style) => {
    const img = document.createElement('img')
    img.src = `data:image/png;base64,${style.image}`
    img.width = 160
    img.title = style.name
    // Store metadata in data attributes
    img.dataset.description = description || ''
    img.dataset.styleTags = JSON.stringify(styleTags || [])
    img.onclick = () => {
      Array.from(optionsDiv.querySelectorAll('img')).forEach(im => im.classList.remove('selected'))
      img.classList.add('selected')
      const i = new Image()
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0); addToTimeline(i.src, 'Applied'); updateButtonStates() }
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
// Default style tags
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
  const selected = new Set(JSON.parse(localStorage.getItem('aiStyleTags') || '[]'))
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

  function validateInput() {
    const val = input.value.trim()
    const userTags = getUserStyleTags()
    const allTags = userTags.concat(DEFAULT_TAGS)
    const isDuplicate = allTags.map(t => t.toLowerCase()).includes(val.toLowerCase())
    addBtn.disabled = !val || isDuplicate
  }

  function addTag() {
    const val = input.value.trim()
    if (!val) return
    // Prevent duplicates (case-insensitive)
    const userTags = getUserStyleTags()
    const allTags = userTags.concat(DEFAULT_TAGS)
    if (allTags.map(t => t.toLowerCase()).includes(val.toLowerCase())) {
      input.value = ''
      validateInput()
      return
    }
    userTags.unshift(val)
    setUserStyleTags(userTags)
    input.value = ''
    renderStyleTags()
    validateInput()
  }
  addBtn.onclick = addTag
  input.onkeydown = (e) => { if (e.key === 'Enter') addTag() }
  input.addEventListener('input', validateInput)
  validateInput()
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
    wrapper.className = 'timeline-item-wrapper'
    const img = document.createElement('img')
    img.src = image
    img.className = 'timeline-img'
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
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0); updateButtonStates() }
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
  // Prevent duplicate snapshot in timeline
  if (timelineState.some(item => item.image === data)) {
    document.getElementById('status').textContent = 'This sketch is already in the timeline.'
    return
  }
  addToTimeline(data)
}

function getCurrentUserObject() {
  return JSON.parse(localStorage.getItem('githubUser'))
}

async function saveSketchForAccount(isPublic = false) {
  const canvas = document.getElementById('canvas')
  const sketchData = canvas.toDataURL('image/png')

  const authHeader = localStorage.getItem('githubToken')
  let userId
  let username
  try {
    const { id, login } = getCurrentUserObject()
    userId = id
    username = login
  } catch (e) {
    console.error('Error getting user info:', e.message)
    return
  }
  if (!authHeader || !userId) {
    alert('You must be logged in to save sketches')
    return
  }

  // Prevent duplicate save: check if sketch already exists in saved sketches
  const sketchesDiv = document.getElementById('sketches')
  if (sketchesDiv) {
    const imgs = sketchesDiv.querySelectorAll('img.sketch-img')
    for (const img of imgs) {
      if (img.src !== sketchData) continue
      document.getElementById('status').textContent = 'This sketch is already saved.'
      return
    }
  }

  // --- Retrieve description and styleTags from selected AI Assist image if present ---
  let description = ''
  let styleTags = []
  const aiOptionsDiv = document.getElementById('ai-options')
  if (aiOptionsDiv) {
    const selectedImg = aiOptionsDiv.querySelector('img.selected')
    if (selectedImg) {
      description = selectedImg.dataset.description || ''
      try {
        styleTags = JSON.parse(selectedImg.dataset.styleTags || '[]')
      } catch { styleTags = [] }
    }
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
        username,
        sketchId,
        sketch: sketchData,
        isPublic: isPublic ? 1 : 0,
        description,
        styleTags
      })
    })

    if (!response.ok) throw new Error('Failed to save sketch')
    loadAccountSketches()
  } catch (error) {
    console.error('Error saving sketch:', error)
    alert('An error occurred while saving the sketch')
  }
}

// --- Publish/Unpublish Sketch UI Integration ---
// Add publish/unpublish button and logic to each sketch in the UI
async function toggleSketchPublic(userId, sketchId, isPublic, callback) {
  const authHeader = localStorage.getItem('githubToken')
  if (!authHeader) {
    alert('You must be logged in to change publish status.')
    return
  }
  try {
    const response = await fetch('/set-sketch-public', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authHeader}`
      },
      body: JSON.stringify({ userId, sketchId, isPublic })
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Failed to update publish status')
    if (callback) callback(true, data)
  } catch (error) {
    alert('Error updating publish status: ' + error.message)
    if (callback) callback(false)
  }
}

// Helper to clone the sketch card template and fill it
function createSketchCard(sk, userId) {
  const template = document.getElementById('sketch-card-template')
  if (!template) return null
  const node = template.content.cloneNode(true)
  const card = node.querySelector('.sketch-card')
  const img = card.querySelector('.sketch-img')
  img.src = sk.sketch
  img.width = 120
  img.title = sk.sketchId
  img.onclick = () => {
    const i = new Image()
    i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0); updateButtonStates() }
    i.src = sk.sketch
  }
  // Border color for public indicator
  function updateBorder() {
    img.style.border = '1.5px solid #e6edff'
  }
  updateBorder()
  // Toggle public/private icon
  const toggleBtn = card.querySelector('.toggle-public-action')
  function updateToggleIcon() {
    toggleBtn.innerHTML = sk.isPublic ? '🌍' : '🔒'
    toggleBtn.setAttribute('aria-checked', sk.isPublic ? 'true' : 'false')
    toggleBtn.title = sk.isPublic ? 'Set Private' : 'Set Public'
  }
  updateToggleIcon()
  toggleBtn.onclick = async function (e) {
    e.stopPropagation()
    toggleBtn.style.pointerEvents = 'none'
    await toggleSketchPublic(userId, sk.sketchId, !sk.isPublic, (success) => {
      toggleBtn.style.pointerEvents = ''
      if (success) {
        sk.isPublic = !sk.isPublic
        updateBorder()
        updateToggleIcon()
      }
    })
  }

  // Info icon for meta popup
  const infoIcon = card.querySelector('.info-action')
  infoIcon.innerHTML = 'ℹ️'
  infoIcon.onclick = infoIcon.onmouseenter = function (e) {
    e.stopPropagation()
    showSketchMetaPopup(sk, infoIcon)
  }
  infoIcon.onmouseleave = function () {
    hideSketchMetaPopup()
  }
  // Delete button
  const delBtn = card.querySelector('.delete-action')
  delBtn.innerHTML = '🗑️'
  delBtn.onclick = async function (e) {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this sketch? This cannot be undone.')) {
      await deleteSketch(userId, sk.sketchId)
      loadAccountSketches()
    }
  }
  return node
}

// Patch loadAccountSketches to use the template from index.html
loadAccountSketches = async function () {
  const authHeader = localStorage.getItem('githubToken')
  let userId
  try {
    const user = getCurrentUserObject()
    userId = user.id
  } catch (e) {
    console.error(e.message)
    return
  }
  if (!authHeader || !userId) return

  const errorDiv = document.getElementById('sketches-error')
  let loadingDiv = document.getElementById('sketches-loading')
  const sketchesDiv = document.getElementById('sketches')
  if (!loadingDiv) {
    loadingDiv = document.createElement('div')
    loadingDiv.id = 'sketches-loading'
    loadingDiv.style.color = '#0078d7'
    loadingDiv.style.marginBottom = '6px'
    loadingDiv.style.fontWeight = '500'
    errorDiv.parentNode.insertBefore(loadingDiv, errorDiv)
  }
  loadingDiv.textContent = 'Loading...'
  loadingDiv.style.display = ''
  if (sketchesDiv) sketchesDiv.style.display = 'none'
  if (errorDiv) {
    errorDiv.textContent = ''
    errorDiv.style.display = 'none'
  }
  try {
    const response = await fetch(`/get-sketches?userId=${encodeURIComponent(userId)}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authHeader}` }
    })
    if (!response.ok) throw new Error('Failed to load sketches')
    const data = await response.json()
    const sketches = data.sketches || []
    const failedSketches = data.failedSketches || []
    const div = document.getElementById('sketches')
    div.innerHTML = ''
    let errorMsg = ''
    sketches.forEach(sk => {
      if (sk.error) {
        errorMsg += `Error loading sketch ${sk.sketchId}: ${sk.error}\n`
        return
      }
      const card = createSketchCard(sk, userId)
      if (card) div.appendChild(card)
    })
    if (failedSketches.length > 0) {
      errorMsg += `Some sketches could not be loaded: ${failedSketches.join(', ')}\n`
    }
    loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = ''
    if (errorDiv) {
      if (errorMsg) {
        errorDiv.textContent = errorMsg.trim()
        errorDiv.style.display = ''
      } else {
        errorDiv.textContent = ''
        errorDiv.style.display = 'none'
      }
    }
  } catch (error) {
    loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = ''
    if (errorDiv) {
      errorDiv.textContent = 'Error loading sketches: ' + error.message
      errorDiv.style.display = ''
    }
  }
}

// --- Public Sketches Section ---
// Helper to clone the public sketch card template and fill it
function createPublicSketchCard(sk) {
  const template = document.getElementById('public-sketch-card-template')
  if (!template) return null
  const node = template.content.cloneNode(true)
  const card = node.querySelector('.public-sketch-card')
  const img = card.querySelector('img')
  img.src = sk.sketch
  img.width = 120
  img.title = sk.sketchId
  img.onclick = () => {
    const i = new Image()
    i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0); updateButtonStates() }
    i.src = sk.sketch
  }
  const userSpan = card.querySelector('.public-sketch-user')
  userSpan.textContent = sk.username || sk.userId || 'Anonymous'
  return node
}

// Load and render public sketches with loading and error UI
async function loadPublicSketches() {
  const loadingDiv = document.getElementById('public-sketches-loading')
  const errorDiv = document.getElementById('public-sketches-error')
  const sketchesDiv = document.getElementById('public-sketches')
  if (loadingDiv) {
    loadingDiv.style.display = ''
    loadingDiv.textContent = 'Loading...'
  }
  if (sketchesDiv) sketchesDiv.style.display = 'none'
  if (errorDiv) {
    errorDiv.textContent = ''
    errorDiv.style.display = 'none'
  }
  try {
    const response = await fetch('/public-sketches', { method: 'GET' })
    if (!response.ok) throw new Error('Failed to load public sketches')
    const data = await response.json()
    const sketches = data.sketches || []
    sketchesDiv.innerHTML = ''
    sketches.forEach(sk => {
      const card = createPublicSketchCard(sk)
      if (card) sketchesDiv.appendChild(card)
    })
    if (loadingDiv) loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = ''
  } catch (error) {
    if (loadingDiv) loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = ''
    if (errorDiv) {
      errorDiv.textContent = 'Could not load public sketches.'
      errorDiv.style.display = ''
    }
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

// Hide all open sketch meta popups
function hideSketchMetaPopup() {
  document.querySelectorAll('.sketch-meta-popup').forEach(popup => { popup.remove() })
}

// Show sketch metadata popup (info icon)
function showSketchMetaPopup(sketch, anchorEl) {
  hideSketchMetaPopup()
  // Create popup
  const popup = document.createElement('div')
  popup.className = 'sketch-meta-popup'
  // Format metadata
  const created = sketch.createdAt ? new Date(sketch.createdAt).toLocaleString() : 'Unknown'
  const description = sketch.description
  const styleTags = sketch.styleTags.join(', ')
  popup.innerHTML = `
    <b>Sketch ID:</b> <span style="word-break:break-all">${sketch.sketchId}</span><br>
    <b>Owner:</b> ${sketch.username || sketch.userId || 'Anonymous'}<br>
    <b>Public:</b> ${sketch.isPublic ? 'Yes' : 'No'}<br>
    <b>description:</b> ${description ?? ''}<br>
    <b>Style Tags:</b> ${styleTags}<br>
    <b>Created:</b> ${created}<br>
  `
  // Position popup below the anchor element
  const rect = anchorEl.getBoundingClientRect()
  popup.style.position = 'fixed'
  popup.style.left = `${rect.left}px`
  popup.style.top = `${rect.bottom + 4}px`
  popup.style.pointerEvents = 'auto'
  // Dismiss on click outside (mobile)
  function onDocClick(e) {
    if (!popup.contains(e.target) && e.target !== anchorEl) {
      hideSketchMetaPopup()
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('touchstart', onDocClick)
    }
  }
  document.addEventListener('mousedown', onDocClick)
  document.addEventListener('touchstart', onDocClick)
  document.body.appendChild(popup)
}

// Description field setup
function setupDescriptionField() {
  const input = document.getElementById('description-input')
  if (!input) return
  // Load from localStorage
  input.value = localStorage.getItem('aiDescription') || ''
  // Save on input
  input.addEventListener('input', () => {
    localStorage.setItem('aiDescription', input.value)
  })
}

window.aiAssist = aiAssist
window.clearCanvas = clearCanvas
window.downloadCanvas = downloadCanvas
window.loginWithGitHub = loginWithGitHub
window.logout = logout
window.renderStyleTags = renderStyleTags
window.saveSketchForAccount = saveSketchForAccount
window.saveToTimeline = saveToTimeline

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    loadPublicSketches()
    renderStyleTags()
    setupAddStyleTagRow()
    setupDescriptionField()
  })
} else {
  loadPublicSketches()
  renderStyleTags()
  setupAddStyleTagRow()
  setupDescriptionField()
}

// Add refresh button event
if (document.getElementById('refresh-sketches-btn')) {
  document.getElementById('refresh-sketches-btn').onclick = () => loadAccountSketches()
}

// Add refresh button event for public sketches
if (document.getElementById('refresh-public-sketches-btn')) {
  document.getElementById('refresh-public-sketches-btn').onclick = () => loadPublicSketches()
}

// Delete a sketch for the current user
async function deleteSketch(userId, sketchId) {
  const authHeader = localStorage.getItem('githubToken')
  if (!authHeader) {
    alert('You must be logged in to delete sketches')
    return
  }
  try {
    const response = await fetch('/delete-sketch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authHeader}`
      },
      body: JSON.stringify({ userId, sketchId })
    })
    if (!response.ok) {
      const data = await response.json().catch(() => ({}))
      throw new Error(data.error || 'Failed to delete sketch')
    }
    // Success: handled by caller (refreshes list)
  } catch (error) {
    alert('Error deleting sketch: ' + error.message)
  }
}
