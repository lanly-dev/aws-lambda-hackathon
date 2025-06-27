import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const dynamo = new DynamoDBClient({})
const DEMO_LIMIT = 3
const AUTH_LIMIT = 10
const DEMO_TTL_HOURS = 5 / 60 // 5 minutes in hours
const AUTH_TTL_HOURS = 5 / 60 // 5 minutes in hours

// Helper: Return 4 mock images for dev/testing
function getMockStyles() {
  console.warn('⚠️⚠️ Using mock styles for development/testing. Set AI_MODE=prod to use real AI generation.')
  const mockImages = [
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAACZgbYfAAAAFElEQVR42mP8z/CfHgAGgwJ/lQnK0wAAAABJRU5ErkJggg==', // bright red
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAACZgbYfAAAAFElEQVR42mP8/5/hPwAHggJ/6t6vWwAAAABJRU5ErkJggg==', // bright green
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAACZgbYfAAAAFElEQVR42mP8/4/hPwAHggJ/6t6vWwAAAABJRU5ErkJggg==', // bright blue
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAACZgbYfAAAAFElEQVR42mP8z/CfHgAGgwJ/lQnK0wAAAABJRU5ErkJggg==' // bright yellow
  ]
  return [
    { name: 'Style A', image: mockImages[0] },
    { name: 'Style B', image: mockImages[1] },
    { name: 'Style C', image: mockImages[2] },
    { name: 'Style D', image: mockImages[3] }
  ]
}

/**
 * @returns {Promise<string[]>}
 */
async function callBedrockStyle(base64Png, count, prompt, modelId) {
  const client = new BedrockRuntimeClient({ region: 'us-west-2' })
  if (modelId.startsWith('amazon.titan-image-generator')) {
    const base64 = base64Png.replace(/^data:image\/png;base64,/, '')
    // Debug: Log base64 length and preview URL
    console.log('[DEBUG] Received base64 length:', base64.length)
    console.log('[DEBUG] Preview sketch URL:', 'data:image/png;base64', base64)

    // https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-titan-image.html
    const payload = {
      taskType: 'TEXT_IMAGE',
      textToImageParams: {
        conditionImage: base64,
        controlMode: 'SEGMENTATION',
        text: prompt,
        controlStrength: 0.8
      },
      imageGenerationConfig: {
        width: 512,
        height: 512,
        quality: 'standard',
        cfgScale: 8.0,
        numberOfImages: count,
        seed: Math.floor(Math.random() * 2147483646)
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
      return responseBody.images
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

async function getDemoUsage(ip) {
  if (!process.env.DEMO_USAGE_TABLE) return 0
  try {
    const res = await dynamo.send(new GetCommand({
      TableName: process.env.DEMO_USAGE_TABLE,
      Key: { ip }
    }))
    return res.Item ? res.Item.count : 0
  } catch (error) {
    console.error('Error getting demo usage:', error)
    return 0
  }
}

async function incrementDemoUsage(ip) {
  if (!process.env.DEMO_USAGE_TABLE) return
  try {
    const ttl = Math.floor(Date.now() / 1000) + DEMO_TTL_HOURS * 3600
    await dynamo.send(new UpdateCommand({
      TableName: process.env.DEMO_USAGE_TABLE,
      Key: { ip },
      UpdateExpression: 'ADD #c :inc SET #t = :ttl',
      ExpressionAttributeNames: { '#c': 'count', '#t': 'ttl' },
      ExpressionAttributeValues: { ':inc': 1, ':ttl': ttl }
    }))
  } catch (error) {
    console.error('Error incrementing demo usage:', error)
  }
}

async function getAuthUsage(userId) {
  if (!process.env.DEMO_USAGE_TABLE) return 0
  try {
    const res = await dynamo.send(new GetCommand({
      TableName: process.env.DEMO_USAGE_TABLE,
      Key: { ip: `auth#${userId}` }
    }))
    return res.Item ? res.Item.count : 0
  } catch (error) {
    console.error('Error getting auth usage:', error)
    return 0
  }
}

async function incrementAuthUsage(userId) {
  if (!process.env.DEMO_USAGE_TABLE) return
  try {
    const ttl = Math.floor(Date.now() / 1000) + AUTH_TTL_HOURS * 3600
    await dynamo.send(new UpdateCommand({
      TableName: process.env.DEMO_USAGE_TABLE,
      Key: { ip: `auth#${userId}` },
      UpdateExpression: 'ADD #c :inc SET #t = :ttl',
      ExpressionAttributeNames: { '#c': 'count', '#t': 'ttl' },
      ExpressionAttributeValues: { ':inc': 1, ':ttl': ttl }
    }))
  } catch (error) {
    console.error('Error incrementing auth usage:', error)
  }
}

export const handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    const { image, model, styleCount, description, styleTags } = JSON.parse(event.body)
    const count = Math.max(1, Math.min(Number(styleCount) || 4, 4))

    // Check for GitHub token in Authorization header
    const authHeader = event.headers?.Authorization || event.headers?.authorization
    const githubToken = authHeader?.replace('Bearer ', '')

    // If no token, user is anonymous - apply demo limits
    if (!githubToken) {
      const ip = event.headers['X-Forwarded-For']?.split(',')[0] || 'unknown'
      const demoUsage = await getDemoUsage(ip)
      console.log('Demo usage for IP', ip, ':', demoUsage)
      if (demoUsage >= DEMO_LIMIT) {
        return { statusCode: 429, headers: cors, body: JSON.stringify({ error: 'Demo usage limit exceeded' }) }
      }
      // Increment demo usage count for the IP
      await incrementDemoUsage(ip)
    } else {
      // Verify GitHub token and get user info
      try {
        const response = await fetch('https://api.github.com/user', {
          headers: { Authorization: `token ${githubToken}` }
        })
        if (!response.ok) {
          return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Invalid GitHub token' }) }
        }
        const githubUser = await response.json()
        console.log('Authenticated user:', githubUser.login)

        // Authenticated users get 10 requests per 5 minutes
        const authUsage = await getAuthUsage(githubUser.id)
        if (authUsage >= AUTH_LIMIT) {
          return { statusCode: 429, headers: cors, body: JSON.stringify({ error: 'Authenticated usage limit exceeded (30 per 5 min)' }) }
        }
        await incrementAuthUsage(githubUser.id)
      } catch (error) {
        return { statusCode: 401, headers: cors, body: JSON.stringify({ error: 'Token verification failed: ' + error.message || 'Unknown error' }) }
      }
    }

    // Use mock or real AI based on AI_MODE env var
    if (process.env.AI_MODE === 'dev') {
      const allStyles = getMockStyles()
      const styles = allStyles.slice(0, count)
      return { statusCode: 200, headers: cors, body: JSON.stringify({ styles }) }
    }

    const prompt = `${description}, ${styleTags.join(', ')}`
    const outArray = await callBedrockStyle(image, count, prompt, model)

    const styles = await Promise.all(outArray.map(async (output, idx) => ({
      name: `Style ${idx + 1}`,
      description,
      tags: styleTags,
      image: output
    })))
    return { statusCode: 200, headers: cors, body: JSON.stringify({ styles }) }
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: e.message }) }
  }
}
