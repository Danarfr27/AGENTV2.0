module.exports = function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secure = process.env.NODE_ENV === 'production' ? ' Secure;' : '';
  res.setHeader(
    'Set-Cookie',
    `ai_session=; HttpOnly; Path=/; Max-Age=0;${secure} SameSite=Lax`
  );
  return res.status(200).json({ ok: true });
};
