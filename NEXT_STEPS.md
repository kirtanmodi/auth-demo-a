# Next Steps for Implementing Secure API Access

## Overview
This guide provides step-by-step instructions for implementing secure API access with CloudFront, S3, and Lambda Authorizers. We'll walk through installing dependencies, creating tokens, deploying the infrastructure, and testing the setup.

## 1. Installation & Setup

### Install Required Dependencies
```bash
# Install the AWS SDK for SSM, Lambda types, and yargs
npm install

# Verify the installations
npm list @aws-sdk/client-ssm
npm list @types/aws-lambda
npm list yargs
```

## 2. Token Management

### Create API Tokens for Different Environments
```bash
# Create a token for the dev environment
npm run token:create -- --stage dev --profile payrix

# For test and production environments (when ready)
npm run token:create -- --stage test --profile payrix
npm run token:create -- --stage prod --profile payrix
```

These commands will:
- Generate secure random tokens
- Store them as SecureStrings in SSM Parameter Store
- Display the token once (save it securely for frontend configuration)

## 3. Deploy Infrastructure

### Deploy in Stages
Deploy each component in the correct order:

```bash
# 1. Deploy base infrastructure (VPC, subnets, Aurora DB)
npm run deploy:infra

# 2. Deploy session manager host (if needed for DB access)
npm run deploy:session-manager

# 3. Deploy API functions with authorizer
npm run deploy:functions

# 4. Deploy frontend infrastructure
npm run deploy:frontend
```

Note: All deployment scripts are already configured to use the 'payrix' AWS profile as defined in package.json

## 4. Upload Frontend Content

### Upload the placeholder index.html to S3
```bash
# Get the S3 bucket name from CloudFormation outputs
aws cloudformation describe-stacks --stack-name auth-clear-frontend-dev --query "Stacks[0].Outputs[?OutputKey=='FrontendBucketName'].OutputValue" --output text --profile payrix

# Upload index.html to the S3 bucket
aws s3 cp frontend/public/index.html s3://auth-clear-frontend-dev/index.html --profile payrix
```

## 5. Configure Frontend Environment

### Create Environment-Specific Configuration
```bash
# Copy the template file
cp frontend/env.template frontend/.env.dev

# Edit the file to set the correct values
# Replace API_KEY with the token from step 2
# Set the correct API endpoint URL
```

## 6. Test the API Security

### Test Direct API Access (should fail)
```bash
# Try accessing the API directly (should fail)
curl -v https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev/merchants
```

### Test Authorized API Access
```bash
# Access with proper token (should succeed)
curl -v -H "Authorization: Bearer YOUR_TOKEN_HERE" https://your-api-gateway-url.execute-api.us-east-1.amazonaws.com/dev/merchants
```

### Test Frontend Access
1. Visit your CloudFront URL (from CloudFormation outputs)
2. Use the Test API Connection button on the frontend page
3. Verify correct environment detection and API integration

## 7. Security Validation

### Verify Security Configuration
- Confirm S3 bucket is not publicly accessible
- Verify CloudFront OAC is correctly configured
- Check API Gateway endpoints are only accessible with valid tokens
- Verify CORS settings are working as expected

## 8. Key Rotation (Maintenance)

### Periodically Rotate API Keys
```bash
# Rotate token when needed (dev environment example)
npm run token:rotate -- --stage dev --profile payrix

# Don't forget to update the frontend with the new token
```

## 9. CI/CD Implementation (Optional)

### Set Up Automated Deployment
- Configure GitHub Actions or AWS CodePipeline
- Secure token handling in CI/CD
- Automated testing and validation

## 10. Common Issues and Troubleshooting

### CloudFront Cache Issues
- CloudFront may cache responses, add Cache-Control headers if needed
- Invalidate the cache when deploying new content

### CORS Issues
- Double-check CORS configuration in the functions serverless.yml
- Verify all required headers are being passed

### Authorization Errors
- Check token format (must be "Bearer TOKEN")
- Verify token value matches the one in SSM Parameter Store
- Check SSM path is correct: `/auth-clear-infra/${stage}/api-token`

### IAM Permission Issues
- Verify Lambda execution roles have proper permissions
- Check CloudFront OAC configuration and bucket policy

## Next Phase Recommendations

1. Implement proper frontend application with React or similar
2. Add more robust error handling and logging
3. Implement monitoring and alerting
4. Consider AWS WAF for additional security layers
5. Implement regular security audits and updates 