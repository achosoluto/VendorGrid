import { encrypt, decrypt } from './encryption';

interface TestCase {
  name: string;
  input: string;
  shouldRoundtrip: boolean;
}

const testCases: TestCase[] = [
  { name: 'Empty string', input: '', shouldRoundtrip: true },
  { name: 'Whitespace only', input: '   ', shouldRoundtrip: true },
  { name: 'Single space', input: ' ', shouldRoundtrip: true },
  { name: 'Normal text', input: 'Hello, World!', shouldRoundtrip: true },
  { name: 'Account number', input: '1234567890', shouldRoundtrip: true },
  { name: 'Routing number', input: '021000021', shouldRoundtrip: true },
  { name: 'Special characters', input: 'Test!@#$%^&*()_+-={}[]|\\:";\'<>?,./~`', shouldRoundtrip: true },
  { name: 'Unicode characters', input: '你好世界 🌍 Привет мир', shouldRoundtrip: true },
  { name: 'Very long string', input: 'A'.repeat(10000), shouldRoundtrip: true },
  { name: 'Newlines and tabs', input: 'Line1\nLine2\tTabbed', shouldRoundtrip: true },
];

function runTests() {
  console.log('🔐 Running Encryption Edge Case Tests\n');
  
  let passed = 0;
  let failed = 0;

  // Test 1: Basic roundtrip encryption/decryption
  console.log('Test Suite 1: Roundtrip Encryption/Decryption');
  console.log('='.repeat(50));
  
  for (const testCase of testCases) {
    try {
      const encrypted = encrypt(testCase.input);
      const decrypted = decrypt(encrypted);
      
      if (testCase.input === decrypted) {
        console.log(`✅ ${testCase.name}: PASS`);
        passed++;
      } else {
        console.log(`❌ ${testCase.name}: FAIL`);
        console.log(`   Expected: "${testCase.input}"`);
        console.log(`   Got: "${decrypted}"`);
        failed++;
      }
    } catch (error: any) {
      console.log(`❌ ${testCase.name}: ERROR - ${error.message}`);
      failed++;
    }
  }

  // Test 2: Empty string handling
  console.log('\nTest Suite 2: Empty String Handling');
  console.log('='.repeat(50));
  
  try {
    const emptyEncrypted = encrypt('');
    if (emptyEncrypted === '') {
      console.log('✅ Empty string returns empty: PASS');
      passed++;
    } else {
      console.log('❌ Empty string should return empty: FAIL');
      failed++;
    }

    const emptyDecrypted = decrypt('');
    if (emptyDecrypted === '') {
      console.log('✅ Decrypt empty returns empty: PASS');
      passed++;
    } else {
      console.log('❌ Decrypt empty should return empty: FAIL');
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Empty string handling: ERROR - ${error.message}`);
    failed++;
  }

  // Test 3: Double encryption (repeated masking)
  console.log('\nTest Suite 3: Double Encryption Prevention');
  console.log('='.repeat(50));
  
  try {
    const original = '1234567890';
    const encrypted1 = encrypt(original);
    const encrypted2 = encrypt(encrypted1); // Encrypt already encrypted data
    const decrypted2 = decrypt(encrypted2);
    const decrypted1 = decrypt(decrypted2);

    if (decrypted1 === original) {
      console.log('✅ Double encryption roundtrip: PASS');
      passed++;
    } else {
      console.log('❌ Double encryption roundtrip: FAIL');
      console.log(`   Expected: "${original}"`);
      console.log(`   Got: "${decrypted1}"`);
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Double encryption: ERROR - ${error.message}`);
    failed++;
  }

  // Test 4: Consistency (same input produces different encrypted outputs due to random salt/IV)
  console.log('\nTest Suite 4: Encryption Randomness');
  console.log('='.repeat(50));
  
  try {
    const input = 'test123';
    const encrypted1 = encrypt(input);
    const encrypted2 = encrypt(input);
    
    if (encrypted1 !== encrypted2) {
      console.log('✅ Same input produces different ciphertext (salt/IV randomness): PASS');
      passed++;
    } else {
      console.log('❌ Same input should produce different ciphertext: FAIL');
      failed++;
    }

    const decrypted1 = decrypt(encrypted1);
    const decrypted2 = decrypt(encrypted2);
    
    if (decrypted1 === input && decrypted2 === input) {
      console.log('✅ Both decrypt to original value: PASS');
      passed++;
    } else {
      console.log('❌ Decryption failed: FAIL');
      failed++;
    }
  } catch (error: any) {
    console.log(`❌ Encryption randomness: ERROR - ${error.message}`);
    failed++;
  }

  // Test 5: Invalid encrypted data handling
  console.log('\nTest Suite 5: Invalid Encrypted Data Handling');
  console.log('='.repeat(50));
  
  const invalidInputs = [
    { name: 'Random string', value: 'not-base64-encrypted-data' },
    { name: 'Corrupted base64', value: 'SGVsbG8gV29ybGQ=' }, // Valid base64 but not our format
    { name: 'Partial encrypted data', value: encrypt('test').slice(0, 20) },
  ];

  for (const invalid of invalidInputs) {
    try {
      const result = decrypt(invalid.value);
      console.log(`❌ ${invalid.name}: Should have thrown error but got "${result}"`);
      failed++;
    } catch (error: any) {
      console.log(`✅ ${invalid.name}: Correctly threw error - ${error.message.slice(0, 50)}`);
      passed++;
    }
  }

  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('Test Summary');
  console.log('='.repeat(50));
  console.log(`Total: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success Rate: ${((passed / (passed + failed)) * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  } else {
    console.log('\n⚠️  Some tests failed!');
    process.exit(1);
  }
}

// Check for SESSION_SECRET
if (!process.env.SESSION_SECRET) {
  console.error('❌ SESSION_SECRET environment variable is required');
  process.exit(1);
}

runTests();
