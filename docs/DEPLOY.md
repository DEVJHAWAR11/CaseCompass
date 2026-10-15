# Deploying CaseCompass (Render backend, Vercel frontend)

The backend image was built and smoke-tested locally (`/health` and `/search` returned 200 with
`IK_SPEND_CAP_INR=0`). Do the backend first: the frontend needs its URL.

## 0. Rotate keys first (recommended)
The Groq, Jina, Indian Kanoon and Supabase DB keys were pasted in a chat earlier. Make new ones,
update your local `.env`, and use the new values below.
- Supabase: Project Settings > Database > reset database password (then copy the new session-pooler URL).
- Groq: console.groq.com > API Keys. Jina: jina.ai > API key. Indian Kanoon: your API dashboard.

## 1. Render (backend)
1. render.com > sign in with GitHub > New > Blueprint > pick the `CaseCompass` repo. Render reads `render.yaml`.
2. It asks for the secret values (marked `sync: false`). Paste from your `.env`:
   `DATABASE_URL` (the Supabase session-pooler URL), `GROQ_API_KEY`, `JINA_API_KEY`, `IK_API_TOKEN`.
   Leave `CORS_ORIGINS` as a placeholder for now (`http://localhost:3000`).
3. Apply. The first build takes a few minutes. When live, open `https://<name>.onrender.com/health`:
   expect `{"status":"ok"}`.
4. Free tier sleeps after ~15 minutes idle; the first request then takes ~30-60 s (the UI shows "waking up").

## 2. Vercel (frontend)
1. vercel.com > sign in with GitHub > Add New Project > import `CaseCompass`.
2. Set **Root Directory** to `frontend` (framework: Next.js is detected).
3. Environment variable: `NEXT_PUBLIC_API_URL` = your Render URL (no trailing slash).
4. Deploy. Copy the Vercel URL (e.g. `https://casecompass.vercel.app`).

## 3. Connect them
In Render > the service > Environment: set `CORS_ORIGINS` to the Vercel URL (comma-separate if you
add a custom domain). Save; Render redeploys. Without this the browser blocks search calls.

## 4. Check
- Open the Vercel URL, run a search. The first one may be slow (backend waking up).
- The IKanoon logo should show above results; the disclaimer should be visible.
- Render > Logs should show `POST /search 200`.

## Notes
- The deployed backend never pays Indian Kanoon per click (`IK_SPEND_CAP_INR=0`); search and passages read the database.
- Usage ledger and rate limiting: the ledger is in Postgres; the per-IP limiter is in memory (resets on restart, fine for one instance).
