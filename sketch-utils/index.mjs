import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { PutCommand, QueryCommand, UpdateCommand, DeleteCommand, GetCommand } from '@aws-sdk/lib-dynamodb'

const dynamo = new DynamoDBClient({})

export const handler = async (event) => {
  // Route based on HTTP method and path
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.path || event.rawPath

  if ((method === 'POST' && path && path.includes('save-sketch')) || (method === 'POST' && !path)) return saveSketchHandler(event)
  else if (method === 'GET' && path && path.includes('get-sketches')) return getSketchesHandler(event)
  else if (method === 'POST' && path && path.includes('set-sketch-public')) return setSketchPublicHandler(event)
  else if (method === 'GET' && path && path.includes('public-sketches')) return getPublicSketchesHandler(event)
  else if (method === 'POST' && path && path.includes('delete-sketch')) return deleteSketchHandler(event)
  else if (method === 'POST' && path && path.includes('like-sketch')) return likeSketchHandler(event)
  else return { statusCode: 404, body: JSON.stringify({ error: 'Not Found' }) }
}

// Save sketch handler (existing logic)
export const saveSketchHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    const { userId, sketch, username, userAvatar, description, styleTags, model, isPublic } = JSON.parse(event.body)
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
      userAvatar,
      sketchId,
      description,
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
      body: JSON.stringify({ error: 'Sketch App Internal Server Error' })
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

    const urlParams = new URLSearchParams(event.queryStringParameters || {})
    const theId = urlParams.get('userId')
    if (!theId) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Bad Request: Missing userId parameter' })
      }
    }

    const isDevMode = process.env.MODE === 'dev'
    if (isDevMode) return getSketchesMock(userId)

    const userId = parseInt(theId)
    // Pagination support
    const limit = Math.max(1, Math.min(5, parseInt(urlParams.get('limit')) || 5))
    const lastKey = urlParams.get('lastKey')

    let theExclusiveStartKey
    if (lastKey) {
      try {
        theExclusiveStartKey = JSON.parse(lastKey)
      } catch {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({ error: 'Invalid lastKey format' })
        }
      }
    }
    const queryParams = {
      TableName: process.env.SKETCHES_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      Limit: limit,
      ScanIndexForward: false // Newest first
    }
    if (theExclusiveStartKey) queryParams.ExclusiveStartKey = theExclusiveStartKey
    const sketchesResult = await dynamo.send(new QueryCommand(queryParams))
    const sketches = sketchesResult.Items || []

    // Reconstruct base64 for each sketch
    for (const sketch of sketches) {
      const partsResult = await dynamo.send(new QueryCommand({
        TableName: process.env.SKETCH_PARTS_TABLE,
        KeyConditionExpression: 'sketchId = :sid',
        ExpressionAttributeValues: { ':sid': sketch.sketchId }
      }))
      const parts = partsResult.Items || []
      parts.sort((a, b) => a.partNumber - b.partNumber)
      sketch.sketch = parts.map(part => part.data).join('')
    }
    // Prepare nextCursor if more data
    let nextCursor = null
    if (sketchesResult.LastEvaluatedKey) {
      nextCursor = JSON.stringify(sketchesResult.LastEvaluatedKey)
    }
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ sketches, nextCursor })
    }
  } catch (error) {
    console.error('Error retrieving sketches:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Sketch App Internal Server Error' })
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
    } catch {
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
      body: JSON.stringify({ error: 'Sketch App Internal Server Error' })
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
      // Return a mock list of public sketches with pagination support
      const urlParams = new URLSearchParams(event.queryStringParameters || {})
      const limit = Math.max(1, Math.min(50, parseInt(urlParams.get('limit')) || 10))
      const lastKey = urlParams.get('lastKey')

      const mockSketches = Array.from({ length: 25 }, (_, i) => ({
        sketchId: `mock-public-${i + 1}`,
        userId: i + 1,
        sketch: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA',
        createdAt: new Date(Date.now() - i * 60000).toISOString(),
        isPublic: 1,
        username: `demo-user-${i + 1}`,
        userAvatar: 'https://example.com/avatar.png',
        likeCount: Math.floor(Math.random() * 10)
      }))

      const startIndex = lastKey ? parseInt(lastKey) || 0 : 0
      const endIndex = Math.min(startIndex + limit, mockSketches.length)
      const sketches = mockSketches.slice(startIndex, endIndex)

      const nextCursor = endIndex < mockSketches.length ? endIndex.toString() : null

      return {
        statusCode: 200,
        headers: cors,
        body: JSON.stringify({ sketches, nextCursor })
      }
    }

    // Parse query parameters for pagination
    const urlParams = new URLSearchParams(event.queryStringParameters || {})
    const limit = Math.max(1, Math.min(5, parseInt(urlParams.get('limit')) || 5))
    const lastKey = urlParams.get('lastKey')

    let theExclusiveStartKey
    if (lastKey) {
      try {
        theExclusiveStartKey = JSON.parse(lastKey)
      } catch {
        return {
          statusCode: 400,
          headers: cors,
          body: JSON.stringify({ error: 'Invalid lastKey format' })
        }
      }
    }

    // Query DynamoDB GSI for public sketches with pagination
    const queryParams = {
      TableName: process.env.SKETCHES_TABLE,
      IndexName: 'PublicSketches',
      KeyConditionExpression: 'isPublic = :pub',
      ExpressionAttributeValues: { ':pub': 1 },
      Limit: limit,
      ScanIndexForward: false // Most recent first
    }
    if (theExclusiveStartKey) queryParams.ExclusiveStartKey = theExclusiveStartKey

    const result = await dynamo.send(new QueryCommand(queryParams))
    const sketches = result.Items || []

    // For each sketch, reconstruct the base64 image from parts
    for (const sketch of sketches) {
      const partsResult = await dynamo.send(new QueryCommand({
        TableName: process.env.SKETCH_PARTS_TABLE,
        KeyConditionExpression: 'sketchId = :sid',
        ExpressionAttributeValues: { ':sid': sketch.sketchId }
      }))
      const parts = partsResult.Items || []
      parts.sort((a, b) => a.partNumber - b.partNumber)
      sketch.sketch = parts.map(part => part.data).join('')
    }

    // Prepare nextCursor if more data
    let nextCursor = null
    if (result.LastEvaluatedKey) {
      nextCursor = JSON.stringify(result.LastEvaluatedKey)
    }

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ sketches, nextCursor })
    }
  } catch (error) {
    console.error('Error retrieving public sketches:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Sketch App Internal Server Error' })
    }
  }
}

