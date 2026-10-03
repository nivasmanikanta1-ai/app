require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 10000;

const trainingCenters = JSON.parse(
  fs.readFileSync(path.join(__dirname, "data.json"), "utf8")
);

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.use(session({
  secret: process.env.SESSION_SECRET || "training-center-finder-change-this",
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 24 * 7,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production"
  }
}));

const users = new Map();
const favorites = new Map();

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

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
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

  let centers = trainingCenters.filter(c => {
    const haystack = [
      c.name, c.city, c.address, c.description, ...(c.courses || [])
    ].join(" ").toLowerCase();

    const qOk = !q || haystack.includes(q);
    const cityOk = !city || c.city.toLowerCase() === city || c.city.toLowerCase().includes(city);
    const categoryOk = !category || (c.courses || []).some(course => categoryFor(course) === category);
    return qOk && cityOk && categoryOk;
  }).map(withCenterDefaults);

  res.render("search", { centers, q: req.query.q || "", city: req.query.city || "", category });
});

app.get("/center/:id", (req, res) => {
  const center = getCenter(req.params.id);
  if (!center) return res.status(404).render("error", { message: "Training center not found." });

  const saved = req.session.user
    ? (favorites.get(req.session.user.email) || []).includes(center.id)
    : false;

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
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");
  const user = users.get(email);

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(401).render("login", { error: "Invalid email or password.", next: req.body.next || "/" });
  }

  req.session.user = { name: user.name, email: user.email };
  res.redirect(req.body.next || "/");
});

app.get("/register", (req, res) => {
  res.render("register", { error: null });
});

app.post("/register", async (req, res) => {
  const name = String(req.body.name || "").trim();
  const email = String(req.body.email || "").trim().toLowerCase();
  const password = String(req.body.password || "");

  if (!name || !email || password.length < 6) {
    return res.status(400).render("register", { error: "Enter a name, valid email and password of at least 6 characters." });
  }
  if (users.has(email)) {
    return res.status(409).render("register", { error: "An account with this email already exists." });
  }

  users.set(email, {
    name,
    email,
    passwordHash: await bcrypt.hash(password, 10)
  });
  favorites.set(email, []);
  req.session.user = { name, email };
  res.redirect("/");
});

app.post("/favorite/:id", (req, res) => {
  if (!req.session.user) return res.redirect("/login?next=/center/" + req.params.id);

  const center = getCenter(req.params.id);
  if (!center) return res.status(404).send("Center not found");

  const email = req.session.user.email;
  const list = favorites.get(email) || [];
  const index = list.indexOf(center.id);

  if (index >= 0) list.splice(index, 1);
  else list.push(center.id);

  favorites.set(email, list);
  res.redirect("/center/" + center.id);
});

app.get("/favorites", (req, res) => {
  if (!req.session.user) return res.redirect("/login?next=/favorites");

  const ids = favorites.get(req.session.user.email) || [];
  const centers = ids.map(id => getCenter(id)).filter(Boolean).map(withCenterDefaults);
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

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Training Center Finder running on port ${PORT}`);
  console.log(`Loaded ${trainingCenters.length} training centers`);
});
