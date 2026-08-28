import express from 'express';
import path from 'path';
import { mkdirSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';

mkdirSync('data', { recursive: true });
const db = new DatabaseSync('data/shravana.db');
db.exec(`CREATE TABLE IF NOT EXISTS grievances (
  id TEXT PRIMARY KEY, title TEXT NOT NULL, summary TEXT NOT NULL, category TEXT NOT NULL,
  department TEXT NOT NULL, location TEXT NOT NULL, state TEXT NOT NULL,
  submitted_at TEXT NOT NULL, sla_due_at TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
); CREATE TABLE IF NOT EXISTS citizen_outcomes (
  id INTEGER PRIMARY KEY AUTOINCREMENT, grievance_id TEXT NOT NULL, outcome TEXT NOT NULL,
  created_at TEXT NOT NULL, FOREIGN KEY(grievance_id) REFERENCES grievances(id)
); CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, grievance_id TEXT NOT NULL, event_type TEXT NOT NULL,
  details TEXT, created_at TEXT NOT NULL
); CREATE TABLE IF NOT EXISTS escalations (
  id INTEGER PRIMARY KEY AUTOINCREMENT, grievance_id TEXT NOT NULL, reason TEXT NOT NULL,
  created_at TEXT NOT NULL
); CREATE TABLE IF NOT EXISTS evidence (
  id INTEGER PRIMARY KEY AUTOINCREMENT, grievance_id TEXT NOT NULL, original_name TEXT NOT NULL,
  stored_path TEXT NOT NULL, mime_type TEXT NOT NULL, size_bytes INTEGER NOT NULL,
  analysis_status TEXT NOT NULL DEFAULT 'PENDING', analysis_summary TEXT, created_at TEXT NOT NULL
); CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, role TEXT NOT NULL, department TEXT, created_at TEXT NOT NULL
); CREATE TABLE IF NOT EXISTS service_ratings (
  id INTEGER PRIMARY KEY AUTOINCREMENT, grievance_id TEXT NOT NULL, rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  created_at TEXT NOT NULL, FOREIGN KEY(grievance_id) REFERENCES grievances(id)
);`);
try { db.exec('ALTER TABLE citizen_outcomes ADD COLUMN closing_reason TEXT') } catch { /* already migrated */ }
try { db.exec('ALTER TABLE users ADD COLUMN email TEXT') } catch { /* already migrated */ }
try { db.exec('ALTER TABLE users ADD COLUMN demo_password TEXT') } catch { /* already migrated */ }

const now = () => new Date().toISOString();
const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)) };
const readBody = req => new Promise((resolve, reject) => { let body = ''; req.on('data', chunk => body += chunk); req.on('end', () => { try { resolve(JSON.parse(body || '{}')) } catch { reject(new Error('Invalid JSON')) } }) });
const map = row => ({ id: row.id, title: row.title, summary: row.summary, category: row.category, department: row.department, location: row.location, state: row.state, submittedAt: row.submitted_at, slaDueAt: row.sla_due_at });

