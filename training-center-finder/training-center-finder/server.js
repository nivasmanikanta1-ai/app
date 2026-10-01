require('dotenv').config();
const express = require('express');
const session = require('express-session');
const pgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 10000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false });

app.set('view engine','ejs');
app.use(express.urlencoded({extended:true}));
app.use(express.json());
app.use(express.static('public'));
app.use(session({
  store: new pgSession({ pool, tableName: 'user_sessions', createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || 'development-secret-change-me',
  resave: false, saveUninitialized: false,
  cookie: { maxAge: 1000*60*60*24*7, httpOnly: true, secure: process.env.NODE_ENV === 'production' }
}));

app.use(async (req,res,next)=>{
  res.locals.user = req.session.user || null;
  next();
});

async function initDb(){
  await pool.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, name VARCHAR(120) NOT NULL, email VARCHAR(180) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS centers (
    id SERIAL PRIMARY KEY, name VARCHAR(200) NOT NULL, city VARCHAR(100) NOT NULL,
    address TEXT NOT NULL, description TEXT NOT NULL, phone VARCHAR(40), email VARCHAR(180),
    website VARCHAR(255), rating NUMERIC(2,1) DEFAULT 4.0, reviews INTEGER DEFAULT 0,
    fee_range VARCHAR(80), image_url TEXT, latitude NUMERIC(10,7), longitude NUMERIC(10,7),
    facilities TEXT[], created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS courses (
    id SERIAL PRIMARY KEY, center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    name VARCHAR(180) NOT NULL, category VARCHAR(100) NOT NULL, duration VARCHAR(80), fee VARCHAR(80), mode VARCHAR(50)
  );`);
  await pool.query(`CREATE TABLE IF NOT EXISTS favorites (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, center_id INTEGER REFERENCES centers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY(user_id, center_id)
  );`);
  const count = await pool.query('SELECT COUNT(*) FROM centers');
  if(Number(count.rows[0].count) === 0){
    const centers = [
      ['Agasthya Solutions','Hyderabad','Ameerpet, Hyderabad, Telangana','Industry-oriented IT training institute offering practical cloud, DevOps, programming and data courses.','+91 90000 11111','info@agasthya.example','https://example.com',4.7,248,'₹8,000 - ₹35,000','https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80',17.4375,78.4483,['Placement Assistance','Lab Access','Mock Interviews','Flexible Batches']],
      ['TechBridge Academy','Bengaluru','BTM Layout, Bengaluru, Karnataka','Career-focused software training with project mentoring, interview preparation and weekend batches.','+91 90000 22222','hello@techbridge.example','https://example.com',4.5,193,'₹10,000 - ₹45,000','https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80',12.9166,77.6101,['Project Training','Interview Prep','Weekend Batches','Labs']],
      ['CloudCraft Institute','Chennai','Guindy, Chennai, Tamil Nadu','Cloud and DevOps learning center with hands-on labs for AWS, Azure, Docker, Kubernetes and Terraform.','+91 90000 33333','learn@cloudcraft.example','https://example.com',4.6,156,'₹12,000 - ₹50,000','https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',13.0067,80.2206,['Cloud Labs','Certification Prep','Mentorship','Placement Cell']],
      ['CodeSphere Training Hub','Visakhapatnam','MVP Colony, Visakhapatnam, Andhra Pradesh','Full-stack, Python, Java and database training with guided capstone projects.','+91 90000 44444','admissions@codesphere.example','https://example.com',4.4,117,'₹7,500 - ₹30,000','https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',17.7231,83.3013,['Capstone Projects','Coding Lab','Career Guidance','Demo Classes']]
    ];
    for(const c of centers){
      const r=await pool.query(`INSERT INTO centers(name,city,address,description,phone,email,website,rating,reviews,fee_range,image_url,latitude,longitude,facilities) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,c);
      const id=r.rows[0].id;
      const courses = {
        'Agasthya Solutions':[['AWS Cloud Computing','Cloud','3 Months','₹18,000','Offline / Online'],['DevOps Engineering','DevOps','4 Months','₹25,000','Offline / Online'],['Java Full Stack','Development','5 Months','₹30,000','Offline'],['Digital Marketing','Marketing','3 Months','₹12,000','Offline / Online'],['Cyber Security','Security','4 Months','₹28,000','Offline']],
        'TechBridge Academy':[['Python Full Stack','Development','5 Months','₹35,000','Offline'],['Java Full Stack','Development','6 Months','₹42,000','Offline / Online'],['Data Analytics','Data','4 Months','₹30,000','Online'],['React JS','Development','3 Months','₹18,000','Offline']],
        'CloudCraft Institute':[['AWS Solutions Architect','Cloud','3 Months','₹25,000','Offline / Online'],['Azure Administrator','Cloud','3 Months','₹22,000','Online'],['Docker & Kubernetes','DevOps','2 Months','₹18,000','Offline'],['Terraform & IaC','DevOps','2 Months','₹15,000','Online']],
        'CodeSphere Training Hub':[['Python Programming','Programming','3 Months','₹12,000','Offline'],['MERN Full Stack','Development','5 Months','₹28,000','Offline / Online'],['SQL & Database','Database','2 Months','₹9,000','Offline'],['Java Programming','Programming','4 Months','₹18,000','Offline']]
      }[c[0]];
      for(const cr of courses) await pool.query('INSERT INTO courses(center_id,name,category,duration,fee,mode) VALUES($1,$2,$3,$4,$5,$6)',[id,...cr]);
    }
  }
  const demo=await pool.query('SELECT id FROM users WHERE email=$1',['demo@example.com']);
  if(demo.rowCount===0){ const hash=await bcrypt.hash('Demo@12345',10); await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3)',['Demo User','demo@example.com',hash]); }
}

