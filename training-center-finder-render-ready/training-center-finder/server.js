require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const trainingCenters = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data.json"), "utf8")
);

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost")
        ? false
        : { rejectUnauthorized: false }
    })
  : null;

async function initDatabase() {
  if (!pool) {
    console.warn("DATABASE_URL is not configured. Login/register will not persist users.");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      center_id TEXT NOT NULL,
      PRIMARY KEY (user_id, center_id)
    )
  `);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.set("trust proxy", 1);
app.use(session({
  secret: process.env.SESSION_SECRET || "training-center-finder-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax"
  }
}));

function withCenterDefaults(center) {
  return {
    ...center,
    email: center.email || "Not listed",
    website: center.website || "#",
    rating: center.rating ?? 4.0,
    reviews: center.reviews ?? 0,
    fee_range: center.fee_range || "Contact institute",
    facilities: center.facilities || [],
    image_url: center.image_url || "https://placehold.co/900x560?text=Training+Center"
  };
}

function categoryFor(course) {
  const c = String(course).toLowerCase();
  if (c.includes("aws") || c.includes("cloud")) return "Cloud";
  if (c.includes("devops")) return "DevOps";
  if (c.includes("data") || c.includes("sql") || c.includes("power bi") || c.includes("excel")) return "Data";
  if (c.includes("cyber") || c.includes("security") || c.includes("kali") || c.includes("ethical")) return "Security";
  if (c.includes("python") || c.includes("java") || c.includes("c++") || c === "c" || c.includes("program")) return "Programming";
  return "Development";
}

function coursesFor(center) {
  return center.courses.map(name => ({
    name,
    category: categoryFor(name),
    duration: "Contact institute",
    fee: "Contact institute",
    mode: "Classroom"
  }));
}

function getCenter(id) {
  return trainingCenters.find(c => String(c.id) === String(id));
}

async function findUser(email) {
  if (!pool) return null;
  const result = await pool.query(
    "SELECT id, name, email, password_hash FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0] || null;
}

app.use(async (req, res, next) => {
  res.locals.user = null;

  if (req.session.user) {
    res.locals.user = req.session.user;
  }

  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: pool ? "connected-configured" : "not-configured",
    centers: trainingCenters.length,
    cities: [...new Set(trainingCenters.map(c => c.city))]
  });
});

app.get("/", (req, res) => {
  const featured = trainingCenters.slice(0, 8).map(withCenterDefaults);
  res.render("home", { featured });
});

app.get("/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const city = String(req.query.city || "").trim().toLowerCase();
  const category = String(req.query.category || "").trim();

  const centers = trainingCenters.filter(c => {
    const haystack = [
      c.name, c.city, c.address, c.description, ...(c.courses || [])
    ].join(" ").toLowerCase();

    const qOk = !q || haystack.includes(q);
    const cityOk = !city || c.city.toLowerCase() === city || c.city.toLowerCase().includes(city);
    const categoryOk = !category || (c.courses || []).some(course => categoryFor(course) === category);
    return qOk && cityOk && categoryOk;
  }).map(withCenterDefaults);

  res.render("search", {
    centers,
    q: req.query.q || "",
    city: req.query.city || "",
    category
  });
});

app.get("/center/:id", async (req, res) => {
  const center = getCenter(req.params.id);
  if (!center) return res.status(404).render("error", { message: "Training center not found." });

  let saved = false;
  if (req.session.user && pool) {
    const result = await pool.query(
      "SELECT 1 FROM favorites WHERE user_id = $1 AND center_id = $2",
      [req.session.user.id, String(center.id)]
    );
    saved = result.rowCount > 0;
  }

  res.render("center", {
    center: withCenterDefaults(center),
    courses: coursesFor(center),
    favorite: saved
  });
});

app.get("/login", (req, res) => {
  res.render("login", { error: null, next: req.query.next || "/" });
});

app.post("/login", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).render("login", {
        error: "Login is temporarily unavailable. Database is not configured.",
        next: req.body.next || "/"
      });
    }

    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const user = await findUser(email);

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).render("login", {
        error: "Invalid email or password.",
        next: req.body.next || "/"
      });
    }

    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    res.redirect(req.body.next || "/");
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).render("login", {
      error: "Unable to login right now. Please try again.",
      next: req.body.next || "/"
    });
  }
});

app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  try {
    if (!pool) {
      return res.status(503).render("register", {
        error: "Registration is temporarily unavailable. Database is not configured."
      });
    }

    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!name || !email || password.length < 6) {
      return res.status(400).render("register", {
        error: "Enter a name, valid email and password of at least 6 characters."
      });
    }

    const existing = await findUser(email);
    if (existing) {
      return res.status(409).render("register", {
        error: "An account with this email already exists."
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email",
      [name, email, passwordHash]
    );

    const user = result.rows[0];
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email
    };

    res.redirect("/");
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).render("register", {
      error: "Unable to create the account right now. Please try again."
    });
  }
});

app.post("/favorite/:id", async (req, res) => {
  if (!req.session.user) return res.redirect("/login?next=/center/" + req.params.id);
  if (!pool) return res.status(503).send("Database is not configured");

  const center = getCenter(req.params.id);
  if (!center) return res.status(404).send("Center not found");

  const userId = req.session.user.id;
  const centerId = String(center.id);
  const existing = await pool.query(
    "SELECT 1 FROM favorites WHERE user_id = $1 AND center_id = $2",
    [userId, centerId]
  );

  if (existing.rowCount > 0) {
    await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND center_id = $2",
      [userId, centerId]
    );
  } else {
    await pool.query(
      "INSERT INTO favorites (user_id, center_id) VALUES ($1, $2)",
      [userId, centerId]
    );
  }

  res.redirect("/center/" + center.id);
});

app.get("/favorites", async (req, res) => {
  if (!req.session.user) return res.redirect("/login?next=/favorites");
  if (!pool) return res.status(503).send("Database is not configured");

  const result = await pool.query(
    "SELECT center_id FROM favorites WHERE user_id = $1 ORDER BY center_id",
    [req.session.user.id]
  );

  const centers = result.rows
    .map(row => getCenter(row.center_id))
    .filter(Boolean)
    .map(withCenterDefaults);

  res.render("favorites", { centers });
});

app.post("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

/* JSON APIs */
app.get("/api/centers", (req, res) => {
  res.json(trainingCenters.map(withCenterDefaults));
});

app.get("/api/centers/:id", (req, res) => {
  const center = getCenter(req.params.id);
  if (!center) return res.status(404).json({ error: "Center not found" });
  res.json(withCenterDefaults(center));
});

app.get("/api/cities", (req, res) => {
  res.json([...new Set(trainingCenters.map(c => c.city))].sort());
});

app.use((req, res) => {
  res.status(404).render("error", { message: "Page not found." });
});

async function startServer() {
  try {
    await initDatabase();
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Training Center Finder running on port ${PORT}`);
      console.log(`Loaded ${trainingCenters.length} training centers`);
    });
  } catch (error) {
    console.error("Database initialization failed:", error);
    process.exit(1);
  }
}

startServer();
