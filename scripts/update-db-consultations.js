// Update database to add consultation tables and doctor profile video links
const { drizzle } = require("drizzle-orm/node-postgres");
const { migrate } = require("drizzle-orm/node-postgres/migrator");
const { Pool } = require("pg");
const { eq } = require("drizzle-orm");
const path = require("path");
require("dotenv").config();

// Connect to the database
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const main = async () => {
  console.log("Running database update for consultation features...");
  
  try {
    const db = drizzle(pool);
    console.log("Connected to database");
    
    // Check if doctorProfiles table exists
    const hasGoogleMeetLink = await checkColumnExists('doctor_profiles', 'google_meet_link');
    
    if (!hasGoogleMeetLink) {
      console.log("Adding video call columns to doctor_profiles table...");
      
      // Add meeting links to doctor_profiles
      await pool.query(`
        ALTER TABLE doctor_profiles 
        ADD COLUMN IF NOT EXISTS google_meet_link TEXT,
        ADD COLUMN IF NOT EXISTS zoom_link TEXT,
        ADD COLUMN IF NOT EXISTS preferred_consultation_platform TEXT DEFAULT 'google_meet'
      `);
      
      console.log("Doctor profile columns added successfully.");
    } else {
      console.log("Doctor profile columns already exist, skipping...");
    }
    
    // Check if consultations table exists
    const hasConsultationsTable = await checkTableExists('consultations');
    
    if (!hasConsultationsTable) {
      console.log("Creating consultations table...");
      
      // Create consultations table
      await pool.query(`
        CREATE TABLE IF NOT EXISTS consultations (
          id SERIAL PRIMARY KEY,
          doctor_id INTEGER NOT NULL REFERENCES users(id),
          patient_id INTEGER NOT NULL REFERENCES users(id),
          scheduled_time TIMESTAMP NOT NULL,
          duration INTEGER NOT NULL DEFAULT 30,
          meeting_link TEXT NOT NULL,
          platform TEXT NOT NULL DEFAULT 'google_meet',
          status TEXT NOT NULL DEFAULT 'scheduled',
          notes TEXT,
          scan_id INTEGER REFERENCES scans(id),
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      console.log("Consultations table created successfully.");
    } else {
      console.log("Consultations table already exists, skipping...");
    }
    
    console.log("Database update completed successfully.");
  } catch (error) {
    console.error("Error updating database:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
};

const checkTableExists = async (tableName) => {
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
    );
  `);
  
  return rows[0].exists;
};

const checkColumnExists = async (tableName, columnName) => {
  const { rows } = await pool.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = '${tableName}'
      AND column_name = '${columnName}'
    );
  `);
  
  return rows[0].exists;
};

main();