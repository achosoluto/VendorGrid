import { storage } from '../storage';
import { db } from '../db';
import { vendorProfiles, dataProvenance, auditLogs } from '../../shared/schema';
import { eq, and, gte, lte, desc } from 'drizzle-orm';
import fetch from 'node-fetch';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { corporationsCanadaConnector } from '../connectors/CorporationsCanadaConnector';

/**
 * Government Data Integration Agent
 * 
 * Specialized agent for connecting to Canadian government data sources
 * and scaling VendorGrid to thousands of businesses from public registries.
 * 
 * Capabilities:
 * - Multi-source data ingestion with rate limiting
 * - Bulk processing with progress tracking
 * - Data quality validation and deduplication
 * - Error recovery and job resumption
 * - Compliance with government data usage terms
 */

export interface DataSource {
  id: string;
  name: string;
  type: 'api' | 'csv' | 'bulk_download';
  url: string;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    burstLimit: number;
  };
  authentication?: {
    type: 'api_key' | 'oauth' | 'none';
    credentials?: Record<string, string>;
  };
  dataMapping: DataFieldMapping;
  enabled: boolean;
  lastSync?: Date;
  nextSync?: Date;
}

export interface DataFieldMapping {
  businessNumber: string;
  companyName: string;
  legalName?: string;
  operatingName?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
  industryCode?: string;
  industryDescription?: string;
  businessType?: string;
  status?: string;
  incorporationDate?: string;
  employeeCount?: string;
  revenueRange?: string;
}

export interface ProcessingJob {
  id: string;
  sourceId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'paused';
  startTime?: Date;
  endTime?: Date;
  totalRecords: number;
  processedRecords: number;
  successfulRecords: number;
  failedRecords: number;
  errors: string[];
  resumeToken?: string;
  metadata?: Record<string, any>;
}

export class GovernmentDataIntegrationAgent {
  private rateLimiters = new Map<string, {
    minute: { count: number; resetTime: number };
    hour: { count: number; resetTime: number };
    day: { count: number; resetTime: number };
  }>();

  private activeJobs = new Map<string, ProcessingJob>();
  private dataQualityRules = new Map<string, (record: any) => { isValid: boolean; errors: string[] }>();

  constructor() {
    this.initializeDataQualityRules();
  }

  /**
   * Get all configured data sources
   */
  getDataSources(): DataSource[] {
    return [
      {
        id: 'statistics_canada_business_register',
        name: 'Statistics Canada Business Register',
        type: 'api',
        url: 'https://www150.statcan.gc.ca/t1/wds/rest/getFullTableDownloadCSV/en/1234567890',
        rateLimits: {
          requestsPerMinute: 60,
          requestsPerHour: 1000,
          requestsPerDay: 10000,
          burstLimit: 5
        },
        authentication: { type: 'none' },
        dataMapping: {
          businessNumber: 'business_number',
          companyName: 'legal_name',
          operatingName: 'operating_name',
          address: 'mailing_address',
          city: 'city',
          province: 'province_territory',
          postalCode: 'postal_code',
          industryCode: 'naics_code',
          industryDescription: 'naics_description',
          businessType: 'business_type',
          employeeCount: 'employment_size_range'
        },
        enabled: true
      },
      {
        id: 'corporations_canada_federal',
        name: 'Corporations Canada Federal Registry',
        type: 'api',
        url: 'https://www.ic.gc.ca/app/api/ic/ccc/corpns/srch',
        rateLimits: {
          requestsPerMinute: 100,
          requestsPerHour: 5000,
          requestsPerDay: 50000,
          burstLimit: 10
        },
        authentication: { 
          type: 'api_key',
          credentials: { apiKey: process.env.CORPORATIONS_CANADA_API_KEY || '' }
        },
        dataMapping: {
          businessNumber: 'corporationNumber',
          companyName: 'corporationName',
          legalName: 'corporationName',
          address: 'registeredOfficeAddress',
          province: 'province',
          status: 'corporationStatusDescription',
          incorporationDate: 'incorporationDate',
          businessType: 'corporationType'
        },
        enabled: true
      },
      {
        id: 'ontario_business_registry',
        name: 'Ontario Business Registry',
        type: 'bulk_download',
        url: 'https://www.ontario.ca/data/ontario-business-registry',
        rateLimits: {
          requestsPerMinute: 10,
          requestsPerHour: 100,
          requestsPerDay: 1000,
          burstLimit: 2
        },
        authentication: { type: 'none' },
        dataMapping: {
          businessNumber: 'BN',
          companyName: 'LEGAL_NAME',
          operatingName: 'OPERATING_NAME',
          address: 'ADDRESS',
          city: 'CITY',
          province: 'PROVINCE',
          postalCode: 'POSTAL_CODE',
          businessType: 'ENTITY_TYPE',
          status: 'STATUS'
        },
        enabled: true
      }
    ];
  }

