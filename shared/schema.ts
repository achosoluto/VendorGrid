import { relations, sql } from 'drizzle-orm';
import {
  index,
  integer,
  sqliteTable,
  text,
  boolean,
} from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = sqliteTable(
  "sessions",
  {
    sid: text("sid").primaryKey(),
    sess: text("sess", { mode: 'json' }).notNull(),
    expire: integer("expire", { mode: 'timestamp' }).notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // No default for SQLite compatibility - generate in app layer
  email: text("email").unique(),
  firstName: text("first_name"),
  lastName: text("last_name"),
  profileImageUrl: text("profile_image_url"),
  createdAt: integer("created_at", { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).defaultNow(),
});

// Vendor profiles table
export const vendorProfiles = sqliteTable("vendor_profiles", {
  id: text("id").primaryKey(), // No default for SQLite compatibility - generate in app layer
  userId: text("user_id").references(() => users.id, { onDelete: 'cascade' }), // Made optional for data ingestion
  companyName: text("company_name").notNull(),
  
  // Tax/Business Identifiers
  taxId: text("tax_id").notNull().unique(), // Primary tax ID (can be US EIN or Canadian BN)
  businessNumber: text("business_number"), // Canadian Business Number (9 digits)
  gstHstNumber: text("gst_hst_number"), // Canadian GST/HST registration number
  
  // Address Information
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(), // Can be US state or Canadian province
  zipCode: text("zip_code").notNull(), // Can be US ZIP or Canadian postal code
  country: text("country").notNull().default('CA'), // Country code (CA for Canada, US for United States)
  
  // Contact Information
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  
  // Business Information
  legalStructure: text("legal_structure"), // Corporation, Partnership, etc.
  industryCode: text("industry_code"), // NAICS code
  industryDescription: text("industry_description"),
  
  // Banking Information (encrypted)
  bankName: text("bank_name"),
  accountNumberEncrypted: text("account_number_encrypted"),
  routingNumberEncrypted: text("routing_number_encrypted"), // US routing or Canadian transit number
  
  // Status and Metadata
  verificationStatus: text("verification_status").notNull().default('unverified'),
  dataSource: text("data_source").default('manual'), // manual, government_registry, api_import, etc.
  isActive: integer("is_active", { mode: 'boolean' }).notNull().default(true),
  
  // Timestamps
  createdAt: integer("created_at", { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).defaultNow(),
});

// Audit log table (immutable)
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(), // No default for SQLite compatibility - generate in app layer
  vendorProfileId: text("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  action: text("action").notNull(),
  actorId: text("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  fieldChanged: text("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: integer("timestamp", { mode: 'timestamp' }).notNull().defaultNow(),
  immutable: integer("immutable", { mode: 'boolean' }).notNull().default(true),
});

// Access log table
export const accessLogs = sqliteTable("access_logs", {
  id: text("id").primaryKey(), // No default for SQLite compatibility - generate in app layer
  vendorProfileId: text("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  accessorId: text("accessor_id").notNull(),
  accessorName: text("accessor_name").notNull(),
  accessorCompany: text("accessor_company").notNull(),
  action: text("action").notNull(),
  timestamp: integer("timestamp", { mode: 'timestamp' }).notNull().defaultNow(),
});

// Data provenance table
export const dataProvenance = sqliteTable("data_provenance", {
  id: text("id").primaryKey(), // No default for SQLite compatibility - generate in app layer
  vendorProfileId: text("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  fieldName: text("field_name").notNull(),
  source: text("source").notNull(),
  method: text("method").notNull(),
  timestamp: integer("timestamp", { mode: 'timestamp' }).notNull().defaultNow(),
});

// Vendor claim tokens for secure profile claiming
export const claimTokens = sqliteTable("claim_tokens", {
  id: text("id").primaryKey(), // No default for SQLite compatibility - generate in app layer
  vendorProfileId: text("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  token: text("token").notNull().unique(),
  email: text("email").notNull(),
  expiresAt: integer("expires_at", { mode: 'timestamp' }).notNull(),
  claimedAt: integer("claimed_at", { mode: 'timestamp' }),
  claimedByUserId: text("claimed_by_user_id").references(() => users.id),
  attempts: integer("attempts").notNull().default(0),
  maxAttempts: integer("max_attempts").notNull().default(3),
  createdAt: integer("created_at", { mode: 'timestamp' }).defaultNow(),
});

// Vendor verification requests and status tracking
export const verificationRequests = sqliteTable("verification_requests", {
  id: text("id").primaryKey(), // No default for SQLite compatibility - generate in app layer
  vendorProfileId: text("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  requestType: text("request_type").notNull(), // email, phone, address, tax_id, etc.
  status: text("status").notNull().default('pending'), // pending, in_progress, verified, failed
  verificationMethod: text("verification_method"), // email_token, sms_code, ai_agent, manual_review
  verificationData: text("verification_data", { mode: 'json' }), // Flexible storage for verification details
  verifiedAt: integer("verified_at", { mode: 'timestamp' }),
  failureReason: text("failure_reason"),
  retryCount: integer("retry_count").notNull().default(0),
  maxRetries: integer("max_retries").notNull().default(3),
  createdAt: integer("created_at", { mode: 'timestamp' }).defaultNow(),
  updatedAt: integer("updated_at", { mode: 'timestamp' }).defaultNow(),
});

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [users.id],
    references: [vendorProfiles.userId],
  }),
}));

export const vendorProfilesRelations = relations(vendorProfiles, ({ one, many }) => ({
  user: one(users, {
    fields: [vendorProfiles.userId],
    references: [users.id],
  }),
  auditLogs: many(auditLogs),
  accessLogs: many(accessLogs),
  provenance: many(dataProvenance),
  claimTokens: many(claimTokens),
  verificationRequests: many(verificationRequests),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [auditLogs.vendorProfileId],
    references: [vendorProfiles.id],
  }),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [accessLogs.vendorProfileId],
    references: [vendorProfiles.id],
  }),
}));

