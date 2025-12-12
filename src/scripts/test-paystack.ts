// Quick test to verify Paystack is working
// Run: npx ts-node -r tsconfig-paths/register src/scripts/test-paystack.ts

import { config } from 'dotenv';
config();

const Paystack = require('paystack-node');

async function testPaystack() {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    console.error('❌ PAYSTACK_SECRET_KEY not found in .env');
    process.exit(1);
  }

  console.log('🔍 Testing Paystack connection...');
  console.log('📝 Using key:', secretKey.substring(0, 15) + '...');

  const paystack = new Paystack(secretKey);

  try {
    // Test 1: Initialize a test transaction
    console.log('\n✅ Test 1: Initialize transaction');
    const response = await paystack.transaction.initialize({
      email: 'test@example.com',
      amount: 100000, // KES 1,000
      currency: 'KES',
      channels: ['mobile_money', 'card'],
    });

    console.log('✅ Transaction initialized successfully!');
    console.log('   Reference:', response.data.reference);
    console.log('   Payment URL:', response.data.authorization_url);

    // Test 2: Verify the transaction (will be pending)
    console.log('\n✅ Test 2: Verify transaction');
    const verification = await paystack.transaction.verify(
      response.data.reference,
    );
    console.log('✅ Verification works!');
    console.log('   Status:', verification.data.status);

    console.log('\n✅✅✅ ALL TESTS PASSED! ✅✅✅');
    console.log('🎉 Paystack is ready to accept payments!');
    console.log('');
    console.log('💡 Next steps:');
    console.log('   1. Start your backend: npm run start:dev');
    console.log('   2. Test GraphQL mutation: initializePaystackPayment');
    console.log('   3. Build frontend payment page');
    console.log('');
  } catch (error: any) {
    console.error('\n❌ TEST FAILED!');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

testPaystack();
