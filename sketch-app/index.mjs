import { readFileSync } from 'fs'

const htmlResponse = html => ({
  statusCode: 200,
  headers: { 'Content-Type': 'text/html', 'Access-Control-Allow-Origin': '*' },
  body: html
})

export const handler = async (event) => {
  const { httpMethod, path } = event
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
