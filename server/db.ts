import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";
import dotenv from "dotenv";
dotenv.config(); // 🔥 This was missing from your db.ts!

// Create a PostgreSQL connection pool
const pool = new Pool({
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5432,
  user: process.env.PGUSER || "barogrip",
  password: process.env.PGPASSWORD || "h9NCuO74UCyVqY9r",
  database: process.env.PGDATABASE || "barogrip_db",
  ssl: false, // Allow self-signed certificates
});

// Export the database client with the schema
export const db = drizzle(pool, { schema });
export { pool };
