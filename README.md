# 🎨 AI-Powered Sketch App - AWS Lambda Hackathon 2025

[![AWS Lambda](https://img.shields.io/badge/AWS-Lambda-orange?logo=amazon-aws)](https://aws.amazon.com/lambda/)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green?logo=node.js)](https://nodejs.org/)
[![DynamoDB](https://img.shields.io/badge/AWS-DynamoDB-blue?logo=amazon-dynamodb)](https://aws.amazon.com/dynamodb/)
[![Bedrock](https://img.shields.io/badge/AWS-Bedrock-purple?logo=amazon-aws)](https://aws.amazon.com/bedrock/)

A fully serverless sketch application with AI-powered style transformation, built for the [**AWS Lambda Hackathon 2025**](https://awslambdahackathon.devpost.com). Draw, create, and transform your sketches using Amazon Bedrock's Titan Image Generator, all powered by AWS Lambda functions.

## 🚀 Live Demo
*[Add your deployed URL here]*

## ✨ Features
- **Timeline History**: Visual timeline of your drawing iterations
- **Sketch Download**: Save your creations
- **UI Responsive**: Works seamlessly on desktop and mobile devices
- **Amazon Bedrock Integration**: Titan Image Generator v2
- **100% Serverless**: No servers to manage, auto-scaling, and global CDN
- **Sharing is caring**: fun to browse others' creative sketch

## 🏛️ Architecture


## 🛠️ Tech Stack

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

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd lambda
   ```

2. **Create environment configuration**
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

3. **Build and run locally**
   ```bash
   sam build
   sam local start-api --env-vars env.json
   ```

4. **Open the application**
   Navigate to `http://localhost:3000`

### Deployment

```bash
sam deploy --guided
```

## 🎨 AI Model Integration

- **Amazon Titan Image Generator v2** - High-quality image generation

## 🏆 What Makes This Project Special

### For the AWS Lambda Hackathon
- **Fully Serverless**: Every component runs on AWS Lambda
- **Modern AI Integration**: Real Amazon Bedrock implementation

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

### Quick Links
- [AWS Lambda Hackathon](https://awslambdahackathon.devpost.com/)
- [GitHub OAuth Apps](https://github.com/settings/developers)
- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli.html)
- [Amazon Bedrock Models](https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html)