export const dataProvenanceRelations = relations(dataProvenance, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [dataProvenance.vendorProfileId],
    references: [vendorProfiles.id],
  }),
}));

export const claimTokensRelations = relations(claimTokens, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [claimTokens.vendorProfileId],
    references: [vendorProfiles.id],
  }),
  claimedByUser: one(users, {
    fields: [claimTokens.claimedByUserId],
    references: [users.id],
  }),
}));

export const verificationRequestsRelations = relations(verificationRequests, ({ one }) => ({
  vendorProfile: one(vendorProfiles, {
    fields: [verificationRequests.vendorProfileId],
    references: [vendorProfiles.id],
  }),
}));

// Zod schemas
export const insertVendorProfileSchema = createInsertSchema(vendorProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verificationStatus: true,
  dataSource: true,
}).extend({
  // Custom validation for Canadian postal codes and business numbers
  zipCode: z.string().refine((val) => {
    // Accept both US ZIP (12345 or 12345-6789) and Canadian postal code (A1A 1A1)
    const usZip = /^\d{5}(-\d{4})?$/;
    const canadianPostal = /^[A-Za-z]\d[A-Za-z] \d[A-Za-z]\d$/;
    return usZip.test(val) || canadianPostal.test(val);
  }, "Invalid postal/ZIP code format"),
  businessNumber: z.string().optional().refine((val) => {
    // Canadian Business Number should be 9 digits
    return !val || /^\d{9}$/.test(val);
  }, "Business Number must be 9 digits"),
  country: z.enum(['CA', 'US']).default('CA'),
});

export const updateVendorProfileSchema = insertVendorProfileSchema.omit({ userId: true }).partial();

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  integer: true,
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  integer: true,
});

export const insertDataProvenanceSchema = createInsertSchema(dataProvenance).omit({
  id: true,
  integer: true,
});

export const insertClaimTokenSchema = createInsertSchema(claimTokens).omit({
  id: true,
  createdAt: true,
});

export const insertVerificationRequestSchema = createInsertSchema(verificationRequests).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type VendorProfile = typeof vendorProfiles.$inferSelect;
export type InsertVendorProfile = z.infer<typeof insertVendorProfileSchema>;
export type UpdateVendorProfile = z.infer<typeof updateVendorProfileSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;
export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type DataProvenance = typeof dataProvenance.$inferSelect;
export type InsertDataProvenance = z.infer<typeof insertDataProvenanceSchema>;
export type ClaimToken = typeof claimTokens.$inferSelect;
export type InsertClaimToken = z.infer<typeof insertClaimTokenSchema>;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type InsertVerificationRequest = z.infer<typeof insertVerificationRequestSchema>;
