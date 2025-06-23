# Local Environment Variables for SAM Testing

## Option 1: Create env.json file (Recommended)

Create `env.json` in your project root:

```json
{
  "GitHubOAuth": {
    "GITHUB_CLIENT_ID": "Ov23liNUvc7QG2vvoSfM",
    "GITHUB_CLIENT_SECRET": "your_actual_github_client_secret_here"
  },
  "AiAssist": {
    "AI_MODE": "dev"
  }
}
```

Then run SAM with environment variables:
```bash
sam local start-api --env-vars env.json
```

## Option 2: Use template parameter overrides

Run SAM local with parameters:
```bash
sam local start-api --parameter-overrides GitHubClientId=Ov23liNUvc7QG2vvoSfM GitHubClientSecret=your_secret_here
```

## Option 3: Set Windows environment variables

In PowerShell:
```powershell
$env:GITHUB_CLIENT_SECRET="your_secret_here"
sam local start-api
```

## Complete Local Testing Commands

1. **Build first:**
   ```bash
   sam build
   ```

2. **Start local API with env vars:**
   ```bash
   sam local start-api --env-vars env.json
   ```

3. **Your local app will be available at:**
   ```
   http://localhost:3000
   ```

## For GitHub OAuth Testing Locally

**Important:** GitHub OAuth callback URLs need to be updated for local testing:

1. Go to your GitHub OAuth App settings: https://github.com/settings/applications/2613507

2. **Add local callback URL:**
   - Authorization callback URL: `http://localhost:3000/`
   - Homepage URL: `http://localhost:3000/`

3. **Keep your production URLs too:**
   - You can have multiple callback URLs separated by newlines

## Testing Flow

1. Start local server: `sam local start-api --env-vars env.json`
2. Open: `http://localhost:3000`
3. Click "🔗 Login with GitHub"
4. GitHub will redirect back to `http://localhost:3000/?code=...`
5. Your local `/auth/github` endpoint will handle the OAuth exchange

## Security Note

- ⚠️ **Never commit `env.json` to git!** 
- Add it to `.gitignore`:
  ```
  env.json
  ```
- The GitHub Client Secret should only be in your local `env.json` file
