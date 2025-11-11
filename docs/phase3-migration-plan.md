# Phase 3: Authentication Migration Plan

## Overview

This document provides a comprehensive migration plan for transitioning from Replit OIDC to Keycloak authentication in Phase 3 of the VendorGrid project. Phase 2 has established a complete Keycloak infrastructure that is now ready for integration.

## Current State (End of Phase 2)

### Keycloak Infrastructure Status
- ✅ Keycloak server running on http://localhost:8080
- ✅ Keycloak PostgreSQL database configured
- ✅ "vendorgrid" realm created and configured
- ✅ OIDC clients created (vendorgrid-app, vendorgrid-admin)
- ✅ Admin console accessible
- ✅ All necessary endpoints available
- ✅ Environment variables configured
- ✅ Testing and startup scripts created

### Current Authentication System
- ✅ Replit OIDC still active and functional
- ✅ Backend using Replit authentication
- ✅ Frontend integrated with Replit authentication
- ✅ Dual authentication support enabled via `AUTH_PROVIDER` variable

## Phase 3 Migration Strategy

### 1. Migration Approach: Gradual Transition

**Option A: Immediate Switch (Recommended)**
- Change `AUTH_PROVIDER=keycloak`
- Update OIDC configuration throughout codebase
- Create bridge users for existing accounts
- Test and validate

**Option B: User-by-User Migration**
- Implement dual authentication support
- Allow users to choose authentication provider
- Gradually migrate users over time
- Remove Replit support after migration

### 2. Implementation Timeline

#### Step 1: Backend Authentication Migration
**Duration**: 1-2 hours
- Update server/replitAuth.ts to support Keycloak
- Implement OIDC token validation
- Add JWT verification using Keycloak JWKS
- Update user session management

#### Step 2: Frontend Integration Update
**Duration**: 1-2 hours
- Update OIDC client configuration
- Update authentication hooks and utilities
- Update API calls to use Keycloak tokens
- Test authentication flow

#### Step 3: Environment Configuration
**Duration**: 30 minutes
- Update .env with new client secrets
- Set `AUTH_PROVIDER=keycloak`
- Remove Replit variables (or keep for rollback)

#### Step 4: User Migration
**Duration**: 1-3 hours
- Create user accounts in Keycloak
- Map existing Replit users to Keycloak accounts
- Implement user import/export if needed
- Test user login with existing credentials

#### Step 5: Testing and Validation
**Duration**: 2-4 hours
- Run comprehensive authentication tests
- Test all user flows (login, logout, session management)
- Verify API integration
- Performance testing

#### Step 6: Cleanup and Finalization
**Duration**: 1 hour
- Remove Replit dependencies
- Update documentation
- Archive old Replit configuration
- Final validation

## Integration Points and Code Changes

### 1. Backend Server Updates (server/replitAuth.ts)

#### Current Structure
```typescript
// server/replitAuth.ts (Phase 2 - Current)
export async function handleAuth(req: Request, res: Response) {
  // Replit OIDC implementation
  const { code } = req.query;
  // ... Replit authentication logic
}
```

#### Target Structure (Phase 3)
```typescript
// server/auth.ts (Phase 3 - Target)
import { OAuth2Client } from 'openid-client';

interface AuthProvider {
  getAuthUrl(): string;
  exchangeCodeForTokens(code: string): Promise<Tokens>;
  getUserInfo(accessToken: string): Promise<UserInfo>;
  verifyToken(token: string): Promise<VerifiedToken>;
}

class KeycloakAuthProvider implements AuthProvider {
  private client: OAuth2Client;
  private realm: string;
  
  constructor() {
    this.client = new OAuth2Client({
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      redirectUri: process.env.KEYCLOAK_REDIRECT_URI!,
    });
    this.realm = process.env.KEYCLOAK_REALM!;
  }
  
  getAuthUrl(): string {
    return `http://localhost:8080/realms/${this.realm}/protocol/openid-connect/auth`;
  }
  
  async exchangeCodeForTokens(code: string) {
    const tokenSet = await this.client.callback(
      process.env.KEYCLOAK_REDIRECT_URI!,
      { code },
      { state: 'state123' }
    );
    return tokenSet;
  }
  
  async getUserInfo(accessToken: string) {
    return await this.client.userinfo(accessToken);
  }
  
  async verifyToken(token: string) {
    return await this.client.introspect(token);
  }
}

