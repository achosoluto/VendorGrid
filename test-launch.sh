#!/bin/bash

# Test script to verify all components required for launch-app.sh are available
# This script doesn't start the actual server, just verifies dependencies

echo "🔍 Testing application launch prerequisites..."
echo "============================================"

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

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "❌ node_modules directory not found. Please run 'npm install' first."
    exit 1
else
    echo "✅ Dependencies already installed"
fi

# Check package.json scripts
if ! grep -q "dev" package.json; then
    echo "❌ 'dev' script not found in package.json"
    exit 1
fi
echo "✅ Development script exists in package.json"

if ! grep -q "build" package.json; then
    echo "❌ 'build' script not found in package.json"
    exit 1
fi
echo "✅ Build script exists in package.json"

if ! grep -q "start" package.json; then
    echo "❌ 'start' script not found in package.json"
    exit 1
fi
echo "✅ Production start script exists in package.json"

if ! grep -q "db:push" package.json; then
    echo "❌ 'db:push' script not found in package.json"
    exit 1
fi
echo "✅ Database push script exists in package.json"

# Check for required files
if [ ! -f "server/index.ts" ]; then
    echo "❌ server/index.ts not found"
    exit 1
fi
echo "✅ Server entry point exists"

if [ ! -f ".env.example" ]; then
    echo "❌ .env.example not found"
    exit 1
fi
echo "✅ Environment file example exists"

# Check if curl is available (needed for health checks)
if ! command -v curl &> /dev/null; then
    echo "❌ curl not found. Please install curl for health checks."
    exit 1
fi
echo "✅ curl found for health checks"

echo ""
echo "🎉 All prerequisites verified successfully!"
echo ""
echo "The launch-app.sh script should work correctly."
echo "To launch the application, run:"
echo "  ./launch-app.sh"
echo ""
echo "For production mode, run:"
echo "  ./launch-app.sh prod"
echo ""
echo "To stop the application later, run:"
echo "  kill \$(cat .server.pid)"
echo ""