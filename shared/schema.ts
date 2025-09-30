import { sql } from 'drizzle-orm';
import { relations } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  varchar,
  boolean,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table (required for Replit Auth)
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table (required for Replit Auth)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Vendor profiles table
export const vendorProfiles = pgTable("vendor_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  companyName: text("company_name").notNull(),
  taxId: text("tax_id").notNull().unique(),
  address: text("address").notNull(),
  city: text("city").notNull(),
  state: text("state").notNull(),
  zipCode: text("zip_code").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  website: text("website"),
  bankName: text("bank_name"),
  accountNumberEncrypted: text("account_number_encrypted"),
  routingNumberEncrypted: text("routing_number_encrypted"),
  verificationStatus: varchar("verification_status", { length: 20 }).notNull().default('unverified'),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Audit log table (immutable)
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorProfileId: varchar("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  action: text("action").notNull(),
  actorId: varchar("actor_id").notNull(),
  actorName: text("actor_name").notNull(),
  fieldChanged: text("field_changed"),
  oldValue: text("old_value"),
  newValue: text("new_value"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
  immutable: boolean("immutable").notNull().default(true),
});

// Access log table
export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorProfileId: varchar("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  accessorId: varchar("accessor_id").notNull(),
  accessorName: text("accessor_name").notNull(),
  accessorCompany: text("accessor_company").notNull(),
  action: text("action").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

// Data provenance table
export const dataProvenance = pgTable("data_provenance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  vendorProfileId: varchar("vendor_profile_id").notNull().references(() => vendorProfiles.id, { onDelete: 'cascade' }),
  fieldName: text("field_name").notNull(),
  source: text("source").notNull(),
  method: text("method").notNull(),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
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

// Zod schemas
export const insertVendorProfileSchema = createInsertSchema(vendorProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  verificationStatus: true,
});

export const updateVendorProfileSchema = insertVendorProfileSchema.omit({ userId: true }).partial();

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  timestamp: true,
});

export const insertDataProvenanceSchema = createInsertSchema(dataProvenance).omit({
  id: true,
  timestamp: true,
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
