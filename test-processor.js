const fs = require('fs');
const path = require('path');
const axios = require('axios');
const FormData = require('form-data');

// Create a test file for upload
async function createTestImage() {
  // Create uploads directory if it doesn't exist
  const uploadDir = path.join(__dirname, 'uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // Create a simple text file as a placeholder (we can't create binary images easily)
  const testFile = path.join(uploadDir, 'test_foot.txt');
  fs.writeFileSync(testFile, 'This is a placeholder for a foot image.');
  
  // Rename to .jpg for the test (this isn't a real image but works for testing)
  const testImage = path.join(uploadDir, 'test_foot.jpg');
  fs.copyFileSync(testFile, testImage);
  
  return testImage;
}

// Register a test user
async function registerUser() {
  try {
    const response = await axios.post('http://localhost:3000/api/register', {
      username: 'testpatient',
      email: 'test@example.com',
      password: 'password',
      fullName: 'Test Patient',
      role: 'patient'
    });
    
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 400) {
      // User already exists, try to login
      const login = await axios.post('http://localhost:3000/api/login', {
        username: 'testpatient',
        password: 'password'
      });
      return login.data;
    }
    throw error;
  }
}

// Upload a test scan
async function uploadTestScan(cookie) {
  const testImage = await createTestImage();
  
  const form = new FormData();
  form.append('images', fs.createReadStream(testImage));
  
  try {
    const response = await axios.post('http://localhost:3000/api/scans', form, {
      headers: {
        ...form.getHeaders(),
        Cookie: cookie
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('Error uploading scan:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Main function
async function main() {
  try {
    // Register and get cookie
    const user = await registerUser();
    console.log('Logged in as:', user.username);
    
    // Get the cookie from the response
    const cookie = 'connect.sid=s%3A12345; Path=/; HttpOnly'; // This is a dummy cookie for testing
    
    // Upload test scan
    const scan = await uploadTestScan(cookie);
    console.log('Scan created:', scan);
    
    console.log('Test completed successfully. The processor should now pick up the scan request.');
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
main();