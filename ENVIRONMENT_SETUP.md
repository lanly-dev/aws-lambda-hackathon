# Environment Variables Setup Guide

## Required Environment Variables

Your GitHub OAuth function needs two environment variables:

1. **GITHUB_CLIENT_ID** - Your GitHub OAuth App's Client ID (already set)
2. **GITHUB_CLIENT_SECRET** - Your GitHub OAuth App's Client Secret (needs to be added)

## Step 1: Get Your GitHub Client Secret

1. Go to your GitHub OAuth App settings:
   - https://github.com/settings/applications/2613507
   - Or: GitHub → Settings → Developer settings → OAuth Apps → Your App

2. Copy the **Client Secret** (if you don't have one, generate a new one)
   - ⚠️ **Keep this secret secure!** Never commit it to code.

## Step 2: Deploy with Environment Variables

### Option A: Deploy with Parameters (Recommended)
```bash
sam deploy --parameter-overrides GitHubClientId=Ov23liNUvc7QG2vvoSfM GitHubClientSecret=YOUR_ACTUAL_CLIENT_SECRET_HERE
```

### Option B: Create a Parameters File
Create `parameters.json`:
```json
{
  "GitHubClientId": "Ov23liNUvc7QG2vvoSfM",
  "GitHubClientSecret": "your_actual_client_secret_here"
}
```

Then deploy:
```bash
sam deploy --parameter-overrides file://parameters.json
```

### Option C: Interactive Deploy
```bash
sam deploy --guided
```
This will prompt you for each parameter.

## Step 3: Verify Environment Variables

After deployment, the Lambda function will have these environment variables automatically set:
- `GITHUB_CLIENT_ID` = "Ov23liNUvc7QG2vvoSfM"
- `GITHUB_CLIENT_SECRET` = "your_secret_from_parameters"

## Step 4: Update GitHub OAuth App Settings

Once deployed, update your GitHub OAuth App with the correct callback URL:

1. Get your API URL from the deploy output (something like):
   ```
   https://abcd1234.execute-api.us-east-1.amazonaws.com/Prod/
   ```

2. Update GitHub OAuth App settings:
   - **Homepage URL**: `https://your-api-url/Prod/`
   - **Authorization callback URL**: `https://your-api-url/Prod/`

## Current SAM Template Configuration

Your `template.yaml` is already configured with:

```yaml
GitHubOAuth:
  Type: AWS::Serverless::Function
  Properties:
    CodeUri: ./github-oauth/
    Handler: index.handler
    Environment:
      Variables:
        GITHUB_CLIENT_ID: !Ref GitHubClientId
        GITHUB_CLIENT_SECRET: !Ref GitHubClientSecret
    Events:
      GitHubOAuthApi:
        Type: Api
        Properties:
          Path: /auth/github
          Method: POST

Parameters:
  GitHubClientId:
    Type: String
    Default: "Ov23liNUvc7QG2vvoSfM"
  GitHubClientSecret:
    Type: String
    NoEcho: true  # This keeps the secret secure in CloudFormation
```

## Security Notes

**Client ID Security:**
- ✅ **Client ID is PUBLIC and safe to expose** - it's designed to be visible
- ✅ GitHub OAuth requires Client ID to be in frontend code
- ✅ No security risk from Client ID exposure
- ✅ Your Client ID `Ov23liNUvc7QG2vvoSfM` can be in public code/repos

**Client Secret Security:**
- 🔒 **Client Secret is PRIVATE and must be hidden**
- ✅ `NoEcho: true` prevents the secret from showing in CloudFormation console
- ✅ Environment variables are encrypted at rest in Lambda
- ✅ The secret is only accessible to your Lambda function
- ⚠️ Never put the Client Secret directly in your code or template

**Why this design?**
- Client ID identifies your app (like a username) - public
- Client Secret authenticates your server (like a password) - private
- Only your backend can exchange authorization codes for real access tokens

## Testing

After deployment with proper environment variables:
1. Click "🔗 Login with GitHub" in your app
2. You'll be redirected to GitHub for authentication
3. After approval, you'll be redirected back with your real GitHub user data
4. You'll see your actual GitHub username and have unlimited AI features!

## Troubleshooting

If authentication fails:
- Check CloudWatch logs for the `GitHubOAuth` function
- Verify environment variables are set correctly
- Ensure GitHub OAuth App callback URL matches your deployed API URL
- Confirm Client Secret is valid and not expired
