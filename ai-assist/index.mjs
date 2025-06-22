import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

// Helper: Return 4 mock images for dev/testing
function getMockStyles() {
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

async function callBedrockStyle(base64Png, prompt, modelId) {

  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
  let input = {}
  // Titan model expects 'inputImage', others may expect 'image' and 'prompt'
  if (modelId.startsWith('amazon.titan-image-generator')) {
    input = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ inputImage: base64Png, taskType: 'INPAINT', parameters: { prompt } })
    }
  } else {
    input = {
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({ prompt, image: base64Png })
    }
  }
  const command = new InvokeModelCommand(input)
  const response = await client.send(command)
  const result = JSON.parse(new TextDecoder().decode(response.body))
  // Adjust this according to your model's output format
  return result.image || result.images?.[0] || base64Png
}

export const handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  }
  try {
    const { image, model, styleCount } = JSON.parse(event.body)
    const count = Math.max(1, Math.min(Number(styleCount) || 4, 4))
    // Use mock or real AI based on AI_MODE env var
    if (process.env.AI_MODE === 'dev') {
      const allStyles = getMockStyles()
      const styles = allStyles.slice(0, count)
      return { statusCode: 200, headers: cors, body: JSON.stringify({ styles }) }
    }
    // Generate N styles using different prompts (prod)
    const prompts = [
      'A vibrant cartoon style',
      'A realistic painting style',
      'A pencil sketch style',
      'A futuristic digital art style'
    ].slice(0, count)
    const styles = await Promise.all(prompts.map(async (prompt, idx) => ({
      name: `Style ${String.fromCharCode(65 + idx)}`,
      image: await callBedrockStyle(image, prompt, model)
    })))
    return { statusCode: 200, headers: cors, body: JSON.stringify({ styles }) }
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) }
  }
}
