export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const githubToken = process.env.GH_TOKEN;
  const userPassword = req.headers['x-admin-password'] || req.body?.password;

  if (method === 'GET' && !req.headers['x-admin-password']) {
    return res.status(200).json({ status: 'Ninja Backend Online 🥷' });
  }

  if (!adminPassword || userPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const repo = 'pepitogumball-lang/file-host';
  // Soporta carpetas 'files' o 'temp'
  const folder = req.body?.folder || req.query?.folder || 'files';
  const baseUrl = `https://api.github.com/repos/${repo}/contents/${folder}`;

  try {
    if (method === 'GET') {
      const response = await fetch(baseUrl, {
        headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json' }
      });
      const data = await response.json();
      if (!Array.isArray(data)) return res.status(200).json([]);
      
      const files = data
        .filter(item => item.name !== '.gitkeep')
        .map(item => ({
          name: item.name,
          sha: item.sha,
          size: item.size,
          permanent_url: `https://pepitogumball-lang.github.io/file-host/${folder}/${item.name}`
        }));
      
      return res.status(200).json(files);
    }

    if (method === 'POST') {
      const { name, content } = req.body;
      if (!name || !content) return res.status(400).json({ error: 'Missing data' });

      const safeName = name.replace(/[^a-z0-9.-]/gi, '_');
      const uploadUrl = `${baseUrl}/${safeName}`;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
            'Authorization': `Bearer ${githubToken}`, 
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Ninja Upload [${folder}]: ${safeName}`,
          content: content
        })
      });

      const result = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(result.message);
      
      return res.status(200).json({ 
        success: true, 
        name: safeName, 
        url: `https://pepitogumball-lang.github.io/file-host/${folder}/${safeName}` 
      });
    }

    if (method === 'DELETE') {
      const { name, sha } = req.body;
      const deleteRes = await fetch(`${baseUrl}/${name}`, {
        method: 'DELETE',
        headers: { 
            'Authorization': `Bearer ${githubToken}`, 
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Ninja Delete [${folder}]: ${name}`,
          sha: sha
        })
      });

      if (!deleteRes.ok) {
          const err = await deleteRes.json();
          throw new Error(err.message);
      }
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
