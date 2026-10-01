require("dotenv").config();

const express = require("express");
const session = require("express-session");
const pgSession = require("connect-pg-simple")(session);
const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

const app = express();
const PORT = process.env.PORT || 10000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false
});

app.set("view engine", "ejs");

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

app.use(
  session({
    store: new pgSession({
      pool,
      tableName: "user_sessions",
      createTableIfMissing: true
    }),
    secret:
      process.env.SESSION_SECRET ||
      "development-secret-change-this",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  })
);

app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});


/* =========================================================
   DATABASE
========================================================= */

async function createTables() {

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(180) UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS centers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      city VARCHAR(100) NOT NULL,
      address TEXT NOT NULL,
      description TEXT NOT NULL,
      phone VARCHAR(40),
      email VARCHAR(180),
      website VARCHAR(255),
      rating NUMERIC(2,1),
      reviews INTEGER DEFAULT 0,
      fee_range VARCHAR(80),
      image_url TEXT,
      latitude NUMERIC(10,7),
      longitude NUMERIC(10,7),
      facilities TEXT[],
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS courses (
      id SERIAL PRIMARY KEY,
      center_id INTEGER
        REFERENCES centers(id)
        ON DELETE CASCADE,
      name VARCHAR(180) NOT NULL,
      category VARCHAR(100) NOT NULL,
      duration VARCHAR(80),
      fee VARCHAR(80),
      mode VARCHAR(50)
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      user_id INTEGER
        REFERENCES users(id)
        ON DELETE CASCADE,

      center_id INTEGER
        REFERENCES centers(id)
        ON DELETE CASCADE,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      PRIMARY KEY(user_id, center_id)
    );
  `);
}


/* =========================================================
   REAL TRAINING CENTERS
========================================================= */

const trainingCenters = [

  /* =======================
     KAKINADA
  ======================= */

  {
    name: "NIIT",
    city: "Kakinada",
    address: "Ramaraopet, Kakinada, Andhra Pradesh",
    description:
      "Computer education and training centre offering software and technology-oriented courses.",
    phone: "08842374929",
    website: null,
    courses: [
      "C",
      "C++",
      "CCNA",
      ".NET",
      "Animation Multimedia"
    ],
    latitude: 16.9891,
    longitude: 82.2475
  },

  {
    name: "Primesoft",
    city: "Kakinada",
    address:
      "Nagamalli Thota Junction, Kakinada, Andhra Pradesh",
    description:
      "Computer education and software training centre.",
    phone: "08842343532",
    website: null,
    courses: ["Java"],
    latitude: 16.9900,
    longitude: 82.2450
  },

  {
    name: "Aptech Education",
    city: "Kakinada",
    address:
      "Bhanugudi, Kakinada, Andhra Pradesh",
    description:
      "Computer education and technology training centre.",
    phone: null,
    website: null,
    courses: [
      ".NET",
      "Animation Multimedia",
      "Dot Net"
    ],
    latitude: 16.9898,
    longitude: 82.2470
  },

  {
    name: "Indian Institute",
    city: "Kakinada",
    address:
      "Bhanugudi Junction, Kakinada, Andhra Pradesh",
    description:
      "Training institute offering technology and enterprise-oriented courses.",
    phone: "08842367111",
    website: null,
    courses: [
      "SAP",
      "SAS"
    ],
    latitude: 16.9897,
    longitude: 82.2471
  },

  {
    name: "Pace Computer Education",
    city: "Kakinada",
    address:
      "Srinagar, Kakinada, Andhra Pradesh",
    description:
      "Computer education and software training centre.",
    phone: "08842367985",
    website: null,
    courses: [
      "J2EE",
      "Java",
      "SAP"
    ],
    latitude: 16.9890,
    longitude: 82.2470
  },

  {
    name: "Silicon Info Systems",
    city: "Kakinada",
    address:
      "Temple Street, Kakinada, Andhra Pradesh",
    description:
      "Computer education and software training centre.",
    phone: "08846598871",
    website: null,
    courses: [
      "J2EE",
      "Java",
      ".NET",
      "SAP"
    ],
    latitude: 16.9670,
    longitude: 82.2380
  },

  {
    name: "Arcsoft Animation",
    city: "Kakinada",
    address:
      "Nagamalli Thota Junction, Kakinada, Andhra Pradesh",
    description:
      "Training centre focused on animation and multimedia education.",
    phone: "08842347279",
    website: null,
    courses: [
      "Animation",
      "Multimedia"
    ],
    latitude: 16.9900,
    longitude: 82.2450
  },

  {
    name: "Ardha Technologies",
    city: "Kakinada",
    address:
      "Bhanugudi Junction, Kakinada, Andhra Pradesh",
    description:
      "Technology training centre.",
    phone: "08842348972",
    website: null,
    courses: [
      "SAP",
      "Tally"
    ],
    latitude: 16.9895,
    longitude: 82.2470
  },

  {
    name: "Sashi Infotech",
    city: "Kakinada",
    address:
      "Sarpavaram, Kakinada, Andhra Pradesh",
    description:
      "Computer and software training centre.",
    phone: "08842353030",
    website: null,
    courses: [
      "Animation Multimedia",
      "Dot Net",
      "J2EE",
      ".NET"
    ],
    latitude: 16.9800,
    longitude: 82.2500
  },

  {
    name: "Informatic Computer Institute",
    city: "Kakinada",
    address:
      "Suryaraopeta, Kakinada, Andhra Pradesh",
    description:
      "Computer programming and software training centre.",
    phone: "08842360614",
    website: null,
    courses: [
      ".NET",
      "J2EE",
      "Java",
      "PHP"
    ],
    latitude: 16.9680,
    longitude: 82.2380
  },

  {
    name: "5XFUTURE Software Training Institute",
    city: "Kakinada",
    address:
      "68-10-35, Vidhyuth Nagar, SBI Officers Colony, Ramanayyapeta, Kakinada, Andhra Pradesh 533003",
    description:
      "Software training institute offering programming, full-stack, AI and data-oriented training.",
    phone: "+919640313555",
    website: "https://www.5xfuture.in/",
    courses: [
      "Python",
      "Java",
      "Full Stack Development",
      "Artificial Intelligence",
      "Machine Learning",
      "Data Science",
      "Cybersecurity"
    ],
    latitude: 16.9891,
    longitude: 82.2475
  },

  {
    name: "iSAN Computers Education",
    city: "Kakinada",
    address:
      "D.No. 2-161/1, 2nd Floor, Thadala Complex, Bhanugudi Junction, Kakinada, Andhra Pradesh 533003",
    description:
      "Computer education and software training centre.",
    phone: "+918978989444",
    website: null,
    courses: [
      "Python",
      "Java",
      "C",
      "Artificial Intelligence",
      "Data Science",
      "Java Full Stack",
      "AutoCAD",
      "Tally"
    ],
    latitude: 16.9896,
    longitude: 82.2470
  },

  {
    name: "KTS",
    city: "Kakinada",
    address:
      "RTC Complex Road, Bhanugudi Junction, Perrajupeta, Kakinada, Andhra Pradesh 533003",
    description:
      "Computer and software training centre.",
    phone: "+919553084240",
    website: null,
    courses: [
      "Software Training",
      "Computer Training"
    ],
    latitude: 16.9898,
    longitude: 82.2472
  },

  {
    name: "Learntact Learning Center",
    city: "Kakinada",
    address:
      "Majestic Street, Suryanarayana Puram, Kakinada, Andhra Pradesh 533001",
    description:
      "Training centre offering programming and computer courses.",
    phone: "+916303114238",
    website: null,
    courses: [
      "Python",
      "Java",
      "C",
      "C++",
      "MS Office",
      "CAD"
    ],
    latitude: 16.9678,
    longitude: 82.2385
  },

  {
    name: "Data Lineage",
    city: "Kakinada",
    address:
      "G O Colony, Kakinada, Andhra Pradesh",
    description:
      "Technology training provider offering cloud and data-related training.",
    phone: null,
    website: null,
    courses: [
      "AWS",
      "Python",
      "MySQL",
      "PySpark"
    ],
    latitude: 16.9900,
    longitude: 82.2450
  },


  /* =======================
     VISAKHAPATNAM
  ======================= */

  {
    name: "NICT Computer Education",
    city: "Visakhapatnam",
    address:
      "48-10-19/21, Hotel Main Street, opposite RTC Complex Road, Srinagar, Dwaraka Nagar, Visakhapatnam, Andhra Pradesh 530020",
    description:
      "Computer education and software training centre.",
    phone: null,
    website: null,
    courses: [
      "Computer Training",
      "Software Training"
    ],
    latitude: 17.7217,
    longitude: 83.3010
  },

  {
    name: "PIONEER COMPUTER EDUCATION",
    city: "Visakhapatnam",
    address:
      "2nd Floor, 48-14-63/7, Ramatalkies Bus Stop Lane, Visakhapatnam, Andhra Pradesh 530016",
    description:
      "Computer education and software training centre.",
    phone: "+919010552255",
    website: null,
    courses: [
      "Software Training",
      "Computer Education"
    ],
    latitude: 17.7118,
    longitude: 83.3000
  },

  {
    name: "Aptech Computer Education Dwarakanagar",
    city: "Visakhapatnam",
    address:
      "Block B, Second Floor, 5th Lane, Dwaraka Nagar, Visakhapatnam, Andhra Pradesh 530016",
    description:
      "Computer education and technology training centre.",
    phone: "+919290005840",
    website: null,
    courses: [
      "Computer Education",
      "Software Training"
    ],
    latitude: 17.7125,
    longitude: 83.3005
  },

  {
    name: "Srikanth Technologies",
    city: "Visakhapatnam",
    address:
      "304, Eswar Paradise, Dwarakanagar Main Road, Visakhapatnam, Andhra Pradesh 530016",
    description:
      "Software training and programming education.",
    phone: "+918912541948",
    website: "https://srikanthtechnologies.com/",
    courses: [
      "Software Training",
      "Programming"
    ],
    latitude: 17.7140,
    longitude: 83.3020
  },

  {
    name: "AIM Professional Computer Training Academy",
    city: "Visakhapatnam",
    address:
      "1st Floor, 7-16-42, Service Road, Old Gajuwaka, Visakhapatnam, Andhra Pradesh 530026",
    description:
      "Computer and software training academy.",
    phone: "+919700029913",
    website: null,
    courses: [
      "Computer Training",
      "Software Training"
    ],
    latitude: 17.6868,
    longitude: 83.2147
  },

  {
    name: "Impulse Software",
    city: "Visakhapatnam",
    address:
      "Divya Shakthi Apartment, Seethammadara, Visakhapatnam, Andhra Pradesh 530013",
    description:
      "Software and programming training centre.",
    phone: "+919247175823",
    website: null,
    courses: [
      "Software Training",
      "Programming"
    ],
    latitude: 17.7390,
    longitude: 83.2980
  },

  {
    name: "Hackersdemy Institute",
    city: "Visakhapatnam",
    address:
      "MVP Colony Sector 12, Visakhapatnam, Andhra Pradesh",
    description:
      "Technology training provider with software and cybersecurity-oriented courses.",
    phone: null,
    website: null,
    courses: [
      "Software Training",
      "Kali Linux",
      "Cybersecurity"
    ],
    latitude: 17.7350,
    longitude: 83.3150
  },

  {
    name: "SVR Technologies",
    city: "Visakhapatnam",
    address:
      "Dwaraka Nagar, Visakhapatnam, Andhra Pradesh",
    description:
      "Technology training provider offering software and AI-oriented courses.",
    phone: null,
    website: null,
    courses: [
      "Software Training",
      "Artificial Intelligence"
    ],
    latitude: 17.7120,
    longitude: 83.3000
  },

  {
    name: "Vedantu Learning Centre Vishakapatnam",
    city: "Visakhapatnam",
    address:
      "5th Lane, Dwaraka Nagar, Visakhapatnam, Andhra Pradesh 530016",
    description:
      "Learning centre providing academic and competitive-exam-oriented education.",
    phone: "08971907522",
    website: null,
    courses: [
      "JEE",
      "NEET",
      "Academic Training"
    ],
    latitude: 17.7125,
    longitude: 83.3005
  },

  {
    name: "TANASVI TECHNOLOGIES PRIVATE LIMITED",
    city: "Visakhapatnam",
    address:
      "Hill No 3, IT Incubation Centre, Sunrise Startup Village, Rushikonda, Madhurawada, Visakhapatnam, Andhra Pradesh 530048",
    description:
      "Technology company and training/project environment.",
    phone: null,
    website: null,
    courses: [
      "Software Training",
      "Technology Training"
    ],
    latitude: 17.7820,
    longitude: 83.3770
  },

  {
    name: "XLNC.io",
    city: "Visakhapatnam",
    address:
      "#504, Hawkish Business Hub, VIZAG CENTRAL, VIP Road, Siripuram, Visakhapatnam, Andhra Pradesh 530003",
    description:
      "Technology organisation with software and internship/project-oriented opportunities.",
    phone: null,
    website: null,
    courses: [
      "Software Training",
      "Live Projects"
    ],
    latitude: 17.7210,
    longitude: 83.3110
  },


  /* =======================
     HYDERABAD
  ======================= */

  {
    name: "TCS iON Training Partner",
    city: "Hyderabad",
    address:
      "Above T T Super Market, opposite Pillar No 22, Mehdipatnam, Hyderabad, Telangana 500028",
    description:
      "Training partner providing computer and technology-related training.",
    phone: "04066741772",
    website: null,
    courses: [
      "Computer Training",
      "Software Training"
    ],
    latitude: 17.3960,
    longitude: 78.4350
  },

  {
    name: "Cad World",
    city: "Hyderabad",
    address:
      "A4 & A5, 2nd Floor, Eureka Courts, Ameerpet, Hyderabad, Telangana 500016",
    description:
      "Computer and CAD training institute.",
    phone: "04066331068",
    website: null,
    courses: [
      "AutoCAD",
      "CAD",
      "Computer Training"
    ],
    latitude: 17.4375,
    longitude: 78.4483
  },

  {
    name: "Omegacad Training Institute For Civil Engineers",
    city: "Hyderabad",
    address:
      "Flat No 201, Manjeera Plaza, Ameerpet, Hyderabad, Telangana 500016",
    description:
      "Civil engineering and CAD-focused training institute.",
    phone: "07330950450",
    website: null,
    courses: [
      "AutoCAD",
      "Civil Engineering Software",
      "CAD"
    ],
    latitude: 17.4370,
    longitude: 78.4480
  },

  {
    name: "IT Professional Computer Training",
    city: "Hyderabad",
    address:
      "Ground Floor, Ansar Complex, Mehdipatnam, Hyderabad, Telangana 500028",
    description:
      "Computer and software training institute.",
    phone: "04023514986",
    website: null,
    courses: [
      "Computer Training",
      "SAP",
      "Java"
    ],
    latitude: 17.3960,
    longitude: 78.4350
  },

  {
    name: "Datamites Data Science Courses",
    city: "Hyderabad",
    address:
      "Saurabh Chharia's Academy, Mega Hills, Madhapur, Hyderabad, Telangana 500081",
    description:
      "Training provider focused on data science and AI-related education.",
    phone: "06282286062",
    website: null,
    courses: [
      "Data Science",
      "Artificial Intelligence",
      "Machine Learning"
    ],
    latitude: 17.4426,
    longitude: 78.3915
  },

  {
    name: "Teks Academy",
    city: "Hyderabad",
    address:
      "Secunderabad, Telangana 500025",
    description:
      "Professional technology training provider offering software, cloud, data and cybersecurity courses.",
    phone: "18001204748",
    website: "https://teksacademy.com/",
    courses: [
      "Full Stack Java",
      "Full Stack Python",
      "Cybersecurity",
      "Generative AI",
      "AWS",
      "DevOps",
      "Data Science",
      "Data Analytics"
    ],
    latitude: 17.4399,
    longitude: 78.4983
  },

  {
    name: "Digital Nest",
    city: "Hyderabad",
    address:
      "2nd Floor, Above Karnataka Bank, Kruthika Layout, Silicon Valley Road, Madhapur, Hyderabad",
    description:
      "Technology training institute offering cloud, software and data-related programs.",
    phone: null,
    website: null,
    courses: [
      "AWS",
      "Data Science",
      "Big Data",
      "Digital Marketing"
    ],
    latitude: 17.4485,
    longitude: 78.3908
  },

  {
    name: "Cyberaegis IT Solution",
    city: "Hyderabad",
    address:
      "2nd Floor, Sri Giri Complex, beside Venkatadri Theatre, Dilsukh Nagar Main Road, Gaddiannaram, Hyderabad",
    description:
      "IT training provider with cybersecurity and AI-related programs.",
    phone: null,
    website: null,
    courses: [
      "Artificial Intelligence",
      "Cybersecurity",
      "Software Training"
    ],
    latitude: 17.3688,
    longitude: 78.5260
  },

  {
    name: "Sumedha Institute of Technology",
    city: "Hyderabad",
    address:
      "Fortune Signature, #301, Nizampet X Roads, Kukatpally, Hyderabad",
    description:
      "Technology training institute.",
    phone: null,
    website: null,
    courses: [
      "Software Training",
      "Programming"
    ],
    latitude: 17.5070,
    longitude: 78.3860
  },

  {
    name: "Dream India Technologies",
    city: "Hyderabad",
    address:
      "Flat No. 408/C, 4th Floor, Nilgiri Block, Aditya Enclave, Ameerpet, Hyderabad, Telangana 500038",
    description:
      "Technology training institute offering software and professional courses.",
    phone: "+919966891899",
    website: "https://www.dreamindiatechnologies.com/",
    courses: [
      "Java Full Stack",
      "Python Full Stack",
      "SAP",
      "Digital Marketing",
      "Web Designing",
      "Data Science"
    ],
    latitude: 17.4375,
    longitude: 78.4483
  },

  {
    name: "RK Software Solutions",
    city: "Hyderabad",
    address:
      "301 & 402, 3rd Floor, opposite SR Nagar Bus Stop, Madhura Nagar, Hyderabad, Telangana 500038",
    description:
      "Software training and project-oriented technology education.",
    phone: null,
    website: null,
    courses: [
      "Software Training",
      "Digital Marketing",
      "Projects"
    ],
    latitude: 17.4410,
    longitude: 78.4420
  },

  {
    name: "Agasthya Solutions",
    city: "Hyderabad",
    address:
      "Ameerpet, Hyderabad, Telangana",
    description:
      "IT training provider offering cloud, DevOps and programming-oriented courses.",
    phone: null,
    website: null,
    courses: [
      "AWS",
      "DevOps",
      "Cloud Computing",
      "Programming"
    ],
    latitude: 17.4375,
    longitude: 78.4483
  },


  /* =======================
     VIJAYAWADA
  ======================= */

  {
    name: "APEC Computer Education",
    city: "Vijayawada",
    address:
      "4th Floor, Vasantha Plaza, near Benz Circle, MG Road, Vijayawada, Andhra Pradesh 520010",
    description:
      "Computer education and software training centre.",
    phone: "+918179624399",
    website: "https://www.apeccomputereducation.com/",
    courses: [
      "C",
      "C++",
      "Java",
      ".NET",
      "Python",
      "PHP",
      "Oracle",
      "Web Designing",
      "Digital Marketing",
      "Networking"
    ],
    latitude: 16.5062,
    longitude: 80.6480
  },

  {
    name: "Nipuna Technologies",
    city: "Vijayawada",
    address:
      "Vijayawada, Andhra Pradesh",
    description:
      "Technology training and software education provider.",
    phone: null,
    website: null,
    courses: [
      "Software Training",
      "Programming"
    ],
    latitude: 16.5062,
    longitude: 80.6480
  },

  {
    name: "Naresh i Technologies",
    city: "Vijayawada",
    address:
      "Vijayawada, Andhra Pradesh",
    description:
      "Software training provider offering programming and IT courses.",
    phone: null,
    website: null,
    courses: [
      "Java",
      "Python",
      "Software Training"
    ],
    latitude: 16.5062,
    longitude: 80.6480
  },

  {
    name: "CADD India",
    city: "Vijayawada",
    address:
      "Vijayawada, Andhra Pradesh",
    description:
      "CAD and engineering software training provider.",
    phone: null,
    website: null,
    courses: [
      "AutoCAD",
      "CAD",
      "Engineering Software"
    ],
    latitude: 16.5062,
    longitude: 80.6480
  },

  {
    name: "Codegnan",
    city: "Vijayawada",
    address:
      "Vijayawada, Andhra Pradesh",
    description:
      "Programming and software development training provider.",
    phone: null,
    website: null,
    courses: [
      "Python",
      "Java",
      "Full Stack Development",
      "Data Science"
    ],
    latitude: 16.5062,
    longitude: 80.6480
  }
];


/* =========================================================
   INSERT / UPDATE CENTERS
========================================================= */

async function seedCenters() {

  for (const center of trainingCenters) {

    const existing = await pool.query(
      `
      SELECT id
      FROM centers
      WHERE LOWER(name) = LOWER($1)
      AND LOWER(city) = LOWER($2)
      LIMIT 1
      `,
      [center.name, center.city]
    );

    let centerId;

    if (existing.rowCount) {

      centerId = existing.rows[0].id;

      await pool.query(
        `
        UPDATE centers
        SET
          address = $1,
          description = $2,
          phone = $3,
          website = $4,
          latitude = $5,
          longitude = $6
        WHERE id = $7
        `,
        [
          center.address,
          center.description,
          center.phone,
          center.website,
          center.latitude,
          center.longitude,
          centerId
        ]
      );

      await pool.query(
        `DELETE FROM courses WHERE center_id = $1`,
        [centerId]
      );

    } else {

      const result = await pool.query(
        `
        INSERT INTO centers
        (
          name,
          city,
          address,
          description,
          phone,
          website,
          rating,
          reviews,
          fee_range,
          latitude,
          longitude,
          facilities
        )
        VALUES
        (
          $1,$2,$3,$4,$5,$6,
          NULL,
          0,
          'Contact institute for current fees',
          $7,$8,
          ARRAY['Training','Course Information','Map Location']
        )
        RETURNING id
        `,
        [
          center.name,
          center.city,
          center.address,
          center.description,
          center.phone,
          center.website,
          center.latitude,
          center.longitude
        ]
      );

      centerId = result.rows[0].id;
    }


    for (const courseName of center.courses) {

      await pool.query(
        `
        INSERT INTO courses
        (
          center_id,
          name,
          category,
          duration,
          fee,
          mode
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6
        )
        `,
        [
          centerId,
          courseName,
          getCategory(courseName),
          "Contact institute",
          "Contact institute",
          "Contact institute"
        ]
      );
    }
  }
}


/* =========================================================
   COURSE CATEGORY
========================================================= */

function getCategory(course) {

  const c = course.toLowerCase();

  if (
    c.includes("python") ||
    c.includes("java") ||
    c === "c" ||
    c === "c++" ||
    c.includes("programming") ||
    c.includes(".net") ||
    c.includes("php")
  ) {
    return "Programming";
  }

  if (
    c.includes("aws") ||
    c.includes("azure") ||
    c.includes("cloud")
  ) {
    return "Cloud";
  }

  if (
    c.includes("devops") ||
    c.includes("docker") ||
    c.includes("kubernetes")
  ) {
    return "DevOps";
  }

  if (
    c.includes("data science") ||
    c.includes("data analytics") ||
    c.includes("machine learning") ||
    c.includes("artificial intelligence") ||
    c.includes("generative ai")
  ) {
    return "Data & AI";
  }

  if (
    c.includes("cyber")
  ) {
    return "Cybersecurity";
  }

  if (
    c.includes("digital marketing")
  ) {
    return "Digital Marketing";
  }

  if (
    c.includes("autocad") ||
    c.includes("cad")
  ) {
    return "CAD";
  }

  if (
    c.includes("sap") ||
    c.includes("tally") ||
    c.includes("oracle")
  ) {
    return "Enterprise & Database";
  }

  if (
    c.includes("network")
  ) {
    return "Networking";
  }

  return "Other";
}


/* =========================================================
   AUTH
========================================================= */

function requireAuth(req, res, next) {

  if (!req.session.user) {
    return res.redirect(
      "/login?next=" +
      encodeURIComponent(req.originalUrl)
    );
  }

  next();
}


/* =========================================================
   HOME
========================================================= */

app.get("/", async (req, res) => {

  try {

    const featured = await pool.query(`
      SELECT *
      FROM centers
      ORDER BY city, name
      LIMIT 8
    `);

    const categories = await pool.query(`
      SELECT DISTINCT category
      FROM courses
      ORDER BY category
    `);

    const cities = await pool.query(`
      SELECT DISTINCT city
      FROM centers
      ORDER BY city
    `);

    res.render("home", {
      featured: featured.rows,
      categories: categories.rows.map(x => x.category),
      cities: cities.rows.map(x => x.city)
    });

  } catch (error) {

    console.error(error);

    res.status(500).render("error", {
      message: "Unable to load training centers"
    });
  }
});


/* =========================================================
   SEARCH
========================================================= */

app.get("/search", async (req, res) => {

  try {

    const q = (req.query.q || "").trim();
    const city = (req.query.city || "").trim();
    const category = (req.query.category || "").trim();

    const params = [];
    const where = [];

    if (q) {

      params.push("%" + q + "%");

      where.push(`
        (
          c.name ILIKE $${params.length}
          OR c.city ILIKE $${params.length}
          OR c.address ILIKE $${params.length}
          OR co.name ILIKE $${params.length}
        )
      `);
    }

    if (city) {

      params.push("%" + city + "%");

      where.push(
        `c.city ILIKE $${params.length}`
      );
    }

    if (category) {

      params.push(category);

      where.push(
        `co.category = $${params.length}`
      );
    }

    const sql = `
      SELECT DISTINCT c.*
      FROM centers c
      LEFT JOIN courses co
        ON co.center_id = c.id
      ${
        where.length
          ? "WHERE " + where.join(" AND ")
          : ""
      }
      ORDER BY c.city, c.name
    `;

    const result = await pool.query(
      sql,
      params
    );

    res.render("search", {
      centers: result.rows,
      q,
      city,
      category
    });

  } catch (error) {

    console.error(error);

    res.status(500).render("error", {
      message: "Search failed"
    });
  }
});


/* =========================================================
   CENTER DETAILS
========================================================= */

app.get("/center/:id", async (req, res) => {

  try {

    const center = await pool.query(
      `
      SELECT *
      FROM centers
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (!center.rowCount) {

      return res.status(404).render(
        "error",
        {
          message: "Training center not found"
        }
      );
    }

    const courses = await pool.query(
      `
      SELECT *
      FROM courses
      WHERE center_id = $1
      ORDER BY category, name
      `,
      [req.params.id]
    );

    let favorite = false;

    if (req.session.user) {

      const f = await pool.query(
        `
        SELECT 1
        FROM favorites
        WHERE user_id = $1
        AND center_id = $2
        `,
        [
          req.session.user.id,
          req.params.id
        ]
      );

      favorite = Boolean(f.rowCount);
    }

    res.render("center", {
      center: center.rows[0],
      courses: courses.rows,
      favorite
    });

  } catch (error) {

    console.error(error);

    res.status(500).render(
      "error",
      {
        message: "Unable to load institute"
      }
    );
  }
});


