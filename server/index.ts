import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { app, server } from "./app";

// Load environment variables
dotenv.config();

// Ensure the uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Set server port - for API server we use 3000 to avoid conflict with the client
const PORT = 3000;

// Start the server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Barogrip API server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`Database: ${process.env.PGDATABASE || "neondb"}`);
  
  // Log Replit domain info for reference
  const replitDomain = process.env.REPLIT_DOMAINS || '(unknown domain)';
  console.log(`Note: API is not directly accessible, client proxy at https://${replitDomain} handles API requests`);
});

// Handle graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down gracefully");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});