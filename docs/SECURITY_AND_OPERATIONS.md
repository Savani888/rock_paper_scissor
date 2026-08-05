# Security, Testing, And Deployment

This project should stay simple for now.

## Auth And Permissions

Use Supabase Auth.

Required:

- Signup
- Login
- Logout
- Protected app pages
- Each user can only access their own projects and samples

Use Supabase row-level security for permissions.

Roles:

- `user`

Optional later:

- `admin`

No teams, API keys, enterprise SSO, or complex permissions for now.

## Security Basics

Keep:

- HTTPS through Vercel/Supabase
- Supabase Auth sessions
- Row-level security
- Input validation
- File size limits for JSON import
- Do not store passwords yourself
- Do not expose Supabase service role key in frontend

Skip for now:

- API key hashing
- Rate limiting system
- Audit log system
- Cloud secret manager complexity
- Advanced compliance work

## Testing

Only local and basic testing for now.

Test manually:

- Camera starts
- RPS game works
- Custom prediction works
- Import JSON works
- Export JSON works
- Login works
- Samples save and reload after logout/login

Add small tests for:

- label normalization
- landmark vector normalization
- classifier distance calculation
- dataset merge/import behavior

## Deployment

Recommended:

- Vercel for website
- Supabase for auth/database

Deployment checklist:

1. Create Supabase project
2. Create database tables
3. Enable row-level security
4. Add Supabase URL/key to Vercel env vars
5. Deploy Next.js app to Vercel
6. Test signup/login
7. Test sample save/load

## Not Needed Now

- CI/CD
- Monitoring and alerts
- Rate limiting
- API keys
- Hosted inference
- Multi-region scale
- Kubernetes
