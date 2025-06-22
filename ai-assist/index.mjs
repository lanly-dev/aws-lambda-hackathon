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
  const client = new BedrockRuntimeClient({ region: process.env.AWS_REGION || 'us-west-2' })
  if (modelId.startsWith('amazon.titan-image-generator')) {
    const base64 = base64Png.replace(/^data:image\/png;base64,/, '')
    // Debug: Log base64 length and preview URL
    console.log('[DEBUG] Received base64 length:', base64.length)
    console.log('[DEBUG] Preview sketch URL:', 'data:image/png;base64', base64)
    const payload = {
      taskType: 'TEXT_IMAGE',
      textToImageParams: {
        conditionImage: base64,
        controlMode: 'SEGMENTATION',
        text: 'a completed artwork',
        controlStrength : 0.8
      },
      imageGenerationConfig: {
        width: 512,
        height: 512,
        quality: 'standard',
        cfgScale: 8.0,
        numberOfImages: 1
      }
    }

    const request = {
      modelId,
      body: JSON.stringify(payload)
    }

    try {
      const response = await client.send(new InvokeModelCommand(request))

      const decodedResponseBody = new TextDecoder().decode(response.body)
      // The response includes an array of base64-encoded PNG images
      /** @type {{images: string[]}} */
      const responseBody = JSON.parse(decodedResponseBody)
      return responseBody.images[0] // Base64-encoded image data
    } catch (error) {
      console.error(`ERROR: Can't invoke '${modelId}'. Reason: ${error.message}`)
      throw error
    }
  } else if (modelId.startsWith('stability.')) {
    alert('Stability.ai is not yet supported in this demo.')
  } else {
    throw new Error('Unsupported model: ' + modelId)
  }
  const command = new InvokeModelCommand(input)
  const response = await client.send(command)
  const result = JSON.parse(new TextDecoder().decode(response.body))
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
