import { v4 as uuidv4 } from 'uuid'
// Add AWS SDK v3 Bedrock client import
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { readFileSync } from 'fs'

// In-memory DB for local testing
const sketches = new Map()

// Helper: Call Bedrock API for 4 styles (mocked for now)
async function callBedrockAIStyles(base64Png) {
  // In production, call Bedrock with different prompts or model params for each style
  // For now, return 4 mocked variations (just tint the image data URLs for demo)
  // You would replace this with actual Bedrock calls for each style
  const styles = [
    { name: 'Style A', image: base64Png }, // original
    { name: 'Style B', image: base64Png.replace('data:image/png', 'data:image/png;filter=grayscale') }, // fake grayscale
    { name: 'Style C', image: base64Png.replace('data:image/png', 'data:image/png;filter=sepia') }, // fake sepia
    { name: 'Style D', image: base64Png.replace('data:image/png', 'data:image/png;filter=invert') } // fake invert
  ]
  return styles
}

// Load HTML from a separate file for IDE linting/highlighting
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8')


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
  if (httpMethod === 'GET' && (path === '/' || path === '')) return htmlResponse(html)
  if (path === '/sketches') {
    if (httpMethod === 'GET') return response(200, Array.from(sketches.values()))
    if (httpMethod === 'POST') {
      const data = JSON.parse(body)
      const id = uuidv4()
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
  // /ai-assist returns 4 styles
  if (path === '/ai-assist' && httpMethod === 'POST') {
    const data = JSON.parse(body)
    const inputImage = data.image
    const styles = await callBedrockAIStyles(inputImage)
    return response(200, { styles })
  }
  return response(404, { error: 'Not found' })
}