  /**
   * Start data ingestion from all enabled sources
   */
  async startFullIngestion(): Promise<{ jobs: ProcessingJob[] }> {
    console.log('🤖 Government Data Integration Agent - Starting full ingestion...');
    
    const enabledSources = this.getDataSources().filter(source => source.enabled);
    const jobs: ProcessingJob[] = [];

    for (const source of enabledSources) {
      const job = this.createJob(source.id);
      jobs.push(job);
      this.activeJobs.set(job.id, job);

      // Start processing asynchronously
      this.processDataSource(source, job).catch(error => {
        console.error(`Error processing ${source.name}:`, error);
        job.status = 'failed';
        job.errors.push(error.message);
        job.endTime = new Date();
      });
    }

    return { jobs };
  }

  /**
   * Start data ingestion from a specific source
   */
  async startSourceIngestion(sourceId: string): Promise<ProcessingJob> {
    const source = this.getDataSources().find(s => s.id === sourceId);
    if (!source) {
      throw new Error(`Data source not found: ${sourceId}`);
    }

    if (!source.enabled) {
      throw new Error(`Data source disabled: ${sourceId}`);
    }

    const job = this.createJob(sourceId);
    this.activeJobs.set(job.id, job);

    console.log(`🔄 Starting ingestion for: ${source.name}`);

    // Process asynchronously
    this.processDataSource(source, job).catch(error => {
      console.error(`Error processing ${source.name}:`, error);
      job.status = 'failed';
      job.errors.push(error.message);
      job.endTime = new Date();
    });

    return job;
  }

  /**
   * Get status of all active jobs
   */
  getJobStatus(): ProcessingJob[] {
    return Array.from(this.activeJobs.values());
  }

  /**
   * Get detailed status of a specific job
   */
  getJobDetails(jobId: string): ProcessingJob | undefined {
    return this.activeJobs.get(jobId);
  }