class ReplitAuthProvider implements AuthProvider {
  // Existing Replit implementation
}

// Factory pattern for authentication provider selection
export function getAuthProvider(): AuthProvider {
  const provider = process.env.AUTH_PROVIDER || 'replit';
  
  switch (provider) {
    case 'keycloak':
      return new KeycloakAuthProvider();
    case 'replit':
      return new ReplitAuthProvider();
    default:
      throw new Error(`Unknown auth provider: ${provider}`);
  }
}

// Updated auth handler
export async function handleAuth(req: Request, res: Response) {
  const authProvider = getAuthProvider();
  const { code } = req.query;
  
  if (!code) {
    const authUrl = authProvider.getAuthUrl();
    return res.redirect(authUrl);
  }
  
  try {
    const tokens = await authProvider.exchangeCodeForTokens(code as string);
    const userInfo = await authProvider.getUserInfo(tokens.access_token);
    
    // Create or update user in database
    const user = await upsertUser(userInfo);
    
    // Create session
    req.session.userId = user.id;
    req.session.accessToken = tokens.access_token;
    req.session.refreshToken = tokens.refresh_token;
    
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Auth error:', error);
    res.redirect('/login?error=auth_failed');
  }
}

// JWT verification middleware
export async function verifyAuthToken(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }
  
  try {
    const authProvider = getAuthProvider();
    const verifiedToken = await authProvider.verifyToken(token);
    
    if (verifiedToken.active) {
      req.user = verifiedToken;
      next();
    } else {
      res.status(401).json({ error: 'Invalid token' });
    }
  } catch (error) {
    res.status(401).json({ error: 'Token verification failed' });
  }
}
```

### 2. Frontend Updates (client/src)

#### Current Authentication Hook (client/src/hooks/useAuth.ts)
```typescript
// client/src/hooks/useAuth.ts (Phase 2 - Current)
export const useAuth = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check for Replit authentication
    checkReplitAuth();
  }, []);
  
  const checkReplitAuth = async () => {
    // Replit OIDC logic
  };
  
  const login = () => {
    // Redirect to Replit OIDC
    window.location.href = '/auth';
  };
  
  return { user, loading, login, logout };
};
```

#### Target Authentication Hook (Phase 3)
```typescript
// client/src/hooks/useAuth.ts (Phase 3 - Target)
import { useState, useEffect, useCallback } from 'react';
import { authClient } from '../services/authClient';
import { User } from '../types/auth';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    initializeAuth();
  }, []);
  
  const initializeAuth = async () => {
    try {
      const isAuthenticated = await authClient.isAuthenticated();
      if (isAuthenticated) {
        const user = await authClient.getUser();
        setUser(user);
      }
    } catch (err) {
      setError('Failed to initialize authentication');
    } finally {
      setLoading(false);
    }
  };
  
  const login = useCallback(() => {
    authClient.login();
  }, []);
  
  const logout = useCallback(async () => {
    try {
      await authClient.logout();
      setUser(null);
    } catch (err) {
      setError('Logout failed');
    }
  }, []);
  
  const getAccessToken = useCallback(async () => {
    return await authClient.getAccessToken();
  }, []);
  
  return {
    user,
    loading,
    error,
    login,
    logout,
    getAccessToken,
    isAuthenticated: !!user
  };
};
```

#### OIDC Client Service
```typescript
// client/src/services/authClient.ts
class KeycloakAuthClient {
  private config = {
    authority: 'http://localhost:8080/realms/vendorgrid',
    client_id: 'vendorgrid-app',
    redirect_uri: 'http://localhost:5173/auth/callback',
    response_type: 'code',
    scope: 'openid profile email',
    loadUserInfo: true,
    automaticSilentRenew: true,
    silent_redirect_uri: 'http://localhost:5173/auth/silent-callback'
  };
  
  private userManager: UserManager;
  
  constructor() {
    this.userManager = new UserManager(this.config);
  }
  
  async login() {
    await this.userManager.signinRedirect();
  }
  
  async handleCallback() {
    const user = await this.userManager.signinRedirectCallback();
    return user;
  }
  
  async logout() {
    await this.userManager.signoutRedirect();
  }
  
  async isAuthenticated(): Promise<boolean> {
    const user = await this.userManager.getUser();
    return !!(user && !user.expired);
  }
  
  async getUser() {
    return await this.userManager.getUser();
  }
  
