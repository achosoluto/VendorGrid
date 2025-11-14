import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '../../server/db';
import { vendorProfiles, dataProvenance } from '../../shared/schema';
import { storage } from '../../server/storage';
import { ODBusIngestionPipeline } from '../../scripts/ingest-odbus-data';
import type { ODBusRecord } from '../../scripts/ingest-odbus-data';

// Mock the database operations
vi.mock('../../server/db', async () => {
  const actual = await vi.importActual('../../server/db');
  return {
    ...actual,
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
            id: 'test-vendor-id',
            createdAt: new Date(),
            updatedAt: new Date(),
            userId: null,
            companyName: 'Test Business',
            taxId: '123456789',
            businessNumber: '123456789',
            address: '123 Main St',
            city: 'Toronto',
            state: 'ON',
            zipCode: 'M5V 2T6',
            country: 'CA',
            phone: '',
            email: '',
            website: '',
            legalStructure: undefined,
            industryCode: undefined,
            industryDescription: undefined,
            dataSource: 'test-source',
            verificationStatus: 'unverified',
            isActive: true
          }]))
        }))
      }))
    }
  };
});

// Mock the storage module
vi.mock('../../server/storage', () => ({
  storage: {
    createVendorProfile: vi.fn(() => Promise.resolve({
      id: 'test-vendor-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      companyName: 'Test Business',
      taxId: '123456789',
      businessNumber: '123456789',
      address: '123 Main St',
      city: 'Toronto',
      state: 'ON',
      zipCode: 'M5V 2T6',
      country: 'CA',
      phone: '',
      email: '',
      website: '',
      legalStructure: undefined,
      industryCode: undefined,
      industryDescription: undefined,
      dataSource: 'test-source',
      verificationStatus: 'unverified',
      isActive: true
    })),
    getVendorProfileByTaxId: vi.fn(() => Promise.resolve(null)), // No existing record
    createDataProvenance: vi.fn(() => Promise.resolve({
      id: 'test-provenance-id',
      vendorProfileId: 'test-vendor-id',
      fieldName: 'test-field',
      source: 'test-source',
      method: 'test-method',
      timestamp: new Date()
    })),
    // Add other mocked methods as needed
  }
}));

