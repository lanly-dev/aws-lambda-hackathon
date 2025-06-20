import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

// Helper: Call Bedrock for a single style
async function callBedrockStyle(base64Png, prompt, modelId) {
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-east-1' })
  const input = {
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      prompt,
      image: base64Png
    })
  }
  const command = new InvokeModelCommand(input)
  const response = await client.send(command)
  const result = JSON.parse(new TextDecoder().decode(response.body))
  // Adjust this according to your model's output format
  return result.image || base64Png
}

export const handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if(event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: cors, body: '' }
  try {
    const { image, model } = JSON.parse(event.body)
    // Generate 4 styles using different prompts
    const prompts = [
      'A vibrant cartoon style',
      'A realistic painting style',
      'A pencil sketch style',
      'A futuristic digital art style'
    ]
    const styles = await Promise.all(prompts.map(async (prompt, idx) => ({
      name: `Style ${String.fromCharCode(65 + idx)}`,
      image: await callBedrockStyle(image, prompt, model)
    })))
    return { statusCode: 200, headers: cors, body: JSON.stringify({ styles }) }
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) }
  }
}
