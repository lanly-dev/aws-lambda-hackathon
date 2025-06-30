const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let drawing = false

// GitHub OAuth Configuration
const GITHUB_CLIENT_ID = 'Ov23liNUvc7QG2vvoSfM' // Your GitHub OAuth App Client ID
const GITHUB_REDIRECT_URI = window.location.origin + window.location.pathname // Current page
let githubToken = localStorage.getItem('githubToken')
let currentUser = null

// --- API base path detection ---
const API_BASE_PATH = window.location.pathname.startsWith('/Prod') ? '/Prod' : ''

// Helper to prefix API requests
function apiUrl(path) {
  return API_BASE_PATH + path
}

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
    const response = await fetch(apiUrl('/auth/github'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    })

    if (!response.ok) throw new Error('Authentication failed')

    const data = await response.json()

    // console.log('Received token and user data:', data) // Debugging log

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
    // console.log('Verifying GitHub token:', githubToken) // Debugging log

    if (!githubToken) {
      console.error('GitHub token is missing') // Debugging log
      alert('Your session has expired. Please log in again.')
      logout()
      return
    }

    fetch('https://api.github.com/user', {
      headers:
      {
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
        // console.log('Verified user:', user) // Debugging log
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
  const savedSketchSection = document.getElementById('saved-sketches-section')

  // Update style count options
  Array.from(styleCountSelect.options).forEach((option, index) => {
    // Options 3 and 4 are disabled for anonymous users
    if (index > 1) option.disabled = !isLoggedIn
  })

  // // Update model options
  // Array.from(modelSelect.options).forEach(option => {
  //   if (option.value.includes('stability.sd3-large-v1')) option.disabled = !isLoggedIn
  // })

  // Reset to safe defaults if logged out
  if (!isLoggedIn) {
    if (styleCountSelect.selectedIndex > 1) styleCountSelect.selectedIndex = 1 // 2 styles max for anonymous
    if (modelSelect.value.includes('stability')) modelSelect.selectedIndex = 0 // Default to Titan
    savedSketchSection.style.display = 'none' // Hide saved sketches section
  } else {
    savedSketchSection.style.display = 'block' // Show saved sketches section
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
  const status2 = document.getElementById('ai-assist-status')
  let remaining = seconds
  status.innerHTML = '<span class="spinner"></span>AI working...'
  status2.innerHTML = `<span class="spinner"></span>AI working... (${remaining}s)`
  if (aiAssistTimer) clearInterval(aiAssistTimer)
  aiAssistTimer = setInterval(() => {
    remaining--
    if (remaining > 0) {
      status2.innerHTML = `<span class="spinner"></span>Please wait before using AI Assist again... (${remaining}s)`
    } else {
      clearInterval(aiAssistTimer)
      aiAssistTimer = null
      status.textContent = ''
      status2.textContent = ''
    }
  }, 1000)
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
  // Only take a snapshot if not already in timeline
  const currentDataUrl = canvas.toDataURL('image/png')
  if (!timelineState.some(item => item.image === currentDataUrl)) {
    addToTimeline(currentDataUrl)
  }
  if (aiAssistCooldown) {
    document.getElementById('status').textContent = 'Please wait before using AI Assist again.'
    return
  }
  const errorDiv = document.getElementById('ai-options-error')
  errorDiv.style.display = 'none'
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
  const model = document.getElementById('model-select').value
  const modelName = document.getElementById('model-select').selectedOptions[0].textContent
  const styleCount = parseInt(document.getElementById('style-count-select').value, 10) || 4

  const headers = { 'Content-Type': 'application/json' }
  if (githubToken) headers.Authorization = `Bearer ${githubToken}`

  const styleTags = JSON.parse(localStorage.getItem('aiStyleTags') || '[]')
  const description = localStorage.getItem('aiDescription')

  let res
  let result
  try {
    res = await fetch(apiUrl('/ai-assist'), {
      method: 'POST',
      headers,
      body: JSON.stringify({ image: data, model, styleCount, description, styleTags })
    })
    result = await res.json()
  } catch (error) {
    errorDiv.textContent = `Error: ${error.message}`
    errorDiv.style.display = 'block'
    return
  }
  if (!res.ok) {
    errorDiv.textContent = `Error: ${result.error ?? 'Unknown error'}`
    errorDiv.style.display = 'block'
    return
  }

  const optionsDiv = document.getElementById('ai-options')
  optionsDiv.innerHTML = ''

  const template = document.getElementById('ai-options-template').content

  result.styles.forEach((style) => {
    const option = template.cloneNode(true)
    const img = option.querySelector('.ai-option-img')
    img.src = `data:image/png;base64,${style.image}`
    img.title = style.name
    img.dataset.description = description || ''
    img.dataset.styleTags = JSON.stringify(styleTags || [])
    img.dataset.modelName = modelName
    img.onclick = () => {
      Array.from(optionsDiv.querySelectorAll('img')).forEach(im => im.classList.remove('selected'))
      img.classList.add('selected')
      const i = new Image()
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0); addToTimeline(i.src, 'Applied'); updateButtonStates() }
      i.src = `data:image/png;base64,${style.image}`
      document.getElementById('status').textContent = 'Applied: ' + style.name
    }
    optionsDiv.appendChild(option)
  })
  document.getElementById('status').textContent = 'AI Assist complete! Pick a style'
  document.getElementById('ai-options-title').style.display = 'block'
}

// Default style tags
const DEFAULT_TAGS = [
  'Cartoon', 'Watercolor', 'Oil Paint', 'Ink', 'Comic', '3D', 'Flat', 'Pixel', 'Pastel', 'Charcoal', 'Line Art', 'Pop Art', 'Anime', 'Realistic'
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
  const MAX_TAGS = 5
  const limitMsg = document.getElementById('style-tag-limit-msg')
  if (limitMsg) {
    limitMsg.textContent = '' // Always clear by default
  }
  let limitMsgTimeout = null
  function handleTagClick(tag) {
    if (selected.has(tag)) {
      selected.delete(tag)
    } else {
      if (selected.size >= MAX_TAGS) {
        tagContainer.classList.add('shake')
        if (limitMsg) limitMsg.textContent = `Max ${MAX_TAGS} tags selected`
        clearTimeout(limitMsgTimeout)
        limitMsgTimeout = setTimeout(() => { if (limitMsg) limitMsg.textContent = '' }, 1800)
        setTimeout(() => tagContainer.classList.remove('shake'), 400)
        return
      }
      selected.add(tag)
    }
    localStorage.setItem('aiStyleTags', JSON.stringify([...selected]))
    renderStyleTags()
  }
  // Render user-added tags first
  userTags.forEach((tag, idx) => {
    const btn = document.createElement('button')
    btn.textContent = tag
    btn.type = 'button'
    btn.className = 'user-style-tag-btn'
    if (selected.has(tag)) btn.classList.add('selected')
    btn.onclick = () => handleTagClick(tag)
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
    btn.onclick = () => handleTagClick(tag)
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

  let userId
  let username
  let userAvatar
  try {
    const userObj = getCurrentUserObject()
    if (userObj) {
      userId = userObj.id
      username = userObj.login
      userAvatar = userObj.avatar_url
    }
  } catch (e) {
    console.error('Error getting user info:', e.message)
    return
  }

  const authHeader = localStorage.getItem('githubToken')
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
  let modelName = ''
  let styleTags = []
  const aiOptionsDiv = document.getElementById('ai-options')
  if (aiOptionsDiv) {
    const selectedImg = aiOptionsDiv.querySelector('img.selected')
    if (selectedImg) {
      description = selectedImg.dataset.description || ''
      modelName = selectedImg.dataset.modelName || ''
      try {
        styleTags = JSON.parse(selectedImg.dataset.styleTags || '[]')
      } catch { styleTags = [] }
    }
  }

  // Generate a unique sketchId (timestamp + random)
  const sketchId = 'sketch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)

  try {
    const response = await fetch(apiUrl('/save-sketch'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authHeader}`
      },
      body: JSON.stringify({
        userId,
        username,
        userAvatar,
        sketchId,
        sketch: sketchData,
        isPublic: isPublic ? 1 : 0,
        description,
        modelName,
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
    const response = await fetch(apiUrl('/set-sketch-public'), {
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
  infoIcon.onclick = function (e) {
    e.stopPropagation()
    showSketchMetaPopup(sk, infoIcon, true)
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

let sketchesNextCursor = null

async function loadAccountSketchesIncremental(append = false) {
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
  const loadingDiv = document.getElementById('sketches-loading')
  const sketchesDiv = document.getElementById('sketches')
  loadingDiv.style.display = 'inline-block'
  if (!append && sketchesDiv) sketchesDiv.innerHTML = ''
  if (errorDiv) {
    errorDiv.textContent = ''
    errorDiv.style.display = 'none'
  }

  try {
    const url = apiUrl(`/get-sketches?userId=${encodeURIComponent(userId)}&limit=5${sketchesNextCursor ? `&lastKey=${encodeURIComponent(sketchesNextCursor)}` : ''}`)
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: `Bearer ${authHeader}` }
    })
    if (!response.ok) throw new Error('Request failed with status ' + response.status)
    const data = await response.json()
    const sketches = data.sketches || []
    sketchesNextCursor = data.nextCursor || null

    if (sketches.length === 0 && !sketchesNextCursor && !append) {
      // Show message if no sketches
      const msg = document.createElement('div')
      msg.className = 'no-sketches-msg'
      msg.textContent = 'You have no saved sketches yet.'
      sketchesDiv.appendChild(msg)
    } else {
      sketches.forEach(sk => {
        const card = createSketchCard(sk, userId)
        if (card) sketchesDiv.appendChild(card)
      })
    }
    loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = ''
    if (errorDiv) {
      errorDiv.textContent = ''
      errorDiv.style.display = 'none'
    }
    return sketches.length > 0
  } catch (error) {
    loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = 'none'
    if (errorDiv) {
      errorDiv.textContent = 'Could not load sketches: ' + (error.message ?? error)
      errorDiv.style.display = 'block'
    }
    return false
  }
}

function loadAccountSketches() {
  sketchesNextCursor = null

  function loadNextBatch(isFirstBatch = false) {
    loadAccountSketchesIncremental(!isFirstBatch).then(() => {
      if (!sketchesNextCursor) return
      if (window.requestIdleCallback) requestIdleCallback(() => loadNextBatch(false))
      else setTimeout(() => loadNextBatch(false), 0)
    })
  }

  loadNextBatch(true)
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

  const likeBtn = card.querySelector('.like-action')
  const likeCountSpan = likeBtn.querySelector('.like-count')
  likeBtn.title = 'Like this sketch'
  likeBtn.style.cursor = 'pointer'
  likeCountSpan.textContent = sk.likeCount || 0

  // Determine if user already liked
  let alreadyLiked = false
  let userId = null

  const user = getCurrentUserObject()
  userId = user && user.id
  if (sk.likedBy && Array.isArray(sk.likedBy) && userId && sk.likedBy.includes(userId)) {
    alreadyLiked = true
  }

  function updateLikeBtnState(liked) {
    likeBtn.style.background = liked ? 'pink' : null
    likeBtn.title = liked ? 'Unlike this sketch' : 'Like this sketch'
  }
  updateLikeBtnState(alreadyLiked)

  likeBtn.onclick = async function (e) {
    e.stopPropagation()
    likeBtn.style.pointerEvents = 'none'
    try {
      const user = getCurrentUserObject()
      if (!user) {
        alert('You must be logged in to like sketches')
        return
      }
      const res = await fetch(apiUrl('/like-sketch'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: localStorage.getItem('githubToken') || ''
        },
        body: JSON.stringify({ sketchId: sk.sketchId, ownerId: sk.userId, userId: user.id })
      })
      if (!res.ok) throw new Error('Failed to like/unlike sketch')
      const data = await res.json()
      const countSpan = likeBtn.querySelector('.like-count')
      if (countSpan && typeof data.likeCount === 'number') countSpan.textContent = data.likeCount.toString()
      updateLikeBtnState(data.liked)
      alreadyLiked = data.liked
    } catch (err) {
      console.error(err)
      alert('Could not like/unlike sketch: ' + (err.message || err))
    } finally {
      likeBtn.style.pointerEvents = ''
    }
  }

  // Set owner avatar in place of info icon
  const avatarBtn = card.querySelector('.owner-avatar-action')
  const avatarImg = avatarBtn && avatarBtn.querySelector('.owner-avatar-img')
  if (avatarImg) {
    avatarImg.src = sk.userAvatar || 'https://avatars.githubusercontent.com/u/583231?v=4'
    avatarImg.alt = sk.username || 'Owner avatar'
    avatarBtn.title = sk.username ? `Show info for ${sk.username}` : 'Show info'
    avatarBtn.onclick = function (e) {
      e.stopPropagation()
      showSketchMetaPopup(sk, avatarBtn)
    }
    avatarBtn.onmouseenter = null
    avatarBtn.onmouseleave = null
  }

  return node
}

let publicSketchesNextCursor = null

async function loadPublicSketchesIncremental(append = false) {
  const loadingDiv = document.getElementById('public-sketches-loading')
  const errorDiv = document.getElementById('public-sketches-error')
  const sketchesDiv = document.getElementById('public-sketches')

  loadingDiv.style.display = 'inline-block'
  if (!append && sketchesDiv) sketchesDiv.innerHTML = ''
  if (errorDiv) {
    errorDiv.textContent = ''
    errorDiv.style.display = 'none'
  }

  try {
    const limit = 5
    let sketches = []
    let nextCursor = publicSketchesNextCursor

    for (let i = 0; i < 3; i++) {
      const url = apiUrl(`/public-sketches?limit=${limit}${nextCursor ? `&lastKey=${encodeURIComponent(nextCursor)}` : ''}`)
      const response = await fetch(url, { method: 'GET' })
      if (!response.ok) throw new Error('Request failed with status ' + response.status)
      const data = await response.json()
      sketches = sketches.concat(data.sketches || [])
      nextCursor = data.nextCursor || null
      if (!nextCursor) break
    }

    publicSketchesNextCursor = githubToken ? nextCursor : null // Disable pagination if not logged in

    sketches.forEach(sk => {
      const card = createPublicSketchCard(sk)
      if (card) sketchesDiv.appendChild(card)
    })

    loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = ''
    if (errorDiv) {
      errorDiv.textContent = ''
      errorDiv.style.display = 'none'
    }
    return sketches.length > 0
  } catch (error) {
    loadingDiv.style.display = 'none'
    if (sketchesDiv) sketchesDiv.style.display = 'none'
    if (errorDiv) {
      errorDiv.textContent = 'Could not load public sketches: ' + (error.message ?? error)
      errorDiv.style.display = 'block'
    }
    return false
  }
}

async function loadPublicSketches() {
  publicSketchesNextCursor = null

  function loadNextBatch(isFirstBatch = false) {
    loadPublicSketchesIncremental(!isFirstBatch).then(() => {
      if (!publicSketchesNextCursor) return
      if (window.requestIdleCallback) requestIdleCallback(() => loadNextBatch(false))
      else setTimeout(() => loadNextBatch(false), 0)
    })
  }
  loadNextBatch(true)
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
  const aiAssistBtn = document.querySelector('button[onclick="aiAssist()"]')
  const descriptionInput = document.getElementById('description-input')
  // AI Assist button requires non-empty canvas, non-empty description, and not in cooldown
  aiAssistBtn.disabled = isCanvasEmpty || !(descriptionInput && descriptionInput.value.trim()) || aiAssistCooldown

  const buttonsToDisable = [
    aiAssistBtn,
    document.querySelector('button[onclick="clearCanvas()"]'),
    document.querySelector('button[onclick="downloadCanvas()"]'),
    document.querySelector('button[onclick="saveSketchForAccount()"]'),
    document.querySelector('button[onclick="saveToTimeline()"]')
  ]
  buttonsToDisable.forEach(button => {
    if (button && button !== aiAssistBtn) button.disabled = isCanvasEmpty
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

// Show sketch metadata popup (info icon) - only on click, with smart positioning
function showSketchMetaPopup(sketch, anchorEl, isPrivate = false) {
  hideSketchMetaPopup()
  // Create popup
  const popup = document.createElement('div')
  popup.className = 'sketch-meta-popup'
  // Format metadata
  const created = sketch.createdAt ? new Date(sketch.createdAt).toLocaleString() : 'Unknown'
  const description = sketch.description
  const styleTags = sketch.styleTags && sketch.styleTags.length ? sketch.styleTags.join(', ') : ''
  popup.innerHTML = `
    <b>Sketch ID:</b> <span style="word-break:break-all">${sketch.sketchId}</span><br>
    <b>Owner:</b> ${sketch.username || sketch.userId || 'Anonymous'}<br>
    ${isPrivate ? (`<b>Public:</b> ${sketch.isPublic ? 'Yes' : 'No'}<br>`) : ''}
    <b>Description:</b> ${description ?? ''}<br>
    <b>Model:</b> ${sketch.modelName || ''}<br>
    <b>Styles:</b> ${styleTags}<br>
    <b>Created:</b> ${created}<br>
  `
  // Smart positioning: try to keep popup in viewport
  const rect = anchorEl.getBoundingClientRect()
  const popupWidth = 260
  const popupHeight = 180
  let left = rect.left
  let top = rect.bottom + 4
  // Adjust if popup would overflow right edge
  if (left + popupWidth > window.innerWidth - 8) {
    left = window.innerWidth - popupWidth - 8
  }
  // Adjust if popup would overflow bottom edge
  if (top + popupHeight > window.innerHeight - 8) {
    top = rect.top - popupHeight + 80
    if (top < 8) top = 8
  }
  if (left < 8) left = 8
  popup.style.position = 'fixed'
  popup.style.left = `${left}px`
  popup.style.top = `${top}px`
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
  const aiAssistBtn = document.querySelector('button[onclick="aiAssist()"]')
  if (!input) return
  // Load from localStorage
  input.value = localStorage.getItem('aiDescription') || ''
  // Set initial state for AI Assist button
  if (aiAssistBtn) aiAssistBtn.disabled = !input.value.trim() || !ctx.getImageData(0, 0, canvas.width, canvas.height).data.some(channel => channel !== 0)
  // Save on input and enable/disable AI Assist button
  input.addEventListener('input', () => {
    localStorage.setItem('aiDescription', input.value)
    updateButtonStates()
  })
}

// Refresh button events
if (document.getElementById('refresh-sketches-btn')) {
  document.getElementById('refresh-sketches-btn').onclick = () => loadAccountSketches()
}
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
    const response = await fetch(apiUrl('/delete-sketch'), {
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

// Restore UI state on page load
function restoreUIState() {
  const githubToken = localStorage.getItem('githubToken')
  const currentUser = JSON.parse(localStorage.getItem('githubUser'))
  if (githubToken && currentUser)  updateUIBasedOnAuth()
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
    restoreUIState()
    setupAddStyleTagRow()
    setupDescriptionField()
  })
} else {
  loadPublicSketches()
  renderStyleTags()
  restoreUIState()
  setupAddStyleTagRow()
  setupDescriptionField()
}
