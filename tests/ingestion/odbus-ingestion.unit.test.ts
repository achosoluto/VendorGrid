import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ODBusIngestionPipeline } from '../../scripts/ingest-odbus-data';
import type { ODBusRecord } from '../../scripts/ingest-odbus-data';

// Mock the storage module
vi.mock('../../server/storage', () => ({
  storage: {
    createVendorProfile: vi.fn(),
    getVendorProfileByTaxId: vi.fn(),
    createDataProvenance: vi.fn(),
  }
}));

// Mock the db module
vi.mock('../../server/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([]))
          }))
        }))
      }))
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(() => Promise.resolve([{
          id: 'test-id',
          createdAt: new Date(),
          updatedAt: new Date()
        }]))
      }))
    }))
  }
}));

describe('ODBusIngestionPipeline', () => {
  let pipeline: ODBusIngestionPipeline;

  beforeEach(async () => {
    pipeline = new ODBusIngestionPipeline();
    // Initialize the pipeline since it has async initialization
    await pipeline['initialize']();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isValidRecord', () => {
    it('should reject records without business names', () => {
      const invalidRecord: ODBusRecord = {
        idx: 'test-idx',
        business_name: '',
        alt_business_name: '..',
        business_sector: '..',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'M5V 2T6',
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: '..',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['isValidRecord'](invalidRecord);
      expect(result).toBe(false);
    });

    it('should reject records with ".." business names', () => {
      const invalidRecord: ODBusRecord = {
        idx: 'test-idx',
        business_name: '..',
        alt_business_name: '..',
        business_sector: '..',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'M5V 2T6',
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: '..',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['isValidRecord'](invalidRecord);
      expect(result).toBe(false);
    });

    it('should accept records with valid business names and identifiers', () => {
      const validRecord: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..',
        business_sector: 'Retail',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'M5V 2T6',
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: '..',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['isValidRecord'](validRecord);
      expect(result).toBe(true);
    });

    it('should validate Canadian postal code format', () => {
      const recordWithValidPostalCode: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..',
        business_sector: 'Retail',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'M5V 2T6', // Valid Canadian postal code
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: '..',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['isValidRecord'](recordWithValidPostalCode);
      expect(result).toBe(true);
    });

    it('should handle invalid postal code formats', () => {
      const recordWithInvalidPostalCode: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..',
        business_sector: 'Retail',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'INVALID', // Invalid postal code
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: '..',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['isValidRecord'](recordWithInvalidPostalCode);
      // For now, the validation doesn't reject records with invalid postal codes
      // It just logs a warning. So this should still return true.
      expect(result).toBe(true);
    });

    it('should validate province/territory codes', () => {
      const recordWithValidProvince: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..',
        business_sector: 'Retail',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'M5V 2T6',
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON', // Valid 2-letter province code
        total_no_employees: '..',
        status: '..',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['isValidRecord'](recordWithValidProvince);
      expect(result).toBe(true);
    });
  });

  describe('mapToVendorProfile', () => {
    it('should correctly map business_id_no to taxId and businessNumber when valid', () => {
      const record: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..',
        business_sector: 'Retail',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789', // 9 digits, valid Canadian BN
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '44',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: 'Retail business',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'M5V 2T6',
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: 'Active',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['mapToVendorProfile'](record);
      
      expect(result.companyName).toBe('Test Business Inc.');
      expect(result.taxId).toBe('123456789');
      expect(result.businessNumber).toBe('123456789'); // Should be set since it's 9 digits
      expect(result.industryCode).toBe('44');
      expect(result.industryDescription).toBe('Retail business');
      expect(result.dataSource).toBe('test-provider');
    });

    it('should handle ".." values by providing appropriate fallbacks', () => {
      const record: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..',
        business_sector: '..', // This is ".." so should be undefined
        business_subsector: '..',
        business_description: '..',
        business_id_no: '..', // No business ID, should use licence number
        licence_number: '987654321',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..', // This is ".." so should be undefined
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '..', // This is ".." so should parse from components
        postal_code: '..', // This is ".." so should be Unknown
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: '..', // This is ".." so should be Unknown
        prov_terr: '..', // This is ".." so should be Unknown
        total_no_employees: '..',
        status: '..', // This is ".." so should default to true
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['mapToVendorProfile'](record);
      
      expect(result.companyName).toBe('Test Business Inc.');
      expect(result.taxId).toBe('987654321'); // Should use licence number as taxId
      expect(result.businessNumber).toBe('987654321'); // Should use licence number
      expect(result.address).toBe('123 Main St'); // Build from components
      expect(result.city).toBe('Unknown');
      expect(result.state).toBe('Unknown');
      expect(result.zipCode).toBe('Unknown');
      expect(result.industryDescription).toBeUndefined();
      expect(result.isActive).toBe(true); // Default when status is ".."
    });

    it('should format postal codes properly', () => {
      const record: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..',
        business_sector: 'Retail',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '..',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: '..',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V2T6', // Without space in postal code
        postal_code: 'M5V2T6', // Without space
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: 'Active',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const result = pipeline['mapToVendorProfile'](record);
      expect(result.zipCode).toBe('M5V 2T6'); // Should be properly formatted with space
    });
  });

  describe('createProvenanceEntries', () => {
    it('should create data provenance entries for all imported fields', () => {
      const record: ODBusRecord = {
        idx: 'test-idx',
        business_name: 'Test Business Inc.',
        alt_business_name: '..', 
        business_sector: 'Retail',
        business_subsector: '..',
        business_description: '..',
        business_id_no: '123456789',
        licence_number: '..',
        licence_type: '..',
        derived_NAICS: '44',
        source_NAICS_primary: '..',
        source_NAICS_secondary: '..',
        NAICS_descr: 'Retail business',
        NAICS_descr2: '..',
        latitude: '..',
        longitude: '..',
        full_address: '123 Main St, Toronto, ON M5V 2T6',
        postal_code: 'M5V 2T6',
        unit: '..',
        street_no: '123',
        street_name: 'Main St',
        street_direction: '..',
        street_type: '..',
        city: 'Toronto',
        prov_terr: 'ON',
        total_no_employees: '..',
        status: 'Active',
        provider: 'test-provider',
        geo_source: '..',
        CSDUID: '..',
        CSDNAME: '..',
        PRUID: '..'
      };

      const entries = pipeline['createProvenanceEntries'](record, 'test-vendor-id');
      
      // Check that we have entries for the mapped fields
      const fieldNames = entries.map(e => e.fieldName);
      expect(fieldNames).toContain('companyName');
      expect(fieldNames).toContain('taxId');
      expect(fieldNames).toContain('businessNumber');
      expect(fieldNames).toContain('address');
      expect(fieldNames).toContain('city');
      expect(fieldNames).toContain('state');
      expect(fieldNames).toContain('zipCode');
      expect(fieldNames).toContain('industryDescription');
      expect(fieldNames).toContain('industryCode');
      expect(fieldNames).toContain('isActive');
      
      // Check that all entries have correct vendorProfileId
      entries.forEach(entry => {
        expect(entry.vendorProfileId).toBe('test-vendor-id');
      });
      
      // Check that all entries have correct source
      entries.forEach(entry => {
        expect(entry.source).toBe('test-provider');
      });
    });
  });

  describe('parseAddress', () => {
    it('should extract street address by removing city and postal code', () => {
      const fullAddress = '123 Main St, Toronto, ON M5V 2T6';
      const city = 'Toronto';
      const postalCode = 'M5V 2T6';
      
      const result = pipeline['parseAddress'](fullAddress, city, postalCode);
      expect(result).toBe('123 Main St');
    });

    it('should handle addresses without city and postal code properly', () => {
      const fullAddress = '456 Oak Avenue';
      const city = 'Unknown';
      const postalCode = 'Unknown';
      
      const result = pipeline['parseAddress'](fullAddress, city, postalCode);
      expect(result).toBe('456 Oak Avenue');
    });
  });

  describe('formatPostalCode', () => {
    it('should format postal codes from A1A1A1 to A1A 1A1 format', () => {
      const result = pipeline['formatPostalCode']('M5V2T6');
      expect(result).toBe('M5V 2T6');
    });

    it('should handle postal codes already in correct format', () => {
      const result = pipeline['formatPostalCode']('M5V 2T6');
      expect(result).toBe('M5V 2T6');
    });

    it('should return unknown for empty postal codes', () => {
      const result = pipeline['formatPostalCode']('');
      expect(result).toBe('Unknown');
    });

    it('should handle postal codes with hyphens', () => {
      const result = pipeline['formatPostalCode']('K1A-1H5');
      expect(result).toBe('K1A 1H5');
    });
  });
});