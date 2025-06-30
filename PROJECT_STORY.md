# 🎨 Sketch App with AI Assist

## Inspiration
I wanted a simple, lightweight way to sketch and transform ideas using AI—without bulky tools or complex workflows. Building the entire app with **AWS Lambda** was a new experience for me, and exploring serverless architecture made the project even more exciting.

## What it does
Sketch App lets users:
- **Draw sketches** directly in the browser
- **Save and revisit** their work
- **Toggle visibility** between public and private
- **Like public sketches** published by others
- **Transform sketches** into polished artwork

## How I built it
- **Frontend**: HTML/CSS, JavaScript, and a canvas-based drawing interface
- **Backend**: AWS Lambda functions handling storage, user actions, and connect to other AWS services
- **Storage**: DynamoDB for storing sketches, like counts, and metadata
- **AI Integration**: connect to Amazon Bedrock service
- **UI**: Clean, minimal layout with compact icons and intuitive controls


## Challenges I ran into
- Hitting payload limits on API request
- Work around DynamoDB object size limit
- Making hover/tap actions work seamlessly across devices
- Keeping the app simple and responsive while supporting key features

## Accomplishments I'm proud of
- Finished most of the features I planned, and the app works well
- This was my first time using an entirely new stack with AWS Lambda and DynamoDB
- Learned many new tools and concepts along the way
- Built a full-stack solo project that combines design, AI, and backend logic

## What I Learned
- Built and structured a serverless application using AWS Lambda
- Gained hands-on experience with AWS services and related tooling
- Balanced feature scope and simplicity effectively as a solo developer

## What's next
- Add more feature to the app
- Explore real-time sketch collaboration
- Address the bugs and improve scalability
- Cost optimization
