const { pool, db } = require('server/db');
const { users, patientProfiles, scans } = require('shared/schema');
const { UserRole, ScanStatus } = require('shared/constants');
const crypto = require('crypto');
const { promisify } = require('util');

// Copy hashPassword from auth.ts since it's not directly importable in this script
const scryptAsync = promisify(crypto.scrypt);

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64));
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestData() {
  try {
    // Check if test user already exists
    const existingUser = await db.select().from(users).where(users.username.equals('testpatient'));
    
    if (existingUser.length > 0) {
      console.log('Test user already exists:', existingUser[0]);
      
      // Check if scan exists
      const existingScans = await db.select().from(scans).where(scans.patientId.equals(existingUser[0].id));
      
      if (existingScans.length > 0) {
        console.log('Test scan already exists:', existingScans[0]);
        console.log(`Access the patient data API at: /api/processor/patient-data/${existingScans[0].id}`);
        return;
      }
      
      // Create a test scan
      const [scan] = await db.insert(scans).values({
        patientId: existingUser[0].id,
        status: ScanStatus.QUEUED,
        statusMessage: 'Ready for processing'
      }).returning();
      
      console.log('Created test scan:', scan);
      console.log(`Access the patient data API at: /api/processor/patient-data/${scan.id}`);
      return;
    }
    
    // Create a test user
    const hashedPassword = await hashPassword('password');
    
    const [user] = await db.insert(users).values({
      username: 'testpatient',
      email: 'test@example.com',
      password: hashedPassword,
      fullName: 'Test Patient',
      role: UserRole.PATIENT
    }).returning();
    
    console.log('Created test user:', user);
    
    // Create a patient profile
    const [profile] = await db.insert(patientProfiles).values({
      userId: user.id,
      age: 45,
      gender: 'male',
      height: 175,
      weight: 80,
      shoeSize: '9',
      shoeSizeUnit: 'US',
      usedOrthopedicInsoles: true,
      hasDiabetes: true,
      hasHeelSpur: false,
      footPain: 'Occasional heel pain'
    }).returning();
    
    console.log('Created patient profile:', profile);
    
    // Create a test scan
    const [scan] = await db.insert(scans).values({
      patientId: user.id,
      status: ScanStatus.QUEUED,
      statusMessage: 'Ready for processing'
    }).returning();
    
    console.log('Created test scan:', scan);
    console.log(`Access the patient data API at: /api/processor/patient-data/${scan.id}`);
    
    console.log('Test data created successfully!');
  } catch (error) {
    console.error('Error creating test data:', error);
  } finally {
    // Close the database connection
    await pool.end();
  }
}

createTestData();