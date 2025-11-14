#!/bin/bash

# VendorGrid Application Launcher
# This script reliably starts the VendorGrid application server

set -e

echo "🚀 Starting VendorGrid Application..."
echo "====================================="

# Check if node is available
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install npm and try again."
    exit 1
fi

echo "✅ npm $(npm --version | head -n 1) found"

# Check if node_modules exists, install if not
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo "✅ Dependencies installed"
else
    echo "✅ Dependencies already installed"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "📋 Please configure your .env file with appropriate values before continuing"
    echo "   At minimum, set DATABASE_URL to a valid database connection string"
fi

# Determine if we should use development or production mode
if [ "${NODE_ENV}" = "production" ] || [ "$1" = "prod" ]; then
    # Production mode: build and start
    echo "🏭 Production mode detected"
    
    # Build the application
    echo "🔨 Building application..."
    npm run build
    
    # Start the built application
    echo "🚀 Starting production server..."
    npm run start &
    SERVER_PID=$!
    
else
    # Development mode: run directly
    echo "🛠️  Development mode detected"
    
    # Check if DATABASE_URL is set to SQLite for development
    if [ -z "${DATABASE_URL}" ] || [[ "${DATABASE_URL}" == *"sqlite"* ]]; then
        echo "🗄️  Using SQLite database for development"
        
        # Ensure backend directory exists
        if [ ! -d "backend" ]; then
            echo "📁 Creating backend directory..."
            mkdir -p backend
        fi
        
        # Initialize database if using SQLite
        if [ ! -f "backend/vendors.db" ]; then
            echo "📋 Setting up SQLite database for development..."
            npm run db:push
            echo "✅ SQLite database initialized"
        fi
    else
        echo "🐘 Using PostgreSQL database from DATABASE_URL"
        echo "📋 Pushing database schema..."
        npm run db:push
        echo "✅ Database schema pushed"
    fi
    
    # Start the development server
    echo "🚀 Starting development server..."
    npm run dev &
    SERVER_PID=$!
fi

# Store the server PID for potential cleanup
echo $SERVER_PID > .server.pid

echo "   Server PID: $SERVER_PID"
echo "   Waiting for server to start..."

# Wait for server to be ready
attempt=1
max_attempts=30
port=${PORT:-5000}

while [ $attempt -le $max_attempts ]; do
    if curl -s http://localhost:$port/ > /dev/null 2>&1 || curl -s http://localhost:$port/api/ > /dev/null 2>&1; then
        echo "✅ Server is ready at http://localhost:$port"
        break
    fi

    if [ $attempt -eq $max_attempts ]; then
        echo "❌ Server failed to start after $max_attempts attempts"
        kill $SERVER_PID 2>/dev/null || true
        rm -f .server.pid
        exit 1
    fi

    echo "   Attempt $attempt/$max_attempts - waiting 2 seconds..."
    sleep 2
    attempt=$((attempt + 1))
done

echo ""
echo "🎉 VendorGrid Application is running!"
echo ""
echo "🌐 Access the application at:"
if [ "${NODE_ENV}" = "production" ] || [ "$1" = "prod" ]; then
    echo "   http://localhost:${port} (Backend API)"
    echo "   Point your frontend to this server"
else
    echo "   http://localhost:${port} (Backend API)"
    echo "   http://localhost:5173 (Frontend - if using Vite)"
fi
echo ""
echo "📊 API endpoints:"
echo "   http://localhost:${port}/api/government-data"
echo "   http://localhost:${port}/api/vendors"
echo ""
echo "🔄 To stop the server, run: kill \$(cat .server.pid) or Ctrl+C to this script"

# Trap to handle cleanup when script is terminated
cleanup() {
    echo ""
    echo "🛑 Shutting down server..."
    if [ -f ".server.pid" ]; then
        SERVER_PID=$(cat .server.pid)
        kill $SERVER_PID 2>/dev/null || true
        rm -f .server.pid
    elif [ ! -z "$SERVER_PID" ]; then
        kill $SERVER_PID 2>/dev/null || true
    fi
    echo "👋 Application stopped. Thank you for using VendorGrid!"
    exit 0
}

# Set up signal handlers for graceful shutdown
trap cleanup INT TERM

# Wait indefinitely to keep the script running
while true; do
    sleep 1
done