describe('ODBus Database Integration Tests', () => {
  let pipeline: ODBusIngestionPipeline;

  beforeEach(async () => {
    pipeline = new ODBusIngestionPipeline();
    // Initialize the pipeline since it has async initialization
    await pipeline['initialize']();
    
    // Reset mocks to clear any previous calls
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should successfully process a valid record and store in database', async () => {
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

    // Mock storage methods to return successful results
    vi.mocked(storage.createVendorProfile).mockResolvedValue({
      id: 'new-vendor-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      companyName: 'Test Business Inc.',
      taxId: '123456789',
      businessNumber: '123456789',
      address: '123 Main St',
      city: 'Toronto',
      state: 'ON',
      zipCode: 'M5V 2T6',
      country: 'CA',
      phone: '',
      email: '',
      website: '',
      legalStructure: 'Retail',
      industryCode: '44',
      industryDescription: 'Retail business',
      dataSource: 'test_provider',
      verificationStatus: 'unverified',
      isActive: true
    });

    vi.mocked(storage.getVendorProfileByTaxId).mockResolvedValue(null); // No duplicate
    vi.mocked(storage.createDataProvenance).mockResolvedValue({
      id: 'test-provenance-id',
      vendorProfileId: 'new-vendor-id',
      fieldName: 'companyName',
      source: 'test-provider',
      method: 'Government Registry Import',
      timestamp: new Date()
    });

    // Process the record
    const result = await pipeline['processRecord'](validRecord);

    // Verify the result
    expect(result).not.toBeNull();
    if (result) {
      expect(result.vendorProfile.companyName).toBe('Test Business Inc.');
      expect(result.vendorProfile.taxId).toBe('123456789');
    }

    // Verify that storage methods were called
    expect(storage.createVendorProfile).toHaveBeenCalled();
    expect(storage.createDataProvenance).toHaveBeenCalledTimes(10); // 10 fields tracked for provenance
  });

  it('should handle existing vendor records by skipping them', async () => {
    const recordWithExisting: ODBusRecord = {
      idx: 'test-idx',
      business_name: 'Existing Business Inc.',
      alt_business_name: '..',
      business_sector: '..',
      business_subsector: '..',
      business_description: '..',
      business_id_no: '987654321', // This ID already exists
      licence_number: '..',
      licence_type: '..',
      derived_NAICS: '..',
      source_NAICS_primary: '..',
      source_NAICS_secondary: '..',
      NAICS_descr: '..',
      NAICS_descr2: '..',
      latitude: '..',
      longitude: '..',
      full_address: '456 Oak Ave, Vancouver, BC V6G 1A1',
      postal_code: 'V6G 1A1',
      unit: '..',
      street_no: '456',
      street_name: 'Oak Ave',
      street_direction: '..',
      street_type: '..',
      city: 'Vancouver',
      prov_terr: 'BC',
      total_no_employees: '..',
      status: '..',
      provider: 'test-provider',
      geo_source: '..',
      CSDUID: '..',
      CSDNAME: '..',
      PRUID: '..'
    };

    // Mock that this vendor already exists
    vi.mocked(storage.getVendorProfileByTaxId).mockResolvedValue({
      id: 'existing-vendor-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      companyName: 'Existing Business Inc.',
      taxId: '987654321',
      businessNumber: '987654321',
      address: '456 Oak Ave',
      city: 'Vancouver',
      state: 'BC',
      zipCode: 'V6G 1A1',
      country: 'CA',
      phone: '',
      email: '',
      website: '',
      legalStructure: undefined,
      industryCode: undefined,
      industryDescription: undefined,
      dataSource: 'test-source',
      verificationStatus: 'unverified',
      isActive: true
    });

    // Process the record - should return null since it exists
    const result = await pipeline['processRecord'](recordWithExisting);
    
    // Should return null since the record already exists
    expect(result).toBeNull();
    
    // Storage methods should not have been called since we skipped the duplicate
    expect(storage.createVendorProfile).not.toHaveBeenCalled();
  });

  it('should handle records with special characters without SQL errors', async () => {
    const recordWithSpecialChars: ODBusRecord = {
      idx: 'test-idx-special',
      business_name: 'Test Business (With Parentheses) Ltd.',
      alt_business_name: '..',
      business_sector: 'Retail',
      business_subsector: '..',
      business_description: '..',
      business_id_no: '111222333',
      licence_number: '..',
      licence_type: '..',
      derived_NAICS: '..',
      source_NAICS_primary: '..',
      source_NAICS_secondary: '..',
      NAICS_descr: '..',
      NAICS_descr2: '..',
      latitude: '..',
      longitude: '..',
      full_address: '789 Pine St (Downtown), Montreal, QC H3B 5H5',
      postal_code: 'H3B 5H5',
      unit: '..',
      street_no: '789',
      street_name: 'Pine St',
      street_direction: '..',
      street_type: '..',
      city: 'Montreal',
      prov_terr: 'QC',
      total_no_employees: '..',
      status: '..',
      provider: 'test-provider',
      geo_source: '..',
      CSDUID: '..',
      CSDNAME: '..',
      PRUID: '..'
    };

    // Mock storage methods to return successful results
    vi.mocked(storage.createVendorProfile).mockResolvedValue({
      id: 'special-vendor-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      companyName: 'Test Business (With Parentheses) Ltd.',
      taxId: '111222333',
      businessNumber: '111222333',
      address: '789 Pine St (Downtown)',
      city: 'Montreal',
      state: 'QC',
      zipCode: 'H3B 5H5',
      country: 'CA',
      phone: '',
      email: '',
      website: '',
      legalStructure: 'Retail',
      industryCode: undefined,
      industryDescription: 'Retail',
      dataSource: 'test_provider',
      verificationStatus: 'unverified',
      isActive: true
    });

    vi.mocked(storage.getVendorProfileByTaxId).mockResolvedValue(null); // No duplicate
    vi.mocked(storage.createDataProvenance).mockResolvedValue({
      id: 'test-provenance-id',
      vendorProfileId: 'special-vendor-id',
      fieldName: 'companyName',
      source: 'test-provider',
      method: 'Government Registry Import',
      timestamp: new Date()
    });

    // Process the record with special characters
    const result = await pipeline['processRecord'](recordWithSpecialChars);

    // Verify the result was processed successfully
    expect(result).not.toBeNull();
    if (result) {
      expect(result.vendorProfile.companyName).toBe('Test Business (With Parentheses) Ltd.');
      expect(result.vendorProfile.address).toBe('789 Pine St (Downtown)');
    }

    // Verify that storage methods were called without errors
    expect(storage.createVendorProfile).toHaveBeenCalled();
  });

  it('should handle records with ".." placeholder values correctly', async () => {
    const recordWithPlaceholders: ODBusRecord = {
      idx: 'test-idx-placeholders',
      business_name: 'Placeholder Business',
      alt_business_name: '..', // Placeholder value
      business_sector: '..', // Placeholder value
      business_subsector: '..',
      business_description: '..',
      business_id_no: '..', // Placeholder value, should try licence_number
      licence_number: '333444555', // Use this as taxId instead
      licence_type: '..',
      derived_NAICS: '..',
      source_NAICS_primary: '..',
      source_NAICS_secondary: '..',
      NAICS_descr: '..',
      NAICS_descr2: '..',
      latitude: '..',
      longitude: '..',
      full_address: '..', // Placeholder value
      postal_code: '..', // Placeholder value
      unit: '..',
      street_no: '321',
      street_name: 'Elm St',
      street_direction: '..',
      street_type: '..',
      city: '..', // Placeholder value
      prov_terr: '..', // Placeholder value
      total_no_employees: '..',
      status: '..', // Placeholder value
      provider: 'test-provider',
      geo_source: '..',
      CSDUID: '..',
      CSDNAME: '..',
      PRUID: '..'
    };

    // Mock storage methods
    vi.mocked(storage.createVendorProfile).mockResolvedValue({
      id: 'placeholder-vendor-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      companyName: 'Placeholder Business',
      taxId: '333444555', // Should use licence number as taxId
      businessNumber: '333444555', // Should use licence number
      address: '321 Elm St', // Build from components when full_address is ".."
      city: 'Unknown', // Since city is ".."
      state: 'Unknown', // Since prov_terr is ".."
      zipCode: 'Unknown', // Since postal_code is ".."
      country: 'CA',
      phone: '',
      email: '',
      website: '',
      legalStructure: undefined,
      industryCode: undefined,
      industryDescription: undefined,
      dataSource: 'test_provider',
      verificationStatus: 'unverified',
      isActive: true // Should default to true when status is ".."
    });

    vi.mocked(storage.getVendorProfileByTaxId).mockResolvedValue(null);
    vi.mocked(storage.createDataProvenance).mockResolvedValue({
      id: 'test-provenance-id',
      vendorProfileId: 'placeholder-vendor-id',
      fieldName: 'companyName',
      source: 'test-provider',
      method: 'Government Registry Import',
      timestamp: new Date()
    });

    // Process the record with placeholder values
    const result = await pipeline['processRecord'](recordWithPlaceholders);

    // Verify the result handled placeholders correctly
    expect(result).not.toBeNull();
    if (result) {
      expect(result.vendorProfile.companyName).toBe('Placeholder Business');
      expect(result.vendorProfile.taxId).toBe('333444555'); // From licence_number
      expect(result.vendorProfile.businessNumber).toBe('333444555'); // From licence_number
      expect(result.vendorProfile.address).toBe('321 Elm St'); // Built from components
      expect(result.vendorProfile.city).toBe('Unknown'); // Default for ".." value
      expect(result.vendorProfile.state).toBe('Unknown'); // Default for ".." value
      expect(result.vendorProfile.zipCode).toBe('Unknown'); // Default for ".." value
      expect(result.vendorProfile.isActive).toBe(true); // Default for ".." value
    }
  });

  it('should create proper data provenance entries for ingested fields', async () => {
    const record: ODBusRecord = {
      idx: 'test-idx-provenance',
      business_name: 'Provenance Test Business',
      alt_business_name: '..',
      business_sector: 'Technology',
      business_subsector: '..',
      business_description: '..',
      business_id_no: '555666777',
      licence_number: '..',
      licence_type: '..',
      derived_NAICS: '51',
      source_NAICS_primary: '..',
      source_NAICS_secondary: '..',
      NAICS_descr: 'Technology services',
      NAICS_descr2: '..',
      latitude: '..',
      longitude: '..',
      full_address: '100 Tech Blvd, Ottawa, ON K1A 0B1',
      postal_code: 'K1A 0B1',
      unit: '..',
      street_no: '100',
      street_name: 'Tech Blvd',
      street_direction: '..',
      street_type: '..',
      city: 'Ottawa',
      prov_terr: 'ON',
      total_no_employees: '..',
      status: 'Active',
      provider: 'gov-data-source',
      geo_source: '..',
      CSDUID: '..',
      CSDNAME: '..',
      PRUID: '..'
    };

    // Mock storage methods
    vi.mocked(storage.createVendorProfile).mockResolvedValue({
      id: 'provenance-vendor-id',
      createdAt: new Date(),
      updatedAt: new Date(),
      userId: null,
      companyName: 'Provenance Test Business',
      taxId: '555666777',
      businessNumber: '555666777',
      address: '100 Tech Blvd',
      city: 'Ottawa',
      state: 'ON',
      zipCode: 'K1A 0B1',
      country: 'CA',
      phone: '',
      email: '',
      website: '',
      legalStructure: 'Technology',
      industryCode: '51',
      industryDescription: 'Technology services',
      dataSource: 'gov_data_source',
      verificationStatus: 'unverified',
      isActive: true
    });

    vi.mocked(storage.getVendorProfileByTaxId).mockResolvedValue(null);
    
    // Track how many times createDataProvenance is called
    const createDataProvenanceSpy = vi.spyOn(storage, 'createDataProvenance')
      .mockResolvedValue({
        id: 'provenance-id-1',
        vendorProfileId: 'provenance-vendor-id',
        fieldName: 'companyName',
        source: 'gov-data-source',
        method: 'Government Registry Import',
        timestamp: new Date()
      });

    // Process the record
    const result = await pipeline['processRecord'](record);

    // Verify processing was successful
    expect(result).not.toBeNull();
    
    // Verify that createDataProvenance was called for multiple fields
    // Based on createProvenanceEntries implementation, this should be called for several fields
    expect(createDataProvenanceSpy).toHaveBeenCalled();
    
    // Clean up the spy
    createDataProvenanceSpy.mockRestore();
  });

  it('should handle invalid records by returning null', async () => {
    const invalidRecord: ODBusRecord = {
      idx: 'test-idx-invalid',
      business_name: '', // Invalid - empty business name
      alt_business_name: '..',
      business_sector: '..',
      business_subsector: '..',
      business_description: '..',
      business_id_no: '..', // Invalid - no identifier
      licence_number: '..', // Invalid - no identifier
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

    // Process the invalid record
    const result = await pipeline['processRecord'](invalidRecord);

    // Should return null for invalid records
    expect(result).toBeNull();
    
    // Storage methods should not be called for invalid records
    expect(storage.createVendorProfile).not.toHaveBeenCalled();
  });
});