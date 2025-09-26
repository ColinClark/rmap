const testAPI = async () => {
  try {
    const response = await fetch('http://localhost:4000/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `test${Date.now()}@example.com`,
        password: 'TestPass123!',
        name: 'Test User',
        tenantName: `Test Company ${Date.now()}`
      })
    });

    const text = await response.text();
    console.log('Response status:', response.status);
    console.log('Response text:', text);

    try {
      const data = JSON.parse(text);
      console.log('Parsed data:', JSON.stringify(data, null, 2));
    } catch(e) {
      console.log('Could not parse as JSON');
    }
  } catch (error) {
    console.error('Error:', error);
  }
};

testAPI();