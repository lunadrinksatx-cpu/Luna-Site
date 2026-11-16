// POST /api/waitlist  { email }
// Saves the email to a Postgres table called `waitlist` (Neon, via Vercel Storage).
import { neon } from '@neondatabase/serverless';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_EMAIL_LENGTH = 254;

let sqlClient;
let tableReady;

function getSql() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) return null;
  if (!sqlClient) sqlClient = neon(url);
  return sqlClient;
}

// Creates the table the first time the function runs, so there is no setup step.
function ensureTable(sql) {
  if (!tableReady) {
    tableReady = sql`
      CREATE TABLE IF NOT EXISTS waitlist (
        id         BIGSERIAL PRIMARY KEY,
        email      TEXT NOT NULL UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `.catch((err) => {
      tableReady = undefined; // let the next request try again
      throw err;
    });
  }
  return tableReady;
}

function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return null;
    }
  }
  return body && typeof body === 'object' ? body : null;
}

// `resolveSql` is injectable so the handler can be tested without a real database.
export function createHandler(resolveSql = getSql) {
  return async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');

    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ ok: false, error: 'Method not allowed.' });
    }

    const body = readBody(req);
    if (!body) {
      return res.status(400).json({ ok: false, error: 'Please enter your email.' });
    }

    // Honeypot field: real people never fill it in. Pretend it worked, save nothing.
    if (typeof body.company === 'string' && body.company.trim() !== '') {
      return res.status(200).json({ ok: true });
    }

    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL.test(email)) {
      return res
        .status(400)
        .json({ ok: false, error: 'That email doesn’t look quite right. Try once more.' });
    }

    const sql = resolveSql();
    if (!sql) {
      console.error('waitlist: DATABASE_URL is not set. Connect a Neon database in Vercel → Storage.');
      return res
        .status(503)
        .json({ ok: false, error: 'The list isn’t open just yet. Please try again soon.' });
    }

    try {
      await ensureTable(sql);
      // Same response whether the email is new or already saved,
      // so the form can't be used to check who has signed up.
      await sql`INSERT INTO waitlist (email) VALUES (${email}) ON CONFLICT (email) DO NOTHING`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('waitlist: database error', err);
      return res.status(500).json({
        ok: false,
        error: 'Something went quiet on our end. Please try again in a moment.',
      });
    }
  };
}

export default createHandler();
