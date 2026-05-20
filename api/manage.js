export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password, X-User-ID');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method } = req;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const githubToken = process.env.GH_TOKEN;
  const repo = 'pepitogumball-lang/file-host';
  
  const authHeader = req.headers['x-admin-password'];
  const userId = req.headers['x-user-id'] || 'anonymous';
  const isAdmin = adminPassword && authHeader === adminPassword;

  // 1. Verificar Admin
  if (method === 'GET' && req.query.action === 'verify') {
    return res.status(200).json({ authorized: isAdmin });
  }

  // 2. Listar Archivos Permanentes
  if (method === 'GET') {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/files`, {
        headers: { 'Authorization': `Bearer ${githubToken}`, 'Accept': 'application/vnd.github+json' }
      });
      const data = await response.json();
      if (!Array.isArray(data)) return res.status(200).json([]);
      
      const files = data
        .filter(item => item.name !== '.gitkeep')
        .map(item => {
          // Extraer el Owner ID del nombre del archivo (formato: timestamp_userid_name)
          const parts = item.name.split('_');
          const ownerId = parts[1] || 'unknown';
          return {
            name: item.name,
            displayName: parts.slice(2).join('_') || item.name,
            sha: item.sha,
            owner: ownerId,
            url: `https://pepitogumball-lang.github.io/file-host/files/${item.name}`
          };
        });
      return res.status(200).json(files);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 3. Subir Archivo
  if (method === 'POST') {
    const { name, content, type } = req.body; // type: 'temp' | 'perm'
    if (!name || !content) return res.status(400).json({ error: 'Missing data' });

    const folder = type === 'temp' ? 'temp' : 'files';
    const timestamp = Date.now();
    const safeName = name.replace(/[^a-z0-9.-]/gi, '');
    const finalName = `${timestamp}_${userId}_${safeName}`;
    
    const uploadUrl = `https://api.github.com/repos/${repo}/contents/${folder}/${finalName}`;

    try {
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${githubToken}`, 
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: `Upload [${type}]: ${finalName}`,
          content: content
        })
      });

      if (!uploadRes.ok) throw new Error('Upload failed');

      return res.status(200).json({ 
        success: true, 
        url: `https://pepitogumball-lang.github.io/file-host/${folder}/${finalName}` 
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 4. Borrar Archivo
  if (method === 'DELETE') {
    const { name, sha, owner } = req.body;
    
    // Solo permitir borrar si es admin O si el userId coincide con el owner
    if (!isAdmin && userId !== owner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const deleteRes = await fetch(`https://api.github.com/repos/${repo}/contents/files/${name}`, {
        method: 'DELETE',
        headers: { 
          'Authorization': `Bearer ${githubToken}`, 
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: `Delete: ${name}`, sha: sha })
      });

      if (!deleteRes.ok) throw new Error('Delete failed');
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
