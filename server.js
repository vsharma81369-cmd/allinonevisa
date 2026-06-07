/* ==========================================================================
   All In One Visa — server.js
   Zero-dependency Node server (built-in modules only). It:
     • serves the static website
     • POST /api/submit          → saves a form fill (creates an application)
     • POST /api/admin/login     → staff login (session cookie)
     • POST /api/admin/logout
     • GET  /api/admin/me        → who am I (auth check)
     • GET  /api/admin/applications → all form fills / applications (auth)
     • POST /api/admin/update    → change an application's stage (auth)
     • GET  /api/track?ref=&email= → public status lookup for customers

   Run:  node server.js   (then open http://localhost:4321)
   Data is stored in data.json (DO NOT commit / serve it — handled below).
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_FILE = path.join(ROOT, 'data.json');
const PORT = process.env.PORT || 4321;

/* Application stages, in order. The customer tracker shows these as a timeline. */
const STATUSES = ['Enquiry received', 'Documents in review', 'Submitted', 'Processing', 'Decision'];

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.webp': 'image/webp',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

/* ----------------------------------------------------------- data store ---- */
function load() {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); }
  catch (e) { return null; }
}
function save(d) { fs.writeFileSync(DATA_FILE, JSON.stringify(d, null, 2)); }

function ensureData() {
  let d = load();
  if (!d) d = { applications: [], sessions: {}, admin: null };
  if (!d.applications) d.applications = [];
  if (!d.sessions) d.sessions = {};
  if (!d.admin) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.scryptSync('changeme123', salt, 64).toString('hex');
    d.admin = { username: 'admin', salt, hash };
    save(d);
    console.log('\n  ┌──────────────────────────────────────────────┐');
    console.log('  │  Admin account created                         │');
    console.log('  │  username: admin                               │');
    console.log('  │  password: changeme123  ← change this!         │');
    console.log('  │  (edit via data.json or the env on deploy)     │');
    console.log('  └──────────────────────────────────────────────┘\n');
  }
  return d;
}
let db = ensureData();

/* Set or reset the admin login from env vars (no need to edit hashes by hand):
   ADMIN_USER=you ADMIN_PASSWORD=yourSecret node server.js  */
if (process.env.ADMIN_PASSWORD) {
  const u = process.env.ADMIN_USER || (db.admin && db.admin.username) || 'admin';
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(process.env.ADMIN_PASSWORD, salt, 64).toString('hex');
  db.admin = { username: u, salt, hash };
  db.sessions = {};
  save(db);
  console.log('Admin credentials updated from environment (user: ' + u + ').');
}

