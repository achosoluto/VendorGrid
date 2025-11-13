// Load environment variables at the very beginning
// This file should be imported first in any file that needs env vars
import { config } from "dotenv";

// Only load .env in development mode
if (process.env.NODE_ENV === 'development') {
  config();
}

export {}; // Make this a module
