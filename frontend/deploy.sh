#!/bin/bash

# Frontend Deployment Script for auth-demo-a
# Usage: ./deploy.sh [stage] [profile]
# Example: ./deploy.sh dev payrix

set -e

# Default values
STAGE=${1:-dev}
PROFILE=${2:-payrix}

# Configuration
BUCKET_NAME="auth-clear-frontend-${STAGE}"
DISTRIBUTION_ID="E39DFVQ8M3AMTE"  # Update this if you have different distributions per stage

echo "🚀 Starting frontend deployment..."
echo "Stage: ${STAGE}"
echo "Profile: ${PROFILE}"
echo "Bucket: ${BUCKET_NAME}"

# Step 1: Build the frontend
echo "📦 Building frontend..."
npm run build

# Check if build was successful
if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist directory not found"
    exit 1
fi

echo "✅ Build completed successfully"

# Step 2: Upload to S3
echo "☁️ Uploading to S3..."
aws s3 sync dist/ s3://${BUCKET_NAME} --profile ${PROFILE} --delete --exact-timestamps

# Check if upload was successful
if [ $? -eq 0 ]; then
    echo "✅ Upload to S3 completed"
else
    echo "❌ Upload to S3 failed"
    exit 1
fi

# Step 3: Invalidate CloudFront cache
echo "🔄 Invalidating CloudFront cache..."
INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id ${DISTRIBUTION_ID} \
    --paths "/*" \
    --profile ${PROFILE} \
    --query 'Invalidation.Id' \
    --output text)

if [ $? -eq 0 ]; then
    echo "✅ CloudFront invalidation created: ${INVALIDATION_ID}"
    echo "⏳ Cache invalidation typically takes 1-2 minutes to complete"
else
    echo "❌ CloudFront invalidation failed"
    exit 1
fi

# Step 4: Display deployment info
echo ""
echo "🎉 Deployment completed successfully!"
echo "📍 Frontend URL: https://dcvxituamj9bp.cloudfront.net"
echo "🗂️ S3 Bucket: s3://${BUCKET_NAME}"
echo "🌐 CloudFront Distribution: ${DISTRIBUTION_ID}"
echo ""
echo "Note: Changes may take 1-2 minutes to appear due to CloudFront caching" 