#!/bin/bash

# VendorGrid Demo Script
# This script demonstrates the VendorGrid application with mock authentication and SQLite

set -e  # Exit on any error

echo "==========================================="
echo "    VENDORGRID APPLICATION DEMO"
echo "==========================================="
echo

# Function to print colored output
print_info() {
    echo -e "\033[1;34mINFO:\033[0m $1"
}

print_success() {
    echo -e "\033[1;32mSUCCESS:\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33mWARNING:\033[0m $1"
}

print_error() {
    echo -e "\033[1;31mERROR:\033[0m $1"
}

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
print_info "Checking prerequisites..."

if ! command_exists node; then
    print_error "Node.js is not installed. Please install Node.js before running this demo."
    exit 1
fi

if ! command_exists npm; then
    print_error "npm is not installed. Please install npm before running this demo."
    exit 1
fi

print_success "Prerequisites check passed"

# Set demo environment variables
export PORT=3000
export AUTH_PROVIDER=mock
export DATABASE_URL=""  # Empty to use SQLite
export SESSION_SECRET=demo-session-secret-change-in-production
export NODE_ENV=development

print_info "Environment variables set:"
print_info "  - PORT=$PORT"
print_info "  - AUTH_PROVIDER=$AUTH_PROVIDER"
print_info "  - DATABASE_URL=$DATABASE_URL (using SQLite)"
print_info "  - NODE_ENV=$NODE_ENV"

# Install dependencies if not already installed
if [ ! -d "node_modules" ]; then
    print_info "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
else
    print_info "Dependencies already installed, skipping installation"
fi

# Function to check if server is ready
check_server_ready() {
    local max_attempts=30
    local attempt=1
    
    print_info "Waiting for server to start on port $PORT..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:$PORT/api/health >/dev/null 2>&1; then
            print_success "Server is ready on http://localhost:$PORT"
            return 0
        fi
        
        print_info "  Attempt $attempt/$max_attempts - waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Server failed to start after $max_attempts attempts"
    return 1
}

# Start the server in the background
print_info "Starting VendorGrid server..."
npm run dev &
SERVER_PID=$!

# Store server PID for cleanup
echo $SERVER_PID > .demo_server.pid

# Wait for server to be ready
if ! check_server_ready; then
    kill $SERVER_PID 2>/dev/null || true
    rm -f .demo_server.pid
    exit 1
fi

# Demo functionality
print_info "Starting demo sequence..."

echo
print_info "1. Checking health endpoint:"
curl -s http://localhost:$PORT/api/health | jq '.' 2>/dev/null || echo "Health check complete"

echo
print_info "2. Checking authentication status:"
curl -s http://localhost:$PORT/api/auth/status | jq '.' 2>/dev/null || echo "Auth status check complete"

echo
print_info "3. Attempting to get current user (should return 401 unauthorized without login):"
curl -s -w "\n" -o /dev/null -w "Status Code: %{http_code}\n" http://localhost:$PORT/api/auth/user

# For mock authentication, let's try to initiate a login
echo
print_info "4. Initiating mock login flow..."
print_warning "Note: Mock authentication will redirect you to a login page in a real scenario"
print_info "   For demo purposes, we'll show how the login endpoint is configured:"
echo "   GET http://localhost:$PORT/api/login"

# Show system status
echo
print_info "5. Checking system status:"
curl -s http://localhost:$PORT/api/system/status | jq '.' 2>/dev/null || echo "System status check complete"

# Demonstrate vendor profile functionality (will require authentication)
echo
print_info "6. Attempting to get vendor profile (will fail without authentication):"
curl -s -w "\n" -o /dev/null -w "Status Code: %{http_code}\n" http://localhost:$PORT/api/vendor-profile

# Demo complete
echo
print_success "Demo completed successfully!"
echo "The server is running with the following configuration:"
echo "  - Port: $PORT"
echo "  - Authentication: $AUTH_PROVIDER"
echo "  - Database: SQLite (file-based)"
echo "  - Environment: $NODE_ENV"
echo
print_info "You can access the API at http://localhost:$PORT"
print_info "Press Ctrl+C to stop the server and exit the demo"

# Keep the script running until user stops it
trap 'echo; print_info "Stopping server..."; kill $SERVER_PID 2>/dev/null || true; rm -f .demo_server.pid; echo; print_success "Demo stopped"; exit 0' INT TERM

wait $SERVER_PID