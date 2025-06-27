import { readFileSync } from 'fs'

// In-memory DB for local testing
const sketches = new Map()

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
}
