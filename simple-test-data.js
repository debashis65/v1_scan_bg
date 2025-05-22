const { Pool } = require('pg');
const crypto = require('crypto');
const { promisify } = require('util');

// Database connection
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "postgres",
  password: process.env.PGPASSWORD || "postgres",
  database: process.env.PGDATABASE || "barogrip",
  ssl: { rejectUnauthorized: false }, // Allow self-signed certificates
});

// User roles and scan status constants
const UserRole = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PATIENT: 'patient',
};

const ScanStatus = {
  QUEUED: 'queued',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
};

// Password hashing function (copy from auth.ts)
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestData() {
  try {
    // Check if test user already exists
    const existingUserResult = await pool.query(
      'SELECT * FROM users WHERE username = $1', 
      ['testpatient']
    );
    
    if (existingUserResult.rows.length > 0) {
      console.log('Test user already exists:', existingUserResult.rows[0]);
      
      // Check if scan exists
      const existingScansResult = await pool.query(
        'SELECT * FROM scans WHERE patient_id = $1',
        [existingUserResult.rows[0].id]
      );
      
      if (existingScansResult.rows.length > 0) {
        console.log('Test scan already exists:', existingScansResult.rows[0]);
        console.log(`Access the patient data API at: /api/processor/patient-data/${existingScansResult.rows[0].id}`);
        return;
      }
      
      // Create a test scan
      const scanResult = await pool.query(
        'INSERT INTO scans (patient_id, status, status_message) VALUES ($1, $2, $3) RETURNING *',
        [existingUserResult.rows[0].id, ScanStatus.QUEUED, 'Ready for processing']
      );
      
      console.log('Created test scan:', scanResult.rows[0]);
      console.log(`Access the patient data API at: /api/processor/patient-data/${scanResult.rows[0].id}`);
      return;
    }
    
    // Create a test user
    const hashedPassword = await hashPassword('password');
    
    const userResult = await pool.query(
      'INSERT INTO users (username, email, password, full_name, role) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      ['testpatient', 'test@example.com', hashedPassword, 'Test Patient', UserRole.PATIENT]
    );
    
    const user = userResult.rows[0];
    console.log('Created test user:', user);
    
    // Create a patient profile
    const profileResult = await pool.query(
      `INSERT INTO patient_profiles (
        user_id, age, gender, height, weight, shoe_size, shoe_size_unit, 
        used_orthopedic_insoles, has_diabetes, has_heel_spur, foot_pain
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
      [
        user.id, 45, 'male', 175, 80, '9', 'US', 
        true, true, false, 'Occasional heel pain'
      ]
    );
    
    console.log('Created patient profile:', profileResult.rows[0]);
    
    // Create a test scan
    const scanResult = await pool.query(
      'INSERT INTO scans (patient_id, status, status_message) VALUES ($1, $2, $3) RETURNING *',
      [user.id, ScanStatus.QUEUED, 'Ready for processing']
    );
    
    console.log('Created test scan:', scanResult.rows[0]);
    console.log(`Access the patient data API at: /api/processor/patient-data/${scanResult.rows[0].id}`);
    
    console.log('Test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

createTestData();