// Express server bootstrapping the backend API.
// Exposes an /api endpoint used by the frontend to analyze images via Gemini.
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { analyzeImageRoute } from "./routes/analyze.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001; // Default local port

// Middleware: CORS, JSON and URL-encoded body parsing (supports large base64 images)
app.use(cors());
app.use(express.json({ limit: "50mb" })); // For base64 images
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Health check endpoint for uptime/liveness probes
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api", analyzeImageRoute);

// Serve static files from React build (only in production)
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../dist")));

  // All other routes return the React index.html (client-side routing)
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}

// Error handling middleware (last resort)
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(500).json({
    error: "Internal server error",
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
});
