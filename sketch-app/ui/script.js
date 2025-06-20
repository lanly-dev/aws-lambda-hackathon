// JavaScript for Sketch App with AI Assist
// Handles drawing, saving, loading, and AI assist features

const canvas = document.getElementById('canvas')
const ctx = canvas.getContext('2d')
let drawing = false
canvas.onmousedown = e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY) }
canvas.onmousemove = e => { if (drawing) { ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke() } }
canvas.onmouseup = () => drawing = false
function clearCanvas() { ctx.clearRect(0, 0, canvas.width, canvas.height) }
async function saveSketch() {
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
async function aiAssist() {
  const data = canvas.toDataURL()
  document.getElementById('status').textContent = 'AI working...'
  document.getElementById('ai-options').innerHTML = ''
  const model = document.getElementById('model-select').value
  const res = await fetch('/ai-assist', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: data, model })
  })
  const result = await res.json()
  // result.styles: [{name, image}]
  const optionsDiv = document.getElementById('ai-options')
  optionsDiv.innerHTML = '<b>Pick a style:</b><br>'
  result.styles.forEach((style, idx) => {
    const img = document.createElement('img')
    img.src = style.image
    img.width = 160
    img.title = style.name
    img.onclick = () => {
      // Highlight selection
      Array.from(optionsDiv.querySelectorAll('img')).forEach(im => im.classList.remove('selected'))
      img.classList.add('selected')
      // Apply to canvas
      const i = new Image()
      i.onload = () => { clearCanvas(); ctx.drawImage(i, 0, 0) }
      i.src = style.image
      document.getElementById('status').textContent = 'Applied: ' + style.name
    }
    optionsDiv.appendChild(img)
  })
  document.getElementById('status').textContent = 'AI Assist complete! Pick a style.'
}
loadSketches()