  async getAccessToken(): Promise<string | null> {
    const user = await this.userManager.getUser();
    return user?.access_token || null;
  }
}

export const authClient = new KeycloakAuthClient();
```

### 3. Environment Variables Changes

#### Current .env (Phase 2)
```env
# Current authentication provider
AUTH_PROVIDER=replit

# Replit OIDC (currently active)
REPLIT_CLIENT_ID=your_replit_client_id
REPLIT_CLIENT_SECRET=your_replit_client_secret
REPLIT_AUTH_URL=https://replit.com/auth
REPLIT_TOKEN_URL=https://replit.com/api/v1/oauth/token
REPLIT_USERINFO_URL=https://replit.com/api/v1/oauth/userinfo

# Keycloak OIDC (configured but not active)
KEYCLOAK_CLIENT_ID=vendorgrid-app
KEYCLOAK_CLIENT_SECRET=GENERATED_SECRET
KEYCLOAK_AUTH_URL=http://localhost:8080/realms/vendorgrid
KEYCLOAK_TOKEN_URL=http://localhost:8080/realms/vendorgrid/protocol/openid-connect/token
```

#### Target .env (Phase 3)
```env
# Switch to Keycloak authentication
AUTH_PROVIDER=keycloak

# Keycloak OIDC (now active)
KEYCLOAK_CLIENT_ID=vendorgrid-app
KEYCLOAK_CLIENT_SECRET=YOUR_ACTUAL_CLIENT_SECRET
KEYCLOAK_AUTH_URL=http://localhost:8080/realms/vendorgrid
KEYCLOAK_TOKEN_URL=http://localhost:8080/realms/vendorgrid/protocol/openid-connect/token
KEYCLOAK_USERINFO_URL=http://localhost:8080/realms/vendorgrid/protocol/openid-connect/userinfo
KEYCLOAK_REDIRECT_URI=http://localhost:5173/auth/callback

# Replit OIDC (commented out for rollback capability)
# REPLIT_CLIENT_ID=your_replit_client_id
# REPLIT_CLIENT_SECRET=your_replit_client_secret
# REPLIT_AUTH_URL=https://replit.com/auth
# REPLIT_TOKEN_URL=https://replit.com/api/v1/oauth/token
# REPLIT_USERINFO_URL=https://replit.com/api/v1/oauth/userinfo
```

## User Migration Strategy

### 1. Account Mapping

#### Existing Replit Users
All existing users authenticated via Replit OIDC need to be migrated to Keycloak accounts.

#### Migration Options

**Option A: Automatic Email-Based Migration**
```typescript
// User migration service
class UserMigrationService {
  async migrateUserByEmail(email: string, replitUserId: string) {
    // Check if user exists in Keycloak
    const keycloakUser = await this.findKeycloakUserByEmail(email);
    
    if (!keycloakUser) {
      // Create new user in Keycloak
      const newKeycloakUser = await this.createKeycloakUser({
        email,
        firstName: replitUser.profile?.firstName,
        lastName: replitUser.profile?.lastName,
        username: email
      });
      
      // Set temporary password and force password change
      await this.setTemporaryPassword(newKeycloakUser.id, this.generateTemporaryPassword());
    }
    
    // Map Replit user to Keycloak user in VendorGrid database
    await this.updateUserMapping(replitUserId, keycloakUser.id);
    
    // Send welcome email with temporary password
    await this.sendMigrationEmail(email, temporaryPassword);
  }
}
```

**Option B: Self-Service Migration**
- Users receive email with migration link
- They create new Keycloak account using same email
- Old account becomes inactive after grace period

**Option C: Administrator-Assisted Migration**
- Admin imports user list from Replit
- Creates corresponding Keycloak accounts
- Sends password reset emails to users

### 2. Data Migration Script

```typescript
// scripts/migrate-users.ts
import { userService } from '../server/services/UserService';
import { keycloakAdmin } from '../server/services/KeycloakAdminService';

