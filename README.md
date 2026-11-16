# Luna — coming soon

A one-page "coming soon" site for Luna with a working waitlist.

- `public/` — the site (HTML, CSS, JS, logo files)
- `api/waitlist.js` — Vercel serverless function that saves emails to Postgres

## Deploy

1. **Push to GitHub**

   ```sh
   git init
   git add .
   git commit -m "Luna coming soon page"
   gh repo create luna --private --source=. --push
   ```

2. **Import into Vercel** — vercel.com → Add New → Project → pick the repo.
   Leave every build setting on its default and deploy.

3. **Add the database** — in the Vercel project: Storage → Create Database → Neon (Postgres) →
   connect it to this project. That adds a `DATABASE_URL` environment variable automatically.

4. **Redeploy** — Deployments → ⋯ → Redeploy, so the function picks up `DATABASE_URL`.

The `waitlist` table is created automatically the first time someone signs up.
Until step 3 is done, the form shows "The list isn't open just yet."

## See who signed up

Vercel project → Storage → your database → Open in Neon → SQL Editor:

```sql
SELECT email, created_at FROM waitlist ORDER BY created_at DESC;
```

Neon's Tables view can also export the list as CSV.

## Run locally

```sh
npm install
vercel link          # once
vercel env pull      # once the database is connected
npm run dev
```
