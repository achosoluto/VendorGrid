import { storage } from '../storage';
import { createHash, randomBytes } from 'crypto';
import type { VendorProfile, InsertClaimToken, InsertVerificationRequest, ClaimToken } from '@shared/schema';

export interface ClaimRequest {
  vendorProfileId: string;
  email: string;
  contactName?: string;
  reason?: string;
}

export interface ClaimVerificationResult {
  success: boolean;
  message: string;
  vendorProfile?: VendorProfile;
  requiresAdditionalVerification?: boolean;
  verificationSteps?: string[];
}

/**
 * VendorClaimingService
 * 
 * Handles the secure vendor profile claiming process:
 * 1. Profile discovery and search
 * 2. Email-based claiming workflow  
 * 3. Claim validation and verification
 * 4. Profile ownership transfer
 * 5. Automated verification workflows
 */
export class VendorClaimingService {
  private readonly TOKEN_EXPIRY_HOURS = 24;
  private readonly MAX_CLAIM_ATTEMPTS = 3;

  /**
   * Search for claimable vendor profiles
   */
  async searchVendorProfiles(query: {
    companyName?: string;
    taxId?: string;
    businessNumber?: string;
    email?: string;
  }): Promise<VendorProfile[]> {
    // Only return profiles that are not already claimed (userId is null)
    const allProfiles = await storage.searchVendorProfiles(query);
    return allProfiles.filter(profile => profile.userId === null);
  }

  /**
   * Initiate the claiming process for a vendor profile
   */
  async initiateProfileClaim(request: ClaimRequest): Promise<{
    success: boolean;
    message: string;
    tokenId?: string;
    expiresAt?: Date;
  }> {
    try {
      // Verify the profile exists and is unclaimed
      const profile = await storage.getVendorProfileById(request.vendorProfileId);
      if (!profile) {
        return { success: false, message: 'Vendor profile not found' };
      }

      if (profile.userId !== null) {
        return { success: false, message: 'This profile has already been claimed' };
      }

      // Check for existing active claim tokens
      const existingTokens = await storage.getClaimTokensByVendorId(request.vendorProfileId);
      const activeTokens = existingTokens.filter(token => 
        token.expiresAt > new Date() && 
        token.claimedAt === null &&
        token.attempts < token.maxAttempts
      );

      if (activeTokens.length > 0) {
        return { 
          success: false, 
          message: 'A claim request is already pending for this profile. Please check your email or wait for it to expire.' 
        };
      }

      // Generate secure claiming token
      const token = this.generateSecureToken();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

      const claimTokenData: InsertClaimToken = {
        vendorProfileId: request.vendorProfileId,
        token,
        email: request.email,
        expiresAt,
        claimedAt: null,
        claimedByUserId: null,
        attempts: 0,
        maxAttempts: this.MAX_CLAIM_ATTEMPTS,
      };

      const claimToken = await storage.createClaimToken(claimTokenData);

      // TODO: Send claim email with token (will implement email service next)
      await this.sendClaimEmail(profile, request.email, token);

      // Create audit log
      await storage.createAuditLog({
        vendorProfileId: request.vendorProfileId,
        action: 'claim_initiated',
        actorId: 'system',
        actorName: 'VendorGrid Claiming System',
        fieldChanged: 'claiming_status',
        oldValue: 'unclaimed',
        newValue: 'claim_pending',
        immutable: true,
      });

      return {
        success: true,
        message: `Claim verification email sent to ${request.email}. Please check your email and follow the instructions to complete the claim.`,
        tokenId: claimToken.id,
        expiresAt: claimToken.expiresAt,
      };

    } catch (error) {
      console.error('Error initiating profile claim:', error);
      return { 
        success: false, 
        message: 'Failed to initiate claim process. Please try again later.' 
      };
    }
  }

  /**
   * Verify a claim token and complete the claiming process
   */
  async verifyClaimToken(token: string, userId: string): Promise<ClaimVerificationResult> {
    try {
      const claimToken = await storage.getClaimTokenByToken(token);
      
      if (!claimToken) {
        return { success: false, message: 'Invalid or expired claim token' };
      }

      // Check if token is expired
      if (claimToken.expiresAt < new Date()) {
        return { success: false, message: 'Claim token has expired. Please request a new one.' };
      }

      // Check if already claimed
      if (claimToken.claimedAt !== null) {
        return { success: false, message: 'This profile has already been claimed.' };
      }

      // Check attempt limits
      if (claimToken.attempts >= claimToken.maxAttempts) {
        return { success: false, message: 'Maximum claim attempts exceeded. Please request a new claim token.' };
      }

      // Get the vendor profile
      const vendorProfile = await storage.getVendorProfileById(claimToken.vendorProfileId);
      if (!vendorProfile) {
        return { success: false, message: 'Vendor profile not found' };
      }

      // Check if profile was claimed by someone else in the meantime
      if (vendorProfile.userId !== null) {
        return { success: false, message: 'This profile has been claimed by another user.' };
      }

      // Update claim token as used
      await storage.updateClaimToken(claimToken.id, {
        claimedAt: new Date(),
        claimedByUserId: userId,
        attempts: claimToken.attempts + 1,
      });

      // Transfer ownership of the profile to the user
      const updatedProfile = await storage.updateVendorProfile(claimToken.vendorProfileId, {
        userId: userId,
        verificationStatus: 'email_verified', // Initial verification level
      });

      // Create audit log for successful claim
      await storage.createAuditLog({
        vendorProfileId: claimToken.vendorProfileId,
        action: 'profile_claimed',
        actorId: userId,
        actorName: 'Vendor User',
        fieldChanged: 'userId',
        oldValue: 'null',
        newValue: userId,
        immutable: true,
      });

      // Start automated verification workflow
      await this.initiateVerificationWorkflow(updatedProfile);

      const verificationSteps = this.getNextVerificationSteps(updatedProfile);

      return {
        success: true,
        message: 'Profile successfully claimed! You can now manage your business information.',
        vendorProfile: updatedProfile,
        requiresAdditionalVerification: verificationSteps.length > 0,
        verificationSteps,
      };

    } catch (error) {
      console.error('Error verifying claim token:', error);
      return { 
        success: false, 
        message: 'Failed to verify claim token. Please try again.' 
      };
    }
  }