/* ------------------------------------------------------------- helpers ----- */
const json = (res, code, obj) => {
  const body = JSON.stringify(obj);
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
};
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { resolve({}); } });
  });
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach((p) => {
    const i = p.indexOf('='); if (i > -1) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const token = parseCookies(req).aiov_session;
  if (!token) return null;
  const s = db.sessions[token];
  if (!s || s.expires < Date.now()) { if (s) { delete db.sessions[token]; save(db); } return null; }
  return s.username;
}
const esc = (s) => String(s == null ? '' : s).slice(0, 2000);
function makeRef() {
  const year = new Date().getFullYear();
  let ref;
  do { ref = 'AIOV-' + year + '-' + (10000 + Math.floor(Math.random() * 89999)); }
  while (db.applications.some((a) => a.ref === ref));
  return ref;
}

/* -------------------------------------------------------- static serving --- */
function serveStatic(req, res) {
  let pathname = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (pathname === '/') pathname = '/index.html';
  // resolve safely within ROOT
  const filePath = path.normalize(path.join(ROOT, pathname));
  if (!filePath.startsWith(ROOT)) return json(res, 403, { error: 'forbidden' });
  // never expose the datastore or the server source
  const base = path.basename(filePath);
  if (base === 'data.json' || base === 'server.js') return json(res, 404, { error: 'not found' });
  fs.readFile(filePath, (err, buf) => {
    if (err) {
      // SPA-ish fallback: unknown path → 404 page or index
      return fs.readFile(path.join(ROOT, 'index.html'), (e2, idx) => {
        if (e2) { res.writeHead(404); return res.end('Not found'); }
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(idx);
      });
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream' };
    if (ext === '.html') headers['Cache-Control'] = 'no-cache';
    res.writeHead(200, headers);
    res.end(buf);
  });
}

/* --------------------------------------------------------------- router ---- */
const server = http.createServer(async (req, res) => {
  const u = new URL(req.url, 'http://x');
  const p = u.pathname;

  /* ---- public: submit a form fill ---- */
  if (p === '/api/submit' && req.method === 'POST') {
    const b = await readBody(req);
    if (!b.name || !b.email) return json(res, 400, { error: 'Name and email are required.' });
    const now = new Date().toISOString();
    const app = {
      id: crypto.randomUUID(), ref: makeRef(), createdAt: now, updatedAt: now,
      name: esc(b.name), email: esc(b.email).toLowerCase(), phone: esc(b.phone),
      residence: esc(b.residence), nationality: esc(b.nationality), destination: esc(b.destination),
      purpose: esc(b.purpose), service: esc(b.service), notes: esc(b.notes),
      source: esc(b.source || 'web'),
      status: STATUSES[0], statusNote: '',
      history: [{ status: STATUSES[0], note: 'Enquiry received from the website.', at: now }]
    };
    db.applications.unshift(app);
    save(db);
    return json(res, 200, { ok: true, ref: app.ref });
  }

  /* ---- public: track an application ---- */
  if (p === '/api/track' && req.method === 'GET') {
    const ref = (u.searchParams.get('ref') || '').trim().toUpperCase();
    const email = (u.searchParams.get('email') || '').trim().toLowerCase();
    const a = db.applications.find((x) => x.ref.toUpperCase() === ref && x.email === email);
    if (!a) return json(res, 404, { error: 'No application found with that reference and email.' });
    return json(res, 200, {
      ref: a.ref, name: a.name, destination: a.destination, purpose: a.purpose, service: a.service,
      status: a.status, statusNote: a.statusNote, statusIndex: Math.max(0, STATUSES.indexOf(a.status)),
      statuses: STATUSES, createdAt: a.createdAt, updatedAt: a.updatedAt
    });
  }

  /* ---- admin: login ---- */
  if (p === '/api/admin/login' && req.method === 'POST') {
    const b = await readBody(req);
    const ad = db.admin;
    const ok = ad && b.username === ad.username &&
      crypto.timingSafeEqual(
        crypto.scryptSync(String(b.password || ''), ad.salt, 64),
        Buffer.from(ad.hash, 'hex')
      );
    if (!ok) return json(res, 401, { error: 'Wrong username or password.' });
    const token = crypto.randomBytes(24).toString('hex');
    db.sessions[token] = { username: ad.username, expires: Date.now() + 1000 * 60 * 60 * 12 };
    save(db);
    res.setHeader('Set-Cookie', `aiov_session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=43200`);
    return json(res, 200, { ok: true });
  }

  /* ---- admin: logout ---- */
  if (p === '/api/admin/logout' && req.method === 'POST') {
    const token = parseCookies(req).aiov_session;
    if (token) { delete db.sessions[token]; save(db); }
    res.setHeader('Set-Cookie', 'aiov_session=; HttpOnly; Path=/; Max-Age=0');
    return json(res, 200, { ok: true });
  }

  /* ---- admin: auth check ---- */
  if (p === '/api/admin/me' && req.method === 'GET') {
    const user = currentUser(req);
    return user ? json(res, 200, { user }) : json(res, 401, { error: 'Not signed in.' });
  }

  /* ---- admin: list all applications ---- */
  if (p === '/api/admin/applications' && req.method === 'GET') {
    if (!currentUser(req)) return json(res, 401, { error: 'Not signed in.' });
    return json(res, 200, { statuses: STATUSES, applications: db.applications });
  }

  /* ---- admin: update an application's stage ---- */
  if (p === '/api/admin/update' && req.method === 'POST') {
    if (!currentUser(req)) return json(res, 401, { error: 'Not signed in.' });
    const b = await readBody(req);
    const a = db.applications.find((x) => x.id === b.id);
    if (!a) return json(res, 404, { error: 'Application not found.' });
    if (b.status && STATUSES.includes(b.status)) a.status = b.status;
    if (typeof b.statusNote === 'string') a.statusNote = esc(b.statusNote);
    a.updatedAt = new Date().toISOString();
    a.history = a.history || [];
    a.history.push({ status: a.status, note: a.statusNote, at: a.updatedAt });
    save(db);
    return json(res, 200, { ok: true });
  }

  /* ---- everything else: static files ---- */
  return serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`All In One Visa running at http://localhost:${PORT}`);
  console.log(`  Site:   http://localhost:${PORT}/`);
  console.log(`  Admin:  http://localhost:${PORT}/admin.html`);
  console.log(`  Track:  http://localhost:${PORT}/track-application.html`);
});
