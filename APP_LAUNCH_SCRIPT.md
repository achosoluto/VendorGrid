# VendorGrid Application Launch Script

## Overview

The `launch-app.sh` script provides a simple and reliable way to start the VendorGrid application. It handles all the necessary setup steps and verifies that the application starts correctly before reporting success.

## Features

- Checks for required dependencies (Node.js, npm)
- Automatically installs dependencies if needed
- Handles both development and production modes
- Sets up database connections (SQLite or PostgreSQL)
- Performs health checks to ensure the server is running
- Provides process ID management for easy stopping
- Implements graceful shutdown handling

## Usage

### Development Mode (Default)

```bash
./launch-app.sh
```

This is the default mode that:
- Starts the development server using `npm run dev`
- Uses hot reloading for development
- Automatically sets up SQLite database if not present
- Runs on the port specified in your `.env` file (default: 5000)

### Production Mode

```bash
./launch-app.sh prod
```

This mode:
- Builds the application using `npm run build`
- Starts the production server using `npm run start`
- Runs on the port specified in your `.env` file (default: 5000)

## Prerequisites

Before running the script, ensure you have:

1. **Node.js 18+** and **npm** installed
2. A `.env` file with proper configuration (copy from `.env.example`)
3. A valid `DATABASE_URL` in your `.env` file

## Configuration

### Environment Variables

Create a `.env` file by copying `.env.example`:

```bash
cp .env.example .env
```

Key variables to configure:

- `DATABASE_URL`: Your database connection string (SQLite or PostgreSQL)
- `PORT`: The port to run the server on (default: 5000)
- `NODE_ENV`: Set to `production` for production mode (default: `development`)

### Database Setup

The script automatically handles database setup:

- **For SQLite**: Creates a database file at `backend/vendors.db` if not present
- **For PostgreSQL**: Runs database migrations to set up the schema

## Stopping the Application

To stop the running application:

```bash
kill $(cat .server.pid)
```

Or use Ctrl+C in the terminal where the script is running.

## Troubleshooting

### Common Issues

1. **"Node.js not found"**: Install Node.js 18+ from [nodejs.org](https://nodejs.org/)

2. **"Database connection failed"**: Verify your `DATABASE_URL` in `.env` is correct

3. **"Port already in use"**: Change the `PORT` variable in your `.env` file

4. **"Module not found"**: Run `npm install` to install dependencies

### Health Checks

The script performs health checks by attempting to connect to the server URL. If the server fails to respond after 30 attempts (60 seconds), the script will terminate and clean up any started processes.

## Script Flow

1. Verify dependencies exist (Node.js, npm, curl)
2. Install dependencies if needed
3. Check for `.env` file (create from example if missing)
4. Set up database based on `DATABASE_URL`
5. Start the appropriate server (dev or prod)
6. Perform health checks to confirm the server is running
7. Set up signal handlers for graceful shutdown
8. Wait indefinitely to keep the server running

## Testing Prerequisites

Use the test script to verify all prerequisites without starting the server:

```bash
./test-launch.sh
```

This will check that all dependencies and configuration files are in place without starting the actual application.