export async function migrateUsers() {
  const replitUsers = await userService.getAllUsers({ authProvider: 'replit' });
  
  for (const user of replitUsers) {
    try {
      // Create Keycloak user
      const keycloakUserId = await keycloakAdmin.createUser({
        email: user.email,
        username: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        enabled: true
      });
      
      // Set temporary password
      const tempPassword = generateSecurePassword();
      await keycloakAdmin.setUserPassword(keycloakUserId, tempPassword);
      
      // Update user record in database
      await userService.updateUser(user.id, {
        keycloakUserId,
        authProvider: 'keycloak',
        passwordResetRequired: true
      });
      
      // Send migration email
      await sendMigrationEmail(user.email, tempPassword);
      
      console.log(`Migrated user: ${user.email}`);
    } catch (error) {
      console.error(`Failed to migrate user ${user.email}:`, error);
    }
  }
}
```

## API Integration Changes

### 1. Authentication Middleware Updates

```typescript
// server/middleware/auth.ts
import { Keycloak } from 'keycloak-connect';
import session from 'express-session';

export function setupAuthMiddleware(app: Express) {
  // Keycloak middleware setup
  const keycloak = new Keycloak({ store: sessionStore }, {
    'auth-flows': ['vendorgrid'],
    'ssl-required': 'external',
    'confidential-port': 0,
    'bearer-only': true
  });
  
  // Apply Keycloak middleware to all API routes
  app.use(keycloak.middleware());
  
  // Protected routes
  app.get('/api/vendors', keycloak.protect('realm:vendor'), getVendors);
  app.post('/api/vendors', keycloak.protect('realm:admin'), createVendor);
  app.delete('/api/vendors/:id', keycloak.protect('realm:admin'), deleteVendor);
  
  // Public routes
  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
}
```

### 2. Frontend API Client Updates

```typescript
// client/src/services/apiClient.ts
class ApiClient {
  private baseURL = '/api';
  
