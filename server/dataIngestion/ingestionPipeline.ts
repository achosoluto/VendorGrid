
import { storage } from '../storage';
import { CANADIAN_DATA_SOURCES, PROVINCIAL_SOURCES, type DataSource } from './canadianSources';
import type { InsertVendorProfile, InsertDataProvenance } from '@shared/schema';
import fetch from 'node-fetch';
import csv from 'csv-parser';
import { Readable } from 'stream';

interface RawBusinessData {
  companyName: string;
  businessNumber: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  website?: string;
}

export class CanadianDataIngestionPipeline {
  private rateLimiters = new Map<string, { lastRequest: number; requestCount: number }>();

  async ingestFromAllSources(): Promise<{ processed: number; errors: string[] }> {
    const results = { processed: 0, errors: [] as string[] };
    
    console.log('Starting Canadian data ingestion pipeline...');
    
    // Process federal sources
    for (const source of CANADIAN_DATA_SOURCES) {
      try {
        const sourceResults = await this.ingestFromSource(source);
        results.processed += sourceResults.processed;
        results.errors.push(...sourceResults.errors);
      } catch (error) {
        results.errors.push(`Failed to process ${source.name}: ${error.message}`);
        console.error(`Error processing ${source.name}:`, error);
      }
    }

    console.log(`Ingestion completed. Processed: ${results.processed}, Errors: ${results.errors.length}`);
    return results;
  }

  private async ingestFromSource(source: DataSource): Promise<{ processed: number; errors: string[] }> {
    console.log(`Processing source: ${source.name}`);
    
    if (!this.checkRateLimit(source.name, source.rateLimit)) {
      return { processed: 0, errors: [`Rate limit exceeded for ${source.name}`] };
    }

    const results = { processed: 0, errors: [] as string[] };

    try {
      let rawData: RawBusinessData[] = [];

      if (source.type === 'csv') {
        rawData = await this.fetchCSVData(source);
      } else if (source.type === 'api') {
        rawData = await this.fetchAPIData(source);
      } else if (source.type === 'json') {
        rawData = await this.fetchJSONData(source);
      }

      // Process each business record
      for (const business of rawData) {
        try {
          await this.processBusinessRecord(business, source.name);
          results.processed++;
        } catch (error) {
          results.errors.push(`Failed to process ${business.companyName}: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`Source processing error: ${error.message}`);
    }

    return results;
  }

  private async fetchCSVData(source: DataSource): Promise<RawBusinessData[]> {
    const response = await fetch(source.url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return new Promise((resolve, reject) => {
      const results: RawBusinessData[] = [];
      const stream = Readable.from(response.body);

      stream
        .pipe(csv())
        .on('data', (row) => {
          const mapped = this.mapFields(row, source.fields);
          if (mapped.companyName && mapped.businessNumber) {
            results.push(mapped);
          }
        })
        .on('end', () => resolve(results))
        .on('error', reject);
    });
  }

  private async fetchAPIData(source: DataSource): Promise<RawBusinessData[]> {
    const response = await fetch(source.url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Vendor-Platform-Data-Ingestion/1.0'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data.map(item => this.mapFields(item, source.fields)) : [];
  }

  private async fetchJSONData(source: DataSource): Promise<RawBusinessData[]> {
    return this.fetchAPIData(source); // Same implementation for now
  }

  private mapFields(row: any, fieldMapping: DataSource['fields']): RawBusinessData {
    return {
      companyName: row[fieldMapping.companyName] || '',
      businessNumber: row[fieldMapping.businessNumber] || '',
      address: row[fieldMapping.address] || '',
      city: row[fieldMapping.city] || '',
      province: row[fieldMapping.province] || '',
      postalCode: row[fieldMapping.postalCode] || '',
      phone: row[fieldMapping.phone] || '',
      email: row[fieldMapping.email] || '',
      website: row[fieldMapping.website] || ''
    };
  }

  private async processBusinessRecord(business: RawBusinessData, sourceName: string): Promise<void> {
    // Check if vendor already exists by business number (Tax ID equivalent)
    const existingProfile = await storage.getVendorProfileByTaxId(business.businessNumber);
    
    if (existingProfile) {
      // Skip if already exists - we'll handle updates in a separate process
      return;
    }

    // Create a "stub" vendor profile that can be claimed later
    const vendorProfile: InsertVendorProfile = {
      userId: null, // No user attached - this is a public business record
      companyName: business.companyName.trim(),
      taxId: business.businessNumber.trim(),
      businessNumber: business.businessNumber.trim(), // Canadian Business Number
      address: business.address?.trim() || 'Address not available',
      city: business.city?.trim() || 'Unknown',
      state: business.province?.trim() || 'Unknown', // Province for Canadian businesses
      zipCode: this.formatPostalCode(business.postalCode?.trim() || ''),
      country: 'CA', // Canadian businesses
      phone: business.phone?.trim() || 'Phone not available',
      email: business.email?.trim() || 'email@example.com', // Placeholder
      website: business.website?.trim() || null,
      dataSource: sourceName.toLowerCase().replace(/\s+/g, '_'),
      verificationStatus: 'unverified',
      isActive: true
    };

    const profile = await storage.createVendorProfile(vendorProfile);

    // Create data provenance entries for all imported fields
    const provenanceFields = ['companyName', 'taxId', 'businessNumber', 'address', 'city', 'state', 'zipCode', 'country'];
    const provenanceEntries: InsertDataProvenance[] = provenanceFields.map(fieldName => ({
      vendorProfileId: profile.id,
      fieldName,
      source: sourceName,
      method: 'Government Registry Import'
    }));

    for (const entry of provenanceEntries) {
      await storage.createDataProvenance(entry);
    }

    console.log(`Created vendor stub: ${business.companyName} (${business.businessNumber})`);
  }

  private checkRateLimit(sourceName: string, limit: number): boolean {
    const now = Date.now();
    const limiter = this.rateLimiters.get(sourceName) || { lastRequest: 0, requestCount: 0 };
    
    // Reset count every minute
    if (now - limiter.lastRequest > 60000) {
      limiter.requestCount = 0;
    }
    
    if (limiter.requestCount >= limit) {
      return false;
    }
    
    limiter.requestCount++;
    limiter.lastRequest = now;
    this.rateLimiters.set(sourceName, limiter);
    
    return true;
  }

  private formatPostalCode(postalCode: string): string {
    if (!postalCode) return 'Unknown';
    
    // Remove all spaces and convert to uppercase
    const cleaned = postalCode.replace(/\s/g, '').toUpperCase();
    
    // Check if it's a Canadian postal code (A1A1A1 format)
    if (/^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(cleaned)) {
      // Format as A1A 1A1
      return `${cleaned.slice(0, 3)} ${cleaned.slice(3)}`;
    }
    
    // Return as-is if not recognizable format
    return postalCode;
  }
}
