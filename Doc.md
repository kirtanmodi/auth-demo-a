
# Auth Demo Architecture Overview

## Project Summary
The Auth Demo project is a secure merchant management system built using AWS serverless architecture. It provides authentication, merchant data management, and secure API endpoints through a modern web application.

## System Architecture

### Infrastructure Components
- **Frontend**: Single-page application deployed to S3 and served via CloudFront
- **Backend**: AWS Lambda functions with API Gateway
- **Database**: Aurora PostgreSQL in a private VPC
- **Security**: Custom token authorizer, VPC isolation, and secrets management
- **DevOps**: Split stack deployment with Serverless Framework

### Architectural Diagram (Text Description)
```
┌────────────────┐     ┌────────────────┐     ┌────────────────┐
│   CloudFront   │────▶│  API Gateway   │────▶│ Lambda Functions│
│  Distribution  │     │                │     │                │
└────────────────┘     └────────────────┘     └────────────────┘
        ▲                                              │
        │                                              ▼
┌────────────────┐                           ┌────────────────┐
│   S3 Bucket    │                           │Aurora PostgreSQL│
│  (Frontend)    │                           │   Database     │
└────────────────┘                           └────────────────┘
                                                      ▲
                                                      │
                                             ┌────────────────┐
                                             │ Bastion Host   │
                                             │(Admin Access)  │
                                             └────────────────┘
```

## Component Details

### 1. Frontend Application
- **Hosting**: AWS S3 bucket with CloudFront distribution
- **Security Features**:
  - Private S3 bucket with CloudFront Origin Access Control
  - HTTPS enforcement
  - SPA routing support via custom error responses

### 2. Backend Services
- **API Gateway**:
  - HTTP API endpoints with CORS support
  - Token-based authorization
  
- **Lambda Functions**:
  - **Authorizer**: Validates authentication tokens for all API requests
  - **Merchant Management**:
    - createMerchant: Creates new merchant entries
    - listMerchants: Returns merchant data based on permissions
  
- **Data Models**:
  - Merchant
  - MerchantMember
  - MerchantBankAccount
  - MerchantDocument
  - MerchantOnboardingStatus
  - MerchantNote
  - MerchantAuditLog
  
### 3. Database System
- **Aurora PostgreSQL**:
  - Deployed in private subnets
  - Access limited to Lambda functions and bastion host
  - Credentials stored in AWS Secrets Manager

### 4. Security Implementation
- **Network Security**:
  - VPC with public and private subnets
  - Security groups controlling access
  - Database isolated in private subnet
  
- **Authentication & Authorization**:
  - Token-based authentication
  - Lambda authorizer function
  - Permission-based access control
  
- **Secrets Management**:
  - Database credentials in AWS Secrets Manager
  - Configuration parameters in Parameter Store

## Deployment Strategy

### Stack Separation
The project uses a split-stack approach for cleaner organization and efficient deployments:

1. **Infrastructure Stack** (`/infra`):
   - Base VPC, subnets, security groups
   - Aurora PostgreSQL database
   - Secrets Manager resources
   
2. **Functions Stack** (`/functions`):
   - Lambda functions
   - API Gateway endpoints
   - IAM roles and permissions
   
3. **Frontend Stack** (`/frontend`):
   - S3 bucket configuration
   - CloudFront distribution
   - Bucket policies
   
4. **Bastion Stack** (`/bastion`):
   - EC2 bastion host
   - Security group rules

### Deployment Order
1. Infrastructure Stack
2. Bastion Stack
3. Functions Stack
4. Frontend Stack

## Data Flow

### Authentication Flow
1. User logs in through frontend application
2. Authentication service validates credentials and issues token
3. Frontend stores token and includes it in API requests
4. Lambda authorizer validates token on every API request
5. If valid, request proceeds; if invalid, returns 401 Unauthorized

### Merchant Creation Flow
1. User submits merchant creation form in frontend
2. Request with authorization token sent to API Gateway
3. Authorizer function validates token and permissions
4. If authorized, createMerchant function processes request
5. Function validates input, creates database entry
6. Response sent back to frontend
7. Audit log entry created for the operation

## Environment Management

### Multiple Environments
- Development (`dev`)
- Testing (`test`)
- Production (`prod`)

### Environment Variables
- Generated using serverless-export-env
- Environment-specific configuration in Serverless Framework stages
- Secrets retrieved from AWS Secrets Manager at runtime

## Database Access

### For Developers
- SSH tunnel through bastion host
- Automated setup script (`db-tunnel.sh`)
- Credentials retrieved from Secrets Manager

### For Applications
- Lambda functions access via private subnet
- Connection parameters from environment variables
- Credentials from Secrets Manager

## Scaling and Performance

### Serverless Advantages
- Auto-scaling Lambda functions
- Pay-per-use cost model
- Independent deployment of components
- Simplified operations

### Performance Considerations
- Function timeout configuration
- Cold start mitigation
- Database connection pooling
- CloudFront caching for static assets

## Development Workflow

### Local Development
- `serverless offline` for local API testing
- Environment variables from `.env` file
- Database access via SSH tunnel

### Deployment Process
- Code changes committed to version control
- CI/CD pipeline runs tests
- Deployment to staging environment
- Manual verification and testing
- Promotion to production

## Monitoring and Logging

### AWS Services
- CloudWatch Logs for Lambda functions
- CloudWatch Metrics for performance monitoring
- X-Ray for tracing (configurable)

### Application Logging
- Structured logging format
- Error tracking
- Audit logging for data changes

## Conclusion
This architecture provides a secure, scalable, and maintainable solution for merchant management with proper authentication and authorization controls. The serverless approach minimizes operational overhead while providing robust security and performance characteristics.
