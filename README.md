# <img src='https://raw.githubusercontent.com/lanly-dev/aws-lambda-hackathon/refs/heads/main/media/logo2.png' width='35' style="margin-bottom:-8px;margin-right:5px"/> AI-Powered Sketch App - AWS Lambda Hackathon 2025

<!-- these may not working of API of huyhieu changed -->
[![AWS Lambda](https://huyhieu.val.run/huyhieu?url=aws.amazon.com&label=AWS&value=Lambda&color=orange&shape=parallelogram)](https://aws.amazon.com/lambda/)
[![Node.js](https://huyhieu.val.run/huyhieu?url=nodejs.org&label=node.js&value=22.x&color=green&shape=parallelogram)](https://nodejs.org/)
[![DynamoDB](https://huyhieu.val.run/huyhieu?url=aws.amazon.com&label=AWS&value=DynamoDB&color=Blue&shape=parallelogram)](https://aws.amazon.com/dynamodb/)
[![Bedrock](https://huyhieu.val.run/huyhieu?url=aws.amazon.com&label=AWS&value=Bedrock&color=purple&shape=parallelogram)](https://aws.amazon.com/bedrock/)

A fully serverless sketch application with AI-powered style transformation, built for the [**AWS Lambda Hackathon 2025**](https://awslambdahackathon.devpost.com). Draw, create, and transform your sketches using Amazon Bedrock's Titan Image Generator, all powered by AWS Lambda functions.

## 🚀 Demo
- ~~https://8b8qylx3db.execute-api.us-west-2.amazonaws.com/Prod~~
- [![Sketch App with AI Assist](http://img.youtube.com/vi/8U6G00AOqbU/0.jpg)](http://www.youtube.com/watch?v=8U6G00AOqbU "Sketch App with AI Assist")

## ✨ Features
- **Snapshot Timeline**: Visual timeline of your drawing iterations
- **Sketch Download**: Save your creations
- **UI Responsive**: Works seamlessly on desktop and mobile devices
- **Amazon Bedrock Integration**: Titan Image Generator v2
- **100% Serverless**: No servers to manage
- **Sharing is caring**: fun to browse others' creative sketch

## 🏛️ Architecture
![AWS services diagram](./media/s1.png)

- See more [DEV_NOTE](./DEV_NOTE.md)

## 🔨 Built With
- AWS Lambda, API Gateway, DynamoDB, Bedrock
- AWS Lambda powers the entire app, handling both the frontend and backend, and acting as middleware to connect the frontend with DynamoDB and Bedrock. API Gateway routes requests to Lambda endpoints, exposing the app to users.

### Quick Links
- [AWS Lambda Hackathon](https://awslambdahackathon.devpost.com/)
