import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";

import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";
import MemoryStore from 'memorystore';
import { storage } from "./storage";

/**
 * Keycloak Authentication Implementation
 *
 * Replaces mock authentication with proper Keycloak OIDC authentication
 * for Phase 3 migration. Maintains compatibility with existing user flows.
 *
 * Features:
 * - OIDC-compliant authentication flow
 * - Session management with PostgreSQL store
 * - Token refresh handling
 * - User data synchronization with database
 * - Rollback capability to mock auth


if (!process.env.KEYCLOAK_BASE_URL) {
  console.warn("⚠️  KEYCLOAK_BASE_URL not provided - Keycloak auth may not work correctly");
}

if (!process.env.KEYCLOAK_REALM) {
  console.warn("⚠️  KEYCLOAK_REALM not provided - Defaulting to 'vendorgrid'");
}

if (!process.env.KEYCLOAK_CLIENT_ID) {
  console.warn("⚠️  KEYCLOAK_CLIENT_ID not provided - Defaulting to 'vendorgrid-app'");
}

const getOidcConfig = memoize(
  async () => {
    const baseUrl = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
    const realm = process.env.KEYCLOAK_REALM || "vendorgrid";
    const clientId = process.env.KEYCLOAK_CLIENT_ID || "vendorgrid-app";
    
    return await client.discovery(
      new URL(`${baseUrl}/realms/${realm}`),
      clientId
    );
  },
  { maxAge: 3600 * 1000 } // Cache for 1 hour
);

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const authProvider = getActiveAuthProvider();

  let store;

  if (authProvider === "keycloak") {
    // Use PostgreSQL session store for Keycloak auth
    const pgStore = connectPg(session);
    store = new pgStore({
      conString: process.env.DATABASE_URL,
      createTableIfMissing: false,
      ttl: sessionTtl,
      tableName: "sessions",
    });
  } else {
    // Use memory store for mock auth (development)
    store = new MemoryStore.default({
      checkPeriod: sessionTtl
    });
  }

  return session({
    secret: process.env.SESSION_SECRET || "default-secret-change-in-production",
    store: store,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(
  claims: any,
) {
  try {
    await storage.upsertUser({
      id: claims["sub"],
      email: claims["email"],
      firstName: claims["first_name"] || claims["given_name"],
      lastName: claims["last_name"] || claims["family_name"],
      profileImageUrl: claims["picture"] || claims["profile_image_url"],
    });
    console.log("✅ User upserted successfully:", claims["email"]);
  } catch (error) {
    console.error("❌ Failed to upsert user:", error);
    throw error;
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();
  const clientId = process.env.KEYCLOAK_CLIENT_ID || "vendorgrid-app";
  
  console.log("🔓 Using Keycloak authentication");
  console.log("📍 OIDC Issuer:", config.issuer);
  console.log("🏢 Client ID:", clientId);
  console.log("🎯 Token Endpoint:", config.token_endpoint);

  const verify: VerifyFunction = async (
    tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers,
    verified: passport.AuthenticateCallback
  ) => {
    try {
      const user = {};
      updateUserSession(user, tokens);
      await upsertUser(tokens.claims());
      verified(null, user);
      console.log("✅ Authentication successful for user:", tokens.claims()["email"]);
    } catch (error) {
      console.error("❌ Authentication failed:", error);
      verified(error);
    }
  };

  const callbackURL = process.env.KEYCLOAK_CALLBACK_URL || "/api/callback";
  const strategy = new Strategy(
    {
      name: "keycloak",
      config,
      client: {
        client_id: clientId,
        client_secret: process.env.KEYCLOAK_CLIENT_SECRET,
      },
      scope: "openid email profile offline_access",
      callbackURL: callbackURL,
      pkce: true, // Enable PKCE for security
    },
    verify,
  );
  
  passport.use(strategy);

  passport.serializeUser((user: Express.User, cb) => cb(null, user));
  passport.deserializeUser((user: Express.User, cb) => cb(null, user));

  // Login endpoint
  app.get("/api/login", (req, res, next) => {
    console.log("🔐 Initiating login flow");
    passport.authenticate("keycloak", {
      prompt: "login consent",
      scope: ["openid", "email", "profile", "offline_access"],
    })(req, res, next);
  });

  // Callback endpoint
  app.get(callbackURL, (req, res, next) => {
    console.log("🔄 Processing authentication callback");
    passport.authenticate("keycloak", {
      successReturnToOrRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    console.log("🚪 Logging out user");
    req.logout(() => {
      const baseUrl = process.env.KEYCLOAK_BASE_URL || "http://localhost:8080";
      const realm = process.env.KEYCLOAK_REALM || "vendorgrid";
      const clientId = process.env.KEYCLOAK_CLIENT_ID || "vendorgrid-app";
      
      const logoutUrl = client.buildEndSessionUrl(config, {
        client_id: clientId,
        post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
      }).href;
      
      console.log("✅ Logout successful, redirecting to:", logoutUrl);
      res.redirect(logoutUrl);
    });
  });

  // Session info endpoint for debugging
  app.get("/api/auth/session", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ authenticated: false });
    }
    
    const user = req.user as any;
    res.json({
      authenticated: true,
      user: {
        id: user.claims?.sub,
        email: user.claims?.email,
        name: `${user.claims?.first_name || ''} ${user.claims?.last_name || ''}`.trim(),
        expires_at: user.expires_at,
      },
    });
  });
}

export const isAuthenticated: RequestHandler = async (req: any, res, next) => {
  const user = req.user as any;

  if (!req.isAuthenticated() || !user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const now = Math.floor(Date.now() / 1000);
  if (now <= user.expires_at) {
    return next();
  }

  const refreshToken = user.refresh_token;
  if (!refreshToken) {
    res.status(401).json({ message: "Unauthorized - no refresh token" });
    return;
  }

  try {
    const config = await getOidcConfig();
    const tokenResponse = await client.refreshTokenGrant(config, refreshToken);
    updateUserSession(user, tokenResponse);
    console.log("🔄 Token refreshed successfully");
    return next();
  } catch (error) {
    console.error("❌ Token refresh failed:", error);
    res.status(401).json({ message: "Unauthorized - token refresh failed" });
    return;
  }
};

/**
 * Auth provider detection utility
 * Used to determine which authentication provider is active
 */
export function getActiveAuthProvider(): "mock" | "keycloak" {
  const provider = process.env.AUTH_PROVIDER?.toLowerCase();
  
  if (provider === "keycloak") {
    return "keycloak";
  } else if (provider === "mock") {
    return "mock";
  } else {
    // Default to mock for backward compatibility
    console.warn("⚠️  AUTH_PROVIDER not set, defaulting to mock authentication");
    return "mock";
  }
}

/**
 * Authentication health check
 * Returns status of current authentication system
 */
export async function getAuthStatus() {
  const provider = getActiveAuthProvider();
  
  if (provider === "keycloak") {
    try {
      const config = await getOidcConfig();
      return {
        provider: "keycloak",
        status: "active",
        issuer: config.issuer,
        clientId: process.env.KEYCLOAK_CLIENT_ID,
      };
    } catch (error) {
      return {
        provider: "keycloak",
        status: "error",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  } else {
    return {
      provider: "mock",
      status: "active",
      environment: process.env.NODE_ENV || "development",
    };
  }
}