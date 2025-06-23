# GitHub OAuth Setup for Real User Authentication

## Summary

Your current setup uses a **simulated** GitHub login that creates fake user data. To get **real** GitHub user accounts, you have two options:

## Option 1: Full OAuth Flow (Recommended for Production)

### What's Needed:
1. **GitHub Client Secret** (currently missing)
2. **Backend OAuth endpoint** (provided in `/github-oauth/index.mjs`)
3. **Environment variables** in your deployment

### Setup Steps:

1. **Get your GitHub Client Secret:**
   - Go to your GitHub OAuth App settings: https://github.com/settings/applications/2613507
   - Copy the **Client Secret** (keep it secure!)

2. **Deploy with Client Secret:**
   ```bash
   sam deploy --parameter-overrides GitHubClientId=Ov23liNUvc7QG2vvoSfM GitHubClientSecret=YOUR_SECRET_HERE
   ```

3. **Update your GitHub OAuth App settings:**
   - Authorization callback URL: `https://your-api-url/Prod/`
   - Homepage URL: `https://your-api-url/Prod/`

### How it works:
- User clicks "Login with GitHub" → GitHub auth page
- GitHub redirects back with authorization code
- Frontend sends code to `/auth/github` endpoint
- Backend exchanges code for real access token
- Backend gets real user data from GitHub API
- Frontend receives real user info and token

## Option 2: Personal Access Token (For Testing)

### What's Available Now:
- Click "Advanced: Use Personal Access Token" in the login section
- Create a token at: https://github.com/settings/tokens/new?scopes=user:email
- Paste the token and click "Use Token"
- Gets **real** GitHub user data immediately

### Benefits:
- ✅ Works immediately without backend setup
- ✅ Gets real GitHub user data
- ✅ Perfect for testing and development

### Limitations:
- ❌ Users must manually create tokens
- ❌ Not suitable for end users
- ❌ Tokens don't expire automatically

## Current Status

**Right now you can:**
- Use Option 2 (Personal Access Token) to get real GitHub user data immediately
- Test the real authentication flow

**To get full OAuth working:**
- Deploy the backend OAuth endpoint (`/github-oauth/index.mjs`)
- Add your GitHub Client Secret to the deployment
- Update your GitHub App settings

## Testing Real Authentication

1. Open your app
2. Click "Advanced: Use Personal Access Token"
3. Go to https://github.com/settings/tokens/new?scopes=user:email
4. Create a token with "user:email" scope
5. Paste it in the input field and click "Use Token"
6. You'll now see your **real** GitHub name and have unlimited AI usage!

The `verifyGitHubToken()` function will now work with real tokens and the backend will properly verify authentication for rate limiting.
