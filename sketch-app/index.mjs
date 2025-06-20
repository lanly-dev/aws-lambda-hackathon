import { readFileSync } from 'fs'

// In-memory DB for local testing
const sketches = new Map()

// Helper: Return 4 mock images for local testing
async function callBedrockAIStyles() {
  const mockImages = [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+1n1cAAAAASUVORK5CYII=', // red
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8AAAgMBAJcF+ZcAAAAASUVORK5CYII=', // green
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8zwAAAgMBAJcF+ZcAAAAASUVORK5CYII=', // blue
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAwMCAO+1n1cAAAAASUVORK5CYII='  // black
  ]
  return [
    { name: 'Style A', image: mockImages[0] },
    { name: 'Style B', image: mockImages[1] },
    { name: 'Style C', image: mockImages[2] },
    { name: 'Style D', image: mockImages[3] }
  ]
}

const html = readFileSync(new URL('./ui/index.html', import.meta.url), 'utf8')

const response = (status, body, headers={}) => ({
  statusCode: status,
  headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*', ...headers },
  body: typeof body === 'string' ? body : JSON.stringify(body)
})
const htmlResponse = html => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
  body: html
})

export const handler = async (event) => {
  const { httpMethod, path, body } = event
  if (httpMethod === 'OPTIONS') return response(200, 'OK')
  if (httpMethod === 'GET' && (path === '/' || path === '' || path === '/ui/index.html')) {
    return htmlResponse(readFileSync(new URL('./ui/index.html', import.meta.url), 'utf8'))
  }
  if (httpMethod === 'GET' && path === '/ui/script.js') {
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*' },
      body: readFileSync(new URL('./ui/script.js', import.meta.url), 'utf8')
    }
  }
  if (path === '/sketches') {
    if (httpMethod === 'GET') return response(200, Array.from(sketches.values()))
    if (httpMethod === 'POST') {
      const data = JSON.parse(body)
      const id = Date.now().toString()
      sketches.set(id, { id, ...data })
      return response(201, { id, message: 'Sketch saved!' })
    }
  }
  if (path.startsWith('/sketches/')) {
    const id = path.split('/')[2]
    if (httpMethod === 'GET') return sketches.has(id) ? response(200, sketches.get(id)) : response(404, { error: 'Not found' })
    if (httpMethod === 'DELETE') {
      sketches.delete(id)
      return response(200, { message: 'Deleted' })
    }
  }
  if (path === '/ai-assist' && httpMethod === 'POST') {
    const styles = await callBedrockAIStyles()
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ styles })
    }
  }
  return response(404, { error: 'Not found' })
}
