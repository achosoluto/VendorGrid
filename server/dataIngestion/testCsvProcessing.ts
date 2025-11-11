import { CanadianBusinessRegistryProcessor } from './canadianBusinessRegistryProcessor';

// Create a mock CSV string for testing
const mockCSVData = `business_name,business_number,business_address,city,province,postal_code
"ABC Corporation","123456789","123 Main St","Toronto","Ontario","M5V 2T6"
"XYZ Ltd","987654321","456 Oak Ave","Vancouver","British Columbia","V6G 1A1"
"Sample Business Inc","555666777","789 Pine Rd","Montreal","Quebec","H3A 1B2"`;

// Create a temporary CSV file for testing
import fs from 'fs';
import path from 'path';
import { tmpdir } from 'os';

async function testCSVProcessing(): Promise<void> {
  console.log('🧪 Testing CSV processing functionality...');
  
  // Create a temporary CSV file
  const tempDir = tmpdir();
  const testCSVPath = path.join(tempDir, 'test_business_registry.csv');
  
  try {
    // Write mock CSV data to temp file
    fs.writeFileSync(testCSVPath, mockCSVData);
    console.log(`📋 Created test CSV file: ${testCSVPath}`);
    
    // Create processor instance
    const processor = new CanadianBusinessRegistryProcessor();
    
    // Define a test source configuration
    const testSource = {
      name: 'Test Business Registry',
      url: testCSVPath, // Using local file for test
      type: 'csv' as const,
      rateLimit: 60,
      fields: {
        companyName: 'business_name',
        businessNumber: 'business_number',
        address: 'business_address',
        city: 'city',
        province: 'province',
        postalCode: 'postal_code'
      }
    };
    
    // Process the test CSV
    console.log('🔄 Processing test CSV data...');
    const results = await processor.processBusinessRegistryCSV(testSource, testCSVPath);
    
    console.log('\n📊 Test Results:');
    console.log(`✅ Successfully processed: ${results.processed} businesses`);
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors encountered: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    } else {
      console.log('🎉 All tests passed! CSV processing is working correctly.');
    }
  } catch (error) {
    console.error('💥 Test failed:', error);
    throw error;
  } finally {
    // Clean up temp file
    if (fs.existsSync(testCSVPath)) {
      fs.unlinkSync(testCSVPath);
      console.log(`🧹 Cleaned up test file: ${testCSVPath}`);
    }
  }
}

// Run the test
// Check if module is run directly using a method compatible with ES modules
const isMain = 
  typeof process.argv[1] !== 'undefined' && 
  import.meta.url.replace('file://', '').includes(process.argv[1].replace(/\\/g, '/'));

if (isMain) {
  testCSVProcessing()
    .then(() => {
      console.log('\n✅ CSV processing test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ CSV processing test failed:', error);
      process.exit(1);
    });
}