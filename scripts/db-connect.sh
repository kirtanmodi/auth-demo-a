#!/bin/bash

# Database Connection Script via Session Manager
# Usage: ./scripts/db-connect.sh [stage] [profile] [action]
# Actions: start, connect, stop, status

set -e

STAGE=${1:-dev}
PROFILE=${2:-payrix}
ACTION=${3:-connect}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

echo_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Get instance ID from CloudFormation exports
get_instance_id() {
    aws cloudformation describe-stacks \
        --stack-name "auth-demo-a-session-manager-${STAGE}" \
        --query 'Stacks[0].Outputs[?OutputKey==`SessionManagerInstanceId`].OutputValue' \
        --output text \
        --profile "${PROFILE}" 2>/dev/null
}

# Get Aurora endpoint from CloudFormation exports
get_aurora_endpoint() {
    aws cloudformation describe-stacks \
        --stack-name "auth-demo-a-${STAGE}" \
        --query 'Stacks[0].Outputs[?OutputKey==`AuroraClusterEndpoint`].OutputValue' \
        --output text \
        --profile "${PROFILE}" 2>/dev/null
}

# Check instance status
get_instance_status() {
    local instance_id=$1
    aws ec2 describe-instances \
        --instance-ids "${instance_id}" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text \
        --profile "${PROFILE}" 2>/dev/null
}

# Start instance
start_instance() {
    local instance_id=$1
    
    local status=$(get_instance_status "${instance_id}")
    
    if [[ "${status}" == "running" ]]; then
        echo_info "Instance is already running"
        return 0
    fi
    
    if [[ "${status}" == "pending" ]]; then
        echo_info "Instance is starting..."
    else
        echo_info "Starting instance ${instance_id}..."
        aws ec2 start-instances \
            --instance-ids "${instance_id}" \
            --profile "${PROFILE}" > /dev/null
    fi
    
    echo_info "Waiting for instance to be running..."
    aws ec2 wait instance-running \
        --instance-ids "${instance_id}" \
        --profile "${PROFILE}"
    
    echo_info "Instance is now running"
}

# Stop instance
stop_instance() {
    local instance_id=$1
    
    local status=$(get_instance_status "${instance_id}")
    
    if [[ "${status}" == "stopped" ]]; then
        echo_info "Instance is already stopped"
        return 0
    fi
    
    if [[ "${status}" == "stopping" ]]; then
        echo_info "Instance is stopping..."
    else
        echo_info "Stopping instance ${instance_id}..."
        aws ec2 stop-instances \
            --instance-ids "${instance_id}" \
            --profile "${PROFILE}" > /dev/null
    fi
    
    echo_info "Waiting for instance to be stopped..."
    aws ec2 wait instance-stopped \
        --instance-ids "${instance_id}" \
        --profile "${PROFILE}"
    
    echo_info "Instance is now stopped"
}

# Start port forwarding
start_port_forwarding() {
    local instance_id=$1
    local aurora_endpoint=$2
    
    echo_info "Starting port forwarding to Aurora database..."
    echo_info "Aurora endpoint: ${aurora_endpoint}"
    echo_info "Local connection: localhost:5432"
    echo_warn "Keep this terminal open for the connection to work"
    echo_warn "Press Ctrl+C to stop port forwarding"
    echo ""
    
    aws ssm start-session \
        --target "${instance_id}" \
        --document-name AWS-StartPortForwardingSessionToRemoteHost \
        --parameters "host=${aurora_endpoint},portNumber=5432,localPortNumber=5432" \
        --profile "${PROFILE}"
}

# Show status
show_status() {
    local instance_id=$1
    local status=$(get_instance_status "${instance_id}")
    
    echo_info "Instance ID: ${instance_id}"
    echo_info "Status: ${status}"
    
    if [[ "${status}" == "running" ]]; then
        echo_info "✅ Ready for database connection"
        echo_info "Run: npm run db:connect to start port forwarding"
    elif [[ "${status}" == "stopped" ]]; then
        echo_info "💤 Instance is stopped"
        echo_info "Run: npm run db:start to start the instance"
    else
        echo_info "⏳ Instance is ${status}"
    fi
}

# Main script logic
main() {
    echo_info "Database Connection Manager - Stage: ${STAGE}, Profile: ${PROFILE}, Action: ${ACTION}"
    
    # Get instance ID
    INSTANCE_ID=$(get_instance_id)
    if [[ -z "${INSTANCE_ID}" || "${INSTANCE_ID}" == "None" ]]; then
        echo_error "Could not find Session Manager instance for stage ${STAGE}"
        echo_error "Make sure the session-manager stack is deployed: npm run deploy:session-manager"
        exit 1
    fi
    
    # Get Aurora endpoint
    AURORA_ENDPOINT=$(get_aurora_endpoint)
    if [[ -z "${AURORA_ENDPOINT}" || "${AURORA_ENDPOINT}" == "None" ]]; then
        echo_error "Could not find Aurora endpoint for stage ${STAGE}"
        echo_error "Make sure the infrastructure stack is deployed: npm run deploy:infra"
        exit 1
    fi
    
    case "${ACTION}" in
        "start")
            start_instance "${INSTANCE_ID}"
            ;;
        "stop")
            stop_instance "${INSTANCE_ID}"
            ;;
        "status")
            show_status "${INSTANCE_ID}"
            ;;
        "connect")
            start_instance "${INSTANCE_ID}"
            echo_info "Instance started. Starting port forwarding in 5 seconds..."
            sleep 5
            start_port_forwarding "${INSTANCE_ID}" "${AURORA_ENDPOINT}"
            ;;
        *)
            echo_error "Unknown action: ${ACTION}"
            echo_info "Available actions: start, stop, connect, status"
            exit 1
            ;;
    esac
}

# Run main function
main "$@" 