function seed() {
  if (db.prepare('SELECT COUNT(*) count FROM grievances').get().count) return;
  const stamp = now();
  db.prepare('INSERT INTO grievances VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run('SHRAVANA-2026-00418', 'Streetlight has not been repaired', 'The streetlight outside Block C has remained off for three weeks, making the lane unsafe at night.', 'Civic infrastructure', 'Municipal Corporation', 'Sector 17, Rohini, Delhi', 'AWAITING_CITIZEN_CONFIRMATION', '2026-08-05', '2026-08-26', stamp, stamp);
}
seed();
if (!db.prepare('SELECT COUNT(*) count FROM users').get().count) {
  const stamp = now();
  db.prepare('INSERT INTO users (name,role,department,created_at) VALUES (?,?,?,?)').run('Asha Sharma', 'CITIZEN', null, stamp);
  db.prepare('INSERT INTO users (name,role,department,created_at) VALUES (?,?,?,?)').run('Ravi Deshmukh', 'DEPARTMENT_OFFICER', 'Municipal Corporation', stamp);
  db.prepare('INSERT INTO users (name,role,department,created_at) VALUES (?,?,?,?)').run('Meera Nair', 'STATE_SUPERVISOR', 'State Grievance Cell', stamp);
  db.prepare('INSERT INTO users (name,role,department,created_at) VALUES (?,?,?,?)').run('Portal Administrator', 'ADMIN', null, stamp);
}
db.prepare('UPDATE users SET email=?, demo_password=? WHERE role=?').run('officer@shravana.demo', 'Officer@123', 'DEPARTMENT_OFFICER');
db.prepare('UPDATE users SET email=?, demo_password=? WHERE role=?').run('supervisor@shravana.demo', 'Supervisor@123', 'STATE_SUPERVISOR');
db.prepare('UPDATE users SET email=?, demo_password=? WHERE role=?').run('admin@shravana.demo', 'Admin@123', 'ADMIN');

const app = express();

// Serve the compiled Vite frontend from the dist directory
app.use(express.static(path.join(process.cwd(), 'dist')));

// Intercept API routes and pass them to your existing native HTTP logic
app.all('/api/*', async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost:3001'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') return send(res, 200, { ok: true });
    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readBody(req);
      const user = db.prepare('SELECT id,name,role,department,email FROM users WHERE email=? AND demo_password=?').get(String(body.email || '').trim().toLowerCase(), String(body.password || ''));
      if (!user) return send(res, 401, { error: 'Invalid demo official credentials.' });
      return send(res, 200, { user });
    }
    if (req.method === 'POST' && url.pathname === '/api/auth/citizen') return send(res, 200, { user: { id: 'citizen-demo', name: 'Citizen', role: 'CITIZEN', department: null } });
    if (req.method === 'GET' && url.pathname === '/api/stakeholder/dashboard') {
      const role = url.searchParams.get('role');
      if (!['DEPARTMENT_OFFICER', 'STATE_SUPERVISOR', 'ADMIN'].includes(role || '')) return send(res, 403, { error: 'This dashboard is available only to authorized stakeholder roles.' });
      const all = db.prepare('SELECT * FROM grievances ORDER BY updated_at DESC').all().map(map);
      const queue = role === 'DEPARTMENT_OFFICER' ? all.filter(item => item.department === 'Municipal Corporation') : all;
      const active = queue.filter(item => !['RESOLVED', 'ESCALATED'].includes(item.state)).length;
      const overdue = queue.filter(item => new Date(item.slaDueAt) < new Date() && item.state !== 'RESOLVED').length;
      const rating = db.prepare('SELECT ROUND(AVG(rating), 1) average FROM service_ratings').get().average;
      const ministries = [
        { name: 'Municipal Corporation', owner: 'Urban Services Directorate', task: 'Restore and verify non-functional streetlights in priority lanes', status: 'On track', resolutionDays: 4.2, rating: rating ?? 4.7, badge: 'RAPID RESPONSE', badgeTone: 'green' },
        { name: 'Public Works Department', owner: 'Roads Maintenance Division', task: 'Repair identified safety hazards on approach roads', status: 'Milestone due Friday', resolutionDays: 6.8, rating: 4.5, badge: 'SLA CHAMPION', badgeTone: 'green' },
        { name: 'Power Distribution', owner: 'Field Operations Circle', task: 'Close supply and pole-safety dependencies within 48 hours', status: 'Needs coordination', resolutionDays: 8.1, rating: 4.2, badge: 'CITIZEN TRUSTED', badgeTone: 'amber' }
      ];
      return send(res, 200, { role, focus: { title: 'Safe streets after dark', outcome: 'Make 120 priority public corridors safe, lit, and verified before the festive season.', deadline: '18 September 2026', progress: 68 }, ministries, metrics: { activeTasks: active + 12, onTrack: 9, overdue, resolved: queue.filter(item => item.state === 'RESOLVED').length, averageRating: rating ?? 4.6, averageResolutionDays: 5.7 }, permissions: role === 'ADMIN' ? ['VIEW_ALL', 'MANAGE_ROLES', 'VIEW_AUDIT_LOG'] : role === 'STATE_SUPERVISOR' ? ['VIEW_ALL', 'VIEW_ESCALATIONS', 'VIEW_ANALYTICS'] : ['VIEW_MINISTRY_TASKS', 'UPDATE_RESOLUTION_EVIDENCE'] });
    }
    if (req.method === 'GET' && url.pathname === '/api/grievances') return send(res, 200, db.prepare('SELECT * FROM grievances ORDER BY created_at DESC').all().map(map));
    if (req.method === 'POST' && url.pathname === '/api/grievances') {
      const body = await readBody(req);
      if (!body.summary || !body.location || !body.category || !body.department) return send(res, 400, { error: 'Summary, location, category, and department are required.' });
      const id = `SHRAVANA-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;
      const stamp = now(), due = new Date(Date.now() + 21 * 86400000).toISOString().slice(0, 10);
      const grievance = { id, title: body.title?.trim() || body.summary.trim().slice(0, 70), summary: body.summary.trim(), category: body.category, department: body.department, location: body.location.trim(), state: 'SUBMITTED', submittedAt: stamp.slice(0, 10), slaDueAt: due };
      db.prepare('INSERT INTO grievances VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(grievance.id, grievance.title, grievance.summary, grievance.category, grievance.department, grievance.location, grievance.state, grievance.submittedAt, grievance.slaDueAt, stamp, stamp);
      db.prepare('INSERT INTO audit_events (grievance_id,event_type,details,created_at) VALUES (?,?,?,?)').run(id, 'GRIEVANCE_SUBMITTED', 'Citizen submitted grievance', stamp);
      return send(res, 201, grievance);
    }
    const evidenceMatch = url.pathname.match(/^\/api\/grievances\/([^/]+)\/evidence$/);
    if (req.method === 'GET' && evidenceMatch) {
      const id = decodeURIComponent(evidenceMatch[1]);
      return send(res, 200, db.prepare('SELECT id, original_name, mime_type, size_bytes, analysis_status, analysis_summary, created_at FROM evidence WHERE grievance_id=? ORDER BY id DESC').all(id));
    }
    if (req.method === 'POST' && evidenceMatch) {
      const body = await readBody(req), id = decodeURIComponent(evidenceMatch[1]);
      if (!db.prepare('SELECT id FROM grievances WHERE id=?').get(id)) return send(res, 404, { error: 'Grievance not found.' });
      if (!body.dataUrl?.startsWith('data:image/') || !body.name) return send(res, 400, { error: 'Please upload a valid image.' });
      const [meta, payload] = body.dataUrl.split(',', 2), mime = meta.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64$/)?.[1];
      const bytes = Buffer.from(payload || '', 'base64');
      if (!mime || !bytes.length || bytes.length > 5 * 1024 * 1024) return send(res, 400, { error: 'Images must be under 5 MB.' });
      mkdirSync('data/uploads', { recursive: true });
      const safeName = body.name.replace(/[^a-zA-Z0-9._-]/g, '_'), storedPath = `data/uploads/${Date.now()}-${safeName}`;
      writeFileSync(storedPath, bytes);
      const summary = 'Offline demo analysis queued. Configure a vision/OCR provider to detect potholes, objects, or constructions.';
      const stamp = now(), result = db.prepare('INSERT INTO evidence (grievance_id,original_name,stored_path,mime_type,size_bytes,analysis_status,analysis_summary,created_at) VALUES (?,?,?,?,?,?,?,?)').run(id, body.name, storedPath, mime, bytes.length, 'DEMO_FALLBACK', summary, stamp);
      db.prepare('INSERT INTO audit_events (grievance_id,event_type,details,created_at) VALUES (?,?,?,?)').run(id, 'EVIDENCE_UPLOADED', body.name, stamp);
      return send(res, 201, { id: Number(result.lastInsertRowid), original_name: body.name, mime_type: mime, size_bytes: bytes.length, analysis_status: 'DEMO_FALLBACK', analysis_summary: summary, created_at: stamp });
    }
    const outcomeMatch = url.pathname.match(/^\/api\/grievances\/([^/]+)\/outcome$/);
    if (req.method === 'POST' && outcomeMatch) {
      const body = await readBody(req), id = decodeURIComponent(outcomeMatch[1]);
      if (!['solved', 'partial', 'unresolved', 'unrelated'].includes(body.outcome)) return send(res, 400, { error: 'A valid outcome is required.' });
      if (!Number.isInteger(body.rating) || body.rating < 1 || body.rating > 5) return send(res, 400, { error: 'Please rate the service from 1 to 5 stars.' });
      if (body.evidenceId && !db.prepare('SELECT id FROM evidence WHERE id=? AND grievance_id=?').get(body.evidenceId, id)) return send(res, 400, { error: 'The resolution photo is not attached to this grievance.' });
      const state = body.outcome === 'solved' ? 'RESOLVED' : 'REOPENED', stamp = now();
      if (!db.prepare('SELECT id FROM grievances WHERE id=?').get(id)) return send(res, 404, { error: 'Grievance not found.' });
      db.prepare('UPDATE grievances SET state=?, updated_at=? WHERE id=?').run(state, stamp, id);
      db.prepare('INSERT INTO citizen_outcomes (grievance_id,outcome,created_at,closing_reason) VALUES (?,?,?,?)').run(id, body.outcome, stamp, String(body.closingReason || '').trim() || null);
      db.prepare('INSERT INTO service_ratings (grievance_id,rating,created_at) VALUES (?,?,?)').run(id, body.rating, stamp);
      db.prepare('INSERT INTO audit_events (grievance_id,event_type,details,created_at) VALUES (?,?,?,?)').run(id, 'CITIZEN_OUTCOME_RECORDED', body.outcome, stamp);
      return send(res, 200, map(db.prepare('SELECT * FROM grievances WHERE id=?').get(id)));
    }
    const escalationMatch = url.pathname.match(/^\/api\/grievances\/([^/]+)\/escalate$/);
    if (req.method === 'POST' && escalationMatch) {
      const id = decodeURIComponent(escalationMatch[1]), stamp = now();
      if (!db.prepare('SELECT id FROM grievances WHERE id=?').get(id)) return send(res, 404, { error: 'Grievance not found.' });
      db.prepare('UPDATE grievances SET state=?, updated_at=? WHERE id=?').run('ESCALATED', stamp, id);
      db.prepare('INSERT INTO escalations (grievance_id,reason,created_at) VALUES (?,?,?)').run(id, 'Demo SLA escalation', stamp);
      db.prepare('INSERT INTO audit_events (grievance_id,event_type,details,created_at) VALUES (?,?,?,?)').run(id, 'ESCALATION_SIMULATED', 'Demo SLA escalation', stamp);
      return send(res, 200, map(db.prepare('SELECT * FROM grievances WHERE id=?').get(id)));
    }
    send(res, 404, { error: 'Not found' });
  } catch (error) { send(res, 500, { error: error instanceof Error ? error.message : 'Server error' }); }
});

// Required for React Router (Single Page Applications)
// Ensures refresh/direct links load index.html instead of a 404
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