// Handler to delete a sketch and its parts
export const deleteSketchHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    let body
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    } catch {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Invalid JSON' })
      }
    }
    const { userId, sketchId } = body
    const authHeader = event.headers?.Authorization || event.headers?.authorization
    if (!authHeader) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ error: 'Unauthorized: Missing Authorization header' })
      }
    }
    if (!userId || !sketchId) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Missing userId or sketchId' })
      }
    }
    // Delete metadata from SKETCHES_TABLE
    await dynamo.send(new DeleteCommand({
      TableName: process.env.SKETCHES_TABLE,
      Key: { userId, sketchId }
    }))
    // Delete all parts from SKETCH_PARTS_TABLE
    const partsResult = await dynamo.send(new QueryCommand({
      TableName: process.env.SKETCH_PARTS_TABLE,
      KeyConditionExpression: 'sketchId = :sid',
      ExpressionAttributeValues: { ':sid': sketchId }
    }))
    const parts = partsResult.Items || []
    for (const part of parts) {
      await dynamo.send(new DeleteCommand({
        TableName: process.env.SKETCH_PARTS_TABLE,
        Key: { sketchId, partNumber: part.partNumber }
      }))
    }
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ message: 'Sketch deleted successfully' })
    }
  } catch (error) {
    console.error('Error deleting sketch:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Sketch App Internal Server Error' })
    }
  }
}

// Handler to like/unlike a public sketch (toggle with likedBy array)
export const likeSketchHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    let body
    try {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body
    } catch {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Invalid JSON' })
      }
    }
    const { userId, sketchId } = body
    if (!userId || !sketchId) {
      return {
        statusCode: 400,
        headers: cors,
        body: JSON.stringify({ error: 'Missing userId or sketchId' })
      }
    }
    // Fetch the sketch using GetCommand (userId and sketchId are the key schema)
    const getResult = await dynamo.send(new GetCommand({
      TableName: process.env.SKETCHES_TABLE,
      Key: { userId, sketchId }
    }))
    const sketch = getResult.Item
    if (!sketch) {
      return {
        statusCode: 404,
        headers: cors,
        body: JSON.stringify({ error: 'Sketch not found' })
      }
    }
    let likedBy = sketch.likedBy || []
    if (!Array.isArray(likedBy)) likedBy = []
    let liked
    if (likedBy.includes(userId)) {
      // Unlike: remove userId
      likedBy = likedBy.filter(id => id !== userId)
      liked = false
    } else {
      // Like: add userId
      likedBy.push(userId)
      liked = true
    }
    // Update likedBy and likeCount
    await dynamo.send(new UpdateCommand({
      TableName: process.env.SKETCHES_TABLE,
      Key: { userId, sketchId },
      UpdateExpression: 'SET likedBy = :likedBy, likeCount = :likeCount',
      ExpressionAttributeValues: {
        ':likedBy': likedBy,
        ':likeCount': likedBy.length
      }
    }))
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ likeCount: likedBy.length, liked })
    }
  } catch (error) {
    console.error('Error liking/unliking sketch:', error)
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Sketch App Internal Server Error' })
    }
  }
}
