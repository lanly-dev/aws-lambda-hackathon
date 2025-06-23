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
  fillCanvasWhiteBg()
  addToTimeline(canvas.toDataURL('image/png'), 'Sketch')
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
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0); addToTimeline(i.src, 'Applied') }
      i.src  = `data:image/png;base64,${style.image}`
      document.getElementById('status').textContent = 'Applied: ' + style.name
    }
    optionsDiv.appendChild(img)
    // Add AI result to timeline
    addToTimeline(`data:image/png;base64,${style.image}`, 'AI')
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

// Timeline logic
function addToTimeline(imageDataUrl, label = '') {
  const timeline = document.getElementById('timeline')
  const wrapper = document.createElement('div')
  wrapper.style.display = 'flex'
  wrapper.style.flexDirection = 'column'
  wrapper.style.alignItems = 'center'
  wrapper.style.minWidth = '80px'

  const img = document.createElement('img')
  img.src = imageDataUrl
  img.style.width = '70px'
  img.style.height = '70px'
  img.style.objectFit = 'contain'
  img.style.border = '2px solid #e6edff'
  img.style.borderRadius = '6px'
  img.style.background = '#fff'
  img.style.boxShadow = '0 1px 4px #0001'
  img.style.marginBottom = '4px'

  if (label) {
    const lbl = document.createElement('div')
    lbl.textContent = label
    lbl.style.fontSize = '0.8rem'
    lbl.style.color = '#2d3a5a'
    lbl.style.textAlign = 'center'
    wrapper.appendChild(img)
    wrapper.appendChild(lbl)
  } else {
    wrapper.appendChild(img)
  }

  timeline.appendChild(wrapper)
}

window.clearCanvas = clearCanvas
window.downloadCanvas = downloadCanvas
window.aiAssist = aiAssist
window.addToTimeline = addToTimeline
