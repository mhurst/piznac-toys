const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');
const http = require('http');

const RAILWAY_URL = process.env.RAILWAY_URL || 'https://piznac-toys-production.up.railway.app';
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const EMAIL = process.env.ADMIN_EMAIL || 'admin@piznac.com';
const PASSWORD = process.env.ADMIN_PASSWORD;

if (!PASSWORD) {
  console.error('Set ADMIN_PASSWORD env var (your production admin password)');
  process.exit(1);
}

function request(url, options, body) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : http;
    const req = mod.request(url, options, (res) => {
      let data = '';
      res.on('data', (d) => data += d);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    if (body) {
      if (body.pipe) { body.pipe(req); }
      else { req.write(body); req.end(); }
    } else {
      req.end();
    }
  });
}

async function getToken() {
  const res = await request(`${RAILWAY_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  }, JSON.stringify({ email: EMAIL, password: PASSWORD }));

  const json = JSON.parse(res.body);
  if (!json.token) throw new Error('Login failed: ' + res.body);
  return json.token;
}

async function checkExists(filename, token) {
  const res = await request(`${RAILWAY_URL}/uploads/${encodeURIComponent(filename)}`, {
    method: 'HEAD',
    headers: { 'Authorization': `Bearer ${token}` },
  });
  return res.status === 200;
}

async function uploadFile(filename, token) {
  const filePath = path.join(UPLOADS_DIR, filename);
  const form = new FormData();
  form.append('file', fs.createReadStream(filePath));
  form.append('filename', filename);

  return new Promise((resolve, reject) => {
    const mod = RAILWAY_URL.startsWith('https') ? https : http;
    const url = new URL('/api/sync-upload', RAILWAY_URL);
    const req = mod.request(url, {
      method: 'POST',
      headers: {
        ...form.getHeaders(),
        'Authorization': `Bearer ${token}`,
      },
    }, (res) => {
      let body = '';
      res.on('data', (d) => body += d);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve(body);
        else reject(new Error(`${res.statusCode}: ${body}`));
      });
    });
    req.on('error', reject);
    form.pipe(req);
  });
}

async function main() {
  const files = fs.readdirSync(UPLOADS_DIR).filter(f =>
    !f.startsWith('.') && !f.startsWith('tmp') && fs.statSync(path.join(UPLOADS_DIR, f)).isFile()
  );
  console.log(`Found ${files.length} local files`);

  const token = await getToken();
  console.log('Logged in to production\n');

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    try {
      const exists = await checkExists(file, token);
      if (exists) {
        skipped++;
        continue;
      }
      await uploadFile(file, token);
      uploaded++;
      process.stdout.write(`\r  Uploaded ${uploaded}, skipped ${skipped}, failed ${failed} / ${files.length} total`);
    } catch (e) {
      failed++;
      console.log(`\n  FAILED ${file}: ${e.message}`);
    }
  }
  console.log(`\n\nDone! ${uploaded} uploaded, ${skipped} already existed, ${failed} failed.`);
}

main();
