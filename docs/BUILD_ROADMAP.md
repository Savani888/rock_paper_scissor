# Build Roadmap

## Phase 0: Current Prototype

Done:

- Browser camera capture
- MediaPipe gesture detection
- Local custom dataset capture
- Dataset import/export JSON
- HaGRID annotation conversion
- Combined RPS dataset
- Game uses custom prediction fallback

## Phase 1: Better Website UI

Build:

- Improve current visuals and animations
- Add a cleaner dashboard-like layout
- Add dataset progress indicators
- Add better prediction confidence UI
- Make the website feel like a real product

Done when:

- The local prototype looks polished and easy to demo.

## Phase 2: Next.js App

Build:

- Move static HTML/CSS/JS into Next.js
- Create reusable components
- Add app routes
- Keep camera + MediaPipe working

Done when:

- The app runs as a proper modern frontend.

## Phase 3: Supabase Auth

Build:

- Signup
- Login
- Logout
- User session handling
- Protected dashboard pages

Done when:

- Each user has their own logged-in app area.

## Phase 4: Supabase Database

Build:

- Projects table
- Gesture labels table
- Dataset samples table
- Row-level security
- Save/load samples from Supabase

Done when:

- Dataset samples are permanent without needing browser localStorage.

## Phase 5: Dataset Management

Build:

- Dataset table
- Counts by label
- Delete bad samples
- Import JSON into project
- Export project dataset JSON

Done when:

- A user can manage a dataset cleanly from the website.

## Phase 6: Local Training And Testing

Build:

- Keep classifier in browser
- Add train/test split
- Show basic accuracy
- Show confusion counts
- Show live prediction confidence

Done when:

- User can test if their dataset is good enough.

## Phase 7: Deploy

Build:

- Deploy to Vercel
- Connect Supabase env vars
- Test signup/login/save/load

Done when:

- The app is online and usable from a normal URL.

## Not Building For Now

- Model versions
- API keys
- Public prediction API
- Rate limiting
- Monitoring/alerts
- CI/CD
- Enterprise scaling
