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

## Notes
- The `/ai-assist` endpoint currently returns a mock image. Integrate with AWS Bedrock or SageMaker for real AI.
- See `.github/copilot-instructions.md` for Copilot guidance.
