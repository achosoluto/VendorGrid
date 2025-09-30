import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertVendorProfileSchema, updateVendorProfileSchema } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Get vendor profile for logged-in user
  app.get('/api/vendor-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const profile = await storage.getVendorProfileByUserId(userId);
      
      // Return null profile instead of 404 so client can handle gracefully
      res.json({ profile: profile || null });
    } catch (error) {
      console.error("Error fetching vendor profile:", error);
      res.status(500).json({ message: "Failed to fetch vendor profile" });
    }
  });

  // Create vendor profile
  app.post('/api/vendor-profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      // Check if profile already exists
      const existingProfile = await storage.getVendorProfileByUserId(userId);
      if (existingProfile) {
        return res.status(400).json({ message: "Vendor profile already exists" });
      }

      // Validate request body
      const validatedData = insertVendorProfileSchema.parse({
        ...req.body,
        userId,
      });

      // Create profile
      const profile = await storage.createVendorProfile(validatedData);

      // Create audit log
      await storage.createAuditLog({
        vendorProfileId: profile.id,
        action: 'claimed vendor profile',
        actorId: userId,
        actorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown User',
        immutable: true,
      });

      // Create initial data provenance entries
      const provenanceEntries = [
        { fieldName: 'companyName', source: 'Manual Entry', method: 'Vendor Submitted' },
        { fieldName: 'taxId', source: 'Manual Entry', method: 'Vendor Submitted' },
        { fieldName: 'address', source: 'Manual Entry', method: 'Vendor Submitted' },
        { fieldName: 'phone', source: 'Manual Entry', method: 'Vendor Submitted' },
        { fieldName: 'email', source: 'Manual Entry', method: 'Vendor Submitted' },
      ];

      for (const entry of provenanceEntries) {
        await storage.createDataProvenance({
          vendorProfileId: profile.id,
          ...entry,
        });
      }

      res.json(profile);
    } catch (error: any) {
      console.error("Error creating vendor profile:", error);
      res.status(400).json({ message: error.message || "Failed to create vendor profile" });
    }
  });

  // Update vendor profile
  app.patch('/api/vendor-profile/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);

      // Verify ownership
      const existingProfile = await storage.getVendorProfileById(id);
      if (!existingProfile || existingProfile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      // Validate request body
      const validatedData = updateVendorProfileSchema.parse(req.body);

      // Update profile
      const updatedProfile = await storage.updateVendorProfile(id, validatedData);

      // Create audit logs for each changed field
      const actorName = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Unknown User';
      const changedFields = Object.keys(validatedData);
      
      for (const field of changedFields) {
        const oldValue = (existingProfile as any)[field];
        const newValue = (validatedData as any)[field];
        
        if (oldValue !== newValue) {
          await storage.createAuditLog({
            vendorProfileId: id,
            action: `updated ${field}`,
            actorId: userId,
            actorName,
            fieldChanged: field,
            oldValue: String(oldValue || ''),
            newValue: String(newValue || ''),
            immutable: true,
          });

          // Update provenance for changed field
          await storage.createDataProvenance({
            vendorProfileId: id,
            fieldName: field,
            source: 'Manual Update',
            method: 'Vendor Modified',
          });
        }
      }

      res.json(updatedProfile);
    } catch (error: any) {
      console.error("Error updating vendor profile:", error);
      res.status(400).json({ message: error.message || "Failed to update vendor profile" });
    }
  });

  // Get audit logs for vendor profile
  app.get('/api/vendor-profile/:id/audit-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const profile = await storage.getVendorProfileById(id);
      if (!profile || profile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const logs = await storage.getAuditLogsByVendorId(id);
      
      // Format timestamps
      const formattedLogs = logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
        timeAgo: formatDistanceToNow(log.timestamp, { addSuffix: true }),
      }));

      res.json(formattedLogs);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
      res.status(500).json({ message: "Failed to fetch audit logs" });
    }
  });

  // Get access logs for vendor profile
  app.get('/api/vendor-profile/:id/access-logs', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const profile = await storage.getVendorProfileById(id);
      if (!profile || profile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const logs = await storage.getAccessLogsByVendorId(id);
      
      // Format timestamps
      const formattedLogs = logs.map(log => ({
        ...log,
        timestamp: log.timestamp.toISOString(),
        timeAgo: formatDistanceToNow(log.timestamp, { addSuffix: true }),
      }));

      res.json(formattedLogs);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  // Get data provenance for vendor profile
  app.get('/api/vendor-profile/:id/provenance', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.claims.sub;

      // Verify ownership
      const profile = await storage.getVendorProfileById(id);
      if (!profile || profile.userId !== userId) {
        return res.status(403).json({ message: "Unauthorized" });
      }

      const provenance = await storage.getProvenanceByVendorId(id);
      
      // Format timestamps and group by field
      const provenanceMap = new Map();
      for (const entry of provenance) {
        const existing = provenanceMap.get(entry.fieldName);
        if (!existing || entry.timestamp > existing.timestamp) {
          provenanceMap.set(entry.fieldName, {
            ...entry,
            timestamp: entry.timestamp.toISOString(),
            timeAgo: formatDistanceToNow(entry.timestamp, { addSuffix: true }),
          });
        }
      }

      res.json(Array.from(provenanceMap.values()));
    } catch (error) {
      console.error("Error fetching provenance:", error);
      res.status(500).json({ message: "Failed to fetch provenance" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
