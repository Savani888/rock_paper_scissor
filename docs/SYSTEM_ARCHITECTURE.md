# Lightweight System Architecture

## High-Level Flow

```text
Next.js Web App
  -> Supabase Auth
  -> Supabase PostgreSQL
  -> Supabase Storage, optional
  -> Browser-side MediaPipe + classifier
```

No separate API server is required for the first SaaS version. The frontend can call Supabase directly using the Supabase client and row-level security.

## Frontend

Pages:

- `/`
- `/login`
- `/signup`
- `/dashboard`
- `/projects/new`
- `/projects/:projectId`
- `/projects/:projectId/collect`
- `/projects/:projectId/dataset`
- `/projects/:projectId/test`

Responsibilities:

- Authentication UI
- Project dashboard
- Camera capture
- Hand landmark extraction
- Dataset labeling
- Dataset import/export
- Local prediction
- Nice visuals and animations

## Supabase

Supabase handles:

- User accounts
- Sessions
- PostgreSQL database
- Row-level security
- Optional file storage

## Prediction

Prediction stays in the browser for now.

```text
Saved samples from Supabase
  -> load into browser
  -> compare live camera landmarks
  -> show prediction and confidence
  -> use prediction in RPS game
```

This avoids hosted inference complexity, API keys, rate limits, model deployments, and real-time model version problems.

## Storage

Database stores:

- profiles
- projects
- gesture labels
- dataset samples

Optional Supabase Storage stores:

- exported JSON backups
- later: screenshots or short clips, only if needed

## Deployment

Recommended:

- Vercel for Next.js frontend
- Supabase hosted project for auth/database

Alternative:

- Render for a simple full-stack deployment later

## Testing

Keep testing basic:

- local browser testing
- camera flow testing
- import/export testing
- small unit tests for label normalization and classifier math
