export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method } = req;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const githubToken = process.env.GH_TOKEN;
  const userPassword = req.headers['x-admin-password'];

  // 1. Verificación de Admin (Auth check)
  if (method === 'GET' && req.query.action === 'verify') {
    if (adminPassword && userPassword === adminPassword) {
      return res.status(200).json({ authorized: true, role: 'ninja-admin' });
    }
    return res.status(401).json({ authorized: false });
  }

  // 2. Modo Público: Listar archivos permanentes
  if (method === 'GET' && !req.query.action) {
    try {
      const repo = 'pepitogumball-lang/file-host';
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/files`, {
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
          url: `https://pepitogumball-lang.github.io/file-host/files/${item.name}`
        }));
      return res.status(200).json(files);
    } catch (e) {
      return res.status(500).json({ error: 'Error al listar archivos' });
    }
  }

  // Restricción de seguridad para POST/DELETE
  if (!adminPassword || userPassword !== adminPassword) {
    return res.status(401).json({ error: 'Acceso denegado' });
  }

  // 3. Subida (POST)
  if (method === 'POST') {
    const { name, content, folder } = req.body; // folder: 'files' o 'temp'
    if (!name || !content) return res.status(400).json({ error: 'Faltan datos' });

    const targetFolder = folder === 'temp' ? 'temp' : 'files';
    const safeName = name.replace(/[^a-z0-9.-]/gi, '_');
    const repo = 'pepitogumball-lang/file-host';
    const uploadUrl = `https://api.github.com/repos/${repo}/contents/${targetFolder}/${safeName}`;

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${githubToken}`, 
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Ninja Upload [${targetFolder}]: ${safeName}`,
          content: content
        })
      });

      if (!uploadRes.ok) {
        const err = await uploadRes.json();
        throw new Error(err.message);
      }

      return res.status(200).json({ 
        success: true, 
        name: safeName, 
        url: `https://pepitogumball-lang.github.io/file-host/${targetFolder}/${safeName}` 
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 4. Borrado (DELETE)
  if (method === 'DELETE') {
    const { name, sha } = req.body;
    const repo = 'pepitogumball-lang/file-host';
    const deleteUrl = `https://api.github.com/repos/${repo}/contents/files/${name}`;

    try {
      const deleteRes = await fetch(deleteUrl, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${githubToken}`, 
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: `Admin Delete: ${name}`, sha: sha })
      });

      if (!deleteRes.ok) throw new Error('No se pudo borrar');
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
