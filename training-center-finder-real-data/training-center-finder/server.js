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
  // Seed verified real-world training centers for Kakinada, Visakhapatnam,
  // Hyderabad and Vijayawada. The records below use published business/official
  // contact information collected on 2026-10-01. Course lists are only included
  // where the provider publicly lists those courses; otherwise they are kept broad.
  await pool.query(`CREATE TABLE IF NOT EXISTS app_meta (key VARCHAR(100) PRIMARY KEY, value TEXT NOT NULL)`);
  const seedVersion = await pool.query("SELECT value FROM app_meta WHERE key='real_center_seed'");
  if (!seedVersion.rowCount || seedVersion.rows[0].value !== '2026-10-01-v1') {
    await pool.query('TRUNCATE TABLE favorites, courses, centers RESTART IDENTITY CASCADE');
    const centers = [
      ['KTS','Kakinada','RTC Complex Rd, Bhanugudi Junction, Perrajupeta, Kakinada, Andhra Pradesh 533003, India','Software training institute in Kakinada.','+91 95530 84240',null,null,4.8,150,'Contact institute for current fees',null,16.9891,82.2475,['Software Training']],
      ['Data Lineage - AWS | Python | MySQL | PySpark','Kakinada','1st Floor, above Shanvi Diagnostic Centre, beside Bhanu Multi Speciality Hospital, G O Colony, Kakinada, Andhra Pradesh 533003, India','Training provider focused on AWS, Python, MySQL and PySpark.','+91 79899 40140',null,null,5.0,38,'Contact institute for current fees',null,16.9910,82.2464,['AWS','Python','MySQL','PySpark']],
      ['Skillinduce Private Limited','Kakinada','II Floor, Srishti Building, 64-4-11/7, Pratap Nagar, Kakinada, Andhra Pradesh 533004, India','Skill-development and training organization offering hands-on training, internships and technology courses.','+91 89717 17105',null,'https://www.skillinduce.co.in',4.5,27,'Contact institute for current fees',null,16.9991,82.2388,['AI','Web Technologies','Python','Java','AWS','Digital Marketing','Medical Coding']],

      ['Firstman IT Solutions','Visakhapatnam','Door No 58-01-241, Murgan Complex, NAD Junction, Visakhapatnam, Andhra Pradesh 530009, India','IT training and placement provider offering cloud, DevOps, networking, cybersecurity, CAD and business software training.','+91 90100 34010','info@firstmanitsolutions.com','https://www.firstmanit.com/',null,null,'Contact institute for current fees',null,17.7500,83.2240,['AWS','Azure','DevOps','CCNA','Cyber Security','CAD','Tally']],
      ['Samavedha IT Solutions','Visakhapatnam','3rd Floor, Satya Sri Devi Complex, 3rd Lane, opposite Anupama Surgical Hospital, Dwaraka Nagar, Visakhapatnam, Andhra Pradesh 530016, India','Software training institute in Dwaraka Nagar, Visakhapatnam.','+91 89148 03239',null,null,4.9,46,'Contact institute for current fees',null,17.7199,83.3055,['Software Training']],
      ['Codegnan','Visakhapatnam','1st Floor, ASN City Center, 1st Ln, opposite Bank of India, Dwaraka Nagar, Visakhapatnam, Andhra Pradesh 530016, India','Classroom IT training center offering programming and full-stack technology courses.','+91 99669 92587','info@codegnan.com','https://codegnan.com/visakhapatnam-campus/',4.6,34,'Contact institute for current fees',null,17.7195,83.3039,['Python','Python Full Stack','Core Java','Software Testing','Full Stack']],

      ['Learners Guru','Hyderabad','5th Floor, Bandari Arcade, Opp. SR Nagar Bus Stand, Srinivas Colony West, SR Nagar, Hyderabad 500038, Telangana, India','Hyderabad IT training institute focused on career-ready technical training and practical learning.','+91 78930 94477','info@learnersguru.com','https://learnersguru.com/',null,null,'Contact institute for current fees',null,17.4399,78.4430,['SOC Analyst','Python Full Stack','Azure & DevOps','AWS & DevOps','Azure Data Engineering','Data Analytics']],
      ['Cloud Soft Solutions','Hyderabad','513, 5th Floor, Aditya Enclave, Nilagiri Block, Beside Ameerpet Metro Station, Ameerpet, Hyderabad 500016, Telangana, India','Software training and placement organization with classroom and online technology training.','+91 99496 16388','info@cloudsoftsol.com','https://cloudsoftsol.com/',null,null,'Contact institute for current fees',null,17.4375,78.4483,['AWS','Azure','GCP','DevOps','Python','Machine Learning','SRE']],
      ['Codegnan','Hyderabad - JNTUH','Kothwal Madhava Reddy Plaza, Beside Indian Oil Petrol Bunk, JNTUH Metro Station, Nizampet X Roads, Hyderabad 500072, Telangana, India','Codegnan classroom IT training campus at JNTUH Metro Station.','+91 89775 40922','info@codegnan.com','https://codegnan.com/',null,null,'Contact institute for current fees',null,17.4932,78.3905,['Programming','Full Stack','Software Testing','Career Training']],

      ['Nipuna Technologies','Vijayawada','Door No. 40-27-88/1, 3rd Floor, Lohia Towers, KP Nagar, Opposite Nirmala Convent, Vijayawada, Andhra Pradesh 520010, India','Software and technical training center offering programming, full stack, data, BI, testing, cloud, DevOps, networking and cybersecurity training.','+91 99858 58639','admin@nipunatechnologies.com','https://nipunatechnologies.com/vijayawada-courses/',null,null,'Contact institute for current fees',null,16.5010,80.6450,['Programming','Full Stack','Data & BI','Testing','Cloud','DevOps','Networking','Cybersecurity']],
      ['Dream India Technologies','Vijayawada','3rd Floor, Vasanth Plaza, Beside Indian Oil Petrol Bunk, Near Benz Circle, MG Road, Vijayawada, Andhra Pradesh 520010, India','Training institute offering classroom and online software training.','+91 73861 36899','vijayawada@dreamindiatechnologies.com','https://www.dreamindiatechnologies.com/',null,null,'Contact institute for current fees',null,16.5020,80.6482,['AWS','Software Training']],
      ['Codegnan','Vijayawada','40-5-19/16, Prasad Naidu Complex, P.B. Siddhartha Bus Stop, Moghalrajpuram, Vijayawada, Andhra Pradesh 520010, India','Classroom IT training center offering programming and development courses.','+91 63013 41478','info@codegnan.com','https://codegnan.com/',null,null,'Contact institute for current fees',null,16.5072,80.6398,['Programming','Full Stack','Software Testing','Career Training']]
    ];
    const genericImage = 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80';
    for(const c of centers){
      c[10] = genericImage;
      const r=await pool.query(`INSERT INTO centers(name,city,address,description,phone,email,website,rating,reviews,fee_range,image_url,latitude,longitude,facilities) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING id`,c);
      const id=r.rows[0].id;
      const coursesByCenter = {
        'KTS': [['Software Training','Programming','Contact institute','Contact institute','Classroom / Online']],
        'Data Lineage - AWS | Python | MySQL | PySpark': [['AWS','Cloud','Contact institute','Contact institute','Contact institute'],['Python','Programming','Contact institute','Contact institute','Contact institute'],['MySQL','Database','Contact institute','Contact institute','Contact institute'],['PySpark','Data','Contact institute','Contact institute','Contact institute']],
        'Skillinduce Private Limited': [['Artificial Intelligence','AI','Contact institute','Contact institute','Contact institute'],['Web Technologies','Development','Contact institute','Contact institute','Contact institute'],['Python','Programming','Contact institute','Contact institute','Contact institute'],['Java','Programming','Contact institute','Contact institute','Contact institute'],['AWS','Cloud','Contact institute','Contact institute','Contact institute'],['Digital Marketing','Marketing','Contact institute','Contact institute','Contact institute'],['Medical Coding','Healthcare IT','Contact institute','Contact institute','Contact institute']],
        'Firstman IT Solutions': [['AWS','Cloud','Contact institute','Contact institute','Contact institute'],['Microsoft Azure','Cloud','Contact institute','Contact institute','Contact institute'],['DevOps','DevOps','Contact institute','Contact institute','Contact institute'],['CCNA','Networking','Contact institute','Contact institute','Contact institute'],['Cyber Security & Ethical Hacking','Security','Contact institute','Contact institute','Contact institute'],['AutoCAD','CAD','Contact institute','Contact institute','Contact institute'],['Tally Prime & GST','Business','Contact institute','Contact institute','Contact institute']],
        'Samavedha IT Solutions': [['Software Training','Programming','Contact institute','Contact institute','Classroom / Online']],
        'Codegnan': [['Python','Programming','Contact institute','Contact institute','Classroom / Online'],['Python Full Stack Developer','Development','Contact institute','Contact institute','Classroom / Online'],['Core Java','Programming','Contact institute','Contact institute','Classroom / Online'],['Software Testing','Testing','Contact institute','Contact institute','Classroom / Online'],['Full Stack Developer','Development','Contact institute','Contact institute','Classroom / Online']],
        'Learners Guru': [['SOC Analyst','Security','Contact institute','Contact institute','Contact institute'],['Python Full Stack','Development','Contact institute','Contact institute','Contact institute'],['Azure & DevOps','DevOps','Contact institute','Contact institute','Contact institute'],['AWS & DevOps','DevOps','Contact institute','Contact institute','Contact institute'],['Azure Data Engineering','Data','Contact institute','Contact institute','Contact institute'],['Data Analytics','Data','Contact institute','Contact institute','Contact institute']],
        'Cloud Soft Solutions': [['AWS','Cloud','Contact institute','Contact institute','Classroom / Online'],['Azure','Cloud','Contact institute','Contact institute','Classroom / Online'],['GCP','Cloud','Contact institute','Contact institute','Classroom / Online'],['DevOps','DevOps','Contact institute','Contact institute','Classroom / Online'],['Python','Programming','Contact institute','Contact institute','Classroom / Online'],['Machine Learning','AI','Contact institute','Contact institute','Classroom / Online']],
        'Codegnan': [['Programming','Programming','Contact institute','Contact institute','Classroom / Online'],['Full Stack','Development','Contact institute','Contact institute','Classroom / Online'],['Software Testing','Testing','Contact institute','Contact institute','Classroom / Online']],
        'Nipuna Technologies': [['Programming','Programming','Contact institute','Contact institute','Classroom / Online'],['Full Stack Development','Development','Contact institute','Contact institute','Classroom / Online'],['Data & BI','Data','Contact institute','Contact institute','Classroom / Online'],['Software Testing','Testing','Contact institute','Contact institute','Classroom / Online'],['Cloud','Cloud','Contact institute','Contact institute','Classroom / Online'],['DevOps','DevOps','Contact institute','Contact institute','Classroom / Online'],['Networking','Networking','Contact institute','Contact institute','Classroom / Online'],['Cybersecurity','Security','Contact institute','Contact institute','Classroom / Online']],
        'Dream India Technologies': [['AWS','Cloud','Contact institute','₹18,999','Classroom / Online'],['Software Training','Programming','Contact institute','Contact institute','Classroom / Online']],
      };
      // Duplicate provider names exist in different cities, so select by city where needed.
      let courses = coursesByCenter[c[0]] || [['Software Training','Programming','Contact institute','Contact institute','Classroom / Online']];
      if(c[0] === 'Codegnan' && c[1] === 'Hyderabad - JNTUH') courses = [['Programming','Programming','Contact institute','Contact institute','Classroom / Online'],['Full Stack','Development','Contact institute','Contact institute','Classroom / Online'],['Software Testing','Testing','Contact institute','Contact institute','Classroom / Online']];
      if(c[0] === 'Codegnan' && c[1] === 'Visakhapatnam') courses = coursesByCenter['Codegnan'];
      for(const cr of courses) await pool.query('INSERT INTO courses(center_id,name,category,duration,fee,mode) VALUES($1,$2,$3,$4,$5,$6)',[id,...cr]);
    }
    await pool.query("INSERT INTO app_meta(key,value) VALUES('real_center_seed','2026-10-01-v1') ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value");
  }
  const demo=await pool.query('SELECT id FROM users WHERE email=$1',['demo@example.com']);
  if(demo.rowCount===0){ const hash=await bcrypt.hash('Demo@12345',10); await pool.query('INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3)',['Demo User','demo@example.com',hash]); }
}

function requireAuth(req,res,next){ if(!req.session.user) return res.redirect('/login?next='+encodeURIComponent(req.originalUrl)); next(); }

app.get('/', async(req,res)=>{
  const featured=await pool.query('SELECT * FROM centers ORDER BY city, name LIMIT 3');
  const courseCount=await pool.query('SELECT COUNT(*) FROM courses');
  const centerCount=await pool.query('SELECT COUNT(*) FROM centers');
  const categoryCount=await pool.query('SELECT COUNT(DISTINCT category) FROM courses');
  res.render('home',{featured:featured.rows,centerCount:Number(centerCount.rows[0].count),courseCount:Number(courseCount.rows[0].count),categoryCount:Number(categoryCount.rows[0].count)});
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
