
## 🏛️ Architecture
### Frontend
- **HTML5/CSS Canvas** - Drawing interface
- **Vanilla JavaScript** - No framework dependencies

### Backend (AWS Lambda Functions)
- **Node.js** - Runtime environment
- **AWS SAM** - Infrastructure as Code
- **API Gateway** - RESTful API endpoints
- **DynamoDB** - NoSQL database for sketches
- **Amazon Bedrock** - AI model integration
- **GitHub OAuth** - Authentication provider

## 🎯 AWS Lambda Functions
### 1. Sketch App (`sketch-app/`)
- **Purpose**: Serves the frontend application
- **Runtime**: Node.js 22.x
- **Features**: Static file serving, SPA routing

### 2. AI Assist (`ai-assist/`)
- **Purpose**: AI-powered sketch transformation
- **Runtime**: Node.js 22.x
- **Features**: Bedrock integration, style processing
- **Models**: Titan Image Generator v2, Stable Diffusion

### 3. Sketch Utils (`sketch-utils/`)
- **Purpose**: Sketch CRUD operations
- **Runtime**: Node.js 22.x
- **Features**: Save, load, delete, like sketches

### 4. GitHub OAuth (`github-oauth/`)
- **Purpose**: User authentication
- **Runtime**: Node.js 22.x
- **Features**: OAuth token exchange, user profile retrieval

## 📊 Database Schema
### Sketches Table
```json
{
  "userId": "number",           // Partition Key
  "sketchId": "string",         // Sort Key
  "username": "string",
  "userAvatar": "string",
  "description": "string",
  "modelName": "string",
  "styleTags": ["array"],
  "isPublic": "number",
  "likeCount": "number",
  "likedBy": ["array"],
  "createdAt": "string",
  "totalParts": "number"
}
```

### Sketch Parts Table
```json
{
  "sketchId": "string",         // Partition Key
  "partNumber": "number",       // Sort Key
  "data": "string"              // Base64 chunk
}
```

## 🚀 Getting Started
### Prerequisites
- AWS CLI configured
- AWS SAM CLI installed
- Node.js 22.x
- GitHub OAuth App

### Local Development
#### Create environment configuration
```json
// env.json
{
  "GitHubOAuth": {
    "GITHUB_CLIENT_ID": "your-github-client-id",
    "GITHUB_CLIENT_SECRET": "your-github-client-secret"
  },
  "AiAssist": {
    "AI_MODE": "dev"
  },
  "SketchUtils": {
    "SKETCHES_TABLE": "sketch-app-sketches",
    "SKETCH_PARTS_TABLE": "sketch-app-sketch-parts",
    "MODE": "dev"
  }
}
```

##### Build and run locally
```bash
sam build
sam local start-api --env-vars env.json
```

### Deployment
```bash
sam deploy --guided
```

### Project Structure
```
lambda/
├── sketch-app/          # Frontend Lambda function
├── ai-assist/           # AI processing Lambda
├── sketch-utils/        # CRUD operations Lambda
├── github-oauth/        # Authentication Lambda
├── template.yaml        # SAM Infrastructure
├── env.json            # Local environment config
└── README.md           # This file
```

### References
- [GitHub OAuth Apps](https://github.com/settings/developers)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html)
- [Amazon Bedrock Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