function requireAuth(req,res,next){ if(!req.session.user) return res.redirect('/login?next='+encodeURIComponent(req.originalUrl)); next(); }

app.get('/', async(req,res)=>{
  const featured=await pool.query('SELECT * FROM centers ORDER BY rating DESC, reviews DESC LIMIT 3');
  const courses=await pool.query('SELECT DISTINCT category FROM courses ORDER BY category');
  res.render('home',{featured:featured.rows,categories:courses.rows.map(x=>x.category)});
});

app.get('/search',async(req,res)=>{
  const q=(req.query.q||'').trim(); const city=(req.query.city||'').trim();
  const category=(req.query.category||'').trim();
  const params=[]; const where=[];
  if(q){params.push('%'+q+'%');where.push(`(c.name ILIKE $${params.length} OR c.city ILIKE $${params.length} OR co.name ILIKE $${params.length})`);}
  if(city){params.push('%'+city+'%');where.push(`c.city ILIKE $${params.length}`);}
  if(category){params.push(category);where.push(`co.category=$${params.length}`);}
  const sql=`SELECT DISTINCT c.* FROM centers c LEFT JOIN courses co ON co.center_id=c.id ${where.length?'WHERE '+where.join(' AND '):''} ORDER BY c.rating DESC,c.reviews DESC`;
  const result=await pool.query(sql,params); res.render('search',{centers:result.rows,q,city,category});
});

app.get('/center/:id',async(req,res)=>{
  const center=await pool.query('SELECT * FROM centers WHERE id=$1',[req.params.id]); if(!center.rowCount) return res.status(404).render('error',{message:'Training center not found'});
  const courses=await pool.query('SELECT * FROM courses WHERE center_id=$1 ORDER BY category,name',[req.params.id]);
  let favorite=false; if(req.session.user){const f=await pool.query('SELECT 1 FROM favorites WHERE user_id=$1 AND center_id=$2',[req.session.user.id,req.params.id]);favorite=!!f.rowCount;}
  res.render('center',{center:center.rows[0],courses:courses.rows,favorite});
});

app.get('/login',(req,res)=>res.render('login',{error:null,next:req.query.next||'/'}));
app.post('/login',async(req,res)=>{try{const {email,password}=req.body;const r=await pool.query('SELECT * FROM users WHERE email=$1',[email]);if(!r.rowCount||!(await bcrypt.compare(password,r.rows[0].password_hash))) return res.status(401).render('login',{error:'Invalid email or password',next:req.body.next||'/'});req.session.user={id:r.rows[0].id,name:r.rows[0].name,email:r.rows[0].email};res.redirect(req.body.next||'/');}catch(e){res.status(500).render('login',{error:'Unable to sign in right now',next:'/'});}});
app.get('/register',(req,res)=>res.render('register',{error:null}));
app.post('/register',async(req,res)=>{try{const {name,email,password}=req.body;if(!name||!email||!password||password.length<8)return res.status(400).render('register',{error:'Enter all fields. Password must be at least 8 characters.'});const hash=await bcrypt.hash(password,10);const r=await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email',[name,email.toLowerCase(),hash]);req.session.user=r.rows[0];res.redirect('/');}catch(e){res.status(400).render('register',{error:e.code==='23505'?'Email is already registered.':'Registration failed.'});}});
app.post('/logout',(req,res)=>req.session.destroy(()=>res.redirect('/')));
app.post('/favorite/:id',requireAuth,async(req,res)=>{const f=await pool.query('SELECT 1 FROM favorites WHERE user_id=$1 AND center_id=$2',[req.session.user.id,req.params.id]);if(f.rowCount) await pool.query('DELETE FROM favorites WHERE user_id=$1 AND center_id=$2',[req.session.user.id,req.params.id]); else await pool.query('INSERT INTO favorites(user_id,center_id) VALUES($1,$2)',[req.session.user.id,req.params.id]);res.redirect('/center/'+req.params.id);});
app.get('/favorites',requireAuth,async(req,res)=>{const r=await pool.query('SELECT c.* FROM centers c JOIN favorites f ON f.center_id=c.id WHERE f.user_id=$1 ORDER BY f.created_at DESC',[req.session.user.id]);res.render('favorites',{centers:r.rows});});
app.get('/api/centers',async(req,res)=>{const r=await pool.query('SELECT id,name,city,latitude,longitude,rating,fee_range FROM centers WHERE latitude IS NOT NULL');res.json(r.rows);});
app.get('/health',(req,res)=>res.json({status:'ok'}));
app.use((req,res)=>res.status(404).render('error',{message:'Page not found'}));

initDb().then(()=>app.listen(PORT,()=>console.log(`Training Center Finder running on port ${PORT}`))).catch(err=>{console.error(err);process.exit(1)});
