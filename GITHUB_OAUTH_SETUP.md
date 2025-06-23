# GitHub OAuth Setup Guide

## Current Implementation

Your sketch app now has a **hybrid GitHub OAuth system** that provides:

### For Anonymous Users (No Login):
- Limited to **3 AI Assist requests per IP per 24 hours**
- Only basic AI models available
- Maximum 2 style generations per request

### For Authenticated Users (GitHub Login):
- **Unlimited AI Assist usage**
- Access to premium AI models (when enabled)
- Up to 4 style generations per request

## How It Works

### Frontend (`ui/script.js`):
1. **Login Button**: Users click "Login with GitHub"
2. **Token Storage**: GitHub token stored in `localStorage`
3. **UI Updates**: Premium features unlock after login
4. **API Calls**: GitHub token sent with AI assist requests

### Backend (`ai-assist/index.mjs`):
1. **Token Verification**: Validates GitHub tokens with GitHub API
2. **Rate Limiting**: Tracks anonymous usage by IP in DynamoDB
3. **Access Control**: Different limits for anonymous vs authenticated users

## Setup Steps

### 1. GitHub OAuth App (Already Created)
- Your GitHub OAuth App Client ID: `Ov23liNUvc7QG2vvoSfM`
- Client Secret: (stored in your .env file)

### 2. Update GitHub OAuth App Settings
Go to https://github.com/settings/developers and update your OAuth App:

**Authorization callback URL:**
```
http://localhost:3000
https://your-deployed-domain.com
```

### 3. Deploy Your App
```bash
sam build
sam deploy
```

### 4. Set GitHub Secrets (Optional)
After deployment, set your GitHub credentials in AWS Secrets Manager:

```bash
aws secretsmanager put-secret-value --secret-id github-client-id --secret-string '{"CLIENT_ID":"Ov23liNUvc7QG2vvoSfM"}'
aws secretsmanager put-secret-value --secret-id github-client-secret --secret-string '{"CLIENT_SECRET":"your-client-secret"}'
```

## Security Features

✅ **Backend Token Verification**: GitHub tokens validated server-side  
✅ **IP-based Rate Limiting**: Anonymous users limited by IP address  
✅ **Auto-expiring Limits**: Demo limits reset after 24 hours  
✅ **Secure Token Storage**: Tokens stored in browser localStorage  
✅ **CORS Protection**: API endpoints configured with proper CORS headers

## Testing

### Test Anonymous Usage:
1. Don't log in
2. Try AI Assist - should work up to 3 times
3. 4th attempt should show "Demo limit reached"

### Test Authenticated Usage:
1. Click "Login with GitHub"
2. Complete OAuth flow
3. AI Assist should work unlimited times
4. Premium features should be unlocked

## Demo Mode

Currently running in **demo mode** - the GitHub OAuth redirects to a simulated login for testing. To enable real GitHub OAuth, you'll need to implement the backend OAuth exchange (requires a server endpoint to exchange the authorization code for an access token).

## Production Considerations

For production deployment:
1. Implement proper OAuth code exchange on backend
2. Use HTTPS for OAuth callbacks
3. Consider adding user session management
4. Add monitoring for API usage and costs
5. Implement proper error handling and user feedback

Your authentication system is now ready for testing! 🚀
