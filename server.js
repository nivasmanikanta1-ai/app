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
  const q = (req.query.q || "").trim();

  try {
    const values = [];
    const conditions = [];

    if (course) {
      values.push(course);

      conditions.push(`EXISTS (
        SELECT 1
        FROM institute_courses ic
        JOIN courses c ON c.id = ic.course_id
        WHERE ic.institute_id = i.id
        AND LOWER(c.name) = LOWER($${values.length})
      )`);
    }

    if (city) {
      values.push(city);

      conditions.push(
        `LOWER(i.city) = LOWER($${values.length})`
      );
    }

    if (q) {
      values.push(`%${q}%`);

      conditions.push(`(
        i.name ILIKE $${values.length}
        OR i.address ILIKE $${values.length}
        OR EXISTS (
          SELECT 1
          FROM institute_courses ic2
          JOIN courses c2 ON c2.id = ic2.course_id
          WHERE ic2.institute_id = i.id
          AND c2.name ILIKE $${values.length}
        )
      )`);
    }

    const where = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const query = `
      SELECT
        i.id,
        i.name,
        i.city,
        i.address,
        i.phone,
        i.website,
        i.fees_from,
        i.duration,
        i.mode,
        i.rating,
        i.latitude,
        i.longitude,
        COALESCE(
          ARRAY_AGG(DISTINCT c.name)
          FILTER (WHERE c.name IS NOT NULL),
          '{}'
        ) AS courses

      FROM institutes i

      LEFT JOIN institute_courses ic
        ON ic.institute_id = i.id

      LEFT JOIN courses c
        ON c.id = ic.course_id

      ${where}

      GROUP BY i.id

      ORDER BY
        i.rating DESC NULLS LAST,
        i.name ASC;
    `;

    const result = await pool.query(query, values);

    res.json(result.rows);

  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Failed to search institutes.",
    });
  }
});


// ===============================
// GET SINGLE INSTITUTE
// ===============================
app.get("/api/institutes/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        i.id,
        i.name,
        i.city,
        i.address,
        i.phone,
        i.website,
        i.fees_from,
        i.duration,
        i.mode,
        i.rating,
        i.latitude,
        i.longitude,

        COALESCE(
          ARRAY_AGG(DISTINCT c.name)
          FILTER (WHERE c.name IS NOT NULL),
          '{}'
        ) AS courses

      FROM institutes i

      LEFT JOIN institute_courses ic
        ON ic.institute_id = i.id

      LEFT JOIN courses c
        ON c.id = ic.course_id

      WHERE i.id = $1

      GROUP BY i.id
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Institute not found.",
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    res.status(500).json({
      error: "Failed to load institute.",
    });
  }
});


// ===============================
// START SERVER
// ===============================
app.listen(port, () => {
  console.log(`Finder API running on port ${port}`);
});