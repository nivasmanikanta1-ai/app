CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS institutes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address TEXT NOT NULL,
  phone VARCHAR(30),
  website TEXT,
  fees_from INTEGER,
  duration VARCHAR(100),
  mode VARCHAR(50) DEFAULT 'Offline',
  rating NUMERIC(2,1),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS institute_courses (
  institute_id INTEGER REFERENCES institutes(id) ON DELETE CASCADE,
  course_id INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (institute_id, course_id)
);

INSERT INTO courses (name) VALUES
('C'), ('C++'), ('Java'), ('Python'), ('AWS'), ('Azure'),
('DevOps'), ('Docker'), ('React'), ('Web Development'),
('Data Science'), ('AI/ML')
ON CONFLICT (name) DO NOTHING;

-- Sample records for development/demo only.
-- Verify institute details before using them in a public production directory.
INSERT INTO institutes
(name, city, address, phone, website, fees_from, duration, mode, rating, latitude, longitude)
SELECT * FROM (VALUES
('Demo Cloud Academy', 'Kakinada', 'Main Road, Kakinada, Andhra Pradesh', '9000000001', NULL, 8000, '2-3 months', 'Offline', 4.5, 16.9891, 82.2475),
('Demo Java Institute', 'Kakinada', 'Education Area, Kakinada, Andhra Pradesh', '9000000002', NULL, 7000, '3 months', 'Offline', 4.2, 16.9898, 82.2470),
('Demo Tech Academy', 'Visakhapatnam', 'Dwaraka Nagar, Visakhapatnam, Andhra Pradesh', '9000000003', NULL, 9000, '3 months', 'Offline', 4.4, 17.7231, 83.3013),
('Demo IT Skills Center', 'Visakhapatnam', 'MVP Colony, Visakhapatnam, Andhra Pradesh', '9000000004', NULL, 7500, '2 months', 'Hybrid', 4.1, 17.7448, 83.3246)
) AS v(name, city, address, phone, website, fees_from, duration, mode, rating, latitude, longitude)
WHERE NOT EXISTS (
  SELECT 1 FROM institutes i WHERE i.name = v.name AND i.city = v.city
);

INSERT INTO institute_courses (institute_id, course_id)
SELECT i.id, c.id
FROM institutes i
JOIN courses c ON (
  (i.name = 'Demo Cloud Academy' AND c.name IN ('AWS','Azure','DevOps','Docker','Python')) OR
  (i.name = 'Demo Java Institute' AND c.name IN ('Java','C','C++')) OR
  (i.name = 'Demo Tech Academy' AND c.name IN ('Java','Python','React','Web Development')) OR
  (i.name = 'Demo IT Skills Center' AND c.name IN ('AWS','Azure','Data Science','AI/ML'))
)
ON CONFLICT DO NOTHING;
