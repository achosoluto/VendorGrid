import { RawBusinessData } from '../canadianBusinessRegistryProcessor';
import { storage } from '../storage';
import type { InsertVendorProfile, InsertDataProvenance } from '@shared/schema';

export interface ValidationRule {
  field: string;
  validator: (value: any) => boolean;
  errorMessage: string;
}

export interface NormalizationRule {
  sourceField: string;
  targetField: string;
  normalizer?: (value: any) => any;
}

export class DataProcessingPipeline {
  private validationRules: ValidationRule[];
  private normalizationRules: NormalizationRule[];

  constructor() {
    this.validationRules = this.getDefaultValidationRules();
    this.normalizationRules = this.getDefaultNormalizationRules();
  }

  /**
   * Normalizes raw business data from different sources to a standard format
   */
  normalizeData(rawData: any[]): RawBusinessData[] {
    return rawData.map(item => this.normalizeRecord(item));
  }

  /**
   * Validates normalized business data
   */
  validateData(businessData: RawBusinessData[]): { valid: RawBusinessData[], invalid: Array<{ record: RawBusinessData, errors: string[] }> } {
    const valid: RawBusinessData[] = [];
    const invalid: Array<{ record: RawBusinessData, errors: string[] }> = [];

    for (const record of businessData) {
      const errors = this.validateRecord(record);
      if (errors.length === 0) {
        valid.push(record);
      } else {
        invalid.push({ record, errors });
      }
    }

    return { valid, invalid };
  }

  /**
   * Processes raw data through normalization and validation
   */
  processData(rawData: any[]): { normalized: RawBusinessData[], valid: RawBusinessData[], invalid: Array<{ record: RawBusinessData, errors: string[] }> } {
    const normalized = this.normalizeData(rawData);
    const validation = this.validateData(normalized);
    
    return {
      normalized,
      ...validation
    };
  }

  /**
   * Deduplicates business records
   */
  deduplicateData(businessData: RawBusinessData[]): RawBusinessData[] {
    const uniqueRecords = new Map<string, RawBusinessData>();
    
    for (const record of businessData) {
      // Use business number as primary key for deduplication
      const key = record.businessNumber || `${record.companyName}-${record.address}`;
      
      if (!uniqueRecords.has(key)) {
        uniqueRecords.set(key, record);
      } else {
        // If we have a duplicate but one has more complete data, keep the more complete one
        const existing = uniqueRecords.get(key)!;
        const current = record;
        
        // Prefer record with more complete fields
        const existingFields = this.countNonEmptyFields(existing);
        const currentFields = this.countNonEmptyFields(current);
        
        if (currentFields > existingFields) {
          uniqueRecords.set(key, current);
        }
      }
    }
    
    return Array.from(uniqueRecords.values());
  }

