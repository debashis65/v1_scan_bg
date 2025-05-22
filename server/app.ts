import express from "express";
import cors from "cors";
import { json, urlencoded } from "body-parser";
import { registerRoutes } from "./routes";
import path from "path";

// Create Express app
const app = express();

// Configure middleware
app.use(cors({
  origin: process.env.NODE_ENV === "production"
    ? [
        process.env.CLIENT_URL || "https://barogrip.com",
        process.env.DASHBOARD_URL || "https://dashboard.barogrip.com"
      ]
    : ["http://localhost:5000", "http://localhost:5001"],
  credentials: true,
}));

app.use(json({ limit: "50mb" }));
app.use(urlencoded({ extended: true, limit: "50mb" }));

// Serve static files from uploads directory
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// Serve static files from scan output directory
app.use("/scans", express.static(path.join(__dirname, "../output")));

// Register routes and create HTTP server
const server = registerRoutes(app);

export { app, server };
