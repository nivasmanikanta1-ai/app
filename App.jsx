import React, { useEffect, useMemo, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function mapsDirections(institute) {
  const destination = `${institute.latitude},${institute.longitude}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

function mapsPlace(institute) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${institute.name}, ${institute.address}`
  )}`;
}

function App() {
  const [courses, setCourses] = useState([]);
  const [cities, setCities] = useState([]);
  const [course, setCourse] = useState("");
  const [city, setCity] = useState("");
  const [q, setQ] = useState("");
  const [institutes, setInstitutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch(`${API_URL}/api/courses`).then(r => r.json()),
      fetch(`${API_URL}/api/cities`).then(r => r.json())
    ])
      .then(([courseData, cityData]) => {
        setCourses(courseData);
        setCities(cityData);
      })
      .catch(() => setError("Could not connect to Finder server."));
  }, []);

  const search = async (event) => {
    event?.preventDefault();
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (course) params.set("course", course);
      if (city) params.set("city", city);
      if (q.trim()) params.set("q", q.trim());

      const response = await fetch(`${API_URL}/api/institutes?${params}`);
      if (!response.ok) throw new Error();
      setInstitutes(await response.json());
    } catch {
      setError("Search failed. Make sure the backend and PostgreSQL are running.");
    } finally {
      setLoading(false);
    }
  };

  const featuredCourses = useMemo(
    () => ["C", "Java", "Python", "AWS", "Azure", "DevOps", "React"],
    []
  );

  const useCourse = (name) => {
    setCourse(name);
    setQ("");
    setTimeout(() => document.getElementById("search-form")?.requestSubmit(), 0);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brand-mark">F</div>
          <div>
            <h1>Finder</h1>
            <span>Training Institute Finder</span>
          </div>
        </div>
        <a className="header-link" href="#results">Explore Centers</a>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <span className="eyebrow">LEARN • TRAIN • GROW</span>
            <h2>Find the right training center near you.</h2>
            <p>
              Search courses such as C, Java, AWS, Azure and DevOps,
              then discover related training institutes in Kakinada and Vizag.
            </p>

            <form id="search-form" className="search-panel" onSubmit={search}>
              <div className="field">
                <label>Course</label>
                <select value={course} onChange={e => setCourse(e.target.value)}>
                  <option value="">All courses</option>
                  {courses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                </select>
              </div>

              <div className="field">
                <label>City</label>
                <select value={city} onChange={e => setCity(e.target.value)}>
                  <option value="">All cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div className="field search-field">
                <label>Search</label>
                <input
                  value={q}
                  onChange={e => setQ(e.target.value)}
                  placeholder="Institute, course or area"
                />
              </div>

              <button className="search-btn" type="submit">
                {loading ? "Searching..." : "Search"}
              </button>
            </form>
          </div>
        </section>

        <section className="course-strip">
          <div>
            <span className="section-label">POPULAR COURSES</span>
            <h3>What do you want to learn?</h3>
          </div>
          <div className="course-chips">
            {featuredCourses.map(name => (
              <button key={name} onClick={() => useCourse(name)}>{name}</button>
            ))}
          </div>
        </section>

        <section id="results" className="results-section">
          <div className="section-heading">
            <div>
              <span className="section-label">TRAINING CENTERS</span>
              <h3>{institutes.length ? `${institutes.length} centers found` : "Search training centers"}</h3>
            </div>
            {(course || city || q) && (
              <button className="clear-btn" onClick={() => {
                setCourse("");
                setCity("");
                setQ("");
                setInstitutes([]);
              }}>Clear filters</button>
            )}
          </div>

          {error && <div className="error">{error}</div>}

          {!institutes.length && !loading && !error && (
            <div className="empty">
              <div className="empty-icon">⌕</div>
              <h4>Start your search</h4>
              <p>Select a course and city to find matching training centers.</p>
            </div>
          )}

          <div className="cards">
            {institutes.map(institute => (
              <article className="card" key={institute.id}>
                <div className="card-top">
                  <div className="institute-icon">🎓</div>
                  <div className="rating">★ {institute.rating ?? "New"}</div>
                </div>

                <h4>{institute.name}</h4>
                <p className="location">📍 {institute.address}, {institute.city}</p>

                <div className="tags">
                  {institute.courses.map(item => <span key={item}>{item}</span>)}
                </div>

                <div className="meta">
                  <span>⏱ {institute.duration || "Contact center"}</span>
                  <span>₹ {institute.fees_from ? `From ${Number(institute.fees_from).toLocaleString("en-IN")}` : "Contact"}</span>
                </div>

                <div className="card-actions">
                  <button className="details-btn" onClick={() => setSelected(institute)}>
                    View Details
                  </button>
                  <a
                    className="direction-btn"
                    href={mapsDirections(institute)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    🧭 Directions
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer>
        <strong>Finder</strong> — Training institute discovery platform
      </footer>

      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <button className="close" onClick={() => setSelected(null)}>×</button>
            <div className="modal-icon">🎓</div>
            <h3>{selected.name}</h3>
            <p className="modal-city">{selected.city}</p>

            <div className="detail-list">
              <div><b>Courses</b><span>{selected.courses.join(", ")}</span></div>
              <div><b>Address</b><span>{selected.address}</span></div>
              <div><b>Fees</b><span>{selected.fees_from ? `From ₹${Number(selected.fees_from).toLocaleString("en-IN")}` : "Contact center"}</span></div>
              <div><b>Duration</b><span>{selected.duration || "Contact center"}</span></div>
              <div><b>Mode</b><span>{selected.mode || "Offline"}</span></div>
              <div><b>Phone</b><span>{selected.phone || "Not available"}</span></div>
            </div>

            <div className="modal-actions">
              <a
                href={mapsPlace(selected)}
                target="_blank"
                rel="noreferrer"
                className="direction-btn wide"
              >
                📍 View on Map
              </a>
              <a
                href={mapsDirections(selected)}
                target="_blank"
                rel="noreferrer"
                className="search-btn wide"
              >
                🧭 Get Directions
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
