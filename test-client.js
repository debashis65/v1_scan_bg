// We need to use dynamic import for node-fetch
import('node-fetch').then(({ default: fetch }) => {
  // Execute tests once fetch is imported
  runTests(fetch);
});

// Register a test user
async function registerUser(fetch) {
  try {
    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testdoctor',
        email: 'doctor@example.com',
        password: 'password123',
        fullName: 'Dr. Test Doctor',
        role: 'doctor',
        specialty: 'Podiatry',
        license: 'MED123456',
        hospital: 'General Hospital',
        bio: 'Experienced podiatrist specializing in foot biomechanics'
      }),
    });

    const data = await response.json();
    console.log('Registration response:', data);
    return data;
  } catch (error) {
    console.error('Error during registration:', error);
  }
}

// Login a user
async function loginUser(fetch, email, password) {
  try {
    const response = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });

    const data = await response.json();
    console.log('Login response:', data);
    return data;
  } catch (error) {
    console.error('Error during login:', error);
  }
}

// Register a patient user
async function registerPatient(fetch) {
  try {
    const response = await fetch('http://localhost:3000/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username: 'testpatient',
        email: 'patient@example.com',
        password: 'password123',
        fullName: 'Test Patient',
        role: 'patient',
        age: 35,
        gender: 'male',
        height: 180, // cm
        weight: 80, // kg
        shoeSize: '42',
        shoeSizeUnit: 'EU',
        usedOrthopedicInsoles: true,
        hasDiabetes: false,
        hasHeelSpur: true,
        footPain: 'Occasional heel pain in the mornings'
      }),
    });

    const data = await response.json();
    console.log('Patient registration response:', data);
    return data;
  } catch (error) {
    console.error('Error during patient registration:', error);
  }
}

// Run the tests
async function runTests(fetch) {
  // Register a doctor
  await registerUser(fetch);
  
  // Register a patient
  await registerPatient(fetch);
  
  // Test login
  await loginUser(fetch, 'doctor@example.com', 'password123');
}

// Execution happens in the import callback above