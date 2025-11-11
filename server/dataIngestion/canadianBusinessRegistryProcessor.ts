import { CSVDownloader } from './csvDownloader';
import { storage } from '../storage';
import type { InsertVendorProfile, InsertDataProvenance } from '@shared/schema';
import { type DataSource } from './canadianSources';

export interface RawBusinessData {
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

export class CanadianBusinessRegistryProcessor {
  private downloader: CSVDownloader;

  constructor() {
    this.downloader = new CSVDownloader();
  }

  /**
   * Process a Canadian business registry CSV file from a given source
   */
  async processBusinessRegistryCSV(source: DataSource, localPath?: string): Promise<{ processed: number; errors: string[] }> {
    console.log(`Processing ${source.name} CSV data...`);

    const results = { processed: 0, errors: [] as string[] };

    try {
      let rawData: RawBusinessData[] = [];

      if (localPath && this.downloader.fileExists(localPath)) {
        // Use local file if provided and exists
        rawData = await this.downloader.parseLocalCSV<RawBusinessData>(localPath);
      } else {
        // Stream and parse directly from URL
        rawData = await this.downloader.streamAndParseCSV<RawBusinessData>(source.url);
      }

      console.log(`Found ${rawData.length} records in ${source.name} data`);

      // Process each business record
      for (const business of rawData) {
        try {
          const mappedBusiness = this.mapFields(business, source.fields);
          if (mappedBusiness.companyName && mappedBusiness.businessNumber) {
            await this.processBusinessRecord(mappedBusiness, source.name);
            results.processed++;
          }
        } catch (error) {
          results.errors.push(`Failed to process business: ${error.message}`);
        }
      }
    } catch (error) {
      results.errors.push(`Processing error: ${error.message}`);
      console.error(`Error processing ${source.name}:`, error);
    }

    return results;
  }

  /**
   * Map raw CSV fields to standardized business data format
   */
  private mapFields(row: any, fieldMapping: DataSource['fields']): RawBusinessData {
    // Handle various possible field name formats
    return {
      companyName: this.extractValue(row, fieldMapping.companyName) || '',
      businessNumber: this.extractValue(row, fieldMapping.businessNumber) || '',
      address: this.extractValue(row, fieldMapping.address) || '',
      city: this.extractValue(row, fieldMapping.city) || '',
      province: this.extractValue(row, fieldMapping.province) || '',
      postalCode: this.extractValue(row, fieldMapping.postalCode) || '',
      phone: this.extractValue(row, fieldMapping.phone) || '',
      email: this.extractValue(row, fieldMapping.email) || '',
      website: this.extractValue(row, fieldMapping.website) || ''
    };
  }

  /**
   * Helper to extract field value from CSV row, handling possible variations in naming
   */
  private extractValue(row: any, fieldName?: string): string | undefined {
    if (!fieldName) return undefined;

    // Direct field access
    if (row[fieldName]) {
      return String(row[fieldName]);
    }

    // Try common variations of the field name
    const variations = [
      fieldName.toLowerCase(),
      fieldName.toUpperCase(),
      fieldName.replace(/\s+/g, '_').toLowerCase(),
      fieldName.replace(/\s+/g, '').toLowerCase(),
      fieldName.replace(/\s+/g, '-').toLowerCase(),
    ];

    for (const variation of variations) {
      if (row[variation]) {
        return String(row[variation]);
      }
    }

    // Try partial matches
    const lowerFieldName = fieldName.toLowerCase();
    for (const key in row) {
      if (key.toLowerCase().includes(lowerFieldName)) {
        return String(row[key]);
      }
    }

    return undefined;
  }

  /**
   * Process a single business record and save to the database
   */
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

    console.log(`Created vendor stub: ${business.companyName} (${business.businessNumber}) from ${sourceName}`);
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