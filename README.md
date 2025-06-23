# Serverless Sketch App with AI Assist
This project is a serverless sketch application with AI assist, built using AWS Lambda (Node.js 22.x), API Gateway, and DynamoDB. The frontend is a simple HTML5/JS app with a canvas and an "AI Assist" button. The backend exposes endpoints for saving/loading sketches and for sending a sketch to an AI model.

## Features
- Draw sketches in your browser
- Save/load sketches (DynamoDB)
- AI Assist: send your sketch to an AI model for enhancement
- GitHub OAuth login to increase usage limits
- Anonymous users get limited AI usage

## Endpoints
- `GET /` - Main app (HTML)
- `GET /sketches` - List all sketches
- `POST /sketches` - Save a new sketch
- `POST /ai-assist` - Send a sketch to AI and get a new image (mocked)
- `POST /auth/github` - Exchange GitHub OAuth code for access token (backend)

---

## How to Run Locally
1. **Install dependencies:**
   - AWS SAM CLI
   - Node.js 22.x
2. **Create `env.json` in the project root:**
   ```json
   {
     "GitHubOAuth": {
       "GITHUB_CLIENT_ID": "Ov23liNUvc7QG2vvoSfM",
       "GITHUB_CLIENT_SECRET": "GITHUB_CLIENT_SECRET"
     },
     "AiAssist": {
       "AI_MODE": "dev"
     }
   }
   ```
3. **Build and start the API locally:**
   ```bash
   sam build
   sam local start-api --env-vars env.json
   ```
4. **Open [http://localhost:3000](http://localhost:3000) in your browser**

## GitHub OAuth Setup
### 1. Create or Use an Existing GitHub OAuth App
- Go to https://github.com/settings/developers
- Note your **Client ID** and **Client Secret**
- Set callback URLs:
  - `http://localhost:3000`
  - `https://your-deployed-domain.com`

### 2. Configure Environment Variables
- Locally: use `env.json` (see above)
- In production: use AWS Secrets Manager or SSM Parameter Store

### 3. Reference Secrets in `template.yaml`
```yaml
ProviderDetails:
  client_id: '{{resolve:secretsmanager:github-client-id:SecretString:CLIENT_ID}}'
  client_secret: '{{resolve:secretsmanager:github-client-secret:SecretString:CLIENT_SECRET}}'
```

### 4. Create Secrets in AWS (for production)
```yaml
Resources:
  GitHubClientId:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: github-client-id
      Description: GitHub OAuth App Client ID
  GitHubClientSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: github-client-secret
      Description: GitHub OAuth App Client Secret
```

After deploying, set the secret values:
```sh
aws secretsmanager put-secret-value --secret-id github-client-id --secret-string '{"CLIENT_ID":"your-client-id-here"}'
aws secretsmanager put-secret-value --secret-id github-client-secret --secret-string '{"CLIENT_SECRET":"your-client-secret-here"}'
```

## How GitHub OAuth Works
1. User clicks **"Login with GitHub"**.
2. User is redirected to GitHub to authorize the app.
3. After authorization, GitHub redirects back to the app with a code.
4. The frontend sends this code to the backend (`/auth/github` endpoint).
5. The backend exchanges the code for an access token and fetches user info.
6. If authenticated, the user gets premium/unlimited AI features.
7. If not authenticated, anonymous users are limited to 3 AI requests per IP per 24 hours.

## Debugging & Troubleshooting
- For GitHub Oauth
  - **Check environment variables:** Make sure your GitHub OAuth credentials are correct in `env.json` or AWS Secrets Manager.
  - **Review logs:** Use AWS SAM CLI or CloudWatch to check for errors.
  - **Test credentials:** Run `node test-credentials.mjs` to verify your setup.

## Security Notes
- **Tokens are stored in browser localStorage**
- **Backend always verifies GitHub tokens**
- **Rate limiting** for anonymous users is enforced by IP

## Testing
### Anonymous Usage
- Do not log in
- Try AI Assist (works up to 3 times per IP per 24h)
- 4th attempt shows "Demo limit reached"

### Authenticated Usage
- Click "Login with GitHub"
- Complete OAuth flow
- AI Assist is unlimited and premium features are unlocked

## Production Considerations
- Use HTTPS for OAuth callbacks
- Store secrets in AWS Secrets Manager
- Monitor API usage and costs
- Add user session management if needed
- Implement robust error handling and user feedback

## Quick Links
- [GitHub OAuth Apps](https://github.com/settings/developers)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html)
- [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/)
