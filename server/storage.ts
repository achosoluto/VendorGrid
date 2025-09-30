import {
  users,
  vendorProfiles,
  auditLogs,
  accessLogs,
  dataProvenance,
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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { encrypt, decrypt } from "./encryption";

export interface IStorage {
  // User operations (required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // Vendor profile operations
  getVendorProfileByUserId(userId: string): Promise<VendorProfile | undefined>;
  getVendorProfileById(id: string): Promise<VendorProfile | undefined>;
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
}

export const storage = new DatabaseStorage();
