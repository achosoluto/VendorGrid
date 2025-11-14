import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { finished } from 'stream/promises';
import fetch from 'node-fetch';
import csv from 'csv-parser';
import { storage } from '../storage';
import type { InsertVendorProfile, InsertDataProvenance } from '@shared/schema';
import { RawBusinessData } from '../canadianBusinessRegistryProcessor';

/**
 * Processes a local Canadian business data file or directory
 */
async function processLocalCanadianData(filePath: string, sourceName: string = 'Local File'): Promise<{ processed: number; errors: string[] }> {
  console.log(`🚀 Processing local Canadian business data from: ${filePath}`);
  
  if (!fs.existsSync(filePath)) {
    throw new Error(`Path does not exist: ${filePath}`);
  }
  
  const results = { processed: 0, errors: [] as string[] };
  
  try {
    const stats = fs.statSync(filePath);
    
    if (stats.isDirectory()) {
      // Process directory - look for CSV files within
      results.processed = await processDirectory(filePath, sourceName);
    } else if (stats.isFile()) {
      // Process single file based on extension
      const ext = path.extname(filePath).toLowerCase();
      
      if (ext === '.csv') {
        // Process as CSV file
        results.processed = await processCSVFile(filePath, sourceName);
      } else if (ext === '.zip') {
        // For ZIP files we'd need to extract and process contents
        // This is a simplified approach that would need expansion
        console.log('ZIP file detected - this would require extraction and processing of contents');
        results.errors.push('ZIP file processing requires extraction of contents - implement specific handling');
      } else {
        results.errors.push(`Unsupported file type: ${ext}`);
      }
    } else {
      results.errors.push(`Path is neither file nor directory: ${filePath}`);
    }
  } catch (error) {
    results.errors.push(`Processing error: ${error.message}`);
    console.error('Error processing file:', error);
  }
  
  return results;
}

/**
 * Processes a directory containing business data files
 */
async function processDirectory(dirPath: string, sourceName: string): Promise<number> {
  let totalRecords = 0;
  
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    const stats = fs.statSync(fullPath);
    
    if (stats.isDirectory()) {
      // Process subdirectory recursively
      console.log(`Processing subdirectory: ${fullPath}`);
      totalRecords += await processDirectory(fullPath, sourceName);
    } else if (stats.isFile() && path.extname(item).toLowerCase() === '.csv') {
      // Process CSV file
      console.log(`Processing CSV file: ${fullPath}`);
      totalRecords += await processCSVFile(fullPath, sourceName);
    }
  }
  
  return totalRecords;
}

/**
 * Processes a CSV file with Canadian business data
 */
async function processCSVFile(filePath: string, sourceName: string): Promise<number> {
  return new Promise((resolve, reject) => {
    let recordCount = 0;
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', async (row) => {
        try {
          // Map the CSV row to business data format
          // The Statistics Canada data has different column names
          const businessData: RawBusinessData = {
            companyName: row['business_name'] || row['company_name'] || row['corpName'] || '',
            businessNumber: row['business_id_no'] || row['business_number'] || row['business_id'] || row['corpNum'] || '',
            address: row['full_address'] || row['business_address'] || row['address'] || row['regOffAddr'] || '',
            city: row['city'] || '',
            province: row['prov_terr'] || row['province'] || row['province_territory'] || '',
            postalCode: row['postal_code'] || row['postal_cd'] || '',
            phone: row['phone'] || row['telephone'] || '',
            email: row['email'] || '',
            website: row['website'] || ''
          };

          // Validate required fields (at minimum need a company name)
          if (businessData.companyName && businessData.companyName.trim() !== '') {
            await saveBusinessRecord(businessData, sourceName);
            recordCount++;
            
            if (recordCount % 1000 === 0) {
              console.log(`Processed ${recordCount} records...`);
            }
          }
        } catch (error) {
          console.error('Error processing row:', error);
          // Continue processing other records
        }
      })
      .on('end', () => {
        console.log(`✅ Completed processing. Total records: ${recordCount}`);
        resolve(recordCount);
      })
      .on('error', reject);
  });
}

/**
 * Saves a business record to the database
 */
async function saveBusinessRecord(business: RawBusinessData, sourceName: string): Promise<void> {
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

  console.log(`Created vendor stub: ${business.companyName} (${business.businessNumber}) from ${sourceName}`);
}

// CLI runner
async function runIfMain() {
  const scriptPath = process.argv[1];
  const filePath = process.argv[2]; // Get file path from command line arguments
  
  // Check if this script is being run directly by checking if it's included in the process.argv
  const isRunningDirectly = scriptPath && scriptPath.includes('processLocalData');
  
  if (isRunningDirectly) {
    if (!filePath) {
      console.error('❌ Please provide a file path as an argument');
      console.error('Usage: npx tsx processLocalData.ts /path/to/your/file.csv');
      process.exit(1);
    }
    
    try {
      const results = await processLocalCanadianData(filePath);
      console.log('\n📊 Processing Results:');
      console.log(`✅ Successfully processed: ${results.processed} records`);
      
      if (results.errors.length > 0) {
        console.log(`❌ Errors encountered: ${results.errors.length}`);
        results.errors.forEach(error => console.log(`  - ${error}`));
      }
      
      console.log('\n🎉 Processing completed!');
    } catch (error) {
      console.error('💥 Fatal error during processing:', error);
      process.exit(1);
    }
  }
}

// Execute if run directly
runIfMain().catch(error => {
  console.error('Error running script:', error);
  process.exit(1);
});

export { processLocalCanadianData };