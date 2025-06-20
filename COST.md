# Cost Estimation for Sketch App with AI Assist

This document provides a rough estimate of the monthly AWS costs for running the serverless Sketch App with AI Assist, assuming typical usage patterns. Actual costs may vary based on region, usage, and AWS pricing changes.

## Components
- **AWS Lambda** (API backend, AI Assist)
- **Amazon API Gateway** (HTTP endpoints)
- **Amazon DynamoDB** (sketch storage)
- **Amazon Bedrock** (AI image generation, production only)
- **S3** (optional, for static file hosting or image cache)

---

## 1. AWS Lambda
- **Free tier:** 1M requests & 400,000 GB-seconds/month
- **Example usage:** 100,000 invocations/month, avg 512MB, 1s duration
- **Cost:** ~$0 (within free tier); otherwise ~$1.00/month

## 2. API Gateway
- **REST API:** $3.50 per million requests
- **Example usage:** 100,000 requests/month
- **Cost:** ~$0.35/month

## 3. DynamoDB
- **On-demand (PAY_PER_REQUEST):** $1.25 per million write units, $0.25 per million read units
- **Example usage:** 10,000 writes, 50,000 reads/month
- **Cost:** <$0.10/month
- **Storage:** First 25GB free, then $0.25/GB/month

## 4. Amazon Bedrock (AI Image Generation)
- **Pricing varies by model. Example (Stable Diffusion XL):**
  - ~$0.002 per image generated (as of 2025)
  - [Bedrock Pricing Page](https://aws.amazon.com/bedrock/pricing/)
- **Example usage:** 10,000 images/month
- **Cost:** 10,000 × $0.002 = **$20/month**
- **Other model examples:**
  - **Titan Image Generator:** ~$0.015 per image (as of 2025)
    - 10,000 images × $0.015 = **$150/month**
  - **Stable Diffusion v1:** ~$0.0015 per image
    - 10,000 images × $0.0015 = **$15/month**
- **Estimation formula:**
  - `Monthly Cost = Number of images × Price per image`
- **Note:** This is the dominant cost if AI is enabled. Choose model based on quality/cost tradeoff.

## 5. S3 (optional)
- **Static hosting:** $0.023/GB/month storage, $0.09/GB data out
- **Example usage:** 1GB storage, 10GB data out
- **Cost:** ~$1.13/month

---

## Total Estimated Monthly Cost (with AI enabled)
| Service         | Estimated Cost |
|-----------------|---------------|
| Lambda          | $0–1          |
| API Gateway     | $0.35         |
| DynamoDB        | $0.10         |
| Bedrock (AI)    | $20           |
| S3 (optional)   | $1            |
| **Total**       | **$21–23**    |

- **Without AI (dev mode):** likely <$2/month (mostly free tier)
- **With AI (prod):** dominated by Bedrock image generation

---

## Notes
- Costs scale with usage, especially Bedrock (AI) calls.
- Staying in the AWS Free Tier (for Lambda, API Gateway, DynamoDB) is possible for low/medium dev/test usage.
- Monitor with AWS Budgets and Cost Explorer for real usage.
- For the latest pricing, see the [AWS Pricing Calculator](https://calculator.aws.amazon.com/) and [Bedrock pricing](https://aws.amazon.com/bedrock/pricing/).
