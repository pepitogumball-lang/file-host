export default async function handler(req, res) {
  // CORS configuration
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
  const userPassword = req.headers['x-admin-password'];

  if (!adminPassword || userPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Password incorrecto' });
  }

  const repo = 'pepitogumball-lang/file-host';
  const baseUrl = `https://api.github.com/repos/${repo}/contents/files`;

  try {
    // LIST FILES (GET)
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
          download_url: item.download_url,
          permanent_url: `https://pepitogumball-lang.github.io/file-host/files/${item.name}`
        }));
      
      return res.status(200).json(files);
    }

    // UPLOAD FILE (POST)
    if (method === 'POST') {
      const { name, content } = req.body;
      if (!name || !content) return res.status(400).json({ error: 'Falta nombre o contenido' });

      // Sanitización básica
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
          message: `Admin Upload: ${safeName}`,
          content: content
        })
      });

      const result = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(result.message);
      
      return res.status(200).json({ success: true, file: safeName });
    }

    // DELETE FILE (DELETE)
    if (method === 'DELETE') {
      const { name, sha } = req.body;
      if (!name || !sha) return res.status(400).json({ error: 'Falta nombre o sha' });

      const deleteRes = await fetch(`${baseUrl}/${name}`, {
        method: 'DELETE',
        headers: { 
            'Authorization': `Bearer ${githubToken}`, 
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Admin Delete: ${name}`,
          sha: sha
        })
      });

      if (!deleteRes.ok) {
          const err = await deleteRes.json();
          throw new Error(err.message);
      }
      
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: `Method ${method} Not Allowed` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
