# Supabase Data Access Design

For the lightweight version, do not build a custom public API.

The Next.js app talks directly to Supabase:

```text
Next.js client
  -> Supabase Auth
  -> Supabase PostgreSQL with row-level security
```

## Auth

Handled by Supabase Auth:

- signup
- login
- logout
- session restore
- password reset later if needed

## App Data Operations

These are frontend data operations, not public API endpoints.

## Projects

```text
list projects for logged-in user
create project
update project
delete project
```

Project shape:

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "Rock Paper Scissors",
  "description": "RPS gesture dataset"
}
```

## Gesture Labels

```text
list labels for project
create label
rename label
delete label
```

Label shape:

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "rock"
}
```

## Dataset Samples

```text
list samples for project
insert one sample
bulk insert imported JSON samples
delete bad sample
delete all samples for one label
```

Sample shape:

```json
{
  "id": "uuid",
  "project_id": "uuid",
  "label": "rock",
  "sample_type": "pose",
  "landmark_vector": [0.0, 0.1, -0.1],
  "metadata": {
    "source": "webcam"
  }
}
```

## Import/Export

Import:

```text
user selects JSON file
frontend validates shape
frontend normalizes labels
frontend inserts samples into Supabase
```

Export:

```text
frontend loads project samples
frontend creates JSON blob
browser downloads file
```

## Local Prediction

Prediction stays inside the browser:

```text
load project samples
capture live landmarks
run local classifier
show label and confidence
```

No hosted prediction endpoint for now.
