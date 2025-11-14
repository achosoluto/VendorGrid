import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import { storage } from "./storage";
import { getActiveAuthProvider } from "./keycloakAuth";

/**
 * Mock Authentication Implementation (Replit-style)
 *
 * Provides in-memory mock authentication for development and testing
 * without requiring external authentication services.
 */

export function getReplitSession() {
  return session({
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    },
  });
}

export async function setupMockAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getReplitSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Mock user data
  const mockUsers = new Map();

  // Serialize/deserialize for session management
  passport.serializeUser((user: any, done) => {
    console.log("🔐 Serializing mock user:", user.email);
    done(null, user.id);
  });

  passport.deserializeUser((id: any, done) => {
    const user = mockUsers.get(id) || {
      id: id,
      email: `user${id}@example.com`,
      firstName: "Mock",
      lastName: "User",
      profileImageUrl: null,
    };
    console.log("🔐 Deserializing mock user:", user.email);
    done(null, user);
  });

  // Login endpoint for mock auth
  app.get("/api/login", (req, res) => {
    console.log("🔐 Initiating mock login flow");
    
    // Create a mock user
    const mockUserId = `mock-user-${Date.now()}`;
    const mockUser = {
      id: mockUserId,
      email: `test${mockUserId}@example.com`,
      firstName: "Test",
      lastName: "User",
      profileImageUrl: null,
    };

    // Store user in mock user map
    mockUsers.set(mockUserId, mockUser);

    // Log in the user
    req.login(mockUser, (err) => {
      if (err) {
        console.error("❌ Mock login error:", err);
        return res.status(500).json({ message: "Login failed" });
      }

      console.log("✅ Mock login successful for user:", mockUser.email);
      res.redirect("/");
    });
  });

  // Callback endpoint (for mock, just redirect to home)
  app.get("/api/callback", (req, res) => {
    console.log("🔄 Mock authentication callback");
    res.redirect("/");
  });

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    console.log("🚪 Mock logout initiated");
    req.logout(() => {
      console.log("✅ Mock logout successful");
      res.redirect("/");
    });
  });

  // Session info endpoint
  app.get("/api/auth/session", (req, res) => {
    if (!req.isAuthenticated() || !req.user) {
      return res.status(401).json({ authenticated: false });
    }

    const user = req.user as any;
    res.json({
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      },
    });
  });
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  if (!req.isAuthenticated() || !req.user) {
    console.log("🔒 Authentication failed - user not authenticated");
    return res.status(401).json({ message: "Unauthorized" });
  }

  console.log("✅ User authenticated:", (req.user as any).email);
  next();
};

/**
 * Mock authentication status for health checking
 */
export async function getMockAuthStatus() {
  return {
    provider: "mock",
    status: "active",
    environment: process.env.NODE_ENV || "development",
    usersInSession: "mock user management",
  };
}