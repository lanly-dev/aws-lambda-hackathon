// Test GitHub OAuth credentials
const GITHUB_CLIENT_ID = 'Ov23liNUvc7QG2vvoSfM'
const GITHUB_CLIENT_SECRET = '1a5c374ee8cadc95eb7f2049332dd0f343c2d268'

console.log('Testing GitHub OAuth credentials...')

// Test with a fake code to see if credentials are accepted
const testTokenExchange = async () => {
  try {
    const response = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code: 'fake_code_for_testing'
      })
    })

    const data = await response.json()
    console.log('GitHub response:', data)

    if (data.error === 'bad_verification_code') {
      console.log('✅ Credentials are VALID (bad code is expected)')
    } else if (data.error === 'incorrect_client_credentials') {
      console.log('❌ Credentials are INVALID')
    } else {
      console.log('🤔 Unexpected response:', data)
    }

  } catch (error) {
    console.error('Network error:', error)
  }
}

testTokenExchange()
