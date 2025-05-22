require('dotenv').config();
const { drizzle } = require('drizzle-orm/node-postgres');
const { migrate } = require('drizzle-orm/node-postgres/migrator');
const { Pool } = require('pg');
const { join } = require('path');

async function main() {
  console.log('Connecting to database...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
	host: process.env.PGHOST || "localhost",
	port: Number(process.env.PGPORT) || 5432,
	user: process.env.PGUSER || "barogrip",
	password: process.env.PGPASSWORD || "h9NCuO74UCyVqY9r",
	database: process.env.PGDATABASE || "barogrip_db",
    ssl: false, // Allow self-signed certificates
  });

  const db = drizzle(pool);
  
  console.log("PG ENV:", {
  host: process.env.PGHOST,
  port: process.env.PGPORT,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
});

  console.log('Pushing schema to database...');
  // Using simple migration with schema modules
  try {
    console.log('Creating tables if they don\'t exist...');
    await db.execute(`
      DROP TABLE IF EXISTS users CASCADE;
      
      CREATE TABLE users (
        id SERIAL PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        full_name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'patient',
        session_token TEXT,
        session_expiry TIMESTAMP,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      DROP TABLE IF EXISTS patient_profiles CASCADE;
      DROP TABLE IF EXISTS doctor_profiles CASCADE;
      DROP TABLE IF EXISTS scans CASCADE;
      DROP TABLE IF EXISTS prescriptions CASCADE;
      DROP TABLE IF EXISTS scan_images CASCADE;
      DROP TABLE IF EXISTS consultations CASCADE;

      CREATE TABLE patient_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        age INTEGER,
        gender TEXT,
        height REAL,
        weight REAL,
        shoe_size TEXT,
        shoe_size_unit TEXT DEFAULT 'UK',
        used_orthopedic_insoles BOOLEAN DEFAULT FALSE,
        has_diabetes BOOLEAN DEFAULT FALSE,
        has_heel_spur BOOLEAN DEFAULT FALSE,
        foot_pain TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE doctor_profiles (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        specialty TEXT,
        license TEXT,
        hospital TEXT,
        bio TEXT,
        google_meet_link TEXT,
        zoom_link TEXT,
        preferred_consultation_platform TEXT DEFAULT 'google_meet',
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE scans (
        id SERIAL PRIMARY KEY,
        patient_id INTEGER NOT NULL REFERENCES users(id),
        status TEXT NOT NULL DEFAULT 'queued',
        status_message TEXT,
        error_type TEXT,
        retry_count INTEGER DEFAULT 0,
        process_started_at TIMESTAMP,
        process_completed_at TIMESTAMP,
        obj_url TEXT,
        stl_url TEXT,
        thumbnail_url TEXT,
        ai_diagnosis TEXT,
        ai_diagnosis_details JSONB,
        ai_confidence REAL,
        doctor_notes TEXT,
        doctor_id INTEGER REFERENCES users(id),
        foot_length REAL,
        foot_width REAL,
        arch_height REAL,
        instep_height REAL,
        is_encrypted BOOLEAN DEFAULT FALSE,
        encryption_details JSONB,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE prescriptions (
        id SERIAL PRIMARY KEY,
        scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
        doctor_id INTEGER NOT NULL REFERENCES users(id),
        patient_id INTEGER NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        recommended_product TEXT,
        recommended_exercises TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE scan_images (
        id SERIAL PRIMARY KEY,
        scan_id INTEGER NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL,
        position TEXT NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE consultations (
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
      );
      
      DROP TABLE IF EXISTS "session" CASCADE;
      
      CREATE TABLE "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      );
    `);
    console.log('Database schema pushed successfully');
  } catch (error) {
    console.error('Error pushing schema to database:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});