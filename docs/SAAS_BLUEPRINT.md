# GestureAI Studio Lightweight SaaS Blueprint

GestureAI Studio is a simple web app for collecting hand-gesture datasets, saving them to a user account, importing/exporting JSON, and testing live predictions in the browser.

This is not an enterprise ML platform. Keep it realistic, visual, and buildable.

## Core Product

- Nice animated website UI
- User signup/login
- User projects
- Browser camera gesture collector
- Pose and motion sample capture
- Dataset save/load from database
- Dataset import/export JSON
- Local/browser prediction
- Basic train/test flow inside the app
- Optional deployment on Vercel or Render

## Removed From Scope

- No model versions
- No hosted public prediction API
- No API keys
- No rate limiting
- No CI/CD pipeline
- No production monitoring and alerts
- No complex scaling system
- No real-time cloud model updating

## Recommended Stack

Use Supabase because it gives auth, PostgreSQL, storage, and row-level security in one place.

- Frontend: Next.js
- Styling: Tailwind CSS or plain CSS modules with Framer Motion
- Auth: Supabase Auth
- Database: Supabase PostgreSQL
- Storage: Supabase Storage for exported datasets if needed
- Prediction: browser-side JavaScript using MediaPipe landmarks and local classifier
- Deployment: Vercel for frontend, Supabase for backend/database
- Testing: local manual testing plus a few basic unit tests

MongoDB is possible, but Supabase is better here because auth and database permissions are built in.

## MVP Features

1. Landing/auth page
2. Signup/login/logout
3. Project dashboard
4. Create/edit/delete project
5. Camera collection screen
6. Save samples to Supabase
7. View dataset counts by label
8. Import/export dataset JSON
9. Test prediction locally in browser
10. Deploy frontend to Vercel

## Data Flow

```text
Browser camera
  -> MediaPipe hand landmarks
  -> normalize landmarks
  -> save samples to Supabase
  -> load samples into browser classifier
  -> predict rock/paper/scissors or custom labels locally
```

## Visual Direction

- Dark polished dashboard
- Camera-first workspace
- Smooth panel transitions
- Animated confidence meter
- Gesture label chips
- Dataset progress bars
- Clean project cards
- Subtle hover and button animations
- No enterprise-heavy admin screens

## Success Criteria

The app is successful when a user can:

- Create an account
- Create a gesture project
- Capture gesture samples
- Import HaGRID/local JSON
- Save everything permanently
- Leave and come back later
- Test live predictions from saved data
