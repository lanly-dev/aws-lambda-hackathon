# Fix GitHub OAuth Credentials Error

## The Problem
```
error: 'incorrect_client_credentials'
error_description: 'The client_id and/or client_secret passed are incorrect.'
```

## Quick Solutions

### Solution 1: Verify your GitHub Client Secret

1. **Go to your GitHub OAuth App:** https://github.com/settings/applications/2613507

2. **Generate a NEW Client Secret:**
   - Click "Generate a new client secret"
   - Copy the new secret immediately (you can't see it again)

3. **Update your `env.json`:**
   ```json
   {
     "GitHubOAuth": {
       "GITHUB_CLIENT_ID": "Ov23liNUvc7QG2vvoSfM",
       "GITHUB_CLIENT_SECRET": "your_new_secret_here"
     },
     "AiAssist": {
       "AI_MODE": "dev"
     }
   }
   ```

### Solution 2: Test credentials manually

Run this to verify your credentials work:
```bash
node test-credentials.mjs
```

Expected result: "✅ Credentials are VALID (bad code is expected)"

### Solution 3: Restart SAM with correct env vars

1. **Stop SAM** (Ctrl+C if running)

2. **Rebuild and restart:**
   ```bash
   sam build
   sam local start-api --env-vars env.json
   ```

3. **Verify environment variables are loaded:**
   - Check the SAM terminal output
   - Look for your function's logs when OAuth is called

### Solution 4: Check GitHub OAuth App Settings

Make sure your GitHub OAuth App has:
- **Application name:** Your app name
- **Homepage URL:** `http://localhost:3000/` (for local testing)
- **Authorization callback URL:** `http://localhost:3000/`

### Solution 5: Debug environment variables

Your Lambda function now logs environment variables. When you test OAuth, check the SAM terminal for:
```
Environment variables check:
GITHUB_CLIENT_ID: SET
GITHUB_CLIENT_SECRET: SET (length: 40)
```

If you see "MISSING", then SAM isn't loading your env.json correctly.

## Common Issues

### Issue 1: Wrong Client Secret Format
- GitHub secrets are exactly 40 characters
- No spaces or extra characters
- Case sensitive

### Issue 2: SAM not loading env.json
- Make sure you're running: `sam local start-api --env-vars env.json`
- Check that `env.json` is in the project root
- Verify JSON syntax is valid

### Issue 3: Expired or Regenerated Secret
- If you regenerated the secret on GitHub, update env.json
- Old secrets become invalid immediately

## Test Flow

1. **Start SAM:** `sam local start-api --env-vars env.json`
2. **Open:** http://localhost:3000
3. **Click "Login with GitHub"**
4. **Check SAM terminal logs** for environment variable debugging
5. **Complete OAuth flow**

## If Still Not Working

1. **Generate a brand new GitHub OAuth App**
2. **Use the new Client ID and Secret**
3. **Update both `env.json` and `script.js`**
