import { CanadianBusinessRegistryProcessor } from './canadianBusinessRegistryProcessor';
import { PROVINCIAL_SOURCES } from './canadianSources';

// Define the Ontario Business Registry source with a placeholder URL
// This URL should be updated once the actual CSV download URL is found
const ONTARIO_BUSINESS_REGISTRY_SOURCE = {
  name: 'Ontario Business Registry',
  url: 'https://data.ontario.ca/dataset/ontario-business-registry/resource/dummy-csv-file.csv', // Placeholder - replace with actual URL
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

async function importOntarioBusinessRegistry(): Promise<void> {
  console.log('📥 Starting Ontario Business Registry import...');
  
  try {
    const processor = new CanadianBusinessRegistryProcessor();
    
    // First check if we have the actual Ontario Business Registry in our sources
    const ontarioSource = PROVINCIAL_SOURCES.find(source => 
      source.name.includes('Ontario') || source.name.includes('Business Registry')
    ) || ONTARIO_BUSINESS_REGISTRY_SOURCE;
    
    console.log(`🔗 Using source URL: ${ontarioSource.url}`);
    
    // Process the CSV data
    const results = await processor.processBusinessRegistryCSV(ontarioSource);
    
    console.log('\n📊 Import Results:');
    console.log(`✅ Successfully processed: ${results.processed} businesses`);
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors encountered: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Ontario Business Registry import completed!');
  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    throw error;
  }
}

// Alternative function that allows specifying a CSV file path
async function importOntarioBusinessRegistryFromLocal(csvPath: string): Promise<void> {
  console.log(`📥 Starting Ontario Business Registry import from local file: ${csvPath}`);
  
  try {
    const processor = new CanadianBusinessRegistryProcessor();
    
    // Use the Ontario source configuration
    const ontarioSource = PROVINCIAL_SOURCES.find(source => 
      source.name.includes('Ontario') || source.name.includes('Business Registry')
    ) || ONTARIO_BUSINESS_REGISTRY_SOURCE;
    
    // Process the local CSV file
    const results = await processor.processBusinessRegistryCSV(ontarioSource, csvPath);
    
    console.log('\n📊 Import Results:');
    console.log(`✅ Successfully processed: ${results.processed} businesses`);
    
    if (results.errors.length > 0) {
      console.log(`❌ Errors encountered: ${results.errors.length}`);
      results.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    console.log('\n🎉 Ontario Business Registry import from local file completed!');
  } catch (error) {
    console.error('💥 Fatal error during import:', error);
    throw error;
  }
}

// CLI runner
if (require.main === module) {
  // Check if a local file path was provided as an argument
  const localFilePath = process.argv[2];
  
  if (localFilePath) {
    console.log(`Using local file: ${localFilePath}`);
    importOntarioBusinessRegistryFromLocal(localFilePath)
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Import failed:', error);
        process.exit(1);
      });
  } else {
    importOntarioBusinessRegistry()
      .then(() => process.exit(0))
      .catch((error) => {
        console.error('Import failed:', error);
        process.exit(1);
      });
  }
}

export { importOntarioBusinessRegistry, importOntarioBusinessRegistryFromLocal };