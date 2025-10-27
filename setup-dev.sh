#!/bin/bash
# VendorGrid Development Setup Script

set -e

echo "🚀 Setting up VendorGrid development environment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+ and try again."
    exit 1
fi

echo "✅ Node.js $(node --version) found"

# Check if npm dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "✅ Dependencies already installed"
fi

# Check for .env file
if [ ! -f ".env" ]; then
    echo "❌ .env file not found. Please configure your environment variables."
    echo "📝 Example .env file should contain:"
    echo "   DATABASE_URL=postgresql://user:password@host:port/database"
    echo "   SESSION_SECRET=your-secret-key"
    echo "   REPL_ID=your-repl-id"
    echo "   REPLIT_DOMAINS=localhost,127.0.0.1"
    exit 1
else
    echo "✅ .env file found"
fi

# Check if DATABASE_URL is set
if ! grep -q "^DATABASE_URL=" .env || grep -q "username:password@localhost" .env; then
    echo "⚠️  DATABASE_URL needs to be configured with a real database connection string"
    echo "📋 Options:"
    echo "   1. Use Neon (recommended): https://neon.tech/"
    echo "   2. Use local Docker: docker-compose up -d postgres"
    echo "   3. Use any PostgreSQL database"
    echo ""
    echo "🔧 Once you have a database URL, update the DATABASE_URL in .env file"
    echo "   Example: DATABASE_URL=postgresql://user:pass@host:5432/dbname"
else
    echo "✅ DATABASE_URL configured"
    
    # Try to push database schema
    echo "📊 Setting up database schema..."
    if npm run db:push; then
        echo "✅ Database schema created successfully"
    else
        echo "❌ Failed to create database schema. Please check your DATABASE_URL"
        exit 1
    fi
fi

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Configure your DATABASE_URL in .env if not done already"
echo "   2. Run: npm run dev"
echo "   3. Open: http://localhost:5000"
echo ""
echo "📚 For Canadian business data ingestion, ensure your database is ready"
echo "   and run the data ingestion pipeline from the application."