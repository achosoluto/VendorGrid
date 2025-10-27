import {
  users,
  vendorProfiles,
  auditLogs,
  accessLogs,
  dataProvenance,
  claimTokens,
  verificationRequests,
  type User,
  type UpsertUser,
  type VendorProfile,
  type InsertVendorProfile,
  type UpdateVendorProfile,
  type AuditLog,
  type InsertAuditLog,
  type AccessLog,
  type InsertAccessLog,
  type DataProvenance,
  type InsertDataProvenance,
  type ClaimToken,
  type InsertClaimToken,
  type VerificationRequest,
  type InsertVerificationRequest,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, or, ilike, and } from "drizzle-orm";
import { encrypt, decrypt } from "./encryption";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Vendor profile operations
  getVendorProfileByUserId(userId: string): Promise<VendorProfile | undefined>;
  getVendorProfileById(id: string): Promise<VendorProfile | undefined>;
  getVendorProfileByTaxId(taxId: string): Promise<VendorProfile | undefined>;
  createVendorProfile(profile: InsertVendorProfile): Promise<VendorProfile>;
  updateVendorProfile(id: string, profile: UpdateVendorProfile): Promise<VendorProfile>;
  
  // Audit log operations
  createAuditLog(log: InsertAuditLog): Promise<AuditLog>;
  getAuditLogsByVendorId(vendorId: string): Promise<AuditLog[]>;
  
  // Access log operations
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  getAccessLogsByVendorId(vendorId: string): Promise<AccessLog[]>;
  
  // Data provenance operations
  createDataProvenance(provenance: InsertDataProvenance): Promise<DataProvenance>;
  getProvenanceByVendorId(vendorId: string): Promise<DataProvenance[]>;
  
  // Vendor claiming operations
  createClaimToken(tokenData: InsertClaimToken): Promise<ClaimToken>;
  getClaimTokenByToken(token: string): Promise<ClaimToken | undefined>;
  getClaimTokensByVendorId(vendorId: string): Promise<ClaimToken[]>;
  updateClaimToken(id: string, data: Partial<ClaimToken>): Promise<ClaimToken>;
  searchVendorProfiles(query: { companyName?: string; taxId?: string; businessNumber?: string; email?: string }): Promise<VendorProfile[]>;
  
  // Verification operations
  createVerificationRequest(request: InsertVerificationRequest): Promise<VerificationRequest>;
  getVerificationRequestsByVendorId(vendorId: string): Promise<VerificationRequest[]>;
  updateVerificationRequest(id: string, data: Partial<VerificationRequest>): Promise<VerificationRequest>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  // Vendor profile operations
  async getVendorProfileByUserId(userId: string): Promise<VendorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(vendorProfiles)
      .where(eq(vendorProfiles.userId, userId));
    
    if (profile) {
      // Decrypt sensitive fields
      return {
        ...profile,
        accountNumberEncrypted: profile.accountNumberEncrypted 
          ? decrypt(profile.accountNumberEncrypted) 
          : null,
        routingNumberEncrypted: profile.routingNumberEncrypted 
          ? decrypt(profile.routingNumberEncrypted) 
          : null,
      };
    }
    return undefined;
  }

  async getVendorProfileById(id: string): Promise<VendorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(vendorProfiles)
      .where(eq(vendorProfiles.id, id));
    
    if (profile) {
      // Decrypt sensitive fields
      return {
        ...profile,
        accountNumberEncrypted: profile.accountNumberEncrypted 
          ? decrypt(profile.accountNumberEncrypted) 
          : null,
        routingNumberEncrypted: profile.routingNumberEncrypted 
          ? decrypt(profile.routingNumberEncrypted) 
          : null,
      };
    }
    return undefined;
  }

  async createVendorProfile(profileData: InsertVendorProfile): Promise<VendorProfile> {
    // Encrypt sensitive fields
    const encryptedProfile = {
      ...profileData,
      accountNumberEncrypted: profileData.accountNumberEncrypted 
        ? encrypt(profileData.accountNumberEncrypted) 
        : null,
      routingNumberEncrypted: profileData.routingNumberEncrypted 
        ? encrypt(profileData.routingNumberEncrypted) 
        : null,
    };

    const [profile] = await db
      .insert(vendorProfiles)
      .values(encryptedProfile)
      .returning();
    
    // Return with decrypted fields
    return {
      ...profile,
      accountNumberEncrypted: profileData.accountNumberEncrypted || null,
      routingNumberEncrypted: profileData.routingNumberEncrypted || null,
    };
  }

  async updateVendorProfile(id: string, profileData: UpdateVendorProfile): Promise<VendorProfile> {
    // Encrypt sensitive fields if provided
    const dataToUpdate: any = { ...profileData };
    
    if (profileData.accountNumberEncrypted !== undefined) {
      dataToUpdate.accountNumberEncrypted = profileData.accountNumberEncrypted 
        ? encrypt(profileData.accountNumberEncrypted) 
        : null;
    }
    
    if (profileData.routingNumberEncrypted !== undefined) {
      dataToUpdate.routingNumberEncrypted = profileData.routingNumberEncrypted 
        ? encrypt(profileData.routingNumberEncrypted) 
        : null;
    }

    dataToUpdate.updatedAt = new Date();

    const [profile] = await db
      .update(vendorProfiles)
      .set(dataToUpdate)
      .where(eq(vendorProfiles.id, id))
      .returning();
    
    // Return with decrypted fields
    return {
      ...profile,
      accountNumberEncrypted: profile.accountNumberEncrypted 
        ? decrypt(profile.accountNumberEncrypted) 
        : null,
      routingNumberEncrypted: profile.routingNumberEncrypted 
        ? decrypt(profile.routingNumberEncrypted) 
        : null,
    };
  }

  // Audit log operations
  async createAuditLog(logData: InsertAuditLog): Promise<AuditLog> {
    const [log] = await db
      .insert(auditLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getAuditLogsByVendorId(vendorId: string): Promise<AuditLog[]> {
    return await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.vendorProfileId, vendorId))
      .orderBy(desc(auditLogs.timestamp));
  }

  // Access log operations
  async createAccessLog(logData: InsertAccessLog): Promise<AccessLog> {
    const [log] = await db
      .insert(accessLogs)
      .values(logData)
      .returning();
    return log;
  }

  async getAccessLogsByVendorId(vendorId: string): Promise<AccessLog[]> {
    return await db
      .select()
      .from(accessLogs)
      .where(eq(accessLogs.vendorProfileId, vendorId))
      .orderBy(desc(accessLogs.timestamp));
  }

  // Data provenance operations
  async createDataProvenance(provenanceData: InsertDataProvenance): Promise<DataProvenance> {
    const [provenance] = await db
      .insert(dataProvenance)
      .values(provenanceData)
      .returning();
    return provenance;
  }

  async getProvenanceByVendorId(vendorId: string): Promise<DataProvenance[]> {
    return await db
      .select()
      .from(dataProvenance)
      .where(eq(dataProvenance.vendorProfileId, vendorId));
  }

  async getVendorProfileByTaxId(taxId: string): Promise<VendorProfile | undefined> {
    const [profile] = await db
      .select()
      .from(vendorProfiles)
      .where(eq(vendorProfiles.taxId, taxId));
    
    if (profile) {
      // Decrypt sensitive fields
      return {
        ...profile,
        accountNumberEncrypted: profile.accountNumberEncrypted 
          ? decrypt(profile.accountNumberEncrypted) 
          : null,
        routingNumberEncrypted: profile.routingNumberEncrypted 
          ? decrypt(profile.routingNumberEncrypted) 
          : null,
      };
    }
    return undefined;
  }

  // Vendor claiming operations
  async createClaimToken(tokenData: InsertClaimToken): Promise<ClaimToken> {
    const [token] = await db
      .insert(claimTokens)
      .values(tokenData)
      .returning();
    return token;
  }

  async getClaimTokenByToken(token: string): Promise<ClaimToken | undefined> {
    const [claimToken] = await db
      .select()
      .from(claimTokens)
      .where(eq(claimTokens.token, token));
    return claimToken;
  }

  async getClaimTokensByVendorId(vendorId: string): Promise<ClaimToken[]> {
    return await db
      .select()
      .from(claimTokens)
      .where(eq(claimTokens.vendorProfileId, vendorId))
      .orderBy(desc(claimTokens.createdAt));
  }

  async updateClaimToken(id: string, data: Partial<ClaimToken>): Promise<ClaimToken> {
    const [token] = await db
      .update(claimTokens)
      .set(data)
      .where(eq(claimTokens.id, id))
      .returning();
    return token;
  }

  async searchVendorProfiles(query: {
    companyName?: string;
    taxId?: string;
    businessNumber?: string;
    email?: string;
  }): Promise<VendorProfile[]> {
    const conditions = [];
    
    if (query.companyName) {
      conditions.push(ilike(vendorProfiles.companyName, `%${query.companyName}%`));
    }
    
    if (query.taxId) {
      conditions.push(eq(vendorProfiles.taxId, query.taxId));
    }
    
    if (query.businessNumber) {
      conditions.push(eq(vendorProfiles.businessNumber, query.businessNumber));
    }
    
    if (query.email) {
      conditions.push(ilike(vendorProfiles.email, `%${query.email}%`));
    }
    
    if (conditions.length === 0) {
      return [];
    }
    
    const profiles = await db
      .select()
      .from(vendorProfiles)
      .where(or(...conditions))
      .limit(50); // Reasonable limit for search results
    
    // Don't decrypt sensitive fields for search results
    return profiles;
  }

  // Verification operations
  async createVerificationRequest(requestData: InsertVerificationRequest): Promise<VerificationRequest> {
    const [request] = await db
      .insert(verificationRequests)
      .values(requestData)
      .returning();
    return request;
  }

  async getVerificationRequestsByVendorId(vendorId: string): Promise<VerificationRequest[]> {
    return await db
      .select()
      .from(verificationRequests)
      .where(eq(verificationRequests.vendorProfileId, vendorId))
      .orderBy(desc(verificationRequests.createdAt));
  }

  async updateVerificationRequest(id: string, data: Partial<VerificationRequest>): Promise<VerificationRequest> {
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };
    
    const [request] = await db
      .update(verificationRequests)
      .set(updateData)
      .where(eq(verificationRequests.id, id))
      .returning();
    return request;
  }
}

export const storage = new DatabaseStorage();
