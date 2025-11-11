import type { Express, RequestHandler } from "express";
import { storage } from "./storage";

/**
 * Mock Authentication for Development
 * 
 * This replaces Replit OAuth authentication with a simple mock system
 * for development and testing purposes.
 * 
 * BACKUP VERSION - Preserved from original mockAuth.ts before Keycloak migration
 * Date: 2025-11-11
 * Purpose: Rollback capability during Keycloak authentication migration
 */

// Mock user data for development
const mockUser = {
  claims: {
    sub: "dev-user-123",
    email: "developer@vendorgrid.local",
    first_name: "Dev",
    last_name: "User"
  },
  access_token: "mock-access-token",
  refresh_token: "mock-refresh-token", 
  expires_at: Math.floor(Date.now() / 1000) + 3600 // Expires in 1 hour
};

export async function setupAuth(app: Express) {
  console.log("🔓 Using MOCK authentication (development mode)");
  
  // Ensure mock user exists in database
  try {
    await storage.upsertUser({
      id: mockUser.claims.sub,
      email: mockUser.claims.email,
      firstName: mockUser.claims.first_name,
      lastName: mockUser.claims.last_name,
      profileImageUrl: null
    });
    console.log("✅ Mock user created/updated in database");
  } catch (error) {
    console.warn("⚠️  Could not create mock user:", error.message);
  }
  
  // Mock session middleware - just attach user to all requests
  app.use((req: any, res, next) => {
    req.user = mockUser;
    req.isAuthenticated = () => true;
    next();
  });

  // Mock auth routes for compatibility
  app.get('/api/auth/user', (req: any, res) => {
    res.json({
      id: mockUser.claims.sub,
      email: mockUser.claims.email,
      firstName: mockUser.claims.first_name,
      lastName: mockUser.claims.last_name,
      profileImageUrl: null
    });
  });

  app.get('/api/login', (req, res) => {
    res.json({ message: "Mock login successful", user: mockUser.claims });
  });

  app.get('/api/logout', (req, res) => {
    res.json({ message: "Mock logout successful" });
  });

  app.get('/api/callback', (req, res) => {
    res.redirect('/');
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  // In mock mode, always allow access
  if (process.env.NODE_ENV === 'development') {
    req.user = mockUser;
    return next();
  }
  
  // For production, this should still require real auth
  return res.status(401).json({ message: "Authentication required" });
};