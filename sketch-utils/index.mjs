import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb'

const dynamo = new DynamoDBClient({})

export const handler = async (event) => {
  // Route based on HTTP method and path
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.path || event.rawPath

  if ((method === 'POST' && path && path.includes('save-sketch')) || (method === 'POST' && !path)) return saveSketchHandler(event)
  else if (method === 'GET' && path && path.includes('get-sketches')) return getSketchesHandler(event)
  else if (method === 'POST' && path && path.includes('set-sketch-public')) return setSketchPublicHandler(event)
  else if (method === 'GET' && path && path.includes('public-sketches')) return getPublicSketchesHandler(event)
  else return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) }
}

// Save sketch handler (existing logic)
export const saveSketchHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    const { userId, sketch, username, styleTags, model, isPublic } = JSON.parse(event.body)
    const authHeader = event.headers?.Authorization || event.headers?.authorization

    if (!authHeader) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ error: 'Unauthorized: Missing Authorization header' })
      }
    }

    const isDevMode = process.env.MODE === 'dev'

    if (isDevMode) return saveSketchMock(sketch)

    const sketchId = `${userId}-${Date.now()}`
    const base64Parts = []
    const maxPartSize = 300 * 1024 // 300 KB

    for (let i = 0; i < sketch.length; i += maxPartSize) {
      base64Parts.push(sketch.slice(i, i + maxPartSize))
    }

    const metadataItem = {
      userId,
      username,
      sketchId,
      styleTags: styleTags || [],
      model,
      isPublic: isPublic ? 1 : 0,
      likeCount: 0,
      createdAt: new Date().toISOString(),
      totalParts: base64Parts.length
    }

    await dynamo.send(
      new PutCommand({
        TableName: process.env.SKETCHES_TABLE,
        Item: metadataItem
      })
    )

    for (let partNumber = 0; partNumber < base64Parts.length; partNumber++) {
      const partItem = {
        sketchId,
        partNumber,
        data: base64Parts[partNumber]
      }

      await dynamo.send(
        new PutCommand({
          TableName: process.env.SKETCH_PARTS_TABLE,
          Item: partItem
        })
      )
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ message: 'Sketch saved successfully', metadataItem })
    }
  } catch (error) {
    console.error('Error saving sketch:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}

// Mock method for saving sketches in development mode
export const saveSketchMock = async (sketchData) => {
  console.log('🧑‍💻🧑‍💻Mock save sketch invoked with data:', sketchData)
  return {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Sketch saved successfully (mock).',
      sketchId: 'mock-sketch-id'
    })
  }
}

// Mock method for retrieving sketches in development mode
export const getSketchesMock = async (userId) => {
  return {
    statusCode: 200,
    body: JSON.stringify({
      sketches: [
        {
          sketchId: 'mock-sketch-1',
          userId,
          sketch: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
          createdAt: new Date().toISOString()
        }
      ]
    })
  }
}

// Handler for retrieving sketches
export const getSketchesHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    const authHeader = event.headers?.Authorization || event.headers?.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ error: 'Unauthorized: Missing Authorization header' })
      }
    }
    const isDevMode = process.env.MODE === 'dev'

    const urlParams = new URLSearchParams(event.queryStringParameters || {})
    const theId = urlParams.get('userId')
    if (!theId) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Bad Request: Missing userId parameter' })
      }
    }

    const userId = parseInt(theId)
    if (isDevMode) return getSketchesMock(userId)
    console.log('Parsed User ID:', userId)

    const sketchesResult = await dynamo.send(new QueryCommand({
      TableName: process.env.SKETCHES_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId }
    }))

    const sketches = sketchesResult.Items || []

    for (const sketch of sketches) {
      const partsResult = await dynamo.send(new QueryCommand({
        TableName: process.env.SKETCH_PARTS_TABLE,
        KeyConditionExpression: 'sketchId = :sid',
        ExpressionAttributeValues: { ':sid': sketch.sketchId }
      }))

      const parts = partsResult.Items || []
      parts.sort((a, b) => a.partNumber - b.partNumber) // Ensure parts are in order

      sketch.sketch = parts.map(part => part.data).join('') // Reconstruct base64 string
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ sketches })
    }
  } catch (error) {
    console.error('Error retrieving sketches:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}

// Handler to update the isPublic field of a sketch
export const setSketchPublicHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    let body
    try {
      body = JSON.parse(event.body)
    } catch (e) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Invalid JSON' })
      }
    }
    const { userId, sketchId, isPublic } = body
    const authHeader = event.headers?.Authorization || event.headers?.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ error: 'Unauthorized: Missing Authorization header' })
      }
    }
    if (!userId || !sketchId || typeof isPublic === 'undefined') {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Missing userId, sketchId, or isPublic' })
      }
    }
    const isDevMode = process.env.MODE === 'dev'
    if (isDevMode) {
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ message: 'Sketch public status updated (mock)', sketchId, isPublic })
      }
    }
    // Update the isPublic field in DynamoDB
    await dynamo.send(new UpdateCommand({
      TableName: process.env.SKETCHES_TABLE,
      Key: { userId, sketchId },
      UpdateExpression: 'SET isPublic = :pub',
      ExpressionAttributeValues: { ':pub': isPublic ? 1 : 0 }
    }))
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ message: 'Sketch public status updated', sketchId, isPublic })
    }
  } catch (error) {
    console.error('Error updating sketch public status:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}

// Handler to get public sketches
export const getPublicSketchesHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    const isDevMode = process.env.MODE === 'dev'
    if (isDevMode) {
      // Return a mock list of public sketches
      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({
          sketches: [
            {
              sketchId: 'mock-public-1',
              userId: 1,
              sketch: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
              createdAt: new Date().toISOString(),
              isPublic: 1,
              username: 'demo-user'
            }
          ]
        })
      }
    }
    // Query DynamoDB GSI for public sketches
    const result = await dynamo.send(new QueryCommand({
      TableName: process.env.SKETCHES_TABLE,
      IndexName: 'PublicSketches',
      KeyConditionExpression: 'isPublic = :pub',
      ExpressionAttributeValues: { ':pub': 1 },
      Limit: 50 // Limit to 50 public sketches
    }))
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ sketches: result.Items || [] })
    }
  } catch (error) {
    console.error('Error retrieving public sketches:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}