  /**
   * Get vendor profile by claim token (for preview before claiming)
   */
  async getProfileByClaimToken(token: string): Promise<{
    success: boolean;
    vendorProfile?: VendorProfile;
    message?: string;
  }> {
    try {
      const claimToken = await storage.getClaimTokenByToken(token);
      
      if (!claimToken || claimToken.expiresAt < new Date()) {
        return { success: false, message: 'Invalid or expired claim token' };
      }

      const vendorProfile = await storage.getVendorProfileById(claimToken.vendorProfileId);
      
      if (!vendorProfile) {
        return { success: false, message: 'Vendor profile not found' };
      }

      // Don't return sensitive information for preview
      const safeProfile = {
        ...vendorProfile,
        accountNumberEncrypted: null,
        routingNumberEncrypted: null,
      };

      return { success: true, vendorProfile: safeProfile };

    } catch (error) {
      console.error('Error getting profile by claim token:', error);
      return { success: false, message: 'Failed to retrieve profile information' };
    }
  }

  /**
   * Generate a secure claim token
   */
  private generateSecureToken(): string {
    const randomData = randomBytes(32);
    const timestamp = Date.now().toString();
    const combined = Buffer.concat([randomData, Buffer.from(timestamp)]);
    return createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Send claim verification email (placeholder for email service)
   */
  private async sendClaimEmail(profile: VendorProfile, email: string, token: string): Promise<void> {
    // TODO: Integrate with email service (SendGrid, AWS SES, etc.)
    console.log(`📧 DEMO: Claim email would be sent to ${email}`);
    console.log(`🔗 Claim URL: http://localhost:3000/claim/${token}`);
    console.log(`🏢 Profile: ${profile.companyName} (${profile.taxId})`);
    
    // For development, we'll log the token so it can be tested
    console.log(`🔑 Claim Token (DEV): ${token}`);
  }

  /**
   * Initiate automated verification workflow for claimed profile
   */
  private async initiateVerificationWorkflow(profile: VendorProfile): Promise<void> {
    const verificationRequests: InsertVerificationRequest[] = [
      {
        vendorProfileId: profile.id,
        requestType: 'tax_id_verification',
        status: 'pending',
        verificationMethod: 'ai_agent',
        verificationData: { taxId: profile.taxId },
        retryCount: 0,
        maxRetries: 3,
      },
      {
        vendorProfileId: profile.id,
        requestType: 'business_email_verification',
        status: 'pending',
        verificationMethod: 'email_domain_check',
        verificationData: { email: profile.email },
        retryCount: 0,
        maxRetries: 2,
      },
    ];

    // Only add address verification if we have complete address data
    if (profile.address && profile.city && profile.zipCode) {
      verificationRequests.push({
        vendorProfileId: profile.id,
        requestType: 'address_verification',
        status: 'pending',
        verificationMethod: 'canada_post_api',
        verificationData: { 
          address: profile.address, 
          city: profile.city, 
          province: profile.state, 
          postalCode: profile.zipCode 
        },
        retryCount: 0,
        maxRetries: 2,
      });
    }

    // Create verification requests
    for (const request of verificationRequests) {
      await storage.createVerificationRequest(request);
    }
  }

  /**
   * Get next verification steps for a vendor profile
   */
  private getNextVerificationSteps(profile: VendorProfile): string[] {
    const steps: string[] = [];

    if (profile.verificationStatus === 'email_verified') {
      steps.push('Tax ID verification is in progress');
      steps.push('Business email domain verification is being checked');
      
      if (profile.address) {
        steps.push('Address verification will be performed automatically');
      } else {
        steps.push('Please complete your address information for full verification');
      }
      
      if (!profile.phone) {
        steps.push('Add a business phone number to improve verification score');
      }
      
      if (!profile.website) {
        steps.push('Add your business website to enhance profile credibility');
      }
    }

    return steps;
  }

  /**
   * Get claiming statistics for admin/monitoring
   */
  async getClaimingStats(): Promise<{
    totalClaimableProfiles: number;
    activeClaimTokens: number;
    completedClaims: number;
    failedClaims: number;
  }> {
    // This would typically use more efficient database queries
    // For now, we'll implement basic functionality
    
    return {
      totalClaimableProfiles: 0, // TODO: Implement
      activeClaimTokens: 0,      // TODO: Implement  
      completedClaims: 0,        // TODO: Implement
      failedClaims: 0,           // TODO: Implement
    };
  }
}

// Export singleton instance
export const vendorClaimingService = new VendorClaimingService();