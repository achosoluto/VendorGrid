import 'dotenv/config';
import { db } from './server/db';
import { vendorProfiles } from './shared/schema';
import { storage } from './server/storage';

// Test inserting a record with special characters to see if that's the issue
async function test() {
  try {
    console.log('Testing direct database insert with special characters...');
    
    // Try creating a vendor with a name that has no special characters
    const testVendor = {
      userId: null,
      companyName: 'Test Company Without Parentheses',
      taxId: '123456789',
      businessNumber: '123456789',
      address: '123 Main St',
      city: 'Toronto',
      state: 'ON',
      zipCode: 'M5V 2T6',
      country: 'CA',
      phone: '416-555-0123',
      email: 'test@example.com',
      website: 'https://example.com',
      dataSource: 'test_import',
      verificationStatus: 'unverified',
      isActive: true
    };

    const profile = await storage.createVendorProfile(testVendor);
    console.log('Success! Inserted test record:', profile.id);
  } catch (error) {
    console.error('Error in test:', error.message);
  }
}

// Run the test
test().catch(console.error);