#!/usr/bin/env tsx

import 'dotenv/config';
import { CanadianDataIngestionPipeline } from '../server/dataIngestion/ingestionPipeline';
import { storage } from '../server/storage';
import { db } from '../server/db';
import { vendorProfiles } from '../shared/schema';

// Sample Canadian business data for testing
const SAMPLE_CANADIAN_BUSINESSES = [
  {
    companyName: 'Shopify Inc.',
    businessNumber: '123456789',
    address: '150 Elgin Street',
    city: 'Ottawa',
    province: 'Ontario',
    postalCode: 'K2P1L4',
    phone: '613-241-2244',
    email: 'contact@shopify.ca',
    website: 'https://www.shopify.ca'
  },
  {
    companyName: 'Tim Hortons Inc.',
    businessNumber: '987654321',
    address: '130 King Street West',
    city: 'Toronto',
    province: 'Ontario', 
    postalCode: 'M5X1E1',
    phone: '416-862-5757',
    email: 'info@timhortons.com',
    website: 'https://www.timhortons.com'
  },
  {
    companyName: 'Bombardier Inc.',
    businessNumber: '456789123',
    address: '400 Côte-Vertu Road West',
    city: 'Dorval',
    province: 'Quebec',
    postalCode: 'H4R2K5',
    phone: '514-861-9481',
    email: 'info@bombardier.com',
    website: 'https://www.bombardier.com'
  },
  {
    companyName: 'Lululemon Athletica Inc.',
    businessNumber: '789123456',
    address: '1818 Cornwall Avenue',
    city: 'Vancouver',
    province: 'British Columbia',
    postalCode: 'V6J1C7',
    phone: '604-732-6124',
    email: 'info@lululemon.com',
    website: 'https://www.lululemon.com'
  },
  {
    companyName: 'Canadian Tire Corporation',
    businessNumber: '321654987',
    address: '2180 Yonge Street',
    city: 'Toronto',
    province: 'Ontario',
    postalCode: 'M4S2B9',
    phone: '416-480-3000',
    email: 'customerservice@canadiantire.ca',
    website: 'https://www.canadiantire.ca'
  }
];

async function ingestSampleData() {
  console.log('🍁 Starting Canadian business data ingestion...');
  console.log(`📊 Processing ${SAMPLE_CANADIAN_BUSINESSES.length} sample businesses`);

  const pipeline = new CanadianDataIngestionPipeline();
  let processed = 0;
  const errors: string[] = [];

  for (const business of SAMPLE_CANADIAN_BUSINESSES) {
    try {
      // Check if already exists
      const existing = await storage.getVendorProfileByTaxId(business.businessNumber);
      if (existing) {
        console.log(`⏭️  Skipping ${business.companyName} - already exists`);
        continue;
      }

      // Create vendor profile directly using our enhanced schema
      const vendorProfile = {
        userId: null, // No user attached - public business record
        companyName: business.companyName,
        taxId: business.businessNumber,
        businessNumber: business.businessNumber,
        address: business.address,
        city: business.city,
        state: business.province,
        zipCode: business.postalCode,
        country: 'CA' as const,
        phone: business.phone,
        email: business.email,
        website: business.website,
        dataSource: 'sample_data_import',
        verificationStatus: 'unverified' as const,
        isActive: true
      };

      const profile = await storage.createVendorProfile(vendorProfile);

      // Create data provenance entries
      const provenanceFields = ['companyName', 'taxId', 'businessNumber', 'address', 'city', 'state', 'zipCode', 'country'];
      for (const fieldName of provenanceFields) {
        await storage.createDataProvenance({
          vendorProfileId: profile.id,
          fieldName,
          source: 'Sample Canadian Business Data',
          method: 'Manual Data Entry'
        });
      }

      console.log(`✅ Created: ${business.companyName} (${business.businessNumber})`);
      processed++;

    } catch (error) {
      const errorMsg = `Failed to process ${business.companyName}: ${error.message}`;
      console.error(`❌ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log('\n🎉 Data ingestion complete!');
  console.log(`📈 Results:`);
  console.log(`   • Processed: ${processed} businesses`);
  console.log(`   • Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\n❌ Errors encountered:');
    errors.forEach(error => console.log(`   - ${error}`));
  }

  // Show some stats
  console.log('\n📊 Database Summary:');
  try {
    const allVendors = await db.select().from(vendorProfiles);
    console.log(`   • Total vendors in database: ${allVendors.length}`);
    
    const canadianVendors = allVendors.filter(v => v.country === 'CA');
    console.log(`   • Canadian vendors: ${canadianVendors.length}`);
    
    const verificationStats = allVendors.reduce((acc, v) => {
      acc[v.verificationStatus] = (acc[v.verificationStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    console.log('   • Verification status breakdown:');
    Object.entries(verificationStats).forEach(([status, count]) => {
      console.log(`     - ${status}: ${count}`);
    });
  } catch (error) {
    console.error('Error getting database stats:', error);
  }
}

// Run the ingestion
console.log('🚀 Script starting...');
if (true) {
  ingestSampleData()
    .then(() => {
      console.log('✨ Canadian business data ingestion completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Fatal error during ingestion:', error);
      process.exit(1);
    });
}

export { ingestSampleData };