import { v4 as uuidv4 } from 'uuid';

// In-memory DB for local testing
const sketches = new Map();

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Sketch App with AI Assist</title>
  <style>body{font-family:sans-serif;background:#f0f0f0;margin:0;padding:0;}#main{max-width:900px;margin:40px auto;background:#fff;padding:24px;border-radius:8px;box-shadow:0 2px 8px #0001;}canvas{border:1px solid #ccc;border-radius:4px;display:block;margin:0 auto 16px;}button{margin:0 8px 8px 0;}</style>
</head>
<body>
  <div id="main">
    <h1>Sketch App with AI Assist</h1>
    <canvas id="canvas" width="800" height="400"></canvas><br>
    <button onclick="clearCanvas()">Clear</button>
    <button onclick="saveSketch()">Save Sketch</button>
    <button onclick="aiAssist()">AI Assist</button>
    <div id="status"></div>
    <h2>Saved Sketches</h2>
    <div id="sketches"></div>
  </div>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    let drawing = false;
    canvas.onmousedown = e => { drawing = true; ctx.beginPath(); ctx.moveTo(e.offsetX, e.offsetY); };
    canvas.onmousemove = e => { if(drawing){ ctx.lineTo(e.offsetX, e.offsetY); ctx.stroke(); } };
    canvas.onmouseup = () => drawing = false;
    function clearCanvas(){ ctx.clearRect(0,0,canvas.width,canvas.height); }
    async function saveSketch(){
      const data = canvas.toDataURL();
      const res = await fetch('/sketches', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({imageData:data,title:'Untitled',timestamp:new Date().toISOString()})});
      document.getElementById('status').textContent = (await res.json()).message || 'Saved!';
      loadSketches();
    }
    async function loadSketches(){
      const res = await fetch('/sketches');
      const sketches = await res.json();
      const div = document.getElementById('sketches');
      div.innerHTML = '';
      sketches.forEach(sk=>{
        const img = document.createElement('img');
        img.src = sk.imageData;
        img.width = 120;
        img.title = sk.title;
        img.style.margin = '4px';
        img.onclick = ()=>{ let i=new Image();i.onload=()=>{clearCanvas();ctx.drawImage(i,0,0);};i.src=sk.imageData; };
        div.appendChild(img);
      });
    }
    async function aiAssist(){
      const data = canvas.toDataURL();
      document.getElementById('status').textContent = 'AI working...';
      const res = await fetch('/ai-assist', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({image:data})});
      const result = await res.json();
      let i=new Image();i.onload=()=>{clearCanvas();ctx.drawImage(i,0,0);};i.src=result.image;
      document.getElementById('status').textContent = 'AI Assist complete!';
    }
    loadSketches();
  </script>
</body>
</html>`;

const response = (status, body, headers={}) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body)
});
const htmlResponse = html => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
  body: html
});

export const handler = async (event) => {
  const { httpMethod, path, body } = event;
  if(httpMethod === 'OPTIONS') return response(200, 'OK');
  if(httpMethod === 'GET' && (path === '/' || path === '')) return htmlResponse(html);
  if(path === '/sketches') {
    if(httpMethod === 'GET') return response(200, Array.from(sketches.values()));
    if(httpMethod === 'POST') {
      const data = JSON.parse(body);
      const id = uuidv4();
      sketches.set(id, { id, ...data });
      return response(201, { id, message: 'Sketch saved!' });
    }
  }
  if(path.startsWith('/sketches/')) {
    const id = path.split('/')[2];
    if(httpMethod === 'GET') return sketches.has(id) ? response(200, sketches.get(id)) : response(404, { error: 'Not found' });
    if(httpMethod === 'DELETE') { sketches.delete(id); return response(200, { message: 'Deleted' }); }
  }
  return response(404, { error: 'Not found' });
};
