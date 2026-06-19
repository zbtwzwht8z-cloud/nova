# Private MCQ Trainer

Private Vercel-ready MCQ trainer for a small study group.

Current app features:

- Individual accounts with signed session cookies
- Synced progress, bookmarks, reports, and leaderboard
- Study, exam, and review sessions
- Subject atlas, custom session builder, global search, mistake notebook
- Bookmark folders
- Question comments shown as post-answer notes
- Report/fix queue and admin console
- JSON export/import for progress/state
- Cached/proxied question images
- Production service worker for offline-ish repeat use

## Run Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

If no account env vars are set, local dev uses:

```text
admin / admin123
```

## Accounts

Use `TRAINER_USERS` for group accounts:

```text
TRAINER_USERS=[{"id":"you","name":"You","password":"change-me","role":"admin"},{"id":"friend","name":"Friend","password":"change-me-too","role":"member"}]
APP_SECRET=use-a-long-random-secret
```

Roles are `admin` or `member`.

## Synced Backend

Locally, progress is written to `.local-data/trainer-state.json`.

On Vercel, add Vercel KV or Upstash Redis REST env vars:

```text
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
# The app also accepts:
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Without KV, Vercel serverless storage will not persist reliably between deployments.

## Question Data

The app reads the bundled question bank from:

```text
data/questions.json
```

To regenerate from DocsDocs with an authorized account:

```bash
DOCSDOCS_USER="..." DOCSDOCS_PASSWORD="..." npm run export:docsdocs
```

To import a CSV/JSON source file:

```bash
npm run import:questions -- path/to/questions.csv
```

CSV headers supported:

```text
id,subject,topic,stem,choice_a,choice_b,choice_c,choice_d,choice_e,answer,explanation,tags,source,difficulty
```

## Deploy On Vercel

1. Push this folder to a private GitHub repo.
2. Import the repo in Vercel.
3. Add env vars:

```text
APP_SECRET=...
TRAINER_USERS=...
KV_REST_API_URL=...
KV_REST_API_TOKEN=...
```

4. Deploy.

Keep the repo private if the question bank should stay private.
