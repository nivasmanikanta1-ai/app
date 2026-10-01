# Training Center Finder

A realistic full-stack training institute discovery application built with Node.js, Express, EJS, PostgreSQL and Leaflet/OpenStreetMap.

## Features
- Search training centers by course and city
- Training center detail pages with courses, fees, rating, contact details and facilities
- Interactive map using Leaflet + OpenStreetMap
- User registration and login with hashed passwords
- Session-based authentication stored in PostgreSQL
- Save/favorite training centers
- Responsive UI
- PostgreSQL seed data for realistic institutes and courses
- Render deployment ready

## Local setup
1. Install Node.js 18+ and PostgreSQL.
2. Create a PostgreSQL database named `training_finder`.
3. Copy `.env.example` to `.env` and update `DATABASE_URL` and `SESSION_SECRET`.
4. Run `npm install`.
5. Run `npm start`.
6. Open `http://localhost:10000`.

The app automatically creates tables and seed data on startup.

## Render deployment
Create a PostgreSQL database in Render, then create a Web Service connected to this repository.
- Build Command: `npm install`
- Start Command: `npm start`
- Environment: Node
- Add `DATABASE_URL` from the Render PostgreSQL database and `SESSION_SECRET` as environment variables.
- The app listens on Render's `PORT` automatically.

No separate frontend service is required because Express serves the responsive frontend.

## Demo login
After first startup, a demo user is seeded:
- Email: `demo@example.com`
- Password: `Demo@12345`

Change/remove demo credentials before production use.
