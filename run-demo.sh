#!/bin/bash

# VendorGrid Demo Startup Script
# This script starts the VendorGrid server and then launches the interactive demo

set -e

echo "🎬 Starting VendorGrid Government Data Integration Demo..."
echo "=============================================================="

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Check if server is running on port 3001
if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "✅ VendorGrid server is already running on port 3001"
else
    echo "🚀 Starting VendorGrid server..."
    
    # Start server in background
    npm run dev &
    SERVER_PID=$!
    
    echo "   Server PID: $SERVER_PID"
    echo "   Waiting for server to start..."
    
    # Wait for server to be ready
    attempt=1
    max_attempts=30
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s http://localhost:3001/api/government-data/ping > /dev/null 2>&1; then
            echo "✅ Server is ready!"
            break
        fi
        
        if [ $attempt -eq $max_attempts ]; then
            echo "❌ Server failed to start after $max_attempts attempts"
            kill $SERVER_PID 2>/dev/null || true
            exit 1
        fi
        
        echo "   Attempt $attempt/$max_attempts - waiting 2 seconds..."
        sleep 2
        attempt=$((attempt + 1))
    done
fi

echo ""
echo "🎭 Launching Interactive Demo CLI..."
echo "   Use Ctrl+C to stop the demo at any time"
echo ""

# Trap Ctrl+C to cleanup
cleanup() {
    echo ""
    echo "🛑 Shutting down demo..."
    if [ ! -z "$SERVER_PID" ]; then
        echo "   Stopping server (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
    fi
    echo "👋 Demo stopped. Thank you for trying VendorGrid!"
    exit 0
}

trap cleanup INT

# Launch the demo
npm run demo

# Cleanup after demo exits normally
cleanup