// GitHub OAuth token exchange Lambda function
export const handler = async (event) => {
  const { httpMethod, body } = event
  if (httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  console.log('GitHub OAuth handler called, body:', body)

  try {
    const { code } = JSON.parse(body)

    if (!code) {
      console.log('No authorization code provided')
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Authorization code required' })
      }
    }

    console.log('Authorization code received:', code.substring(0, 10) + '...')

    // Check environment variables
    console.log('Environment variables check:')
    console.log('GITHUB_CLIENT_ID:', process.env.GITHUB_CLIENT_ID ? 'SET' : 'MISSING')
    console.log('GITHUB_CLIENT_SECRET:', process.env.GITHUB_CLIENT_SECRET ? 'SET (length: ' + process.env.GITHUB_CLIENT_SECRET.length + ')' : 'MISSING')

    if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
      console.error('Missing GitHub environment variables')
      console.error('Available env vars:', Object.keys(process.env).filter(key => key.includes('GITHUB')))
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Server configuration error' })
      }
    }

    // Exchange code for access token
    console.log('Exchanging code for access token...')
    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: code
      })
    })

    const tokenData = await tokenResponse.json()
    console.log('Token response status:', tokenResponse.status)
    console.log('Token data:', tokenData)

    if (tokenData.error) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: tokenData.error_description || 'OAuth error' })
      }
    }

    // Get user information
    const userResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `token ${tokenData.access_token}`,
        Accept: 'application/vnd.github.v3+json'
      }
    })

    console.log('⭐⭐ User response status:', userResponse.status, userResponse.statusText)
    if (!userResponse.ok) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Failed to fetch user data' })
      }
    }

    const userData = await userResponse.json()
    console.log('User data received:', userData.login)

    const response = {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        access_token: tokenData.access_token,
        user: {
          id: userData.id,
          login: userData.login,
          name: userData.name,
          email: userData.email,
          avatar_url: userData.avatar_url
        }
      })
    }

    console.log('Returning successful response')
    return response
  } catch (error) {
    console.error('❌ GitHub OAuth error:', error)
    console.error('❌ Error stack:', error.stack)
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({
        error: 'Internal server error',
        details: error.message
      })
    }
  }

  // This should NEVER be reached, but just in case...
  console.error('❌ CRITICAL: Function reached end without returning!')
  return {
    statusCode: 500,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ error: 'Function execution error' })
  }
}