  async request(endpoint: string, options: RequestOptions = {}) {
    const token = await authClient.getAccessToken();
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    });
    
    if (response.status === 401) {
      // Token expired, try to refresh
      await authClient.login();
      throw new Error('Authentication required');
    }
    
    return response.json();
  }
  
  // API methods
  async getVendors() {
    return this.request('/vendors');
  }
  
  async createVendor(vendor: VendorData) {
    return this.request('/vendors', {
      method: 'POST',
      body: JSON.stringify(vendor)
    });
  }
}
```

## Testing Strategy

### 1. Pre-Migration Testing

#### Backend Tests
```typescript
// tests/auth/keycloak-auth.test.ts
describe('Keycloak Authentication', () => {
  test('should verify Keycloak token', async () => {
    const token = await getTestToken();
    const verified = await verifyKeycloakToken(token);
    expect(verified).toBeTruthy();
  });
  
  test('should reject invalid token', async () => {
    const invalidToken = 'invalid.token.here';
    await expect(verifyKeycloakToken(invalidToken)).rejects.toThrow();
  });
  
  test('should create user session with Keycloak token', async () => {
    const userInfo = await getUserInfoFromKeycloak();
    const session = await createUserSession(userInfo);
    expect(session.userId).toBeDefined();
  });
});
```

#### Frontend Tests
```typescript
// client/src/tests/auth.test.tsx
describe('Keycloak Authentication', () => {
  test('should login with Keycloak', async () => {
    render(<LoginPage />);
    fireEvent.click(screen.getByText('Login'));
    
    // Should redirect to Keycloak
    await waitFor(() => {
      expect(window.location.href).toContain('localhost:8080');
    });
  });
  
  test('should handle auth callback', async () => {
    const mockAuthClient = {
      handleCallback: jest.fn().mockResolvedValue({ profile: { email: 'test@example.com' } })
    };
    
    render(<AuthCallback />);
    
    await waitFor(() => {
      expect(mockAuthClient.handleCallback).toHaveBeenCalled();
    });
  });
});
```

### 2. Migration Testing

#### End-to-End Tests
```typescript
// tests/e2e/auth-migration.test.ts
describe('Authentication Migration E2E', () => {
  test('should complete full login flow with Keycloak', async () => {
    // Start from login page
    await page.goto('http://localhost:5173/login');
    
    // Click login button
    await page.click('[data-testid="login-button"]');
    
    // Should redirect to Keycloak
    await page.waitForURL('**/realms/vendorgrid/login-actions/authenticate**');
    
    // Login with test credentials
    await page.fill('#username', 'testuser@example.com');
    await page.fill('#password', 'testpassword123');
    await page.click('#kc-login');
    
    // Should return to application
    await page.waitForURL('**/dashboard');
    
    // Should be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
  
  test('should maintain session after page reload', async () => {
    // Login first
    await loginWithKeycloak();
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });
});
```

## Rollback Plan

### 1. Emergency Rollback Procedure

If the Keycloak migration fails, revert to Replit authentication:

#### Step 1: Environment Variables
```bash
# Quick rollback
export AUTH_PROVIDER=replit
```

#### Step 2: Restart Services
```bash
# Restart backend to pick up new environment
npm run server:dev

# Restart frontend
npm run client:dev
```

#### Step 3: Revert Code Changes
```bash
# Revert authentication changes
git checkout HEAD~1 -- server/auth.ts
git checkout HEAD~1 -- client/src/hooks/useAuth.ts
git checkout HEAD~1 -- client/src/services/authClient.ts
```

#### Step 4: Database Rollback
```sql
-- Revert user auth provider field
UPDATE users SET auth_provider = 'replit' WHERE auth_provider = 'keycloak';
```

### 2. Rollback Triggers

- Login failure rate > 10%
- User session loss > 5%
- API error rate > 5%
- Performance degradation > 20%

## Validation Checklist

### Pre-Migration Validation
- [ ] Keycloak infrastructure running and healthy
- [ ] All OIDC endpoints accessible
- [ ] Client secrets generated and configured
- [ ] Test users created in Keycloak
- [ ] Environment variables updated
- [ ] Migration scripts tested

### Post-Migration Validation
- [ ] All users can log in with new system
- [ ] Session management working correctly
- [ ] API authentication functional
- [ ] Logout working properly
- [ ] Password reset functional
- [ ] User profile management working
- [ ] Performance within acceptable limits
- [ ] No authentication-related errors in logs

### Monitoring After Migration
- [ ] Set up authentication success/failure monitoring
- [ ] Monitor session creation/termination rates
- [ ] Track API authentication failures
- [ ] Monitor Keycloak server health
- [ ] Set up alerts for authentication issues

## Success Metrics

### Technical Metrics
- Authentication success rate: > 99%
- Session creation time: < 2 seconds
- Token validation time: < 100ms
- System availability: 99.9%

### User Experience Metrics
- User login completion rate: > 95%
- User session duration: unchanged from Replit
- Support tickets related to auth: < 5% increase

### Business Metrics
- Zero downtime during migration
- All existing users successfully migrated
- No data loss or corruption
- Improved security posture with Keycloak

## Communication Plan

### Stakeholder Notification
1. **Development Team**: Migration start and completion times
2. **Users**: Advance notice of authentication changes
3. **Support Team**: Documentation and troubleshooting guides
4. **Management**: Migration status and success metrics

### User Communication
- Email notification 48 hours before migration
- In-app notifications during migration
- Post-migration confirmation and help resources

## Post-Migration Activities

### Immediate (First 24 hours)
- Monitor authentication metrics
- User support for login issues
- Performance monitoring
- Log analysis for errors

### Short-term (First Week)
- User feedback collection
- Performance optimization
- Security review
- Documentation updates

### Long-term (First Month)
- Cleanup of Replit dependencies
- Advanced Keycloak features implementation
- Security hardening
- Performance tuning

## Resource Requirements

### Development Time
- Backend migration: 8-16 hours
- Frontend migration: 8-16 hours
- Testing: 16-24 hours
- Documentation: 4-8 hours
- **Total: 36-64 hours**

### Testing Environment
- Test Keycloak deployment
- Test user migration scripts
- Load testing for authentication
- Security testing

### Production Requirements
- Keycloak production instance
- Database backup and recovery
- Monitoring and alerting
- User support resources

## Conclusion

The Phase 3 migration plan provides a comprehensive roadmap for transitioning from Replit OIDC to Keycloak authentication. The plan includes:

1. **Detailed Implementation Steps**: Clear code changes and integration points
2. **Testing Strategy**: Comprehensive testing for all components
3. **Rollback Procedures**: Safe rollback mechanisms if issues arise
4. **User Migration**: Multiple options for migrating existing users
5. **Validation Framework**: Clear success criteria and metrics
6. **Communication Plan**: Stakeholder and user communication strategies

The migration leverages the Keycloak infrastructure established in Phase 2 and provides a smooth transition path that minimizes disruption to users while improving the overall authentication security and functionality.

---

**Migration Status**: Phase 3 Ready  
**Target Start Date**: After Phase 2 completion  
**Estimated Duration**: 1-2 weeks  
**Risk Level**: Medium (mitigated by comprehensive testing)  
**Rollback Capability**: Full rollback available