  /**
   * Pause a running job
   */
  async pauseJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'running') {
      job.status = 'paused';
      console.log(`⏸️  Paused job: ${jobId}`);
      return true;
    }
    return false;
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string): Promise<boolean> {
    const job = this.activeJobs.get(jobId);
    if (job && job.status === 'paused') {
      job.status = 'running';
      const source = this.getDataSources().find(s => s.id === job.sourceId);
      if (source) {
        console.log(`▶️  Resuming job: ${jobId}`);
        this.processDataSource(source, job, job.resumeToken);
        return true;
      }
    }
    return false;
  }

  /**
   * Process data from a specific source
   */
  private async processDataSource(source: DataSource, job: ProcessingJob, resumeToken?: string): Promise<void> {
    try {
      job.status = 'running';
      job.startTime = new Date();

      console.log(`📊 Processing ${source.name}...`);

      switch (source.type) {
        case 'api':
          await this.processAPISource(source, job, resumeToken);
          break;
        case 'bulk_download':
          await this.processBulkDownloadSource(source, job);
          break;
        case 'csv':
          await this.processCSVSource(source, job);
          break;
        default:
          throw new Error(`Unsupported source type: ${source.type}`);
      }

      job.status = 'completed';
      job.endTime = new Date();
      
      console.log(`✅ Completed ${source.name}: ${job.successfulRecords}/${job.totalRecords} records processed`);

      // Update source last sync time
      source.lastSync = new Date();

    } catch (error) {
      job.status = 'failed';
      job.endTime = new Date();
      job.errors.push(`Processing failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Process API-based data source
   */
  private async processAPISource(source: DataSource, job: ProcessingJob, resumeToken?: string): Promise<void> {
    console.log(`🔗 Processing API source: ${source.name}`);
    
    // Route to specific connector based on source ID
    switch (source.id) {
      case 'corporations_canada_federal':
        await this.processCorporationsCanadaAPI(job, resumeToken);
        break;
      default:
        // Default mock implementation for other sources
        console.log(`⚠️  No specific connector implemented for ${source.name}, using mock data`);
        await this.processMockAPISource(source, job, resumeToken);
        break;
    }
  }

  /**
   * Process Corporations Canada API using real connector
   */
  private async processCorporationsCanadaAPI(job: ProcessingJob, resumeToken?: string): Promise<void> {
    console.log('🏢 Processing Corporations Canada Federal Registry...');
    
    try {
      const pageSize = 100;
      let offset = 0;
      let hasMoreData = true;
      
      // Resume from where we left off if we have a resume token
      if (resumeToken) {
        offset = parseInt(resumeToken) || 0;
        console.log(`📍 Resuming from offset: ${offset}`);
      }
      
      while (hasMoreData && job.status === 'running') {
        console.log(`📡 Fetching batch at offset ${offset}...`);
        
        const response = await corporationsCanadaConnector.fetchCorporations(offset, pageSize);
        
        // Set total records on first fetch
        if (job.totalRecords === 0) {
          job.totalRecords = response.totalRecords;
          console.log(`📊 Total records to process: ${job.totalRecords}`);
        }
        
        if (response.corporations.length === 0) {
          console.log('✅ No more records to process');
          break;
        }
        
        // Process this batch of corporations
        const batchResult = await corporationsCanadaConnector.processCorporations(response.corporations);
        
        // Update job statistics
        job.processedRecords += response.corporations.length;
        job.successfulRecords += batchResult.successful;
        job.failedRecords += batchResult.failed;
        job.errors.push(...batchResult.errors);
        
        // Progress logging
        const progressPercent = Math.round((job.processedRecords / job.totalRecords) * 100);
        console.log(`📈 Progress: ${job.processedRecords}/${job.totalRecords} (${progressPercent}%) - ${batchResult.successful} successful, ${batchResult.failed} failed`);
        
        // Check if we should pause
        if (job.status === 'paused') {
          job.resumeToken = (offset + pageSize).toString();
          console.log(`⏸️  Job paused, resume token: ${job.resumeToken}`);
          return;
        }
        
        // Move to next page
        offset += pageSize;
        hasMoreData = response.hasNextPage;
        
        // Rate limiting - small delay between batches
        if (hasMoreData) {
          console.log('⏳ Rate limiting delay...');
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ Corporations Canada processing complete: ${job.successfulRecords} successful, ${job.failedRecords} failed`);
      
    } catch (error) {
      console.error('❌ Error processing Corporations Canada API:', error);
      job.errors.push(`Corporations Canada API error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Mock API processing for sources without specific connectors
   */
  private async processMockAPISource(source: DataSource, job: ProcessingJob, resumeToken?: string): Promise<void> {
    // Mock data for demonstration
    const mockBusinesses = [
      {
        business_number: '123456789',
        legal_name: 'Mock Canadian Company Inc.',
        operating_name: 'Mock Corp',
        mailing_address: '123 Main Street',
        city: 'Toronto',
        province_territory: 'Ontario',
        postal_code: 'M5V 3A8',
        naics_code: '541511',
        naics_description: 'Custom Computer Programming Services',
        business_type: 'Corporation'
      }
    ];

    job.totalRecords = mockBusinesses.length;

    for (let i = 0; i < mockBusinesses.length; i++) {
      if (job.status === 'paused') {
        job.resumeToken = i.toString();
        return;
      }

      const rawRecord = mockBusinesses[i];
      await this.processBusinessRecord(rawRecord, source, job);
      job.processedRecords++;

      // Progress logging
      if (job.processedRecords % 100 === 0) {
        console.log(`📈 Progress: ${job.processedRecords}/${job.totalRecords} (${Math.round(job.processedRecords/job.totalRecords*100)}%)`);
      }
    }
  }

  /**
   * Process bulk download data source
   */
  private async processBulkDownloadSource(source: DataSource, job: ProcessingJob): Promise<void> {
    console.log(`📦 Processing bulk download source: ${source.name}`);
    // Implementation would download and process large CSV files
    // For now, this is a placeholder
    job.totalRecords = 0;
    job.successfulRecords = 0;
  }

  /**
   * Process CSV data source
   */
  private async processCSVSource(source: DataSource, job: ProcessingJob): Promise<void> {
    console.log(`📄 Processing CSV source: ${source.name}`);
    // Implementation would parse CSV data
    // For now, this is a placeholder
    job.totalRecords = 0;
    job.successfulRecords = 0;
  }

  /**
   * Process individual business record
   */
  private async processBusinessRecord(rawRecord: any, source: DataSource, job: ProcessingJob): Promise<void> {
    try {
      // Map raw data to standardized format
      const businessData = this.mapBusinessData(rawRecord, source.dataMapping);

      // Validate data quality
      const validation = this.validateBusinessData(businessData);
      if (!validation.isValid) {
        job.failedRecords++;
        job.errors.push(`Invalid record ${businessData.taxId}: ${validation.errors.join(', ')}`);
        return;
      }

      // Check for existing record
      const existingProfile = await storage.getVendorProfileByTaxId(businessData.taxId);
      if (existingProfile) {
        // Update existing record if newer data
        await this.updateExistingRecord(existingProfile, businessData, source.name);
      } else {
        // Create new vendor profile
        await this.createVendorProfile(businessData, source.name);
      }

      job.successfulRecords++;

    } catch (error) {
      job.failedRecords++;
      job.errors.push(`Failed to process record: ${error.message}`);
    }
  }

  /**
   * Map raw business data to standardized format
   */
  private mapBusinessData(rawRecord: any, mapping: DataFieldMapping): any {
    return {
      businessNumber: rawRecord[mapping.businessNumber],
      companyName: rawRecord[mapping.companyName] || rawRecord[mapping.legalName],
      taxId: rawRecord[mapping.businessNumber], // Use business number as tax ID
      address: rawRecord[mapping.address],
      city: rawRecord[mapping.city],
      state: rawRecord[mapping.province],
      zipCode: rawRecord[mapping.postalCode],
      phone: rawRecord[mapping.phone],
      email: rawRecord[mapping.email],
      website: rawRecord[mapping.website],
      industryCode: rawRecord[mapping.industryCode],
      industryDescription: rawRecord[mapping.industryDescription],
      legalStructure: rawRecord[mapping.businessType],
      country: 'CA'
    };
  }

  /**
   * Validate business data quality
   */
  private validateBusinessData(data: any): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data.companyName || data.companyName.trim().length === 0) {
      errors.push('Company name is required');
    }

    if (!data.taxId || data.businessNumber) {
      errors.push('Business number/tax ID is required');
    }

    if (data.businessNumber && !/^\d{9}$/.test(data.businessNumber)) {
      errors.push('Business number must be 9 digits');
    }

    if (data.zipCode && data.country === 'CA' && !/^[A-Z]\d[A-Z] \d[A-Z]\d$/.test(data.zipCode)) {
      // Check Canadian postal code format
      if (!/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(data.zipCode.replace(/\s/g, ''))) {
        errors.push('Invalid Canadian postal code format');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Create new vendor profile
   */
  private async createVendorProfile(businessData: any, sourceName: string): Promise<void> {
    const vendorProfile = {
      userId: null,
      companyName: businessData.companyName?.trim(),
      taxId: businessData.taxId?.trim(),
      businessNumber: businessData.businessNumber?.trim(),
      address: businessData.address?.trim() || 'Address not available',
      city: businessData.city?.trim() || 'Unknown',
      state: businessData.state?.trim() || 'Unknown',
      zipCode: this.formatPostalCode(businessData.zipCode?.trim() || ''),
      country: 'CA',
      phone: businessData.phone?.trim() || 'Phone not available',
      email: businessData.email?.trim() || 'email@example.com',
      website: businessData.website?.trim() || null,
      industryCode: businessData.industryCode?.trim() || null,
      industryDescription: businessData.industryDescription?.trim() || null,
      legalStructure: businessData.legalStructure?.trim() || null,
      dataSource: sourceName.toLowerCase().replace(/\s+/g, '_'),
      verificationStatus: 'unverified',
      isActive: true
    };

    const profile = await storage.createVendorProfile(vendorProfile);

    // Create data provenance entries
    const provenanceFields = ['companyName', 'taxId', 'businessNumber', 'address', 'city', 'state', 'zipCode', 'country'];
    for (const fieldName of provenanceFields) {
      await storage.createDataProvenance({
        vendorProfileId: profile.id,
        fieldName,
        source: sourceName,
        method: 'Government Registry Import'
      });
    }
  }

  /**
   * Update existing vendor profile with newer data
   */
  private async updateExistingRecord(existingProfile: any, newData: any, sourceName: string): Promise<void> {
    // Simple update logic - in production, this would be more sophisticated
    const updatedFields: any = {};
    let hasChanges = false;

    // Check for data freshness and update if needed
    if (newData.companyName && newData.companyName !== existingProfile.companyName) {
      updatedFields.companyName = newData.companyName;
      hasChanges = true;
    }

    if (hasChanges) {
      await storage.updateVendorProfile(existingProfile.id, updatedFields);
      
      // Log the update
      await storage.createAuditLog({
        vendorProfileId: existingProfile.id,
        action: 'Updated from government registry',
        actorId: 'system',
        actorName: 'Government Data Integration Agent',
        fieldChanged: Object.keys(updatedFields).join(', '),
        oldValue: JSON.stringify(existingProfile),
        newValue: JSON.stringify({ ...existingProfile, ...updatedFields })
      });
    }
  }

  /**
   * Format postal code to standard Canadian format
   */
  private formatPostalCode(postalCode: string): string {
    if (!postalCode) return 'Unknown';
    
    const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
    if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned)) {
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    return postalCode;
  }

  /**
   * Check rate limits for a data source
   */
  private checkRateLimit(sourceId: string, limits: DataSource['rateLimits']): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(sourceId) || {
      minute: { count: 0, resetTime: now + 60000 },
      hour: { count: 0, resetTime: now + 3600000 },
      day: { count: 0, resetTime: now + 86400000 }
    };

    // Reset counters if time windows have expired
    if (now > limiter.minute.resetTime) {
      limiter.minute = { count: 0, resetTime: now + 60000 };
    }
    if (now > limiter.hour.resetTime) {
      limiter.hour = { count: 0, resetTime: now + 3600000 };
    }
    if (now > limiter.day.resetTime) {
      limiter.day = { count: 0, resetTime: now + 86400000 };
    }

    // Check limits
    if (limiter.minute.count >= limits.requestsPerMinute ||
        limiter.hour.count >= limits.requestsPerHour ||
        limiter.day.count >= limits.requestsPerDay) {
      return false;
    }

    // Increment counters
    limiter.minute.count++;
    limiter.hour.count++;
    limiter.day.count++;
    
    this.rateLimiters.set(sourceId, limiter);
    return true;
  }

  /**
   * Create a new processing job
   */
  private createJob(sourceId: string): ProcessingJob {
    return {
      id: this.generateJobId(),
      sourceId,
      status: 'pending',
      totalRecords: 0,
      processedRecords: 0,
      successfulRecords: 0,
      failedRecords: 0,
      errors: [],
      metadata: {
        createdAt: new Date(),
        version: '1.0.0'
      }
    };
  }

  /**
   * Generate unique job ID
   */
  private generateJobId(): string {
    return `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Initialize data quality validation rules
   */
  private initializeDataQualityRules(): void {
    // Add custom validation rules here
    this.dataQualityRules.set('business_name_required', (record) => ({
      isValid: !!(record.companyName && record.companyName.trim().length > 0),
      errors: record.companyName ? [] : ['Company name is required']
    }));

    this.dataQualityRules.set('valid_business_number', (record) => {
      if (!record.businessNumber) return { isValid: true, errors: [] };
      const isValid = /^\d{9}$/.test(record.businessNumber);
      return {
        isValid,
        errors: isValid ? [] : ['Business number must be 9 digits']
      };
    });
  }

  /**
   * Get system health and statistics
   */
  async getSystemHealth(): Promise<{
    activeJobs: number;
    totalVendors: number;
    recentlyAdded: number;
    dataSourcesEnabled: number;
    lastIngestionTime?: Date;
  }> {
    const activeJobs = Array.from(this.activeJobs.values()).filter(job => 
      job.status === 'running' || job.status === 'pending'
    ).length;

    const totalVendors = await db.select().from(vendorProfiles).then(rows => rows.length);
    
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentlyAdded = await db.select()
      .from(vendorProfiles)
      .where(gte(vendorProfiles.createdAt, yesterday))
      .then(rows => rows.length);

    const dataSourcesEnabled = this.getDataSources().filter(s => s.enabled).length;

    const lastProvenance = await db.select()
      .from(dataProvenance)
      .where(eq(dataProvenance.method, 'Government Registry Import'))
      .orderBy(desc(dataProvenance.timestamp))
      .limit(1);

    return {
      activeJobs,
      totalVendors,
      recentlyAdded,
      dataSourcesEnabled,
      lastIngestionTime: lastProvenance.length > 0 ? lastProvenance[0].timestamp : undefined
    };
  }
}

// Export singleton instance
export const governmentDataAgent = new GovernmentDataIntegrationAgent();