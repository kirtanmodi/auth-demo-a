#!/bin/bash

# Configuration
STAGE=${1:-dev}
AWS_PROFILE=${2:-payrix}
KEY_FILE=${3:-aurora-bastion-key.pem}
LOCAL_PORT=${4:-5432}

# Stack names
INFRA_STACK="auth-demo-c-${STAGE}"
BASTION_STACK="auth-demo-c-bastion-${STAGE}"

echo "Setting up database tunnel using bastion host..."
echo "Stage: ${STAGE}"
echo "AWS Profile: ${AWS_PROFILE}"

# Get bastion IP address
BASTION_IP=$(aws cloudformation describe-stacks --stack-name ${BASTION_STACK} \
  --query "Stacks[0].Outputs[?OutputKey=='BastionPublicIP'].OutputValue" \
  --output text \
  --profile ${AWS_PROFILE})

if [ -z "$BASTION_IP" ]; then
  echo "Error: Could not retrieve bastion IP address. Make sure the stack ${BASTION_STACK} exists."
  exit 1
fi

echo " ------------------------------------------------------------"
echo "Bastion IP: ${BASTION_IP}"
echo " ------------------------------------------------------------"
# Get DB endpoint
DB_ENDPOINT=$(aws cloudformation describe-stacks --stack-name ${INFRA_STACK} \
  --query "Stacks[0].Outputs[?OutputKey=='AuroraClusterEndpoint'].OutputValue" \
  --output text \
  --profile ${AWS_PROFILE})

if [ -z "$DB_ENDPOINT" ]; then
  echo "Error: Could not retrieve database endpoint. Make sure the stack ${INFRA_STACK} exists."
  exit 1
fi

echo " ------------------------------------------------------------"
echo "Database Endpoint: ${DB_ENDPOINT}"
echo " ------------------------------------------------------------"

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
  echo "Error: Key file $KEY_FILE not found."
  echo "Please make sure the key file exists and is in the correct location."
  exit 1
fi

# Get database credentials
echo "Retrieving database credentials..."

# Get the Secret ARN from CloudFormation exports
SECRET_ARN=$(aws cloudformation describe-stacks --stack-name ${INFRA_STACK} \
  --query "Stacks[0].Outputs[?OutputKey=='AuroraSecretArn'].OutputValue" \
  --output text \
  --profile ${AWS_PROFILE})

if [ -z "$SECRET_ARN" ]; then
  echo "Error: Could not retrieve secret ARN from CloudFormation. Make sure the stack ${INFRA_STACK} exists."
  exit 1
fi

echo " ------------------------------------------------------------"
echo "Secret ARN: ${SECRET_ARN}"
echo " ------------------------------------------------------------"

DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
  --secret-id "${SECRET_ARN}" \
  --query "SecretString" \
  --output text \
  --profile ${AWS_PROFILE})

# If that fails, try direct name formats
if [ -z "$DB_CREDENTIALS" ]; then
  echo "Trying direct secret name..."
  DB_CREDENTIALS=$(aws secretsmanager get-secret-value \
    --secret-id "auth-demo-c/${STAGE}/aurora-credentials" \
    --query "SecretString" \
    --output text \
    --profile ${AWS_PROFILE})
fi

if [ ! -z "$DB_CREDENTIALS" ]; then
  # Extract username and password using grep and sed
  DB_USERNAME=$(echo $DB_CREDENTIALS | grep -o '"username":"[^"]*' | sed 's/"username":"//g')
  DB_PASSWORD=$(echo $DB_CREDENTIALS | grep -o '"password":"[^"]*' | sed 's/"password":"//g')
  
  echo " ------------------------------------------------------------"
  echo "Database credentials retrieved."
  echo "Username: $DB_USERNAME"
  echo "Password: $DB_PASSWORD"
  echo " ------------------------------------------------------------"
  
  # Create a temporary .pgpass file for passwordless connection
  echo "Setting up .pgpass file for passwordless connection..."
  PGPASS_FILE=~/.pgpass
  if [ ! -f "$PGPASS_FILE" ]; then
    touch $PGPASS_FILE
    chmod 600 $PGPASS_FILE
  fi
  
  # Add or update entry in .pgpass
  PGPASS_ENTRY="localhost:${LOCAL_PORT}:authcleardb:${DB_USERNAME}:${DB_PASSWORD}"
  grep -q "^localhost:${LOCAL_PORT}:authcleardb:" $PGPASS_FILE && \
    sed -i.bak "s/^localhost:${LOCAL_PORT}:authcleardb:.*/${PGPASS_ENTRY}/" $PGPASS_FILE || \
    echo $PGPASS_ENTRY >> $PGPASS_FILE
  
  echo " ------------------------------------------------------------"
  echo ".pgpass file updated."
  echo " ------------------------------------------------------------"
else
  echo "Warning: Could not retrieve database credentials from Secrets Manager."
fi

# Make sure key file has correct permissions
chmod 400 $KEY_FILE

echo " ------------------------------------------------------------"
echo "Establishing SSH tunnel to ${DB_ENDPOINT}:5432 through bastion host..."
echo "Local port: ${LOCAL_PORT}"
echo "Press Ctrl+C to close the tunnel."
echo " ------------------------------------------------------------"

# Establish tunnel
ssh -i $KEY_FILE -N -L ${LOCAL_PORT}:${DB_ENDPOINT}:5432 ec2-user@${BASTION_IP}

# Tunnel closed
echo " ------------------------------------------------------------"
echo "SSH tunnel closed." 
echo " ------------------------------------------------------------"