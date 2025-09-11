// Test POA System
// Run this in your browser console to test the POA system

async function testPOASystem() {
  console.log('🧪 Testing POA System...');
  
  try {
    // Test 1: Check if POA API endpoint works
    console.log('1. Testing POA API endpoint...');
    const response = await fetch('/api/poa/user/0x1234567890123456789012345678901234567890');
    console.log('POA API Response:', response.status, response.statusText);
    
    if (response.status === 200) {
      const data = await response.json();
      console.log('✅ POA API working! Data:', data);
    } else {
      console.log('❌ POA API error:', await response.text());
    }
    
    // Test 2: Check if POA templates endpoint works
    console.log('2. Testing POA templates endpoint...');
    const templatesResponse = await fetch('/api/poa/templates');
    console.log('Templates API Response:', templatesResponse.status, templatesResponse.statusText);
    
    if (templatesResponse.status === 200) {
      const templates = await templatesResponse.json();
      console.log('✅ POA Templates working! Count:', templates.length);
    } else {
      console.log('❌ POA Templates error:', await templatesResponse.text());
    }
    
    // Test 3: Check if main app loads without errors
    console.log('3. Checking main app...');
    const mainResponse = await fetch('/');
    console.log('Main app Response:', mainResponse.status, mainResponse.statusText);
    
    if (mainResponse.status === 200) {
      console.log('✅ Main app loading successfully!');
    } else {
      console.log('❌ Main app error:', mainResponse.status);
    }
    
    console.log('🎉 POA System Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPOASystem();
