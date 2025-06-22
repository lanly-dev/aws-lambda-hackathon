const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let drawing = false

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

canvas.onmousedown = e => {
  drawing = true
  const { x, y } = getCanvasCoords(e)
  ctx.beginPath()
  ctx.moveTo(x, y)
}
canvas.onmousemove = e => {
  if (drawing) {
    const { x, y } = getCanvasCoords(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
}
canvas.onmouseup = () => drawing = false
canvas.onmouseleave = () => drawing = false
function fillCanvasWhiteBg() {
  ctx.save()
  ctx.globalCompositeOperation = 'destination-over'
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.restore()
}
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height) }
async function saveSketch() {
  fillCanvasWhiteBg()
  const data = canvas.toDataURL()
  const res = await fetch('/sketches', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ imageData: data, title: 'Untitled', timestamp: new Date().toISOString() }) })
  document.getElementById('status').textContent = (await res.json()).message || 'Saved!'
  loadSketches()
}
async function loadSketches() {
  const res = await fetch('/sketches')
  const sketches = await res.json()
  const div = document.getElementById('sketches')
  div.innerHTML = ''
  sketches.forEach(sk => {
    const img = document.createElement('img')
    img.src = sk.imageData
    img.width = 120
    img.title = sk.title
    img.style.margin = '4px'
    img.onclick = () => { const i = new Image(); i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0) }; i.src = sk.imageData }
    div.appendChild(img)
  })
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

async function aiAssist() {
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
  const res = await fetch('/ai-assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0) }
      i.src  = `data:image/png;base64,${style.image}`
      document.getElementById('status').textContent = 'Applied: ' + style.name
    }
    optionsDiv.appendChild(img)
  })
  document.getElementById('status').textContent = 'AI Assist complete! Pick a style.'
}
loadSketches()

window.clearCanvas = clearCanvas
window.saveSketch = saveSketch
window.aiAssist = aiAssist
