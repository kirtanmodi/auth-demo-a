<!--
title: 'AWS Simple HTTP Endpoint example in NodeJS'
description: 'This template demonstrates how to make a simple HTTP API with Node.js running on AWS Lambda and API Gateway using the Serverless Framework.'
layout: Doc
framework: v4
platform: AWS
language: nodeJS
authorLink: 'https://github.com/serverless'
authorName: 'Serverless, Inc.'
authorAvatar: 'https://avatars1.githubusercontent.com/u/13742415?s=200&v=4'
-->

# Auth Demo Project

This project uses a split stack approach with Serverless Framework to separate infrastructure from function code.

## Project Structure

- `/infra/serverless.yml` - Infrastructure stack (VPC, RDS, etc.)
- `/session-manager/serverless.yml` - Session Manager host for database access
- `/functions/serverless.yml` - Lambda functions stack
- `/frontend/serverless.yml` - S3 bucket and CloudFront distribution

## Deployment Order

### Manual Deployment

#### 1. Deploy Infrastructure

```bash
cd infra
serverless deploy
```

#### 2. Deploy Session Manager Host

```bash
cd session-manager
serverless deploy --stage dev --aws-profile payrix
```

#### 3. Deploy Functions

```bash
cd functions
serverless deploy
```

#### 4. Deploy Frontend

```bash
cd frontend
serverless deploy
```

### Using NPM Scripts

For convenience, npm scripts are provided to deploy and remove stacks:

```bash
# Deploy all stacks in the correct order
npm run deploy:all

# Deploy individual stacks
npm run deploy:infra
npm run deploy:session-manager
npm run deploy:functions
npm run deploy:frontend

# Deploy specific functions
npm run function:create-merchant
npm run function:list-merchants

# Generate .env files with environment variables
npm run export-env:infra
npm run export-env:functions
npm run export-env:frontend

# Connect to the database through the session manager host
npm run db:connect

# Remove stacks (reverse order)
npm run remove:all

# Remove individual stacks
npm run remove:functions
npm run remove:session-manager
npm run remove:infra
```

## Dependency Management

The stacks are designed to avoid circular dependencies:

1. **Infrastructure Stack**: Base infrastructure with no dependencies on other stacks
2. **Session Manager Stack**: Depends on Infrastructure stack, adds security group rules to resources in the Infrastructure stack
3. **Functions Stack**: Depends on Infrastructure stack, references resources from both stacks
4. **Frontend Stack**: Depends on Infrastructure stack, references resources from both stacks

This design pattern allows for clean separation while maintaining proper dependency order.

## Benefits of Split Stacks

- **Isolation**: Infrastructure changes won't affect function deployments
- **Faster Deployments**: Function-only deployments are much faster
- **Better Organization**: Clearer separation of concerns
- **Team Collaboration**: Different teams can manage different stacks
- **Security Isolation**: Session Manager host in separate stack for better security management

## Individual Function Deployment

To deploy a single function without touching infrastructure:

```bash
cd functions
serverless deploy function -f createMerchant
```

## Cross-Stack References

The stacks reference resources from each other using CloudFormation exports through the `${cf:stack-name.output-name}` syntax:

- Infrastructure exports VPC, subnets, security groups, DB connection info
- Session Manager stack imports VPC and public subnet from infrastructure
- Functions stack imports DB connection info and network configuration from infrastructure
- Frontend stack imports S3 bucket and CloudFront distribution from infrastructure

## Connecting to the Database

The Aurora PostgreSQL database is deployed in a private subnet and is not directly accessible from the internet. To connect to it, you need to tunnel through the session manager host.

### Using the Tunnel Script

We've created a convenient script that automates the process of setting up an SSH tunnel to the database:

```bash
# Basic usage
npm run db:tunnel

# Advanced usage: customize stage, profile, key file, and local port
./scripts/db-tunnel.sh <stage> <aws-profile> <key-file-path> <local-port>
```

The script:

1. Gets the session manager IP and database endpoint automatically from CloudFormation
2. Sets up a secure SSH tunnel
3. Retrieves database credentials from Secrets Manager
4. Sets up a `.pgpass` file for passwordless connections

Once the tunnel is established, you can connect to the database using any PostgreSQL client:

```bash
# Connect with psql
psql -h localhost -p 5432 -U postgres -d authcleardb

# Or use a GUI tool like pgAdmin, pointing to:
# Host: localhost
# Port: 5432
# Username: postgres (or whatever is in Secrets Manager)
# Password: (retrieved from Secrets Manager)
# Database: authcleardb
```

### Manual Approach

If you prefer to set up the tunnel manually:

```bash
# Get the session manager IP
SESSION_MANAGER_IP=$(aws cloudformation describe-stacks --stack-name auth-demo-a-session-manager-dev \
--query "Stacks[0].Outputs[?OutputKey=='SessionManagerPublicIP'].OutputValue" \
--output text --profile payrix)

# Get the DB endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name auth-demo-a-dev \
  --query "Stacks[0].Outputs[?OutputKey=='AuroraClusterEndpoint'].OutputValue" \
  --output text)

# Set up the tunnel
ssh -i aurora-session-manager-key.pem -L 5432:${DB_ENDPOINT}:5432 ec2-user@${SESSION_MANAGER_IP}
```

# Serverless Framework Node HTTP API on AWS

This template demonstrates how to make a simple HTTP API with Node.js running on AWS Lambda and API Gateway using the Serverless Framework.

This template does not include any kind of persistence (database). For more advanced examples, check out the [serverless/examples repository](https://github.com/serverless/examples/) which includes Typescript, Mongo, DynamoDB and other examples.

## Environment Variables

This project uses `serverless-export-env` to automatically generate environment variables needed for both local development and deployed functions.

### How It Works

1. **Infrastructure Stack** - Defines resources and exports parameters
2. **Session Manager Stack** - Depends on Infrastructure stack, adds security group rules to resources in the Infrastructure stack
3. **Functions Stack** - References these parameters and uses them to set environment variables
4. **serverless-export-env** - Generates a `.env` file containing all environment variables

### Database Connection

The TypeORM data source automatically connects to the Aurora database using these environment variables:

- `DB_HOST` - Aurora cluster endpoint
- `DB_PORT` - Aurora port (typically 5432)
- `DB_USERNAME` - Retrieved from Secrets Manager
- `DB_PASSWORD` - Retrieved from Secrets Manager
- `DB_NAME` - Database name

### Generating Environment Variables

To generate the environment variables for local development:

```bash
npm run export-env
```

This will create a `.env` file in the project root that contains all necessary variables for TypeORM to connect to the database.

### Database Migrations

All migration commands automatically run `export-env` first to ensure the environment variables are available:

```bash
# Generate a migration
npm run migration:generate -- migration-name

# Run migrations
npm run migration:run

# Revert migrations
npm run migration:revert
```

### Local development

The easiest way to develop and test your function is to use the `dev` command:

```
serverless dev
```

This will start a local emulator of AWS Lambda and tunnel your requests to and from AWS Lambda, allowing you to interact with your function as if it were running in the cloud.

Now you can invoke the function as before, but this time the function will be executed locally. Now you can develop your function locally, invoke it, and see the results immediately without having to re-deploy.

When you are done developing, don't forget to run `serverless deploy` to deploy the function to the cloud.
