const { sign } = require('./_session.js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { username, password } = req.body || {};

  // Anti brute-force delay (500 - 1000 ms)
  const delay = Math.floor(Math.random() * 500) + 500;
  await new Promise(resolve => setTimeout(resolve, delay));

  if (!username || !password) {
    return res.status(400).json({ error: 'username and password required' });
  }

  const adminUser = process.env.ADMIN_USER;
  const adminPass = process.env.ADMIN_PASS;

  let role = null;

  // 1. Cek Admin
  if (adminUser && adminPass && username === adminUser && password === adminPass) {
    role = 'admin';
  } else {
    // 2. Mengumpulkan kredensial pengguna biasa
    const userCreds = [];

    // Dukungan opsional untuk USER_USER / USER_PASS (tanpa angka)
    if (process.env.USER_USER && process.env.USER_PASS) {
      userCreds.push({ user: process.env.USER_USER, pass: process.env.USER_PASS });
    }

    // Perulangan dinamis dari USER1_USER s/d USER100_USER
    for (let i = 1; i <= 100; i++) {
      const u = process.env[`USER${i}_USER`];
      const p = process.env[`USER${i}_PASS`];
      if (u && p) userCreds.push({ user: u, pass: p });
    }

    const matched = userCreds.find(c => c.user === username && c.pass === password);
    if (matched) role = 'user';
  }

  if (!role) {
    return res.status(401).json({ ok: false, message: 'Invalid credentials' });
  }

  // 3. Penerbitan Token & Cookie
  const payload = { username, role, ts: Date.now() };
  const token = sign(payload);

  const maxAge = 60 * 60 * 8; // 8 Jam
  const secure = process.env.NODE_ENV === 'production' ? 'Secure; ' : '';
  res.setHeader(
    'Set-Cookie',
    `ai_session=${token}; HttpOnly; Path=/; Max-Age=${maxAge}; ${secure}SameSite=Lax`
  );

  return res.status(200).json({ ok: true, role });
};
