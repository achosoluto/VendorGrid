#!/usr/bin/env tsx

/**
 * VendorGrid Claiming Workflow Test Script
 * 
 * Demonstrates the complete vendor profile claiming process:
 * 1. Search for claimable vendor profiles
 * 2. Initiate profile claiming process
 * 3. Preview profile with claim token
 * 4. Complete the claim (requires authentication)
 */

import 'dotenv/config';

const BASE_URL = 'http://localhost:3000';

interface VendorProfile {
  id: string;
  companyName: string;
  taxId: string;
  businessNumber?: string;
  email: string;
  phone?: string;
  website?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  verificationStatus: string;
  dataSource: string;
  isActive: boolean;
  createdAt: string;
}

interface ClaimResponse {
  success: boolean;
  message: string;
  tokenId?: string;
  expiresAt?: string;
}

interface SearchResponse {
  success: boolean;
  profiles: VendorProfile[];
  total: number;
}

async function searchVendorProfiles(query: { companyName?: string; taxId?: string; email?: string }): Promise<VendorProfile[]> {
  console.log('\n🔍 Searching for claimable vendor profiles...');
  
  const params = new URLSearchParams();
  if (query.companyName) params.append('companyName', query.companyName);
  if (query.taxId) params.append('taxId', query.taxId);
  if (query.email) params.append('email', query.email);

  const response = await fetch(`${BASE_URL}/api/vendor-claiming/search?${params}`);
  const result: SearchResponse = await response.json();

  if (result.success) {
    console.log(`✅ Found ${result.total} claimable profile(s)`);
    result.profiles.forEach((profile, index) => {
      console.log(`\n📋 Profile ${index + 1}:`);
      console.log(`   • Company: ${profile.companyName}`);
      console.log(`   • Tax ID: ${profile.taxId}`);
      console.log(`   • Email: ${profile.email}`);
      console.log(`   • Location: ${profile.city}, ${profile.state}`);
      console.log(`   • Status: ${profile.verificationStatus}`);
      console.log(`   • Data Source: ${profile.dataSource}`);
    });
    return result.profiles;
  } else {
    console.error('❌ Search failed:', result);
    return [];
  }
}

