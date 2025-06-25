import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'

const dynamo = new DynamoDBClient({})

export const handler = async (event) => {
  // Route based on HTTP method and path
  const method = event.httpMethod || event.requestContext?.http?.method
  const path = event.path || event.rawPath

  if ((method === 'POST' && path && path.includes('save-sketch')) || (method === 'POST' && !path)) {
    // Save sketch
    return saveSketchHandler(event)
  } else if (method === 'GET' && path && path.includes('get-sketches')) {
    // Get sketches
    return getSketchesHandler(event)
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({ error: 'Not Found' })
    }
  }
}

// Save sketch handler (existing logic)
export const saveSketchHandler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  }
  try {
    const { sketch } = JSON.parse(event.body)
    const authHeader = event.headers?.Authorization || event.headers?.authorization

    console.log('Authorization Header:', authHeader) // Debugging log

    if (!authHeader) {
      return {
        statusCode: 401,
        headers: cors,
        body: JSON.stringify({ error: 'Unauthorized: Missing Authorization header' })
      }
    }

    const isDevMode = process.env.MODE === 'dev'

    if (isDevMode) return saveSketchMock(sketch)

    const userId = authHeader.replace('Bearer ', '')
    console.log('Parsed User ID:', userId) // Debugging log

    const item = {
      userId,
      sketchId: `${userId}-${Date.now()}`,
      sketch,
      createdAt: new Date().toISOString()
    }

    await dynamo.send(
      new PutCommand({
        TableName: process.env.SKETCHES_TABLE,
        Item: item
      })
    )

    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ message: 'Sketch saved successfully', item })
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
    const userId = authHeader.replace('Bearer ', '')
    if (isDevMode) return getSketchesMock(userId)
    // Production: Query DynamoDB for user's sketches
    const result = await dynamo.send(new QueryCommand({
      TableName: process.env.SKETCHES_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId }
    }))
    return {
      statusCode: 200,
      headers: cors,
      body: JSON.stringify({ sketches: result.Items || [] })
    }
  } catch (error) {
    return {
      statusCode: 500,
      headers: cors,
      body: JSON.stringify({ error: 'Internal Server Error' })
    }
  }
}
