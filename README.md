# Finder – Training Institute Finder

Finder helps students search training institutes by **course** and **city**.

Initial cities:
- Kakinada
- Visakhapatnam (Vizag)

Example courses:
C, C++, Java, Python, AWS, Azure, DevOps, Docker, React, Web Development, Data Science, AI/ML.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL
- Deployment: Render

## Local setup

### 1. Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL connection string
npm run db:setup
npm run dev
```

Backend runs on http://localhost:5000

### 2. Frontend
Open another terminal:
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on the Vite URL shown in the terminal.

For local PostgreSQL, set:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/finder
```

For Render PostgreSQL, use the **Internal Database URL** when the backend is also deployed on Render.

## Render deployment

1. Push this project to GitHub.
2. Create a Render PostgreSQL database.
3. Create a Render Web Service for `backend`.
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment variable: `DATABASE_URL=<Render Internal Database URL>`
   - Environment variable: `FRONTEND_URL=<your frontend URL>`
4. Create a Render Static Site for `frontend`.
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Publish Directory: `dist`
   - Environment variable: `VITE_API_URL=<your backend URL>`

After deployment, update `FRONTEND_URL` in the backend to the actual frontend URL.

## Map directions
The project uses Google Maps directions URLs. It does not require a Google Maps API key for the basic "Get Directions" button. The user's current location can be used by Google Maps when navigation opens.

## Database
`backend/db/schema.sql` creates the institutes and courses tables and inserts sample Kakinada/Vizag training-center records. Replace sample data with verified institute information before public launch.
