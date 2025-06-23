# Serverless Sketch App with AI Assist

This project is a serverless sketch application with AI assist, built using AWS Lambda (Node.js 20.x), API Gateway, and DynamoDB. The frontend is a simple HTML5/JS app with a canvas and an "AI Assist" button. The backend exposes endpoints for saving/loading sketches and for sending a sketch to an AI model (mocked for now). It now supports real GitHub OAuth authentication for unlimited/premium features.

---

## Features
- Draw sketches in your browser
- Save/load sketches (DynamoDB)
- AI Assist: send your sketch to an AI model for enhancement (mocked)
- GitHub OAuth login for unlimited/premium AI usage
- Anonymous users get limited AI usage

---

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
   - Node.js 20.x
2. **Create `env.json` in the project root:**
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
3. **Build and start the API locally:**
   ```bash
   sam build
   sam local start-api --env-vars env.json
   ```
4. **Open [http://localhost:3000](http://localhost:3000) in your browser**

---

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

---

## How GitHub OAuth Works

- User clicks "Login with GitHub"
- Redirected to GitHub for authorization
- GitHub redirects back with a code
- Frontend sends code to `/auth/github` endpoint
- Backend exchanges code for access token and fetches user info
- User gets premium/unlimited AI features if authenticated
- Anonymous users are limited (3 AI requests per IP per 24h)

---

## Debugging & Troubleshooting

### Common Issues
- **Lambda returned NoneType**: Your Lambda must always return a response object. Check for missing return statements or unhandled errors.
- **Incorrect client credentials**: Double-check your GitHub Client Secret. Regenerate if needed and update `env.json` or AWS Secrets Manager.
- **Environment variables missing**: Ensure `env.json` is present and correct, and you are running with `--env-vars env.json`.
- **CORS issues**: All responses include `Access-Control-Allow-Origin: *`.
- **JSON parsing errors**: Ensure all requests send valid JSON bodies.

### Debugging Steps
1. **Check SAM terminal output** for logs and errors
2. **Test the OAuth endpoint directly**:
   ```bash
   curl -X POST http://localhost:3000/auth/github \
     -H "Content-Type: application/json" \
     -d '{"code":"test_code_here"}'
   ```
3. **Test credentials manually**:
   ```bash
   node test-credentials.mjs
   ```
4. **Try a minimal handler** (see `TRACK_NONETYPE_ERROR.md` for code)
5. **Check browser network tab** for failed requests

---

## Security Notes
- **Client ID is public** (safe to expose)
- **Client Secret must be kept secure** (never commit to git)
- **Tokens are stored in browser localStorage**
- **Backend always verifies GitHub tokens**
- **Rate limiting** for anonymous users is enforced by IP

---

## Testing

### Anonymous Usage
- Do not log in
- Try AI Assist (works up to 3 times per IP per 24h)
- 4th attempt shows "Demo limit reached"

### Authenticated Usage
- Click "Login with GitHub"
- Complete OAuth flow
- AI Assist is unlimited and premium features are unlocked

### Personal Access Token (for dev/testing)
- Click "Advanced: Use Personal Access Token"
- Create a token at https://github.com/settings/tokens/new?scopes=user:email
- Paste and use for real GitHub user data (for dev only)

---

## Production Considerations
- Use HTTPS for OAuth callbacks
- Store secrets in AWS Secrets Manager
- Monitor API usage and costs
- Add user session management if needed
- Implement robust error handling and user feedback

---

## References & Guides
- See `ENVIRONMENT_SETUP.md`, `LOCAL_ENV_SETUP.md`, `DEBUG_OAUTH.md`, `FIX_OAUTH_CREDENTIALS.md`, `TRACK_NONETYPE_ERROR.md`, and `GITHUB_OAUTH_SETUP.md` for detailed troubleshooting and setup instructions (now merged here).

---

## Quick Links
- [GitHub OAuth Apps](https://github.com/settings/developers)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html)
- [AWS Secrets Manager](https://console.aws.amazon.com/secretsmanager/)

---

Your authentication system is now ready for testing and production! 🚀
