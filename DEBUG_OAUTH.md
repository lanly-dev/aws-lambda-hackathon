# Debugging GitHub OAuth Issues

## The Error You're Seeing

```
Invalid lambda response received: Lambda returned <class 'NoneType'> instead of dict
```

This means your Lambda function is returning `null/undefined` instead of a proper response object.

## Debugging Steps

### 1. First, let's test the GitHub OAuth function directly

Create a test file to verify the function works:

**test-oauth.mjs:**
```javascript
import { handler } from './github-oauth/index.mjs'

// Test the OAuth function
const testEvent = {
  httpMethod: 'POST',
  body: JSON.stringify({
    code: 'test_code_12345'
  })
}

// Set environment variables for testing
process.env.GITHUB_CLIENT_ID = 'Ov23liNUvc7QG2vvoSfM'
process.env.GITHUB_CLIENT_SECRET = 'your_secret_here'

try {
  const result = await handler(testEvent)
  console.log('Result:', result)
} catch (error) {
  console.error('Error:', error)
}
```

Run: `node test-oauth.mjs`

### 2. Check CloudWatch Logs

When testing locally with SAM, check the logs in terminal to see:
- Is the function being called?
- Are environment variables set?
- What's the exact error?

### 3. Test with curl

Once SAM is running locally, test the endpoint directly:

```bash
curl -X POST http://localhost:3000/auth/github \
  -H "Content-Type: application/json" \
  -d '{"code":"test_code_123"}'
```

### 4. Common Issues

**Environment Variables Missing:**
- Make sure `env.json` has your real GitHub Client Secret
- Verify SAM is loading the env vars: `sam local start-api --env-vars env.json`

**Function Not Found:**
- Check that the `github-oauth` folder exists
- Verify `template.yaml` has the correct `CodeUri: ./github-oauth/`

**CORS Issues:**
- All responses now include `'Access-Control-Allow-Origin': '*'`

**JSON Parsing Issues:**
- Make sure the request body is valid JSON

### 5. Quick Fix Test

Try this minimal version first to test if the function responds at all:

**Temporarily replace the handler with:**
```javascript
export const handler = async (event) => {
  console.log('Handler called with:', event)
  
  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ message: 'OAuth handler working' })
  }
}
```

If this works, then gradually add back the OAuth logic.

## Expected Flow

1. User clicks "Login with GitHub"
2. Redirected to GitHub: `https://github.com/login/oauth/authorize?client_id=...`
3. User approves
4. GitHub redirects back: `http://localhost:3000/?code=ABC123`
5. Frontend calls: `POST /auth/github` with `{"code": "ABC123"}`
6. Lambda exchanges code for token with GitHub
7. Lambda gets user data from GitHub API
8. Lambda returns: `{"access_token": "...", "user": {...}}`

The error suggests step 6-8 is failing. Check the logs to see where exactly it's failing.