  /**
   * Saves validated business records to the database with provenance tracking
   */
  async saveToDatabase(businessData: RawBusinessData[], sourceName: string): Promise<{ saved: number, errors: string[] }> {
    let savedCount = 0;
    const errors: string[] = [];

    for (const business of businessData) {
      try {
        // Check if vendor already exists by business number (Tax ID equivalent)
        const existingProfile = await storage.getVendorProfileByTaxId(business.businessNumber);

        if (existingProfile) {
          // Skip if already exists - we'll handle updates in a separate process
          continue;
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
          zipCode: business.postalCode?.trim() || 'Unknown',
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

        savedCount++;
      } catch (error) {
        errors.push(`Failed to save ${business.companyName}: ${error.message}`);
      }
    }

    return { saved: savedCount, errors };
  }

  private normalizeRecord(rawRecord: any): RawBusinessData {
    const normalizedRecord: RawBusinessData = {
      companyName: '',
      businessNumber: '',
      address: '',
      city: '',
      province: '',
      postalCode: '',
      phone: '',
      email: '',
      website: ''
    };

    // Apply normalization rules
    for (const rule of this.normalizationRules) {
      const sourceValue = this.extractValue(rawRecord, rule.sourceField);
      
      if (sourceValue) {
        const normalizedValue = rule.normalizer ? rule.normalizer(sourceValue) : sourceValue;
        (normalizedRecord as any)[rule.targetField] = normalizedValue;
      }
    }

    // Apply some standard normalizations
    normalizedRecord.companyName = this.normalizeCompanyName(normalizedRecord.companyName);
    normalizedRecord.address = this.normalizeAddress(normalizedRecord.address);
    normalizedRecord.postalCode = this.normalizePostalCode(normalizedRecord.postalCode);
    
    return normalizedRecord;
  }

  private validateRecord(record: RawBusinessData): string[] {
    const errors: string[] = [];

    for (const rule of this.validationRules) {
      const value = (record as any)[rule.field];
      if (!rule.validator(value)) {
        errors.push(rule.errorMessage);
      }
    }

    return errors;
  }

  private extractValue(record: any, fieldName: string): any {
    // Try direct field access
    if (record[fieldName] !== undefined) {
      return record[fieldName];
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
      if (record[variation] !== undefined) {
        return record[variation];
      }
    }

    // Try partial matches
    const lowerFieldName = fieldName.toLowerCase();
    for (const key in record) {
      if (key.toLowerCase().includes(lowerFieldName)) {
        return record[key];
      }
    }

    return undefined;
  }

  private normalizeCompanyName(name: string): string {
    if (!name) return '';
    
    // Remove common legal suffixes
    return name
      .replace(/\b(Incorporated|Inc\.?)\b/gi, 'Inc')
      .replace(/\b(Limited|Ltd\.?)\b/gi, 'Ltd')
      .replace(/\b(Corporation|Corp\.?)\b/gi, 'Corp')
      .replace(/\b(Unlimited|Unltd\.?)\b/gi, 'Unltd')
      .trim();
  }

  private normalizeAddress(address: string): string {
    if (!address) return 'Address not available';
    
    // Normalize address formatting
    return address
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }

  private normalizePostalCode(postalCode: string): string {
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

  private countNonEmptyFields(record: RawBusinessData): number {
    let count = 0;
    for (const key in record) {
      const value = (record as any)[key];
      if (value && value.toString().trim() !== '') {
        count++;
      }
    }
    return count;
  }

  private getDefaultValidationRules(): ValidationRule[] {
    return [
      {
        field: 'companyName',
        validator: (value: any) => typeof value === 'string' && value.trim().length > 0,
        errorMessage: 'Company name is required'
      },
      {
        field: 'businessNumber',
        validator: (value: any) => !value || typeof value === 'string',
        errorMessage: 'Business number must be a string if provided'
      },
      {
        field: 'address',
        validator: (value: any) => typeof value === 'string' && value.trim().length > 0,
        errorMessage: 'Address is required'
      }
    ];
  }

  private getDefaultNormalizationRules(): NormalizationRule[] {
    return [
      { sourceField: 'companyName', targetField: 'companyName' },
      { sourceField: 'businessNumber', targetField: 'businessNumber' },
      { sourceField: 'business_number', targetField: 'businessNumber' },
      { sourceField: 'corpNum', targetField: 'businessNumber' },
      { sourceField: 'address', targetField: 'address' },
      { sourceField: 'business_address', targetField: 'address' },
      { sourceField: 'regOffAddr', targetField: 'address' },
      { sourceField: 'city', targetField: 'city' },
      { sourceField: 'province', targetField: 'province' },
      { sourceField: 'postalCode', targetField: 'postalCode' },
      { sourceField: 'postal_cd', targetField: 'postalCode' },
      { sourceField: 'phone', targetField: 'phone' },
      { sourceField: 'email', targetField: 'email' },
      { sourceField: 'website', targetField: 'website' }
    ];
  }
}