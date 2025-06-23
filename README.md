# Serverless Sketch App with AI Assist

This project is a serverless sketch application with AI assist, built using AWS Lambda (Node.js 20.x), API Gateway, and DynamoDB. The frontend is a simple HTML5/JS app with a canvas and an "AI Assist" button. The backend exposes endpoints for saving/loading sketches and for sending a sketch to an AI model (mocked for now).

## Features
- Draw sketches in your browser
- Save/load sketches (DynamoDB)
- AI Assist: send your sketch to an AI model for enhancement (mocked)

## Endpoints
- `GET /` - Main app (HTML)
- `GET /sketches` - List all sketches
- `POST /sketches` - Save a new sketch
- `POST /ai-assist` - Send a sketch to AI and get a new image (mocked)

## How to Run
1. Install AWS SAM CLI and Node.js 20.x
2. Run `sam build`
3. Run `sam local start-api`
4. Open [http://localhost:3000](http://localhost:3000) in your browser

## How to Deploy
1. Run `sam deploy --guided`

## GitHub OAuth Setup for Cognito
- https://github.com/settings/developers for creating OAuth Apps for authentication

### For Development
- Filling the field in`template.yaml`:
  ```yaml
  ProviderDetails:
    client_id: YOUR_CLIENT_ID
    client_secret: YOUR_CLIENT_SECRET
    # ...other settings...
  ```

### For Production
- Store your secrets in AWS Secrets Manager or SSM Parameter Store.
- Reference them in your template using dynamic references, e.g.:
  ```yaml
  ProviderDetails:
    client_id: '{{resolve:secretsmanager:github-client-id:SecretString:CLIENT_ID}}'
    client_secret: '{{resolve:secretsmanager:github-client-secret:SecretString:CLIENT_SECRET}}'
    # ...other settings...
  ```
- You must create these secrets in AWS Secrets Manager before deploying.

### Creating Secrets in AWS Secrets Manager with SAM

You can define your GitHub OAuth secrets as resources in your `template.yaml`:

```yaml
Resources:
  GitHubClientId:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: github-client-id
      Description: GitHub OAuth App Client ID for Cognito
  GitHubClientSecret:
    Type: AWS::SecretsManager::Secret
    Properties:
      Name: github-client-secret
      Description: GitHub OAuth App Client Secret for Cognito
```

After deploying, set the secret values in the AWS Console or with the AWS CLI:
```sh
aws secretsmanager put-secret-value --secret-id github-client-id --secret-string '{"CLIENT_ID":"your-client-id-here"}'
aws secretsmanager put-secret-value --secret-id github-client-secret --secret-string '{"CLIENT_SECRET":"your-client-secret-here"}'
```

Reference these secrets in your `template.yaml` for Cognito:
```yaml
ProviderDetails:
  client_id: '{{resolve:secretsmanager:github-client-id:SecretString:CLIENT_ID}}'
  client_secret: '{{resolve:secretsmanager:github-client-secret:SecretString:CLIENT_SECRET}}'
  # ...other settings...
```

- This approach keeps your secrets out of source control and templates.
- You must create and set the secret values before deploying resources that reference them.
