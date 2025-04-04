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
- `/functions/serverless.yml` - Lambda functions stack

## Deployment

### 1. Deploy Infrastructure

```bash
cd infra
serverless deploy
```

### 2. Deploy Functions

```bash
cd functions
serverless deploy
```

## Benefits of Split Stacks

- **Isolation**: Infrastructure changes won't affect function deployments
- **Faster Deployments**: Function-only deployments are much faster
- **Better Organization**: Clearer separation of concerns
- **Team Collaboration**: Different teams can manage different stacks

## Individual Function Deployment

To deploy a single function without touching infrastructure:

```bash
cd functions
serverless deploy function -f createMerchant
```

## Cross-Stack References

The functions stack references resources from the infrastructure stack using CloudFormation exports through the `${cf:stack-name.output-name}` syntax.

# Serverless Framework Node HTTP API on AWS

This template demonstrates how to make a simple HTTP API with Node.js running on AWS Lambda and API Gateway using the Serverless Framework.

This template does not include any kind of persistence (database). For more advanced examples, check out the [serverless/examples repository](https://github.com/serverless/examples/) which includes Typescript, Mongo, DynamoDB and other examples.

## Usage

### Deployment

In order to deploy the example, you need to run the following command:

```
serverless deploy
```

After running deploy, you should see output similar to:

```
Deploying "serverless-http-api" to stage "dev" (us-east-1)

✔ Service deployed to stack serverless-http-api-dev (91s)

endpoint: GET - https://xxxxxxxxxx.execute-api.us-east-1.amazonaws.com/
functions:
  hello: serverless-http-api-dev-hello (1.6 kB)
```

_Note_: In current form, after deployment, your API is public and can be invoked by anyone. For production deployments, you might want to configure an authorizer. For details on how to do that, refer to [HTTP API (API Gateway V2) event docs](https://www.serverless.com/framework/docs/providers/aws/events/http-api).

### Invocation

After successful deployment, you can call the created application via HTTP:

```
curl https://xxxxxxx.execute-api.us-east-1.amazonaws.com/
```

Which should result in response similar to:

```json
{ "message": "Go Serverless v4! Your function executed successfully!" }
```

### Local development

The easiest way to develop and test your function is to use the `dev` command:

```
serverless dev
```

This will start a local emulator of AWS Lambda and tunnel your requests to and from AWS Lambda, allowing you to interact with your function as if it were running in the cloud.

Now you can invoke the function as before, but this time the function will be executed locally. Now you can develop your function locally, invoke it, and see the results immediately without having to re-deploy.

When you are done developing, don't forget to run `serverless deploy` to deploy the function to the cloud.


### To run bastion host

```
chmod 400 aurora-bastion-key.pem
```

```
 ssh -i aurora-bastion-key.pem -L 5432:auth-demo-c-dev-auroracluster-z5lnqndwtc3l.cluster-cafk8mqqcxzp.us-east-1.rds.amazonaws.com:5432 ec2-user@54.210.188.99
 ```

 ```
aws secretsmanager get-secret-value \
    --secret-id auth-demo-c/dev/aurora-credentials \
    --query SecretString \
    --profile payrix \
    --output text
```