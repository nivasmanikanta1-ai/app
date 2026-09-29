import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;
const app = express();
const port = process.env.PORT || 5000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.DATABASE_URL &&
    !process.env.DATABASE_URL.includes("localhost")
      ? { rejectUnauthorized: false }
      : false,
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "*",
  })
);

app.use(express.json());


// ===============================
// HOME ROUTE
// ===============================
app.get("/", (_req, res) => {
  res.json({
    message: "Finder API is running successfully!",
    status: "OK",
  });
});


// ===============================
// HEALTH CHECK
// ===============================
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");

    res.json({
      ok: true,
      message: "Finder API and PostgreSQL are connected.",
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      message: error.message,
    });
  }
});


// ===============================
// GET COURSES
// ===============================
app.get("/api/courses", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT id, name FROM courses ORDER BY name ASC"
    );

    res.json(result.rows);
  } catch (error) {
    res.status(500).json({
      error: "Failed to load courses.",
    });
  }
});


// ===============================
// GET CITIES
// ===============================
app.get("/api/cities", async (_req, res) => {
  try {
    const result = await pool.query(
      "SELECT DISTINCT city FROM institutes ORDER BY city ASC"
    );

    res.json(result.rows.map((row) => row.city));
  } catch (error) {
    res.status(500).json({
      error: "Failed to load cities.",
    });
  }
});


// ===============================
// SEARCH INSTITUTES
// ===============================
app.get("/api/institutes", async (req, res) => {
  const course = (req.query.course || "").trim();
  const city = (req.query.city || "").trim();
  const q = (req.query.q