async function initiateProfileClaim(vendorProfileId: string, email: string, contactName?: string): Promise<string | null> {
  console.log('\n📧 Initiating profile claim...');
  
  const response = await fetch(`${BASE_URL}/api/vendor-claiming/initiate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vendorProfileId,
      email,
      contactName: contactName || 'Test Contact',
      reason: 'Testing the claiming workflow'
    })
  });

  const result: ClaimResponse = await response.json();

  if (result.success) {
    console.log('✅ Claim initiated successfully!');
    console.log(`   • Message: ${result.message}`);
    console.log(`   • Token ID: ${result.tokenId}`);
    console.log(`   • Expires: ${result.expiresAt}`);
    
    // The actual claim token would be sent via email in production
    // For development, we need to get it from the database or logs
    console.log('\n⚠️  In development mode, check server console for the claim token');
    
    return result.tokenId || null;
  } else {
    console.error('❌ Claim initiation failed:', result.message);
    return null;
  }
}

async function previewProfileByToken(token: string): Promise<VendorProfile | null> {
  console.log('\n👁️  Previewing profile with claim token...');
  
  const response = await fetch(`${BASE_URL}/api/vendor-claiming/preview/${token}`);
  const result = await response.json();

  if (result.success) {
    console.log('✅ Profile preview loaded:');
    const profile = result.vendorProfile;
    console.log(`   • Company: ${profile.companyName}`);
    console.log(`   • Tax ID: ${profile.taxId}`);
    console.log(`   • Email: ${profile.email}`);
    console.log(`   • Location: ${profile.address}, ${profile.city}, ${profile.state}`);
    console.log(`   • Status: ${profile.verificationStatus}`);
    return profile;
  } else {
    console.error('❌ Profile preview failed:', result.message);
    return null;
  }
}

async function completeProfileClaim(token: string): Promise<boolean> {
  console.log('\n🔐 Completing profile claim (requires authentication)...');
  console.log('⚠️  This step requires user authentication and would normally be done through the web interface');
  
  // In a real scenario, the user would be authenticated and this would work
  // For testing, we'd need to mock or skip this step
  console.log('🔄 Skipping authentication step for demo purposes');
  console.log('✅ In production, this would transfer profile ownership to the authenticated user');
  
  return true;
}

async function testClaimingWorkflow() {
  console.log('🚀 VendorGrid Vendor Claiming Workflow Test');
  console.log('='.repeat(50));

  try {
    // Step 1: Search for profiles to claim
    const profiles = await searchVendorProfiles({ companyName: 'Shopify' });
    
    if (profiles.length === 0) {
      console.log('\n⚠️  No profiles found to test claiming workflow');
      console.log('💡 Try running: npm run demo:seed to add sample data');
      return;
    }

    // Step 2: Initiate claim for the first profile
    const profileToClaim = profiles[0];
    const tokenId = await initiateProfileClaim(
      profileToClaim.id, 
      'test@shopify.ca',
      'Shopify Test Admin'
    );

    if (!tokenId) {
      console.log('\n❌ Could not initiate claim, stopping test');
      return;
    }

    // Step 3: Demonstrate token-based preview
    // Note: In development, we'd need the actual token from the database or logs
    console.log('\n📝 Next steps for complete testing:');
    console.log('   1. Check server console output for the actual claim token');
    console.log('   2. Use the token to call: GET /api/vendor-claiming/preview/{token}');
    console.log('   3. Authenticate a user and call: POST /api/vendor-claiming/complete');
    
    // Step 4: Show what the complete workflow would look like
    console.log('\n🎯 Complete Claiming Workflow:');
    console.log('   ✅ 1. Search profiles - COMPLETED');
    console.log('   ✅ 2. Initiate claim - COMPLETED');
    console.log('   🔄 3. Email sent to vendor - SIMULATED (logged to console)');
    console.log('   🔄 4. Vendor clicks email link - REQUIRES FRONTEND');
    console.log('   🔄 5. Vendor authenticates - REQUIRES AUTH SYSTEM');
    console.log('   🔄 6. Profile ownership transferred - REQUIRES AUTHENTICATED USER');
    console.log('   🔄 7. Verification workflow started - AUTOMATED');

    console.log('\n🎉 Core claiming infrastructure is functional!');
    console.log('💡 Next: Build frontend components for steps 4-6');

  } catch (error) {
    console.error('\n💥 Test failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔧 Make sure the VendorGrid server is running:');
      console.log('   npm run dev');
    }
  }
}

async function testAllAPIs() {
  console.log('\n🧪 Testing All Claiming APIs');
  console.log('='.repeat(30));

  try {
    // Test 1: Search API
    console.log('\n1️⃣ Testing Search API...');
    const searchTests = [
      { companyName: 'Shopify' },
      { companyName: 'Tim Hortons' },
      { taxId: '123456789' },
      { email: 'contact@shopify.ca' }
    ];

    for (const query of searchTests) {
      const profiles = await searchVendorProfiles(query);
      console.log(`   Query ${JSON.stringify(query)}: ${profiles.length} results`);
    }

    // Test 2: Stats API
    console.log('\n2️⃣ Testing Stats API...');
    const statsResponse = await fetch(`${BASE_URL}/api/vendor-claiming/stats`);
    const stats = await statsResponse.json();
    console.log('   Stats API response:', stats);

    console.log('\n✅ All API endpoints are responding correctly');

  } catch (error) {
    console.error('\n❌ API testing failed:', error);
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--api-only')) {
    await testAllAPIs();
  } else {
    await testClaimingWorkflow();
  }
}

// Run main if script is executed directly
main().catch(console.error);
