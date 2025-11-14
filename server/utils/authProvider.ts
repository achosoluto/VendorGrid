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
      // We'll need to import and call the actual keycloak auth status function
      // This is a placeholder that will need to be implemented
      return {
        provider: "keycloak",
        status: "active",
        environment: process.env.NODE_ENV || "development",
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