/* =========================================================
   LOGIN
========================================================= */

app.get("/login", (req, res) => {

  res.render("login", {
    error: null,
    next: req.query.next || "/"
  });
});


app.post("/login", async (req, res) => {

  try {

    const {
      email,
      password
    } = req.body;

    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE email = $1
      `,
      [email.toLowerCase()]
    );

    if (
      !result.rowCount ||
      !(await bcrypt.compare(
        password,
        result.rows[0].password_hash
      ))
    ) {

      return res.status(401).render(
        "login",
        {
          error: "Invalid email or password",
          next: req.body.next || "/"
        }
      );
    }

    req.session.user = {
      id: result.rows[0].id,
      name: result.rows[0].name,
      email: result.rows[0].email
    };

    res.redirect(
      req.body.next || "/"
    );

  } catch (error) {

    console.error(error);

    res.status(500).render(
      "login",
      {
        error: "Unable to sign in",
        next: "/"
      }
    );
  }
});


/* =========================================================
   REGISTER
========================================================= */

app.get("/register", (req, res) => {

  res.render("register", {
    error: null
  });
});


app.post("/register", async (req, res) => {

  try {

    const {
      name,
      email,
      password
    } = req.body;

    if (
      !name ||
      !email ||
      !password ||
      password.length < 8
    ) {

      return res.status(400).render(
        "register",
        {
          error:
            "Enter all fields. Password must be at least 8 characters."
        }
      );
    }

    const hash =
      await bcrypt.hash(password, 10);

    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        email,
        password_hash
      )
      VALUES
      ($1,$2,$3)
      RETURNING id,name,email
      `,
      [
        name,
        email.toLowerCase(),
        hash
      ]
    );

    req.session.user = result.rows[0];

    res.redirect("/");

  } catch (error) {

    console.error(error);

    res.status(400).render(
      "register",
      {
        error:
          error.code === "23505"
            ? "Email is already registered."
            : "Registration failed."
      }
    );
  }
});


