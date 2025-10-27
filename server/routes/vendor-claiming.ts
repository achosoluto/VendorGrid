import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { vendorClaimingService } from '../services/VendorClaimingService';
import { isAuthenticated } from '../mockAuth';
import { z } from 'zod';

const router = Router();

// Rate limiting for claiming operations
const claimingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // Limit each IP to 10 claiming operations per windowMs
  message: "Too many claiming requests, please try again later.",
  standardHeaders: 'draft-6',
  legacyHeaders: false,
});

const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 50, // Allow more searches
  message: "Too many search requests, please try again later.",
  standardHeaders: 'draft-6',
  legacyHeaders: false,
});

// Validation schemas
const searchQuerySchema = z.object({
  companyName: z.string().optional(),
  taxId: z.string().optional(),
  businessNumber: z.string().optional(),
  email: z.string().email().optional(),
}).refine(data => Object.values(data).some(value => value !== undefined), {
  message: "At least one search parameter must be provided"
});

const claimRequestSchema = z.object({
  vendorProfileId: z.string().min(1),
  email: z.string().email(),
  contactName: z.string().optional(),
  reason: z.string().max(500).optional(),
});

const claimTokenSchema = z.object({
  token: z.string().min(1),
});

/**
 * Search for claimable vendor profiles
 * GET /api/vendor-claiming/search?companyName=...&taxId=...
 */
router.get('/search', searchLimiter, async (req, res) => {
  try {
    const query = searchQuerySchema.parse(req.query);
    
    const profiles = await vendorClaimingService.searchVendorProfiles(query);
    
    // Remove sensitive information from search results
    const safeProfiles = profiles.map(profile => ({
      id: profile.id,
      companyName: profile.companyName,
      taxId: profile.taxId,
      businessNumber: profile.businessNumber,
      address: profile.address,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      country: profile.country,
      email: profile.email,
      phone: profile.phone,
      website: profile.website,
      verificationStatus: profile.verificationStatus,
      dataSource: profile.dataSource,
      isActive: profile.isActive,
      createdAt: profile.createdAt,
      // Explicitly exclude sensitive fields
      userId: undefined,
      bankName: undefined,
      accountNumberEncrypted: undefined,
      routingNumberEncrypted: undefined,
    }));

    res.json({
      success: true,
      profiles: safeProfiles,
      total: safeProfiles.length,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid search parameters",
        errors: error.errors,
      });
    }

    console.error("Vendor profile search error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to search vendor profiles",
    });
  }
});

/**
 * Initiate profile claiming process
 * POST /api/vendor-claiming/initiate
 */
router.post('/initiate', claimingLimiter, async (req, res) => {
  try {
    const claimRequest = claimRequestSchema.parse(req.body);
    
    const result = await vendorClaimingService.initiateProfileClaim(claimRequest);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        tokenId: result.tokenId,
        expiresAt: result.expiresAt,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid claim request data",
        errors: error.errors,
      });
    }

    console.error("Profile claim initiation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to initiate profile claim",
    });
  }
});

/**
 * Get profile information by claim token (for preview)
 * GET /api/vendor-claiming/preview/:token
 */
router.get('/preview/:token', searchLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Claim token is required",
      });
    }

    const result = await vendorClaimingService.getProfileByClaimToken(token);
    
    if (result.success) {
      res.json({
        success: true,
        vendorProfile: result.vendorProfile,
      });
    } else {
      res.status(404).json({
        success: false,
        message: result.message,
      });
    }

  } catch (error) {
    console.error("Profile preview error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve profile information",
    });
  }
});

/**
 * Complete profile claiming process (requires authentication)
 * POST /api/vendor-claiming/complete
 */
router.post('/complete', claimingLimiter, isAuthenticated, async (req: any, res) => {
  try {
    const { token } = claimTokenSchema.parse(req.body);
    const userId = req.user.claims.sub;
    
    const result = await vendorClaimingService.verifyClaimToken(token, userId);
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        vendorProfile: result.vendorProfile,
        requiresAdditionalVerification: result.requiresAdditionalVerification,
        verificationSteps: result.verificationSteps,
      });
    } else {
      res.status(400).json({
        success: false,
        message: result.message,
      });
    }

  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: "Invalid claim token",
        errors: error.errors,
      });
    }

    console.error("Profile claim completion error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to complete profile claim",
    });
  }
});

/**
 * Get claiming statistics (admin only - for now just return basic stats)
 * GET /api/vendor-claiming/stats
 */
router.get('/stats', searchLimiter, async (req, res) => {
  try {
    const stats = await vendorClaimingService.getClaimingStats();
    
    res.json({
      success: true,
      stats,
    });

  } catch (error) {
    console.error("Claiming stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve claiming statistics",
    });
  }
});

export default router;