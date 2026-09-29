import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import pg from "pg";
import { fileURLToPath } from "url";

dotenv.config();

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
    ? { rejectUnauthorized: false }
    : false
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const schema = fs.readFileSync(path.join(__dirname, "schema.sql"), "utf8");

try {
  await pool.query(schema);
  console.log("Finder database schema and sample data are ready.");
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