/* =========================================================
   LOGOUT
========================================================= */

app.post("/logout", (req, res) => {

  req.session.destroy(() => {
    res.redirect("/");
  });
});


/* =========================================================
   FAVORITES
========================================================= */

app.post(
  "/favorite/:id",
  requireAuth,
  async (req, res) => {

    try {

      const existing = await pool.query(
        `
        SELECT 1
        FROM favorites
        WHERE user_id = $1
        AND center_id = $2
        `,
        [
          req.session.user.id,
          req.params.id
        ]
      );

      if (existing.rowCount) {

        await pool.query(
          `
          DELETE FROM favorites
          WHERE user_id = $1
          AND center_id = $2
          `,
          [
            req.session.user.id,
            req.params.id
          ]
        );

      } else {

        await pool.query(
          `
          INSERT INTO favorites
          (
            user_id,
            center_id
          )
          VALUES
          ($1,$2)
          `,
          [
            req.session.user.id,
            req.params.id
          ]
        );
      }

      res.redirect(
        "/center/" + req.params.id
      );

    } catch (error) {

      console.error(error);

      res.status(500).send(
        "Unable to update favorite"
      );
    }
  }
);


/* =========================================================
   FAVORITES PAGE
========================================================= */

app.get(
  "/favorites",
  requireAuth,
  async (req, res) => {

    const result = await pool.query(
      `
      SELECT c.*
      FROM centers c
      JOIN favorites f
        ON f.center_id = c.id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
      `,
      [req.session.user.id]
    );

    res.render(
      "favorites",
      {
        centers: result.rows
      }
    );
  }
);


/* =========================================================
   API
========================================================= */

app.get(
  "/api/centers",
  async (req, res) => {

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        city,
        address,
        latitude,
        longitude
      FROM centers
      WHERE latitude IS NOT NULL
      AND longitude IS NOT NULL
      ORDER BY city,name
      `
    );

    res.json(result.rows);
  }
);


/* =========================================================
   HEALTH CHECK
========================================================= */

app.get(
  "/health",
  (req, res) => {

    res.json({
      status: "ok",
      application: "Training Center Finder"
    });
  }
);


/* =========================================================
   404
========================================================= */

app.use(
  (req, res) => {

    res.status(404).render(
      "error",
      {
        message: "Page not found"
      }
    );
  }
);


/* =========================================================
   START
========================================================= */

async function startServer() {

  try {

    await createTables();

    await seedCenters();

    console.log(
      `Loaded ${trainingCenters.length} training centers`
    );

    app.listen(
      PORT,
      () => {

        console.log(
          `Training Center Finder running on port ${PORT}`
        );
      }
    );

  } catch (error) {

    console.error(
      "Application startup failed:",
      error
    );

    process.exit(1);
  }
}

startServer();
